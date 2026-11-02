from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from models import HazardClass

class HazardBase(BaseModel):
    hazard_class: HazardClass
    severity_score: Optional[float] = None
    confidence: Optional[float] = None

class HazardCreate(HazardBase):
    lat: float
    lon: float

class HazardResponse(HazardBase):
    id: int
    lat: float
    lon: float
    recurrence_count: int
    aurs_score: Optional[float] = None
    status: str
    image_path: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# -------------------------------------------------------------
# AI Verification Schemas
# -------------------------------------------------------------

class AiDetectionSchema(BaseModel):
    id: Optional[int] = None
    class_id: int
    class_name: str
    display_name: Optional[str] = None
    confidence: float
    confidence_level: Optional[str] = None
    bbox_x1: float
    bbox_y1: float
    bbox_x2: float
    bbox_y2: float
    original_image_width: int
    original_image_height: int

    class Config:
        from_attributes = True


class AiVerificationStatusResponse(BaseModel):
    verification_id: str
    report_id: Optional[int] = None
    processing_status: str  # QUEUED, PROCESSING, COMPLETED, NEEDS_REVIEW, FAILED
    status: Optional[str] = None
    current_stage: Optional[str] = None
    assessment: str         # EVIDENCE_FOUND, NOT_DETECTED, INCONCLUSIVE
    category: str
    model_id: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_duration_ms: Optional[float] = None
    explanation: Optional[str] = None
    detection_count: int = 0


class AiVerificationDetailResponse(BaseModel):
    id: str
    report_id: Optional[int] = None
    user_id: Optional[str] = None
    image_reference: str
    category: str
    processing_status: str
    assessment: str
    model_id: Optional[str] = None
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_duration_ms: Optional[float] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    explanation: Optional[str] = None
    image_quality: Optional[Dict[str, Any]] = None
    metrics_summary: Optional[Dict[str, Any]] = None
    detections: List[AiDetectionSchema] = Field(default_factory=list)
    benchmark_snapshot: Optional[Dict[str, Any]] = None
    original_image_url: Optional[str] = None
    annotated_image_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportUploadResponse(BaseModel):
    hazard: HazardResponse
    verification_id: str
    verification_status: str
    message: str
