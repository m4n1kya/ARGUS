from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base, IS_SQLITE
import enum

class HazardClass(str, enum.Enum):
    pothole = "pothole"
    garbage = "garbage"
    construction = "construction"
    debris = "debris"
    exposed_wire = "exposed_wire"

class Hazard(Base):
    __tablename__ = "hazards"

    id = Column(Integer, primary_key=True, index=True)
    hazard_class = Column(Enum(HazardClass), nullable=False)
    
    # PostGIS geometry column for PostgreSQL; Text WKT column for SQLite fallback
    if not IS_SQLITE:
        from geoalchemy2 import Geometry
        location = Column(Geometry(geometry_type='POINT', srid=4326), nullable=False)
    else:
        location = Column(Text, nullable=False)
    
    # severity feature extraction
    severity_score = Column(Float, nullable=True) 
    confidence = Column(Float, nullable=True)
    
    # fusion / AURS metrics
    recurrence_count = Column(Integer, default=1)
    aurs_score = Column(Float, nullable=True)
    
    # state
    status = Column(String(64), default="reported") # reported, verified, resolved
    image_path = Column(String(512), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship to AI verification
    verifications = relationship("AiVerification", back_populates="hazard", cascade="all, delete-orphan")


# -----------------------------------------------------------
# Section 15: AI Verification Entities
# -----------------------------------------------------------

class AiVerification(Base):
    __tablename__ = "ai_verifications"

    id = Column(String(64), primary_key=True, index=True)  # UUID
    report_id = Column(Integer, ForeignKey("hazards.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(String(64), nullable=True)
    image_reference = Column(String(512), nullable=False)
    category = Column(String(64), nullable=False, index=True)
    
    # Processing Status: QUEUED, PROCESSING, COMPLETED, NEEDS_REVIEW, FAILED
    processing_status = Column(String(32), default="QUEUED", index=True, nullable=False)
    # AI Assessment: EVIDENCE_FOUND, NOT_DETECTED, INCONCLUSIVE
    assessment = Column(String(32), default="INCONCLUSIVE", index=True, nullable=False)

    model_id = Column(String(64), nullable=True, index=True)
    model_version = Column(String(32), nullable=True)
    
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    total_duration_ms = Column(Float, nullable=True)
    
    error_code = Column(String(64), nullable=True)
    error_message = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)

    # Structured metadata snapshots
    image_quality = Column(JSON, nullable=True)
    metrics_summary = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    hazard = relationship("Hazard", back_populates="verifications")
    detections = relationship("AiDetection", back_populates="verification", cascade="all, delete-orphan")
    benchmark_snapshot = relationship("AiVerificationBenchmarkSnapshot", back_populates="verification", uselist=False, cascade="all, delete-orphan")
    artifact = relationship("AiVerificationArtifact", back_populates="verification", uselist=False, cascade="all, delete-orphan")


class AiDetection(Base):
    __tablename__ = "ai_detections"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    verification_id = Column(String(64), ForeignKey("ai_verifications.id", ondelete="CASCADE"), nullable=False, index=True)
    
    class_id = Column(Integer, nullable=False)
    class_name = Column(String(64), nullable=False)
    confidence = Column(Float, nullable=False)
    
    # Absolute pixel coordinates
    bbox_x1 = Column(Float, nullable=False)
    bbox_y1 = Column(Float, nullable=False)
    bbox_x2 = Column(Float, nullable=False)
    bbox_y2 = Column(Float, nullable=False)
    
    original_image_width = Column(Integer, nullable=False)
    original_image_height = Column(Integer, nullable=False)

    verification = relationship("AiVerification", back_populates="detections")


class AiModelRegistryEntryDb(Base):
    __tablename__ = "ai_model_registry"

    model_id = Column(String(64), primary_key=True, index=True)
    model_name = Column(String(128), nullable=False)
    version = Column(String(32), nullable=False)
    checkpoint_hash = Column(String(128), nullable=True)
    architecture = Column(String(64), nullable=False)
    source_repository = Column(String(255), nullable=False)
    licence = Column(String(64), nullable=False)
    category = Column(String(64), nullable=False, index=True)
    model_status = Column(String(32), default="INTEGRATED")  # INTEGRATED, EXPERIMENTAL, UNAVAILABLE, DISABLED
    benchmark_metadata = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AiVerificationBenchmarkSnapshot(Base):
    __tablename__ = "ai_verification_benchmark_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    verification_id = Column(String(64), ForeignKey("ai_verifications.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    model_id = Column(String(64), nullable=False)
    snapshot_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    verification = relationship("AiVerification", back_populates="benchmark_snapshot")


class AiVerificationArtifact(Base):
    __tablename__ = "ai_verification_artifacts"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    verification_id = Column(String(64), ForeignKey("ai_verifications.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    original_image_path = Column(String(512), nullable=False)
    annotated_image_path = Column(String(512), nullable=True)
    inference_output_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    verification = relationship("AiVerification", back_populates="artifact")
