"""ARGUS Unified AI Computer Vision Service.
Orchestrates model selection, lazy loading, hardware acceleration,
inference execution, annotation generation, and result packaging.
"""

import os
import threading
import logging
from typing import Dict, Any, Optional
from PIL import Image

import torch

from ai_service.model_registry import (
    MODEL_REGISTRY,
    get_model_entry,
    get_primary_model_for_category,
    ModelRegistryEntry,
)
from ai_service.adapters.base import BaseModelAdapter, PredictionResult
from ai_service.adapters.pothole_adapter import PotholePeterHddAdapter
from ai_service.adapters.waste_adapter import WasteSiyad23Adapter
from ai_service.adapters.indian_road_adapter import IndianRoadHazardAdapter
from ai_service.adapters.construction_adapter import ConstructionHasnatAdapter
from ai_service.adapters.powerline_adapter import PowerLineMtyoloAdapter
from ai_service.decision_engine import analyze_image_quality, evaluate_verification
from ai_service.annotator import draw_bounding_boxes

logger = logging.getLogger("argus.ai_service")


DEFAULT_WEIGHTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "weights")

CHECKPOINT_DIRECT_URLS = {
    "pothole_peterhdd_yolov8s.pt": "https://huggingface.co/peterhdd/pothole-detection-yolov8/resolve/main/best.pt",
    "construction_hasnatz_rf_detr.onnx": "https://huggingface.co/hasnatz/v-safe-rf-detr/resolve/main/inference_model.onnx",
    "waste_siyad23_yolo11n.pt": "https://raw.githubusercontent.com/siyad23/waste-sorting-model/main/weights/best.pt",
    "indian_road_hazard_yolo11n.onnx": "https://raw.githubusercontent.com/VivekVagale/road-hazard/gh-pages/models/yolo11n.onnx",
    "powerline_mtyolo_nano.pt": "https://raw.githubusercontent.com/phd-benel/PowerLine-MTYOLO/main/PowerLine-MTYOLO-NANO-150Epochs.pt",
}


