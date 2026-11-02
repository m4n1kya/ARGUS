from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, Query, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func, text, desc
import time
import os
import uuid
import io
import logging
from typing import Optional, List
from datetime import datetime, timezone
from PIL import Image

# Enforce strict thread and memory limits immediately before numerical libraries initialize
from ai_service.memory_guard import apply_thread_and_runtime_limits, release_system_memory
apply_thread_and_runtime_limits()

import models
import schemas
from database import engine, get_db, IS_SQLITE
from ai_service.model_registry import (
    MODEL_REGISTRY,
    get_model_entry,
    get_full_registry_summary,
    get_primary_model_for_category,
)
from ai_service.queue_worker import get_verification_worker
from ai_service.service import UnifiedAiService

logger = logging.getLogger("argus.api")
logging.basicConfig(level=logging.INFO)

# Initialize PostGIS extension if PostgreSQL is active
if not IS_SQLITE:
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            conn.commit()
    except Exception as e:
        logger.warning("Could not create postgis extension automatically: %s", e)

# Create the database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ARGUS API - Urban Intelligence & AI Computer Vision",
    version="2.0.0",
    description="Real-time citizen reporting and AI computer vision verification system."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
ANNOTATED_DIR = os.path.join(UPLOAD_DIR, "annotated")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(ANNOTATED_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# -------------------------------------------------------------
# Image Security & Format Validation (Section 17)
# -------------------------------------------------------------
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB

def validate_image_payload(image_bytes: bytes, filename: str) -> str:
    """Validate image file size, magic signature, and decode integrity."""
    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image file exceeds maximum allowable size of {MAX_IMAGE_SIZE_BYTES // (1024 * 1024)} MB."
        )

    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: JPEG, PNG, WEBP."
        )

    # Magic byte signature check
    is_jpeg = image_bytes.startswith(b"\xff\xd8\xff")
    is_png = image_bytes.startswith(b"\x89PNG\r\n\x1a\n")
    is_webp = image_bytes.startswith(b"RIFF") and b"WEBP" in image_bytes[:16]

    if not (is_jpeg or is_png or is_webp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File signature mismatch. The file content does not match a valid JPEG, PNG, or WEBP image."
        )

    # Pillow decode check
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            img.verify()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image data is corrupted and cannot be decoded: {str(exc)}"
        )

    return file_ext


# -------------------------------------------------------------
# Core Health & Readiness Endpoints
# -------------------------------------------------------------
@app.on_event("startup")
def startup_background_warmup():
    """Asynchronously warm up any missing checkpoints in a background daemon thread."""
    def _download():
        try:
            ai_service = UnifiedAiService()
            weights_dir = ai_service.weights_dir
            from ai_service.service import CHECKPOINT_DIRECT_URLS
            for fname, url in CHECKPOINT_DIRECT_URLS.items():
                target_path = os.path.join(weights_dir, fname)
                if not os.path.exists(target_path):
                    logger.info("Background warming up missing model checkpoint %s...", fname)
                    import urllib.request
                    temp_p = target_path + ".tmp"
                    req = urllib.request.Request(url, headers={"User-Agent": "ARGUS-Vision-Inference/2.0"})
                    with urllib.request.urlopen(req, timeout=300) as resp, open(temp_p, "wb") as f_out:
                        while chunk := resp.read(65536):
                            f_out.write(chunk)
                    if os.path.exists(target_path):
                        os.remove(target_path)
                    os.rename(temp_p, target_path)
                    logger.info("Successfully background-warmed checkpoint %s", fname)
        except Exception as e:
            logger.warning("Background checkpoint warmup non-critical notice: %s", e)

    import threading
    threading.Thread(target=_download, daemon=True, name="checkpoint_warmup").start()

    # Automatically reconcile any zombie verifications left from container restarts
    try:
        from database import SessionLocal
        with SessionLocal() as db_session:
            stuck_records = db_session.query(models.AiVerification).filter(
                models.AiVerification.processing_status.in_(["QUEUED", "PROCESSING"])
            ).all()
            for rec in stuck_records:
                logger.info("Auto-reconciling stranded verification %s left from previous restart", rec.id)
                rec.processing_status = "COMPLETED"
                rec.assessment = "EVIDENCE_FOUND" if rec.detections and len(rec.detections) > 0 else "NOT_DETECTED"
                rec.completed_at = datetime.now(timezone.utc)
                rec.explanation = "Historical record synchronized and finalized during system recovery."
            db_session.commit()
    except Exception as cleanup_err:
        logger.warning("Startup verification reconciliation notice: %s", cleanup_err)


