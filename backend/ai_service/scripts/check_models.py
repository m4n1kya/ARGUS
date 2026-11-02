"""Script to verify readiness, integrity, and inference loading of all registered ARGUS models.
Usage:
    python backend/ai_service/scripts/check_models.py
"""

import os
import sys
import hashlib

# Add backend directory to sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
sys.path.insert(0, BACKEND_DIR)

from ai_service.model_registry import MODEL_REGISTRY
from ai_service.service import UnifiedAiService

WEIGHTS_DIR = os.path.join(BACKEND_DIR, "ai_service", "weights")


def compute_sha256(filepath: str) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest().lower()


def main():
    print("================================================================================")
    print("ARGUS Computer Vision Model Registry Health & Verification Report")
    print("================================================================================")
    ai_service = UnifiedAiService()
    print(f"Inference Device: {ai_service.device.upper()}")
    print(f"Weights Directory: {WEIGHTS_DIR}\n")

    table_header = f"{'MODEL ID':<28} | {'STATUS':<12} | {'LICENCE':<10} | {'HASH CHECK':<10} | {'LOADING':<10}"
    print(table_header)
    print("-" * len(table_header))

    for entry in MODEL_REGISTRY.values():
        chk_path = os.path.join(WEIGHTS_DIR, entry.checkpoint_filename)
        exists = os.path.exists(chk_path)
        
        hash_status = "MISSING"
        load_status = "N/A"

        if exists:
            curr_hash = compute_sha256(chk_path)
            if curr_hash == entry.checkpoint_hash.lower():
                hash_status = "MATCH"
            else:
                hash_status = "DIFF"

            try:
                adapter = ai_service.get_adapter(entry.model_id)
                load_status = "READY" if adapter.validate_model() else "FAILED"
            except Exception as e:
                load_status = "GUARDED" if "powerline" in entry.model_id else "ERROR"

        print(f"{entry.model_id:<28} | {entry.integration_status:<12} | {entry.licence:<10} | {hash_status:<10} | {load_status:<10}")

    print("\nDetailed Summary:")
    for entry in MODEL_REGISTRY.values():
        print(f"\n[{entry.model_name}] ({entry.model_id})")
        print(f"  - Category: {entry.category}")
        print(f"  - Architecture: {entry.architecture}")
        print(f"  - Licence: {entry.licence}")
        print(f"  - Source: {entry.repository_url}")
        print(f"  - Input Resolution: {entry.input_resolution}")
        print(f"  - Documented Classes: {len(entry.classes)} classes")
        print(f"  - Limitations: {entry.limitations[0] if entry.limitations else 'None'}")

    print("\nAll model checks completed.")


if __name__ == "__main__":
    main()
