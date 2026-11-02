"""ARGUS AI Decision Engine & Verification Logic.
Implements category-specific verification rules, false-positive controls,
domain constraints, image quality heuristics, and truthful explanation synthesis.
"""

from typing import Dict, Any, List, Tuple
from PIL import Image
import numpy as np
import cv2

from ai_service.adapters.base import PredictionResult, DetectionObject


def analyze_image_quality(image: Image.Image) -> Dict[str, Any]:
    """Measure image sharpness, resolution, and inspection suitability heuristics."""
    width, height = image.size
    megapixels = round((width * height) / 1_000_000.0, 2)

    # Convert to grayscale numpy array for sharpness analysis
    img_cv = np.array(image.convert("RGB"))
    gray = cv2.cvtColor(img_cv, cv2.COLOR_RGB2GRAY)
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    warnings: List[str] = []
    if laplacian_var < 30.0:
        sharpness_rating = "Blurry / Motion Degraded"
        warnings.append("Low image sharpness detected; fine surface fissures may be obscured.")
    elif laplacian_var < 100.0:
        sharpness_rating = "Moderate Sharpness"
    else:
        sharpness_rating = "High Sharpness"

    if width < 320 or height < 320:
        suitability = "POOR"
        warnings.append("Image resolution is below optimal inspection threshold (320x320).")
    elif width < 640 or height < 640:
        suitability = "ACCEPTABLE"
    else:
        suitability = "OPTIMAL"

    return {
        "width": width,
        "height": height,
        "megapixels": megapixels,
        "sharpness_score": round(laplacian_var, 2),
        "sharpness_rating": sharpness_rating,
        "suitability": suitability,
        "warnings": warnings,
    }


