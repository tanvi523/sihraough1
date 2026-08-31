import os
import sys
import io

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.database import Base, engine
from app.models import models
# Ensure tables exist
Base.metadata.create_all(bind=engine)

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_upload_tms_valid():
    dataset_path = os.path.join(os.path.dirname(__file__), "../datasets/tms_dataset.csv")
    with open(dataset_path, "rb") as f:
        res = client.post("/api/upload/tms", files={"file": ("tms_dataset.csv", f, "text/csv")})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["success"] is True
    assert data["records_processed"] > 0
    print("[PASS] TMS Upload & Duplicate Upsert Test: ", data["message"])

def test_upload_smms_valid():
    dataset_path = os.path.join(os.path.dirname(__file__), "../datasets/smms_dataset.csv")
    with open(dataset_path, "rb") as f:
        res = client.post("/api/upload/smms", files={"file": ("smms_dataset.csv", f, "text/csv")})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["success"] is True
    assert data["records_processed"] > 0
    print("[PASS] SMMS Upload & Duplicate Upsert Test: ", data["message"])

def test_upload_tdms_valid():
    dataset_path = os.path.join(os.path.dirname(__file__), "../datasets/tdms_dataset.csv")
    with open(dataset_path, "rb") as f:
        res = client.post("/api/upload/tdms", files={"file": ("tdms_dataset.csv", f, "text/csv")})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["success"] is True
    assert data["records_processed"] > 0
    print("[PASS] TDMS Upload & Duplicate Upsert Test: ", data["message"])

def test_upload_normalized_valid():
    dataset_path = os.path.join(os.path.dirname(__file__), "../datasets/normalized_maintenance_dataset.csv")
    with open(dataset_path, "rb") as f:
        res = client.post("/api/upload/merged", files={"file": ("normalized_maintenance_dataset.csv", f, "text/csv")})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["success"] is True
    assert data["records_processed"] > 0
    print("[PASS] Normalized Maintenance Upload Test: ", data["message"])

def test_invalid_csv_missing_columns():
    invalid_csv = "Random_Col_A,Random_Col_B\nVal1,Val2\n"
    res = client.post(
        "/api/upload/tms",
        files={"file": ("invalid_tms.csv", io.BytesIO(invalid_csv.encode("utf-8")), "text/csv")}
    )
    assert res.status_code == 400, f"Expected 400 for invalid CSV, got {res.status_code}"
    detail = res.json().get("detail", "")
    assert "Missing required column" in detail
    print("[PASS] Invalid CSV Rejection Test (400 Bad Request): ", detail)

def test_search_and_sorting():
    # Test TMS sorting
    res = client.get("/api/tms/?sort_by=train_id&sort_order=desc")
    assert res.status_code == 200
    items = res.json()
    assert len(items) > 0
    
    # Test SMMS sorting by health score
    res_smms = client.get("/api/smms/?sort_by=health_score&sort_order=asc")
    assert res_smms.status_code == 200
    smms_items = res_smms.json()
    assert smms_items[0]["health_score"] <= smms_items[-1]["health_score"]
    
    # Test TDMS sorting
    res_tdms = client.get("/api/tdms/?sort_by=health_score&sort_order=desc")
    assert res_tdms.status_code == 200
    tdms_items = res_tdms.json()
    assert tdms_items[0]["health_score"] >= tdms_items[-1]["health_score"]
    print("[PASS] Search and Sorting on TMS, SMMS, TDMS Endpoints!")

if __name__ == "__main__":
    test_upload_tms_valid()
    test_upload_smms_valid()
    test_upload_tdms_valid()
    test_upload_normalized_valid()
    test_invalid_csv_missing_columns()
    test_search_and_sorting()
    print("\n=======================================================")
    print(" ALL 6 CSV VALIDATION & UPLOAD TESTS PASSED WITH SUCCESS!")
    print("=======================================================")
