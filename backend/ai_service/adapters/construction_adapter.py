"""Adapter for HasnatHridoy V-Safe RF-DETR Construction & Safety Equipment Detection Model (ONNX).
Repository: https://github.com/HasnatHridoy/construction-safety-equipment-detection
Hugging Face: hasnatz/v-safe-rf-detr
Licence: MIT
"""

import time
import os
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image
import numpy as np

from ai_service.adapters.base import (
    BaseModelAdapter,
    PredictionResult,
    DetectionObject,
    BoundingBox,
    RelativeBoundingBox,
    compute_confidence_level,
)
from ai_service.model_registry import ModelRegistryEntry


def sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(x, -50.0, 50.0)))


def box_cxcywh_to_xyxy_numpy(x: np.ndarray) -> np.ndarray:
    """Convert [cx, cy, w, h] box format to [x1, y1, x2, y2]."""
    x_c, y_c, w, h = np.split(x, 4, axis=-1)
    b = np.concatenate(
        [
            x_c - 0.5 * np.clip(w, a_min=0.0, a_max=None),
            y_c - 0.5 * np.clip(h, a_min=0.0, a_max=None),
            x_c + 0.5 * np.clip(w, a_min=0.0, a_max=None),
            y_c + 0.5 * np.clip(h, a_min=0.0, a_max=None),
        ],
        axis=-1,
    )
    return b


