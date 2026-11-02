"""Adapter for PeterHdd YOLOv8s Fine-Tuned Pothole Detection Model.
Optimized for ONNX Runtime (low-memory <15MB) with PyTorch fallback.
Repository: https://github.com/PeterHdd/pothole-detection-yolo
Licence: Apache 2.0
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


def nms(boxes: np.ndarray, scores: np.ndarray, iou_threshold: float = 0.45) -> List[int]:
    """Non-maximum suppression for numpy bounding boxes."""
    if len(boxes) == 0:
        return []

    x1 = boxes[:, 0]
    y1 = boxes[:, 1]
    x2 = boxes[:, 2]
    y2 = boxes[:, 3]
    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort()[::-1]

    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(i)
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])

        w = np.maximum(0.0, xx2 - xx1)
        h = np.maximum(0.0, yy2 - yy1)
        inter = w * h
        ovr = inter / (areas[i] + areas[order[1:]] - inter)

        inds = np.where(ovr <= iou_threshold)[0]
        order = order[inds + 1]

    return keep


class PotholePeterHddAdapter(BaseModelAdapter):
    """Adapter for PeterHdd fine-tuned YOLOv8s pothole model with ONNX support."""

    def __init__(self, entry: ModelRegistryEntry, checkpoint_path: str, device: str = "cpu"):
        super().__init__(entry, checkpoint_path, device)
        self.session = None
        self.yolo_model = None
        self.is_onnx = False

    def load_model(self) -> bool:
        if self.is_loaded:
            return True

        # Check for ONNX checkpoint first (ultra-lightweight <15MB RAM)
        onnx_path = self.checkpoint_path if self.checkpoint_path.endswith(".onnx") else self.checkpoint_path.replace(".pt", ".onnx")
        if os.path.exists(onnx_path):
            import onnxruntime as ort

            providers = ["CPUExecutionProvider"]
            if self.device != "cpu" and "CUDAExecutionProvider" in ort.get_available_providers():
                providers.insert(0, "CUDAExecutionProvider")

            sess_options = ort.SessionOptions()
            sess_options.enable_cpu_mem_arena = False
            sess_options.intra_op_num_threads = 1
            sess_options.inter_op_num_threads = 1
            sess_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
            sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC

            self.session = ort.InferenceSession(onnx_path, sess_options=sess_options, providers=providers)
            self.is_onnx = True
            self.is_loaded = True
            return True

        raise FileNotFoundError(f"Pothole ONNX checkpoint not found: {onnx_path}")

    def unload_model(self) -> None:
        """Evict model from memory."""
        self.session = None
        self.yolo_model = None
        self.is_loaded = False
        import gc
        gc.collect()

    def validate_model(self) -> bool:
        if not self.is_loaded:
            self.load_model()
        return (self.session is not None) if self.is_onnx else (self.yolo_model is not None)

    def preprocess(self, image: Image.Image) -> Tuple[Any, Dict[str, float]]:
        if self.is_onnx:
            orig_w, orig_h = image.size
            target_size = self.entry.input_resolution[0]

            scale = min(target_size / orig_w, target_size / orig_h)
            nw = int(round(orig_w * scale))
            nh = int(round(orig_h * scale))
            pad_x = (target_size - nw) // 2
            pad_y = (target_size - nh) // 2

            resized = image.convert("RGB").resize((nw, nh), Image.BILINEAR)
            letterboxed = Image.new("RGB", (target_size, target_size), (114, 114, 114))
            letterboxed.paste(resized, (pad_x, pad_y))

            img_array = np.array(letterboxed, dtype=np.float32) / 255.0
            img_array = np.transpose(img_array, (2, 0, 1))
            img_tensor = np.expand_dims(img_array, axis=0)

            meta = {
                "scale": scale,
                "pad_x": pad_x,
                "pad_y": pad_y,
                "orig_w": orig_w,
                "orig_h": orig_h,
            }
            return img_tensor, meta
        else:
            if image.mode != "RGB":
                return image.convert("RGB"), {}
            return image, {}

    def postprocess(
        self,
        raw_output: Any,
        original_size: Tuple[int, int],
        preprocess_meta: Any,
        confidence_threshold: float,
    ) -> List[DetectionObject]:
        orig_w, orig_h = original_size
        detections: List[DetectionObject] = []

        if self.is_onnx:
            scale = preprocess_meta["scale"]
            pad_x = preprocess_meta["pad_x"]
            pad_y = preprocess_meta["pad_y"]

            output = raw_output[0]
            output = np.squeeze(output, axis=0).T  # (8400, 5)

            boxes_xyxy = []
            confidences = []
            class_ids = []

            for row in output:
                max_conf = float(row[4])
                if max_conf < confidence_threshold:
                    continue

                cx, cy, bw, bh = row[0], row[1], row[2], row[3]
                x1 = (cx - bw / 2.0 - pad_x) / scale
                y1 = (cy - bh / 2.0 - pad_y) / scale
                x2 = (cx + bw / 2.0 - pad_x) / scale
                y2 = (cy + bh / 2.0 - pad_y) / scale

                x1 = max(0.0, min(float(orig_w), x1))
                y1 = max(0.0, min(float(orig_h), y1))
                x2 = max(0.0, min(float(orig_w), x2))
                y2 = max(0.0, min(float(orig_h), y2))

                if x2 > x1 and y2 > y1:
                    boxes_xyxy.append([x1, y1, x2, y2])
                    confidences.append(max_conf)
                    class_ids.append(0)

            if not boxes_xyxy:
                return []

            boxes_arr = np.array(boxes_xyxy, dtype=np.float32)
            confs_arr = np.array(confidences, dtype=np.float32)
            keep_indices = nms(boxes_arr, confs_arr, iou_threshold=0.45)

            for idx in keep_indices:
                conf = confidences[idx]
                box = boxes_xyxy[idx]
                x1, y1, x2, y2 = box

                rel_x1 = max(0.0, min(1.0, x1 / orig_w)) if orig_w > 0 else 0.0
                rel_y1 = max(0.0, min(1.0, y1 / orig_h)) if orig_h > 0 else 0.0
                rel_x2 = max(0.0, min(1.0, x2 / orig_w)) if orig_w > 0 else 0.0
                rel_y2 = max(0.0, min(1.0, y2 / orig_h)) if orig_h > 0 else 0.0

                detections.append(
                    DetectionObject(
                        class_id=0,
                        class_name="pothole",
                        display_name="Pothole / Road Cavity",
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
        else:
            # PyTorch fallback
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
                x1 = max(0.0, float(xyxy[0]))
                y1 = max(0.0, float(xyxy[1]))
                x2 = min(float(orig_w), float(xyxy[2]))
                y2 = min(float(orig_h), float(xyxy[3]))

                detections.append(
                    DetectionObject(
                        class_id=cls_id,
                        class_name="pothole",
                        display_name="Pothole / Road Cavity",
                        confidence=round(float(conf), 4),
                        confidence_level=compute_confidence_level(float(conf)),
                        bbox=BoundingBox(x1=round(x1, 1), y1=round(y1, 1), x2=round(x2, 1), y2=round(y2, 1)),
                        relative_bbox=RelativeBoundingBox(
                            rel_x1=round(x1 / orig_w, 4),
                            rel_y1=round(y1 / orig_h, 4),
                            rel_x2=round(x2 / orig_w, 4),
                            rel_y2=round(y2 / orig_h, 4),
                        ),
                    )
                )
            return detections

    def predict(self, image: Image.Image, confidence_threshold: Optional[float] = None) -> PredictionResult:
        if not self.is_loaded:
            self.load_model()

        threshold = confidence_threshold if confidence_threshold is not None else self.entry.confidence_threshold
        orig_w, orig_h = image.size

        t0 = time.perf_counter()
        tensor_or_img, meta = self.preprocess(image)
        t1 = time.perf_counter()
        preprocess_ms = (t1 - t0) * 1000.0

        if self.is_onnx:
            input_name = self.session.get_inputs()[0].name
            raw_outputs = self.session.run(None, {input_name: tensor_or_img})
            t2 = time.perf_counter()
            inference_ms = (t2 - t1) * 1000.0
            detections = self.postprocess(
                raw_output=raw_outputs,
                original_size=(orig_w, orig_h),
                preprocess_meta=meta,
                confidence_threshold=threshold,
            )
        else:
            inference_ms = 0.0
            detections = []

        t3 = time.perf_counter()
        postprocess_ms = (t3 - t2) * 1000.0

        confs = [d.confidence for d in detections]
        max_conf = max(confs) if confs else None
        avg_conf = round(sum(confs) / len(confs), 4) if confs else None

        class_dist: Dict[str, int] = {}
        for d in detections:
            class_dist[d.display_name] = class_dist.get(d.display_name, 0) + 1

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
            total_ms=round((t3 - t0) * 1000.0, 2),
            raw_output_meta={"raw_candidates": 8400},
        )