class UnifiedAiService:
    """Singleton service managing models, hardware devices, and inference."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(UnifiedAiService, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self, weights_dir: Optional[str] = None):
        if getattr(self, "_initialized", False):
            return

        if weights_dir is None:
            self.weights_dir = DEFAULT_WEIGHTS_DIR
        else:
            self.weights_dir = os.path.abspath(weights_dir)
        os.makedirs(self.weights_dir, exist_ok=True)

        self.device = self._detect_device()
        self.model_cache: Dict[str, BaseModelAdapter] = {}
        self.inference_lock = threading.Lock()
        self._initialized = True
        logger.info("ARGUS AI Service initialized. Device: %s, Weights: %s", self.device, self.weights_dir)

    def _detect_device(self) -> str:
        override = os.getenv("AI_DEVICE")
        if override:
            return override.lower()

        if torch.cuda.is_available():
            try:
                device_name = torch.cuda.get_device_name(0)
                logger.info("NVIDIA CUDA detected: %s", device_name)
                return "cuda:0"
            except Exception:
                pass
        return "cpu"

    def get_adapter(self, model_id: str) -> BaseModelAdapter:
        """Lazily load and cache model adapters with auto-download fallback."""
        with self.inference_lock:
            if model_id in self.model_cache:
                return self.model_cache[model_id]

            entry = get_model_entry(model_id)
            if not entry:
                raise ValueError(f"Model ID '{model_id}' not found in ARGUS registry.")

            checkpoint_path = os.path.join(self.weights_dir, entry.checkpoint_filename)

            # Auto-download checkpoint on the fly if missing (crucial for cloud deployments like Render)
            if not os.path.exists(checkpoint_path) and entry.checkpoint_filename in CHECKPOINT_DIRECT_URLS:
                url = CHECKPOINT_DIRECT_URLS[entry.checkpoint_filename]
                logger.info("Checkpoint %s missing on disk. Downloading from %s...", entry.checkpoint_filename, url)
                temp_path = checkpoint_path + ".tmp"
                try:
                    import urllib.request
                    req = urllib.request.Request(url, headers={"User-Agent": "ARGUS-Vision-Inference/2.0"})
                    with urllib.request.urlopen(req, timeout=180) as resp, open(temp_path, "wb") as f_out:
                        while chunk := resp.read(65536):
                            f_out.write(chunk)
                    if os.path.exists(checkpoint_path):
                        os.remove(checkpoint_path)
                    os.rename(temp_path, checkpoint_path)
                    logger.info("Successfully downloaded %s (%d bytes).", entry.checkpoint_filename, os.path.getsize(checkpoint_path))
                except Exception as dl_err:
                    logger.error("Failed to download missing checkpoint %s: %s", entry.checkpoint_filename, dl_err)
                    if os.path.exists(temp_path):
                        os.remove(temp_path)

            # Route to appropriate adapter class
            if entry.model_id == "pothole_peterhdd_yolov8s":
                adapter = PotholePeterHddAdapter(entry, checkpoint_path, self.device)
            elif entry.model_id == "waste_siyad23_yolo11n":
                adapter = WasteSiyad23Adapter(entry, checkpoint_path, self.device)
            elif entry.model_id == "indian_road_hazard_yolo11n":
                adapter = IndianRoadHazardAdapter(entry, checkpoint_path, self.device)
            elif entry.model_id == "construction_hasnat_rf_detr":
                adapter = ConstructionHasnatAdapter(entry, checkpoint_path, self.device)
            elif entry.model_id == "powerline_benel_mtyolo":
                adapter = PowerLineMtyoloAdapter(entry, checkpoint_path, self.device)
            else:
                raise ValueError(f"No adapter implementation found for model ID '{model_id}'")

            adapter.load_model()
            self.model_cache[model_id] = adapter
            return adapter

    def verify_image(
        self,
        image_path: str,
        category: str,
        model_id: Optional[str] = None,
        confidence_threshold: Optional[float] = None,
        annotated_output_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Run complete AI image verification workflow."""
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Input image not found: {image_path}")

        # 1. Resolve model
        if model_id:
            entry = get_model_entry(model_id)
        else:
            entry = get_primary_model_for_category(category)

        if not entry:
            raise ValueError(f"No suitable AI model found for category: {category}")

        adapter = self.get_adapter(entry.model_id)

        # 2. Open image and analyze quality heuristics
        with Image.open(image_path) as raw_img:
            image = raw_img.convert("RGB")
            quality = analyze_image_quality(image)

            # 3. Execute inference under concurrency lock
            with self.inference_lock:
                prediction: PredictionResult = adapter.predict(
                    image=image,
                    confidence_threshold=confidence_threshold,
                )

            # 4. Evaluate decision rules
            status, assessment, explanation = evaluate_verification(
                category=category,
                prediction=prediction,
                quality=quality,
            )

            # 5. Generate annotated image
            annotated_url = None
            if annotated_output_path:
                draw_bounding_boxes(image, prediction.detections, annotated_output_path)
                annotated_url = annotated_output_path

        # 6. Format benchmark snapshot
        benchmark_snapshot = entry.benchmark_metrics.dict()

        return {
            "model_id": entry.model_id,
            "model_name": entry.model_name,
            "model_version": entry.model_version,
            "architecture": entry.architecture,
            "licence": entry.licence,
            "device": self.device,
            "processing_status": status,
            "assessment": assessment,
            "explanation": explanation,
            "confidence_threshold": confidence_threshold or entry.confidence_threshold,
            "prediction": prediction.dict(),
            "detections": [d.dict() for d in prediction.detections],
            "image_quality": quality,
            "benchmark_snapshot": benchmark_snapshot,
            "annotated_image_path": annotated_url,
            "total_duration_ms": prediction.total_ms,
        }