class ConstructionHasnatAdapter(BaseModelAdapter):
    """Adapter for HasnatHridoy V-Safe RF-DETR ONNX construction & safety detector."""

    MEANS = [0.485, 0.456, 0.406]
    STDS = [0.229, 0.224, 0.225]

    def __init__(self, entry: ModelRegistryEntry, checkpoint_path: str, device: str = "cpu"):
        super().__init__(entry, checkpoint_path, device)
        self.session = None
        self.input_height = 640
        self.input_width = 640

    def load_model(self) -> bool:
        if self.is_loaded and self.session is not None:
            return True

        if not os.path.exists(self.checkpoint_path):
            raise FileNotFoundError(f"Construction RF-DETR ONNX checkpoint not found: {self.checkpoint_path}")

        import onnxruntime as ort

        providers = ["CPUExecutionProvider"]
        if self.device != "cpu" and "CUDAExecutionProvider" in ort.get_available_providers():
            providers.insert(0, "CUDAExecutionProvider")

        # Configure memory-conserving ONNX Runtime session for cloud containers (<512MB)
        sess_options = ort.SessionOptions()
        sess_options.enable_cpu_mem_arena = False  # Avoid pre-allocated tensor arenas
        sess_options.intra_op_num_threads = 1
        sess_options.inter_op_num_threads = 1
        sess_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC

        self.session = ort.InferenceSession(self.checkpoint_path, sess_options=sess_options, providers=providers)
        input_info = self.session.get_inputs()[0]
        # input shape is typically [1, 3, H, W]
        if len(input_info.shape) >= 4:
            self.input_height = input_info.shape[2] if isinstance(input_info.shape[2], int) else 640
            self.input_width = input_info.shape[3] if isinstance(input_info.shape[3], int) else 640

        self.is_loaded = True
        return True

    def unload_model(self) -> None:
        """Evict ONNX session from memory."""
        self.session = None
        self.is_loaded = False
        import gc
        gc.collect()

    def validate_model(self) -> bool:
        if not self.is_loaded:
            self.load_model()
        return self.session is not None

    def preprocess(self, image: Image.Image) -> Tuple[np.ndarray, Dict[str, Any]]:
        orig_w, orig_h = image.size
        # Resize to model input dimensions
        resized = image.convert("RGB").resize((self.input_width, self.input_height), Image.BILINEAR)
        img_arr = np.array(resized).astype(np.float32) / 255.0
        img_arr = ((img_arr - self.MEANS) / self.STDS).astype(np.float32)
        img_arr = np.transpose(img_arr, (2, 0, 1))  # HWC to CHW
        img_tensor = np.expand_dims(img_arr, axis=0)  # batch dimension

        meta = {
            "orig_w": orig_w,
            "orig_h": orig_h,
        }
        return img_tensor, meta

    def postprocess(
        self,
        raw_output: Any,
        original_size: Tuple[int, int],
        preprocess_meta: Any,
        confidence_threshold: float,
    ) -> List[DetectionObject]:
        orig_w, orig_h = original_size
        max_boxes = 100

        pred_boxes, pred_logits = raw_output[0], raw_output[1]
        prob = sigmoid(pred_logits)

        # Flatten and extract top-k candidates
        flat_prob = prob[0].flatten()
        topk_count = min(max_boxes, len(flat_prob))
        topk_indexes = np.argsort(flat_prob)[-topk_count:][::-1]
        scores = np.take_along_axis(flat_prob, topk_indexes, axis=0)

        num_classes = pred_logits.shape[2]
        topk_boxes = topk_indexes // num_classes
        labels = topk_indexes % num_classes

        # Rescale boxes to original image
        boxes = box_cxcywh_to_xyxy_numpy(pred_boxes[0])
        boxes = np.take_along_axis(
            boxes,
            np.expand_dims(topk_boxes, axis=-1).repeat(4, axis=-1),
            axis=0,
        )

        scale_factors = np.array([orig_w, orig_h, orig_w, orig_h], dtype=np.float32)
        boxes = boxes * scale_factors

        # Filter by confidence threshold
        keep = scores >= confidence_threshold
        filtered_scores = scores[keep]
        filtered_labels = labels[keep]
        filtered_boxes = boxes[keep]

        detections: List[DetectionObject] = []
        for score, label_id, box in zip(filtered_scores, filtered_labels, filtered_boxes):
            cls_id = int(label_id)
            # Skip background class "None" (id 0)
            if cls_id == 0:
                continue

            class_name = self.entry.classes.get(cls_id, f"class_{cls_id}")
            display_name = self.entry.class_display_names.get(cls_id, class_name)

            x1 = max(0.0, min(float(orig_w), float(box[0])))
            y1 = max(0.0, min(float(orig_h), float(box[1])))
            x2 = max(0.0, min(float(orig_w), float(box[2])))
            y2 = max(0.0, min(float(orig_h), float(box[3])))

            if x2 <= x1 or y2 <= y1:
                continue

            rel_x1 = max(0.0, min(1.0, x1 / orig_w)) if orig_w > 0 else 0.0
            rel_y1 = max(0.0, min(1.0, y1 / orig_h)) if orig_h > 0 else 0.0
            rel_x2 = max(0.0, min(1.0, x2 / orig_w)) if orig_w > 0 else 0.0
            rel_y2 = max(0.0, min(1.0, y2 / orig_h)) if orig_h > 0 else 0.0

            detections.append(
                DetectionObject(
                    class_id=cls_id,
                    class_name=class_name,
                    display_name=display_name,
                    confidence=round(float(score), 4),
                    confidence_level=compute_confidence_level(float(score)),
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
        tensor, meta = self.preprocess(image)
        t1 = time.perf_counter()
        preprocess_ms = (t1 - t0) * 1000.0

        # 2. Forward pass
        input_name = self.session.get_inputs()[0].name
        raw_outputs = self.session.run(None, {input_name: tensor})
        t2 = time.perf_counter()
        inference_ms = (t2 - t1) * 1000.0

        # 3. Postprocess
        detections = self.postprocess(
            raw_output=raw_outputs,
            original_size=(orig_w, orig_h),
            preprocess_meta=meta,
            confidence_threshold=threshold,
        )
        t3 = time.perf_counter()
        postprocess_ms = (t3 - t2) * 1000.0
        total_ms = (t3 - t0) * 1000.0

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
            input_resolution=[self.input_width, self.input_height],
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
            raw_output_meta={"model_type": "RF-DETR ONNX"},
        )