def evaluate_verification(
    category: str,
    prediction: PredictionResult,
    quality: Dict[str, Any],
) -> Tuple[str, str, str]:
    """Evaluate predictions using domain rules.

    Returns:
        (processing_status, assessment, explanation)
        processing_status: QUEUED, PROCESSING, COMPLETED, NEEDS_REVIEW, FAILED
        assessment: EVIDENCE_FOUND, NOT_DETECTED, INCONCLUSIVE
    """
    norm_category = category.lower().strip()
    if norm_category in ("cut_wire", "cut_wires", "wire", "wires"):
        norm_category = "exposed_wire"
    elif norm_category == "debris":
        norm_category = "garbage"

    # 1. SPECIAL CASE: EXPOSED / CUT WIRES
    if norm_category == "exposed_wire":
        return (
            "NEEDS_REVIEW",
            "INCONCLUSIVE",
            "Potential cable damage could not be reliably verified from this street-level photograph. "
            "PowerLine-MTYOLO is calibrated exclusively for overhead UAV inspection and is not validated for "
            "street-level municipal cable angles. Field inspection by electrical utility crew is recommended.",
        )

    detections = prediction.detections
    count = len(detections)

    # 2. POTHOLE VERIFICATION RULES
    if norm_category == "pothole":
        if count == 0:
            return (
                "COMPLETED",
                "NOT_DETECTED",
                "No road cavities or asphalt depressions meeting confidence thresholds were detected in the photograph.",
            )

        high_conf_potholes = [d for d in detections if d.confidence >= 0.50]
        max_c = prediction.max_confidence or 0.0

        if high_conf_potholes:
            plural = "pothole-like road cavities were" if len(high_conf_potholes) > 1 else "pothole-like road cavity was"
            return (
                "COMPLETED",
                "EVIDENCE_FOUND",
                f"{len(high_conf_potholes)} {plural} detected in the uploaded photograph "
                f"with peak detection confidence of {int(max_c * 100)}%.",
            )
        elif count >= 1 and max_c >= 0.30:
            return (
                "NEEDS_REVIEW",
                "INCONCLUSIVE",
                f"A possible roadway defect was detected with marginal confidence ({int(max_c * 100)}%). "
                "Road shadow, manhole seam, or asphalt moisture cannot be ruled out; manual review is advised.",
            )
        else:
            return (
                "COMPLETED",
                "NOT_DETECTED",
                "Only weak low-confidence surface anomalies were observed. No definite pothole confirmed.",
            )

    # 3. GARBAGE / SOLID WASTE VERIFICATION RULES
    if norm_category == "garbage":
        if count == 0:
            return (
                "COMPLETED",
                "NOT_DETECTED",
                "No municipal solid waste objects or discarded debris were detected in the uploaded photograph.",
            )

        unique_classes = set(d.display_name for d in detections)
        high_conf_items = [d for d in detections if d.confidence >= 0.35]

        # Single loose litter item rule: does not prove illegal dump
        if count == 1 and detections[0].confidence < 0.60:
            item_name = detections[0].display_name
            return (
                "NEEDS_REVIEW",
                "INCONCLUSIVE",
                f"A solitary discarded object ({item_name}) was detected. "
                "Individual loose litter does not establish an active municipal waste accumulation or illegal dump site.",
            )
        elif len(high_conf_items) >= 2 or len(unique_classes) >= 2 or count >= 3:
            class_str = ", ".join(list(unique_classes)[:3])
            return (
                "COMPLETED",
                "EVIDENCE_FOUND",
                f"Multiple waste objects ({count} detections including {class_str}) "
                f"were identified across the scene, providing visual evidence of solid waste accumulation.",
            )
        else:
            return (
                "COMPLETED",
                "EVIDENCE_FOUND",
                f"{count} waste object(s) detected with confidence up to {int((prediction.max_confidence or 0) * 100)}%.",
            )

    # 4. CONSTRUCTION SITE CONTEXTUAL RULES
    if norm_category == "construction":
        if count == 0:
            return (
                "COMPLETED",
                "NOT_DETECTED",
                "No construction machinery, safety equipment, or active construction hazard indicators were detected.",
            )

        detected_names = set(d.class_name.lower() for d in detections)
        has_worker = any("worker" in name for name in detected_names)
        has_heavy_machinery = any(name in ("excavator", "crane", "truck", "ladder") for name in detected_names)
        has_safety_gear = any(name in ("hat", "helmet", "vest", "cone", "boots", "goggles", "gloves") for name in detected_names)

        # Contextual constraint: A lone worker alone is NOT construction hazard evidence
        if has_worker and not has_heavy_machinery and not has_safety_gear and count <= 2:
            return (
                "NEEDS_REVIEW",
                "INCONCLUSIVE",
                "A worker was detected without heavy construction machinery or designated site barrier equipment. "
                "Contextual evidence is insufficient to verify an active hazardous construction zone.",
            )

        # Robust multi-evidence combination
        evidence_points = []
        if has_heavy_machinery:
            machinery = [d.display_name for d in detections if d.class_name.lower() in ("excavator", "crane", "truck", "ladder")]
            evidence_points.append(f"heavy machinery ({', '.join(set(machinery))})")
        if has_safety_gear:
            safety = [d.display_name for d in detections if d.class_name.lower() in ("hat", "helmet", "vest", "cone", "boots", "goggles", "gloves")]
            evidence_points.append(f"safety equipment ({', '.join(set(safety))})")
        if has_worker:
            evidence_points.append("workers on site")

        if has_heavy_machinery or (has_worker and has_safety_gear) or len(detections) >= 3:
            return (
                "COMPLETED",
                "EVIDENCE_FOUND",
                f"Visual construction evidence verified: {'; '.join(evidence_points)} detected in the image.",
            )
        else:
            return (
                "NEEDS_REVIEW",
                "INCONCLUSIVE",
                f"Isolated objects ({', '.join(detected_names)}) detected, but lack conclusive construction zone context.",
            )

    # Fallback default
    if count > 0:
        return (
            "COMPLETED",
            "EVIDENCE_FOUND",
            f"{count} object(s) detected matching the reported hazard category.",
        )
    return (
        "COMPLETED",
        "NOT_DETECTED",
        "No objects matching the reported category were identified in the image.",
    )