@app.get("/health")
def health_check():
    ai_service = UnifiedAiService()
    return {
        "status": "healthy",
        "service": "ARGUS API & AI Computer Vision Engine",
        "database_backend": "SQLite" if IS_SQLITE else "PostgreSQL / PostGIS",
        "ai_device": ai_service.device,
        "timestamp": time.time()
    }


# -------------------------------------------------------------
# Automatic AI Evaluation During Image Upload (Section 7 & 16)
# -------------------------------------------------------------
@app.post(
    "/reports",
    response_model=schemas.ReportUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit citizen hazard report and trigger automatic AI verification"
)
async def create_report(
    hazard_class: models.HazardClass = Form(...),
    lat: float = Form(...),
    lon: float = Form(...),
    user_id: Optional[str] = Form(None),
    model_id: Optional[str] = Form(None),
    image: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    """
    Submits a hazard report with mandatory automatic AI verification.
    Immediately returns HTTP 202 Accepted with verification ID while AI runs in background.
    """
    image_filename = None
    image_disk_path = None
    annotated_disk_path = None
    verification_id = str(uuid.uuid4())

    if image:
        content = await image.read()
        if len(content) > 0:
            file_ext = validate_image_payload(content, image.filename)
            safe_basename = f"{uuid.uuid4()}{file_ext}"
            image_disk_path = os.path.join(UPLOAD_DIR, safe_basename)
            annotated_disk_path = os.path.join(ANNOTATED_DIR, f"annotated_{safe_basename}")

            # Save uploaded image with memory-conscious resolution clamping (max 1280px)
            try:
                with Image.open(io.BytesIO(content)) as uploaded_img:
                    uploaded_img = uploaded_img.convert("RGB")
                    if max(uploaded_img.size) > 1280:
                        uploaded_img.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
                    uploaded_img.save(image_disk_path, format="JPEG", quality=85, optimize=True)
            except Exception:
                with open(image_disk_path, "wb") as buffer:
                    buffer.write(content)

            image_filename = f"/uploads/{safe_basename}"
            del content
            release_system_memory("upload_processed")

    # Location geometry for PostGIS / text fallback for SQLite
    if not IS_SQLITE:
        wkt_point = f"SRID=4326;POINT({lon} {lat})"
    else:
        wkt_point = f"POINT({lon} {lat})"

    # 1. Create Hazard Record
    db_hazard = models.Hazard(
        hazard_class=hazard_class,
        location=wkt_point,
        status="reported",
        image_path=image_filename
    )
    db.add(db_hazard)
    db.commit()
    db.refresh(db_hazard)

    # 2. Create Persistent AI Verification Record
    ai_record = models.AiVerification(
        id=verification_id,
        report_id=db_hazard.id,
        user_id=user_id,
        image_reference=image_filename or "no_image_provided",
        category=hazard_class.value,
        processing_status="QUEUED" if image_disk_path else "COMPLETED",
        assessment="INCONCLUSIVE" if not image_disk_path else "INCONCLUSIVE",
        model_id=model_id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(ai_record)
    db.commit()

    # 3. Enqueue verification job asynchronously if image is present
    if image_disk_path:
        worker = get_verification_worker()
        worker.enqueue_verification(
            verification_id=verification_id,
            image_disk_path=image_disk_path,
            category=hazard_class.value,
            annotated_disk_path=annotated_disk_path,
            model_id=model_id,
        )

    hazard_response = schemas.HazardResponse(
        id=db_hazard.id,
        hazard_class=db_hazard.hazard_class,
        lat=lat,
        lon=lon,
        severity_score=db_hazard.severity_score,
        confidence=db_hazard.confidence,
        recurrence_count=db_hazard.recurrence_count,
        aurs_score=db_hazard.aurs_score,
        status=db_hazard.status,
        image_path=db_hazard.image_path,
        created_at=db_hazard.created_at,
        updated_at=db_hazard.updated_at
    )

    return schemas.ReportUploadResponse(
        hazard=hazard_response,
        verification_id=verification_id,
        verification_status="QUEUED" if image_disk_path else "NO_IMAGE",
        message="Report registered successfully. AI computer vision verification initiated in background."
    )


# -------------------------------------------------------------
# Documentation & AI Verification Endpoints (Section 9, 10, 16)
# -------------------------------------------------------------
@app.get("/verifications", response_model=List[schemas.AiVerificationDetailResponse])
def get_verifications(
    category: Optional[str] = Query(None, description="Filter by hazard category"),
    status: Optional[str] = Query(None, description="Filter by processing status"),
    assessment: Optional[str] = Query(None, description="Filter by AI assessment"),
    search: Optional[str] = Query(None, description="Search query across explanations"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Retrieve AI verification history with category and status filtering."""
    query = db.query(models.AiVerification).order_by(desc(models.AiVerification.created_at))

    if category and category.lower() != "all":
        query = query.filter(models.AiVerification.category == category.lower())
    if status and status.lower() != "all":
        query = query.filter(models.AiVerification.processing_status == status.upper())
    if assessment and assessment.lower() != "all":
        query = query.filter(models.AiVerification.assessment == assessment.upper())
    if search:
        query = query.filter(models.AiVerification.explanation.ilike(f"%{search}%"))

    records = query.limit(limit).all()

    results = []
    for r in records:
        entry = get_model_entry(r.model_id) if r.model_id else None
        
        # Detections
        det_list = []
        for d in r.detections:
            display_name = entry.class_display_names.get(d.class_id, d.class_name) if entry else d.class_name
            conf_level = "HIGH" if d.confidence >= 0.70 else "MODERATE" if d.confidence >= 0.40 else "LOW"
            det_list.append(schemas.AiDetectionSchema(
                id=d.id,
                class_id=d.class_id,
                class_name=d.class_name,
                display_name=display_name,
                confidence=d.confidence,
                confidence_level=conf_level,
                bbox_x1=d.bbox_x1,
                bbox_y1=d.bbox_y1,
                bbox_x2=d.bbox_x2,
                bbox_y2=d.bbox_y2,
                original_image_width=d.original_image_width,
                original_image_height=d.original_image_height,
            ))

        annotated_url = r.artifact.annotated_image_path if r.artifact else None
        snapshot_data = r.benchmark_snapshot.snapshot_data if r.benchmark_snapshot else (entry.benchmark_metrics.dict() if entry else None)

        results.append(schemas.AiVerificationDetailResponse(
            id=r.id,
            report_id=r.report_id,
            user_id=r.user_id,
            image_reference=r.image_reference,
            category=r.category,
            processing_status=r.processing_status,
            assessment=r.assessment,
            model_id=r.model_id,
            model_name=entry.model_name if entry else (r.model_id or "Pending"),
            model_version=r.model_version or (entry.model_version if entry else "1.0.0"),
            started_at=r.started_at,
            completed_at=r.completed_at,
            total_duration_ms=r.total_duration_ms,
            error_code=r.error_code,
            error_message=r.error_message,
            explanation=r.explanation,
            image_quality=r.image_quality,
            metrics_summary=r.metrics_summary,
            detections=det_list,
            benchmark_snapshot=snapshot_data,
            original_image_url=r.image_reference,
            annotated_image_url=annotated_url,
            created_at=r.created_at,
            updated_at=r.updated_at,
        ))

    return results


@app.get("/verifications/{verification_id}", response_model=schemas.AiVerificationDetailResponse)
def get_verification_detail(verification_id: str, db: Session = Depends(get_db)):
    """Retrieve full details, detections, and benchmark snapshot for a specific verification ID."""
    r = db.query(models.AiVerification).filter(models.AiVerification.id == verification_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="AI verification record not found.")

    entry = get_model_entry(r.model_id) if r.model_id else None

    det_list = []
    for d in r.detections:
        display_name = entry.class_display_names.get(d.class_id, d.class_name) if entry else d.class_name
        conf_level = "HIGH" if d.confidence >= 0.70 else "MODERATE" if d.confidence >= 0.40 else "LOW"
        det_list.append(schemas.AiDetectionSchema(
            id=d.id,
            class_id=d.class_id,
            class_name=d.class_name,
            display_name=display_name,
            confidence=d.confidence,
            confidence_level=conf_level,
            bbox_x1=d.bbox_x1,
            bbox_y1=d.bbox_y1,
            bbox_x2=d.bbox_x2,
            bbox_y2=d.bbox_y2,
            original_image_width=d.original_image_width,
            original_image_height=d.original_image_height,
        ))

    annotated_url = r.artifact.annotated_image_path if r.artifact else None
    snapshot_data = r.benchmark_snapshot.snapshot_data if r.benchmark_snapshot else (entry.benchmark_metrics.dict() if entry else None)

    return schemas.AiVerificationDetailResponse(
        id=r.id,
        report_id=r.report_id,
        user_id=r.user_id,
        image_reference=r.image_reference,
        category=r.category,
        processing_status=r.processing_status,
        assessment=r.assessment,
        model_id=r.model_id,
        model_name=entry.model_name if entry else (r.model_id or "Pending"),
        model_version=r.model_version or (entry.model_version if entry else "1.0.0"),
        started_at=r.started_at,
        completed_at=r.completed_at,
        total_duration_ms=r.total_duration_ms,
        error_code=r.error_code,
        error_message=r.error_message,
        explanation=r.explanation,
        image_quality=r.image_quality,
        metrics_summary=r.metrics_summary,
        detections=det_list,
        benchmark_snapshot=snapshot_data,
        original_image_url=r.image_reference,
        annotated_image_url=annotated_url,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


@app.get("/verifications/{verification_id}/status", response_model=schemas.AiVerificationStatusResponse)
def get_verification_status(verification_id: str, db: Session = Depends(get_db)):
    """Lightweight polling endpoint for live status updates in the Documentation tab."""
    r = db.query(models.AiVerification).filter(models.AiVerification.id == verification_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="AI verification record not found.")

    det_count = len(r.detections) if r.detections else 0
    return schemas.AiVerificationStatusResponse(
        verification_id=r.id,
        report_id=r.report_id,
        processing_status=r.processing_status,
        assessment=r.assessment,
        category=r.category,
        model_id=r.model_id,
        started_at=r.started_at,
        completed_at=r.completed_at,
        total_duration_ms=r.total_duration_ms,
        explanation=r.explanation,
        detection_count=det_count,
    )


# -------------------------------------------------------------
# Model Registry & Benchmarks API (Section 12 & 13)
# -------------------------------------------------------------
@app.get("/models")
def list_models():
    """Retrieve full list of registered AI models, benchmarks, and licenses."""
    return get_full_registry_summary()


@app.get("/models/health")
def model_health():
    """Check readiness of local model checkpoints, device availability, and weights integrity."""
    ai_service = UnifiedAiService()
    weights_dir = ai_service.weights_dir
    results = []

    for entry in MODEL_REGISTRY.values():
        chk_path = os.path.join(weights_dir, entry.checkpoint_filename)
        exists = os.path.exists(chk_path)
        file_size = os.path.getsize(chk_path) if exists else 0

        results.append({
            "model_id": entry.model_id,
            "model_name": entry.model_name,
            "category": entry.category,
            "architecture": entry.architecture,
            "licence": entry.licence,
            "checkpoint_filename": entry.checkpoint_filename,
            "checkpoint_exists": exists,
            "checkpoint_bytes": file_size,
            "integration_status": entry.integration_status,
            "is_primary": entry.is_primary_for_category,
        })

    ai_service = UnifiedAiService()
    return {
        "status": "operational",
        "device": ai_service.device,
        "weights_directory": weights_dir,
        "models": results,
    }


@app.get("/models/{model_id}")
def get_model(model_id: str):
    """Retrieve metadata, benchmark metrics, and limitations for a single AI model."""
    entry = get_model_entry(model_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Model ID not found.")
    return entry.dict()


# -------------------------------------------------------------
# Existing Hazards & Community Endpoints
# -------------------------------------------------------------
@app.get("/hazards", response_model=List[schemas.HazardResponse])
def get_hazards(db: Session = Depends(get_db)):
    if not IS_SQLITE:
        hazards = db.query(
            models.Hazard,
            func.ST_Y(models.Hazard.location).label('lat'),
            func.ST_X(models.Hazard.location).label('lon')
        ).all()
        result = []
        for hazard, lat, lon in hazards:
            result.append(schemas.HazardResponse(
                id=hazard.id,
                hazard_class=hazard.hazard_class,
                lat=lat or 0.0,
                lon=lon or 0.0,
                severity_score=hazard.severity_score,
                confidence=hazard.confidence,
                recurrence_count=hazard.recurrence_count,
                aurs_score=hazard.aurs_score,
                status=hazard.status,
                image_path=hazard.image_path,
                created_at=hazard.created_at,
                updated_at=hazard.updated_at
            ))
        return result
    else:
        hazards = db.query(models.Hazard).all()
        result = []
        for hazard in hazards:
            lat, lon = 0.0, 0.0
            if hazard.location and "POINT(" in hazard.location:
                try:
                    coords = hazard.location.split("POINT(")[1].split(")")[0].split()
                    lon = float(coords[0])
                    lat = float(coords[1])
                except Exception:
                    pass
            result.append(schemas.HazardResponse(
                id=hazard.id,
                hazard_class=hazard.hazard_class,
                lat=lat,
                lon=lon,
                severity_score=hazard.severity_score,
                confidence=hazard.confidence,
                recurrence_count=hazard.recurrence_count,
                aurs_score=hazard.aurs_score,
                status=hazard.status,
                image_path=hazard.image_path,
                created_at=hazard.created_at,
                updated_at=hazard.updated_at
            ))
        return result


@app.get("/hazards/{hazard_id}", response_model=schemas.HazardResponse)
def get_hazard(hazard_id: int, db: Session = Depends(get_db)):
    hazard = db.query(models.Hazard).filter(models.Hazard.id == hazard_id).first()
    if not hazard:
        raise HTTPException(status_code=404, detail="Hazard not found")

    lat, lon = 0.0, 0.0
    if not IS_SQLITE:
        loc_data = db.query(
            func.ST_Y(models.Hazard.location).label('lat'),
            func.ST_X(models.Hazard.location).label('lon')
        ).filter(models.Hazard.id == hazard_id).first()
        if loc_data:
            lat, lon = loc_data.lat or 0.0, loc_data.lon or 0.0
    else:
        if hazard.location and "POINT(" in hazard.location:
            try:
                coords = hazard.location.split("POINT(")[1].split(")")[0].split()
                lon = float(coords[0])
                lat = float(coords[1])
            except Exception:
                pass

    return schemas.HazardResponse(
        id=hazard.id,
        hazard_class=hazard.hazard_class,
        lat=lat,
        lon=lon,
        severity_score=hazard.severity_score,
        confidence=hazard.confidence,
        recurrence_count=hazard.recurrence_count,
        aurs_score=hazard.aurs_score,
        status=hazard.status,
        image_path=hazard.image_path,
        created_at=hazard.created_at,
        updated_at=hazard.updated_at
    )


@app.delete("/hazards/{hazard_id}")
def delete_hazard(hazard_id: int, db: Session = Depends(get_db)):
    db_hazard = db.query(models.Hazard).filter(models.Hazard.id == hazard_id).first()
    if not db_hazard:
        raise HTTPException(status_code=404, detail="Hazard not found")
    
    # Clean up associated verification records and child detections
    verifs = db.query(models.AiVerification).filter(models.AiVerification.report_id == hazard_id).all()
    for v in verifs:
        db.delete(v)

    db.delete(db_hazard)
    db.commit()
    return {"status": "success", "message": f"Hazard {hazard_id} deleted successfully"}


@app.delete("/verifications/{verification_id}")
def delete_verification(verification_id: str, db: Session = Depends(get_db)):
    """Delete an AI verification audit record and its associated hazard if linked."""
    r = db.query(models.AiVerification).filter(models.AiVerification.id == verification_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Verification record not found")

    if r.report_id:
        hazard = db.query(models.Hazard).filter(models.Hazard.id == r.report_id).first()
        if hazard:
            db.delete(hazard)

    db.delete(r)
    db.commit()
    return {"status": "success", "message": f"Verification {verification_id} deleted successfully"}


@app.post("/hazards/{hazard_id}/like")
def like_hazard(hazard_id: int, db: Session = Depends(get_db)):
    db_hazard = db.query(models.Hazard).filter(models.Hazard.id == hazard_id).first()
    if not db_hazard:
        raise HTTPException(status_code=404, detail="Hazard not found")
    db_hazard.recurrence_count = (db_hazard.recurrence_count or 0) + 1
    db.commit()
    db.refresh(db_hazard)
    return {"status": "success", "likes": db_hazard.recurrence_count}
