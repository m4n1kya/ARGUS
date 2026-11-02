"""Unified Base Model Adapter Interface for ARGUS AI Computer Vision.
Every model adapter implements this contract to ensure consistent preprocessing,
inference, postprocessing, metric reporting, and limitation transparency.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field
from PIL import Image
import numpy as np

from ai_service.model_registry import ModelRegistryEntry, ModelBenchmarkMetrics


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

    @property
    def width(self) -> float:
        return max(0.0, self.x2 - self.x1)

    @property
    def height(self) -> float:
        return max(0.0, self.y2 - self.y1)


class RelativeBoundingBox(BaseModel):
    rel_x1: float
    rel_y1: float
    rel_x2: float
    rel_y2: float


class DetectionObject(BaseModel):
    class_id: int
    class_name: str
    display_name: str
    confidence: float
    confidence_level: str  # HIGH, MODERATE, LOW
    bbox: BoundingBox
    relative_bbox: RelativeBoundingBox


class PredictionResult(BaseModel):
    model_id: str
    model_name: str
    model_version: str
    category: str
    device: str
    input_resolution: List[int]
    original_width: int
    original_height: int
    detections: List[DetectionObject]
    detection_count: int
    max_confidence: Optional[float] = None
    avg_confidence: Optional[float] = None
    class_distribution: Dict[str, int] = Field(default_factory=dict)
    preprocess_ms: float
    inference_ms: float
    postprocess_ms: float
    total_ms: float
    raw_output_meta: Dict[str, Any] = Field(default_factory=dict)


def compute_confidence_level(conf: float) -> str:
    """Classify confidence score into user-friendly bands."""
    if conf >= 0.70:
        return "HIGH"
    elif conf >= 0.40:
        return "MODERATE"
    return "LOW"


class BaseModelAdapter(ABC):
    """Abstract base adapter that all model adapters must implement."""

    def __init__(self, entry: ModelRegistryEntry, checkpoint_path: str, device: str = "cpu"):
        self.entry = entry
        self.checkpoint_path = checkpoint_path
        self.device = device
        self.is_loaded = False
        self.model = None

    @abstractmethod
    def load_model(self) -> bool:
        """Load the model weights into memory/device."""
        pass

    def unload_model(self) -> None:
        """Unload model from memory and trigger GC."""
        self.model = None
        self.is_loaded = False

    @abstractmethod
    def validate_model(self) -> bool:
        """Validate model integrity, device placement, and inference readiness."""
        pass

    @abstractmethod
    def preprocess(self, image: Image.Image) -> Any:
        """Preprocess PIL Image into model input format."""
        pass

    @abstractmethod
    def predict(self, image: Image.Image, confidence_threshold: Optional[float] = None) -> PredictionResult:
        """Execute full inference pipeline: preprocess -> forward pass -> postprocess."""
        pass

    @abstractmethod
    def postprocess(self, raw_output: Any, original_size: Tuple[int, int], preprocess_meta: Any, confidence_threshold: float) -> List[DetectionObject]:
        """Convert raw tensor/array outputs into structured DetectionObjects."""
        pass

    def get_model_metadata(self) -> Dict[str, Any]:
        """Return the immutable metadata from registry."""
        return self.entry.dict()

    def get_benchmark_metrics(self) -> ModelBenchmarkMetrics:
        """Return published benchmark metrics."""
        return self.entry.benchmark_metrics

    def get_model_limitations(self) -> List[str]:
        """Return documented limitations and domain warnings."""
        return self.entry.limitations
