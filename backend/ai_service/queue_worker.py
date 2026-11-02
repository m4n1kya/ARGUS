"""ARGUS Background AI Verification Job Queue & Worker.
Executes asynchronous verification jobs with idempotency, exponential backoff,
retry handling, and persistent database state synchronization.
"""

import os
import time
import uuid
import logging
import threading
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from concurrent.futures import ThreadPoolExecutor

from sqlalchemy.orm import Session

import models
from database import SessionLocal
from ai_service.service import UnifiedAiService
from ai_service.model_registry import get_primary_model_for_category
from ai_service.memory_guard import release_system_memory

logger = logging.getLogger("argus.queue_worker")


class VerificationWorker:
    """Background worker processing AI verification tasks."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(VerificationWorker, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self, max_workers: int = 1):
        if getattr(self, "_initialized", False):
            return

        self.executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="ai_worker")
        self.ai_service = UnifiedAiService()
        self.active_jobs = set()
        self.jobs_lock = threading.Lock()
        self._initialized = True
        logger.info("VerificationWorker initialized with %d worker thread(s).", max_workers)

    def enqueue_verification(
        self,
        verification_id: str,
        image_disk_path: str,
        category: str,
        annotated_disk_path: str,
        model_id: Optional[str] = None,
    ):
        """Submit a verification job to the asynchronous worker pool."""
        with self.jobs_lock:
            if verification_id in self.active_jobs:
                logger.warning("Job %s is already active; ignoring duplicate enqueue.", verification_id)
                return
            self.active_jobs.add(verification_id)

        self.executor.submit(
            self._process_job_safe,
            verification_id,
            image_disk_path,
            category,
            annotated_disk_path,
            model_id,
        )

    def _process_job_safe(
        self,
        verification_id: str,
        image_disk_path: str,
        category: str,
        annotated_disk_path: str,
        model_id: Optional[str] = None,
    ):
        max_retries = 2
        backoff_sec = 1.0

        try:
            for attempt in range(max_retries + 1):
                try:
                    self._execute_verification(
                        verification_id,
                        image_disk_path,
                        category,
                        annotated_disk_path,
                        model_id,
                    )
                    break
                except Exception as exc:
                    logger.exception("Error on attempt %d for verification %s: %s", attempt + 1, verification_id, exc)
                    if attempt < max_retries:
                        time.sleep(backoff_sec)
                        backoff_sec *= 2.0
                    else:
                        self._mark_failed(verification_id, exc)
        finally:
            with self.jobs_lock:
                self.active_jobs.discard(verification_id)
            release_system_memory("post_worker_job")

    def _execute_verification(
        self,
        verification_id: str,
        image_disk_path: str,
        category: str,
        annotated_disk_path: str,
        model_id: Optional[str] = None,
    ):
        db: Session = SessionLocal()
        try:
            # 1. Update status to PROCESSING
            record = db.query(models.AiVerification).filter(models.AiVerification.id == verification_id).first()
            if not record:
                logger.error("Verification record %s not found in database.", verification_id)
                return

            record.processing_status = "PROCESSING"
            record.started_at = datetime.now(timezone.utc)
            db.commit()

            # 2. Run inference via UnifiedAiService
            result = self.ai_service.verify_image(
                image_path=image_disk_path,
                category=category,
                model_id=model_id,
                annotated_output_path=annotated_disk_path,
            )

            # 3. Save Structured Detections to DB
            record.processing_status = result["processing_status"]
            record.assessment = result["assessment"]
            record.model_id = result["model_id"]
            record.model_version = result["model_version"]
            record.explanation = result["explanation"]
            record.image_quality = result["image_quality"]
            record.metrics_summary = {
                "detection_count": len(result["detections"]),
                "max_confidence": result["prediction"]["max_confidence"],
                "avg_confidence": result["prediction"]["avg_confidence"],
                "class_distribution": result["prediction"]["class_distribution"],
                "preprocess_ms": result["prediction"]["preprocess_ms"],
                "inference_ms": result["prediction"]["inference_ms"],
                "postprocess_ms": result["prediction"]["postprocess_ms"],
                "total_ms": result["prediction"]["total_ms"],
                "device": result["device"],
            }
            record.total_duration_ms = result["total_duration_ms"]
            record.completed_at = datetime.now(timezone.utc)

            # Add Detections
            orig_w = result["prediction"]["original_width"]
            orig_h = result["prediction"]["original_height"]
            for d in result["detections"]:
                det_db = models.AiDetection(
                    verification_id=verification_id,
                    class_id=d["class_id"],
                    class_name=d["class_name"],
                    confidence=d["confidence"],
                    bbox_x1=d["bbox"]["x1"],
                    bbox_y1=d["bbox"]["y1"],
                    bbox_x2=d["bbox"]["x2"],
                    bbox_y2=d["bbox"]["y2"],
                    original_image_width=orig_w,
                    original_image_height=orig_h,
                )
                db.add(det_db)

            # Add Benchmark Snapshot
            snapshot_db = models.AiVerificationBenchmarkSnapshot(
                verification_id=verification_id,
                model_id=result["model_id"],
                snapshot_data=result["benchmark_snapshot"],
            )
            db.add(snapshot_db)

            # Add Artifacts
            # Save relative web URLs
            norm_orig_url = "/uploads/" + os.path.basename(image_disk_path)
            norm_annot_url = "/uploads/annotated/" + os.path.basename(annotated_disk_path) if result["annotated_image_path"] else None

            artifact_db = models.AiVerificationArtifact(
                verification_id=verification_id,
                original_image_path=norm_orig_url,
                annotated_image_path=norm_annot_url,
                inference_output_json=result["prediction"],
            )
            db.add(artifact_db)

            # Sync hazard severity and confidence if linked
            if record.report_id:
                hazard = db.query(models.Hazard).filter(models.Hazard.id == record.report_id).first()
                if hazard:
                    if result["assessment"] == "EVIDENCE_FOUND":
                        hazard.status = "verified"
                        hazard.confidence = result["prediction"]["max_confidence"]
                        hazard.severity_score = min(1.0, 0.4 + (len(result["detections"]) * 0.15))
                    elif result["assessment"] == "NOT_DETECTED":
                        hazard.confidence = 0.0

            db.commit()
            logger.info("Successfully completed verification %s -> %s / %s", verification_id, record.processing_status, record.assessment)
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
            release_system_memory("post_exec_verification")

    def _mark_failed(self, verification_id: str, exc: Exception):
        db: Session = SessionLocal()
        try:
            record = db.query(models.AiVerification).filter(models.AiVerification.id == verification_id).first()
            if record:
                record.processing_status = "FAILED"
                record.assessment = "INCONCLUSIVE"
                record.error_code = type(exc).__name__
                record.error_message = str(exc)[:500]
                record.completed_at = datetime.now(timezone.utc)
                db.commit()
        except Exception as e:
            logger.error("Failed to mark verification %s as failed: %s", verification_id, e)
        finally:
            db.close()
            release_system_memory("post_exec_verification")


def get_verification_worker() -> VerificationWorker:
    """Return singleton verification worker instance."""
    return VerificationWorker()
