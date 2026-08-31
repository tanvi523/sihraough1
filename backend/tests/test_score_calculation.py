import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.database import Base, engine, SessionLocal
from app.models import models
from app.services.csv_parser import (
    parse_and_import_tms_csv,
    parse_and_import_smms_csv,
    parse_and_import_tdms_csv,
    parse_and_import_batch_csvs
)
from app.services.prioritizer import get_all_ranked_tasks

def test_direct_parsers_and_scoring():
    # Ensure tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    datasets_dir = os.path.join(os.path.dirname(__file__), "../datasets")
    tms_path = os.path.join(datasets_dir, "tms_dataset.csv")
    smms_path = os.path.join(datasets_dir, "smms_dataset.csv")
    tdms_path = os.path.join(datasets_dir, "tdms_dataset.csv")

    print("[1] Testing TMS CSV parse & import...")
    with open(tms_path, "rb") as f:
        res_tms = parse_and_import_tms_csv(f, db)
    assert res_tms["status"] == "success"
    assert res_tms["records_processed"] > 0
    print(f" -> TMS Records: {res_tms['records_processed']}")

    print("[2] Testing SMMS CSV parse & import...")
    with open(smms_path, "rb") as f:
        res_smms = parse_and_import_smms_csv(f, db)
    assert res_smms["status"] == "success"
    assert res_smms["records_processed"] > 0
    print(f" -> SMMS Records: {res_smms['records_processed']}")

    print("[3] Testing TDMS CSV parse & import...")
    with open(tdms_path, "rb") as f:
        res_tdms = parse_and_import_tdms_csv(f, db)
    assert res_tdms["status"] == "success"
    assert res_tdms["records_processed"] > 0
    print(f" -> TDMS Records: {res_tdms['records_processed']}")

    print("[4] Testing Priority Score Calculations...")
    ranked = get_all_ranked_tasks(db, risk_weight=0.5, deadline_weight=0.3, criticality_weight=0.2)
    assert len(ranked) > 0, "Expected ranked tasks from SMMS/TDMS"
    print(f" -> Total Scored & Ranked Tasks: {len(ranked)}")

    top = ranked[0]
    print(f" -> Top Task: {top['task_id']} ({top['source']}) | Final Priority Score: {top['final_priority_score']} | Risk: {top['ai_risk_score']} | Deadline: {top['deadline_score']} | Crit: {top['criticality_score']} | Tier: {top['risk_level']}")

    # Verify descending sort order
    for i in range(len(ranked) - 1):
        assert ranked[i]["final_priority_score"] >= ranked[i+1]["final_priority_score"], "Tasks must be sorted descending by final priority score"

    print("[5] Testing Batch Multi-CSV Ingestion...")
    with open(tms_path, "rb") as f_tms, open(smms_path, "rb") as f_smms, open(tdms_path, "rb") as f_tdms:
        batch_res = parse_and_import_batch_csvs(db, tms_file=f_tms, smms_file=f_smms, tdms_file=f_tdms)
    assert batch_res["success"] is True
    assert "score_summary" in batch_res
    print(f" -> Batch Ingested: {batch_res['records_processed']} rows. Avg Score: {batch_res['score_summary']['avg_priority_score']}")

    db.close()
    print("\n=======================================================")
    print(" ALL TMS, SMMS & TDMS CSV INGESTION & SCORING TESTS PASSED!")
    print("=======================================================")

if __name__ == "__main__":
    test_direct_parsers_and_scoring()
