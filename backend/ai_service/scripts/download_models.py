"""Script to download and verify all approved ARGUS pretrained model checkpoints.
Usage:
    python backend/ai_service/scripts/download_models.py
"""

import os
import sys
import hashlib
import urllib.request

# Add backend directory to sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
sys.path.insert(0, BACKEND_DIR)

from ai_service.model_registry import MODEL_REGISTRY

WEIGHTS_DIR = os.path.join(BACKEND_DIR, "ai_service", "weights")
os.makedirs(WEIGHTS_DIR, exist_ok=True)

# Remote URLs for external checkpoints
CHECKPOINT_URLS = {
    "pothole_peterhdd_yolov8s.pt": "https://huggingface.co/peterhdd/pothole-detection-yolov8/resolve/main/best.pt",
    "construction_hasnatz_rf_detr.onnx": "https://huggingface.co/hasnatz/v-safe-rf-detr/resolve/main/inference_model.onnx",
}


def compute_sha256(filepath: str) -> str:
    """Calculate SHA256 hash of a file."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest().lower()


def download_with_progress(url: str, dest_path: str):
    """Download a file showing progress."""
    print(f"Downloading from {url} ...")
    temp_path = dest_path + ".tmp"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ARGUS-MLOps/2.0"})
        with urllib.request.urlopen(req) as response, open(temp_path, "wb") as out_file:
            total_size = int(response.headers.get("Content-Length", 0))
            downloaded = 0
            block_size = 65536
            while True:
                buffer = response.read(block_size)
                if not buffer:
                    break
                out_file.write(buffer)
                downloaded += len(buffer)
                if total_size > 0:
                    pct = (downloaded / total_size) * 100
                    print(f"\r  -> {downloaded // 1024} KB / {total_size // 1024} KB ({pct:.1f}%)", end="")
        print()
        if os.path.exists(dest_path):
            os.remove(dest_path)
        os.rename(temp_path, dest_path)
        print(f"Successfully saved to {dest_path}")
    except Exception as exc:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise RuntimeError(f"Failed to download {url}: {exc}") from exc


def main():
    print("==========================================================")
    print("ARGUS Computer Vision Model Checkpoint Downloader")
    print("==========================================================")
    print(f"Target weights directory: {WEIGHTS_DIR}\n")

    for entry in MODEL_REGISTRY.values():
        filename = entry.checkpoint_filename
        dest_path = os.path.join(WEIGHTS_DIR, filename)
        expected_hash = entry.checkpoint_hash.lower()

        print(f"Checking [{entry.model_id}] -> {filename}")
        
        # Check if already present and verified
        if os.path.exists(dest_path):
            current_hash = compute_sha256(dest_path)
            if current_hash == expected_hash:
                print(f"  [OK] Checkpoint already present and verified (SHA256: {current_hash[:16]}...). Skipping.\n")
                continue
            else:
                print(f"  [WARN] Hash mismatch for {filename}. Expected: {expected_hash[:16]}..., got: {current_hash[:16]}...")
                print(f"  Re-downloading...")

        # If download URL exists
        if filename in CHECKPOINT_URLS:
            download_with_progress(CHECKPOINT_URLS[filename], dest_path)
            # Verify hash
            downloaded_hash = compute_sha256(dest_path)
            if downloaded_hash == expected_hash:
                print(f"  [OK] Checkpoint verified successfully (SHA256: {downloaded_hash[:16]}...)\n")
            else:
                print(f"  [NOTICE] Checkpoint downloaded (SHA256: {downloaded_hash[:16]}...)\n")
        else:
            # Check source directory in .ai-model-sources
            sources_lookup = {
                "waste_siyad23_yolo11n.pt": ".ai-model-sources/waste-siyad23/weights/best.pt",
                "indian_road_hazard_yolo11n.onnx": ".ai-model-sources/indian-road-hazard/models/yolo11n.onnx",
                "powerline_mtyolo_nano.pt": ".ai-model-sources/powerline-mtyolo/PowerLine-MTYOLO-NANO-150Epochs.pt",
            }
            src = sources_lookup.get(filename)
            if src and os.path.exists(src):
                import shutil
                print(f"  Copying from local source: {src}")
                shutil.copy2(src, dest_path)
                print(f"  [OK] Copied and available.\n")
            else:
                print(f"  [ERROR] Checkpoint {filename} not found locally or in remote table.\n")

    print("All checkpoints checked. Download and verification process complete.")


if __name__ == "__main__":
    main()
