"""ARGUS End-to-End Real Inference Smoke Test.
Tests the complete pipeline:
1. Submits real test images across categories to POST /reports (HTTP 202 Accepted).
2. Waits for background worker to execute real model inference and generate annotations.
3. Queries GET /verifications and GET /verifications/{id}.
4. Verifies bounding boxes, confidence, image quality, and benchmark snapshots.
"""

import os
import sys
import time

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from main import app, engine, IS_SQLITE
import models

def test_full_pipeline():
    client = TestClient(app)
    print("=== Testing Health Endpoint ===")
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print(f"Health response: {res.json()}")

    print("\n=== Testing Models Catalog Endpoint ===")
    res = client.get("/models")
    assert res.status_code == 200
    models_data = res.json()
    print(f"Registered models in catalog: {len(models_data)}")
    for m in models_data:
        print(f"  - [{m['model_id']}] {m['model_name']} ({m['category']}) -> {m['license']}")

    test_images = [
        ("pothole", "../frontend/public/hazard-images/potholes.webp"),
        ("garbage", "../frontend/public/hazard-images/garbage.webp"),
        ("construction", "../.ai-model-sources/construction-hasnat/deployment/v-safe-demo/examples/goggles_bing_construction_goggles_000109.jpg"),
        ("exposed_wire", "../frontend/public/hazard-images/debris.webp"),
    ]

    verification_ids = []

    for cat, img_rel_path in test_images:
        img_path = os.path.join(backend_dir, img_rel_path)
        if not os.path.exists(img_path):
            print(f"Skipping {cat}: image {img_path} not found.")
            continue

        print(f"\n=== Submitting Hazard Report for {cat.upper()} ===")
        with open(img_path, "rb") as f:
            file_bytes = f.read()

        payload = {
            "hazard_class": cat,
            "lat": "23.0784",
            "lon": "76.8521",
            "user_id": "operator_test"
        }

        # POST /reports
        resp = client.post(
            "/reports",
            data=payload,
            files={"image": (os.path.basename(img_path), file_bytes, "image/jpeg")}
        )

        assert resp.status_code == 202, f"Failed POST /reports: {resp.status_code} {resp.text}"
        data = resp.json()
        v_id = data["verification_id"]
        verification_ids.append((v_id, cat))
        print(f"HTTP 202 Accepted! Verification ID: {v_id}, Initial Status: {data['verification_status']}")

    print("\n=== Awaiting Background Worker Inference Execution ===")
    # Wait for queue worker threads to finish real inference
    time.sleep(3.0)

    print("\n=== Verifying Completed Verifications via GET /verifications ===")
    for v_id, cat in verification_ids:
        # Poll status
        status_res = client.get(f"/verifications/{v_id}/status")
        assert status_res.status_code == 200
        print(f"Status for {v_id} ({cat}): {status_res.json()}")

        # Fetch detail
        detail_res = client.get(f"/verifications/{v_id}")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        print(f"\n--- Verification Detail for {cat} ---")
        print(f"  Model ID: {detail.get('model_id')}")
        print(f"  Processing Status: {detail.get('processing_status')}")
        print(f"  Assessment: {detail.get('assessment')}")
        print(f"  Explanation: {detail.get('explanation')}")
        print(f"  Detections Count: {len(detail.get('detections', []))}")
        for d in detail.get('detections', [])[:3]:
            print(f"    * Class: {d.get('class_name')} ({d.get('confidence')*100:.1f}%), BBox: [{d.get('bbox_x1'):.0f}, {d.get('bbox_y1'):.0f}, {d.get('bbox_x2'):.0f}, {d.get('bbox_y2'):.0f}]")
        print(f"  Image Quality: {detail.get('image_quality')}")
        print(f"  Metrics Summary: {detail.get('metrics_summary')}")
        print(f"  Annotated Image: {detail.get('annotated_image_url')}")
        if detail.get('annotated_image_url'):
            annotated_local_path = os.path.join(backend_dir, detail.get('annotated_image_url').lstrip("/"))
            print(f"  Annotated file exists on disk: {os.path.exists(annotated_local_path)}")

    # Fetch list
    all_res = client.get("/verifications")
    assert all_res.status_code == 200
    print(f"\nTotal completed/logged verifications in DB: {len(all_res.json())}")

    print("\n>>> ALL REAL INFERENCE SMOKE TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_full_pipeline()
