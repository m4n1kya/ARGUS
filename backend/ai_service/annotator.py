"""ARGUS AI Image Annotator.
Draws visual bounding boxes, category tags, and confidence scores onto images,
preserving the original photograph untouched.
"""

import os
from typing import List, Tuple
from PIL import Image, ImageDraw, ImageFont

from ai_service.adapters.base import DetectionObject

# Professional palette consistent with ARGUS UI
PALETTE = [
    (59, 130, 246),   # Blue (#3b82f6)
    (239, 68, 68),    # Red (#ef4444)
    (16, 185, 129),   # Emerald (#10b981)
    (245, 158, 11),   # Amber (#f59e0b)
    (139, 92, 246),   # Purple (#8b5cf6)
    (236, 72, 153),   # Pink (#ec4899)
    (6, 182, 212),    # Cyan (#06b6d4)
    (249, 115, 22),   # Orange (#f97316)
]


def draw_bounding_boxes(
    image: Image.Image,
    detections: List[DetectionObject],
    output_path: str,
) -> str:
    """Draw bounding boxes and class tags onto a copy of the image and save to disk."""
    annotated = image.copy().convert("RGB")
    draw = ImageDraw.Draw(annotated)

    # Attempt to load a default clean font
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None

    for idx, d in enumerate(detections):
        color = PALETTE[d.class_id % len(PALETTE)]
        box = d.bbox
        x1, y1, x2, y2 = box.x1, box.y1, box.x2, box.y2

        # Draw 3px outline
        for offset in range(3):
            draw.rectangle(
                [x1 - offset, y1 - offset, x2 + offset, y2 + offset],
                outline=color,
            )

        # Draw label chip
        label_text = f"{d.display_name} {int(d.confidence * 100)}%"
        if font:
            try:
                bbox_text = draw.textbbox((x1, y1), label_text, font=font)
                text_w = bbox_text[2] - bbox_text[0]
                text_h = bbox_text[3] - bbox_text[1]
            except Exception:
                text_w, text_h = len(label_text) * 7, 12
        else:
            text_w, text_h = len(label_text) * 7, 12

        chip_y1 = max(0.0, y1 - text_h - 6)
        chip_y2 = chip_y1 + text_h + 6
        chip_x2 = x1 + text_w + 10

        draw.rectangle([x1, chip_y1, chip_x2, chip_y2], fill=color)
        draw.text((x1 + 5, chip_y1 + 3), label_text, fill=(255, 255, 255), font=font)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    annotated.save(output_path, quality=92)
    return output_path
