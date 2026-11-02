"""Adapter for PeterHdd YOLOv8s Fine-Tuned Pothole Detection Model.
Repository: https://github.com/PeterHdd/pothole-detection-yolo
Licence: Apache 2.0
"""

import time
import os
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image

from ai_service.adapters.base import (
    BaseModelAdapter,
    PredictionResult,
    DetectionObject,
    BoundingBox,
    RelativeBoundingBox,
    compute_confidence_level,
)
from ai_service.model_registry import ModelRegistryEntry


class PotholePeterHddAdapter(BaseModelAdapter):
    """Adapter for PeterHdd fine-tuned YOLOv8s pothole model."""

    def __init__(self, entry: ModelRegistryEntry, checkpoint_path: str, device: str = "cpu"):
        super().__init__(entry, checkpoint_path, device)
        self.yolo_model = None

    def load_model(self) -> bool:
        if self.is_loaded and self.yolo_model is not None:
            return True

        if not os.path.exists(self.checkpoint_path):
            raise FileNotFoundError(f"Pothole checkpoint not found: {self.checkpoint_path}")

        from ultralytics import YOLO

        self.yolo_model = YOLO(self.checkpoint_path)
        # Device transfer
        try:
            self.yolo_model.to(self.device)
        except Exception as e:
            # Fallback to CPU if device placement fails
            self.device = "cpu"
            self.yolo_model.to("cpu")

        self.is_loaded = True
        return True

    def validate_model(self) -> bool:
        if not self.is_loaded:
            self.load_model()
        return self.yolo_model is not None

    def preprocess(self, image: Image.Image) -> Image.Image:
        # Ultralytics handles internal letterbox resizing and tensor conversion
        if image.mode != "RGB":
            return image.convert("RGB")
        return image

    def postprocess(
        self,
        raw_output: Any,
        original_size: Tuple[int, int],
        preprocess_meta: Any,
        confidence_threshold: float,
    ) -> List[DetectionObject]:
        orig_w, orig_h = original_size
        detections: List[DetectionObject] = []

        if not raw_output:
            return detections

        result = raw_output[0]
        if not hasattr(result, "boxes") or result.boxes is None:
            return detections

        boxes = result.boxes
        cls_list = boxes.cls.cpu().tolist() if hasattr(boxes.cls, "cpu") else []
        conf_list = boxes.conf.cpu().tolist() if hasattr(boxes.conf, "cpu") else []
        xyxy_list = boxes.xyxy.cpu().tolist() if hasattr(boxes.xyxy, "cpu") else []

        for cls_id_float, conf, xyxy in zip(cls_list, conf_list, xyxy_list):
            if conf < confidence_threshold:
                continue

            cls_id = int(cls_id_float)
            class_name = self.entry.classes.get(cls_id, "pothole")
            display_name = self.entry.class_display_names.get(cls_id, "Pothole / Road Cavity")

            x1 = max(0.0, float(xyxy[0]))
            y1 = max(0.0, float(xyxy[1]))
            x2 = min(float(orig_w), float(xyxy[2]))
            y2 = min(float(orig_h), float(xyxy[3]))

            rel_x1 = max(0.0, min(1.0, x1 / orig_w)) if orig_w > 0 else 0.0
            rel_y1 = max(0.0, min(1.0, y1 / orig_h)) if orig_h > 0 else 0.0
            rel_x2 = max(0.0, min(1.0, x2 / orig_w)) if orig_w > 0 else 0.0
            rel_y2 = max(0.0, min(1.0, y2 / orig_h)) if orig_h > 0 else 0.0

            detections.append(
                DetectionObject(
                    class_id=cls_id,
                    class_name=class_name,
                    display_name=display_name,
                    confidence=round(float(conf), 4),
                    confidence_level=compute_confidence_level(float(conf)),
                    bbox=BoundingBox(x1=round(x1, 1), y1=round(y1, 1), x2=round(x2, 1), y2=round(y2, 1)),
                    relative_bbox=RelativeBoundingBox(
                        rel_x1=round(rel_x1, 4),
                        rel_y1=round(rel_y1, 4),
                        rel_x2=round(rel_x2, 4),
                        rel_y2=round(rel_y2, 4),
                    ),
                )
            )

        return detections

    def predict(self, image: Image.Image, confidence_threshold: Optional[float] = None) -> PredictionResult:
        if not self.is_loaded:
            self.load_model()

        threshold = confidence_threshold if confidence_threshold is not None else self.entry.confidence_threshold
        orig_w, orig_h = image.size

        # 1. Preprocess
        t0 = time.perf_counter()
        rgb_image = self.preprocess(image)
        t1 = time.perf_counter()
        preprocess_ms = (t1 - t0) * 1000.0

        # 2. Forward pass
        results = self.yolo_model.predict(
            source=rgb_image,
            imgsz=self.entry.input_resolution[0],
            conf=threshold,
            device=self.device,
            verbose=False,
        )
        t2 = time.perf_counter()
        inference_ms = (t2 - t1) * 1000.0

        # 3. Postprocess
        detections = self.postprocess(
            raw_output=results,
            original_size=(orig_w, orig_h),
            preprocess_meta=None,
            confidence_threshold=threshold,
        )
        t3 = time.perf_counter()
        postprocess_ms = (t3 - t2) * 1000.0
        total_ms = (t3 - t0) * 1000.0

        # Aggregate metrics
        class_dist: Dict[str, int] = {}
        for d in detections:
            class_dist[d.display_name] = class_dist.get(d.display_name, 0) + 1

        confs = [d.confidence for d in detections]
        max_conf = max(confs) if confs else None
        avg_conf = round(sum(confs) / len(confs), 4) if confs else None

        return PredictionResult(
            model_id=self.entry.model_id,
            model_name=self.entry.model_name,
            model_version=self.entry.model_version,
            category=self.entry.category,
            device=self.device,
            input_resolution=self.entry.input_resolution,
            original_width=orig_w,
            original_height=orig_h,
            detections=detections,
            detection_count=len(detections),
            max_confidence=max_conf,
            avg_confidence=avg_conf,
            class_distribution=class_dist,
            preprocess_ms=round(preprocess_ms, 2),
            inference_ms=round(inference_ms, 2),
            postprocess_ms=round(postprocess_ms, 2),
            total_ms=round(total_ms, 2),
            raw_output_meta={"boxes_count": len(detections)},
        )
