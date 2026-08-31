from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy.orm import Session
from typing import Optional
from app.db.database import get_db
from app.models.models import TrainSchedule, SignalMaintenance, TractionMaintenance, OptimizedBlock
from app.schemas.schemas import UploadResponse
from app.services.csv_parser import (
    parse_and_import_tms_csv,
    parse_and_import_smms_csv,
    parse_and_import_tdms_csv,
    parse_and_import_merged_csv,
    parse_and_import_batch_csvs,
    auto_detect_and_import_csv,
    auto_seed_datasets_if_empty
)
from app.services.prioritizer import get_all_ranked_tasks
import io
import os

router = APIRouter(prefix="/upload", tags=["Dataset & Ingestion"])

def get_scoring_summary(db: Session):
    ranked_tasks = get_all_ranked_tasks(db)
    if not ranked_tasks:
        return None
    crit_count = sum(1 for t in ranked_tasks if t["risk_level"] == "Critical")
    high_count = sum(1 for t in ranked_tasks if t["risk_level"] == "High")
    med_count = sum(1 for t in ranked_tasks if t["risk_level"] == "Medium")
    low_count = sum(1 for t in ranked_tasks if t["risk_level"] == "Low")
    avg_priority = round(sum(t["final_priority_score"] for t in ranked_tasks) / len(ranked_tasks), 2)
    avg_risk = round(sum(t["ai_risk_score"] for t in ranked_tasks) / len(ranked_tasks), 2)
    avg_deadline = round(sum(t["deadline_score"] for t in ranked_tasks) / len(ranked_tasks), 2)
    avg_crit = round(sum(t["criticality_score"] for t in ranked_tasks) / len(ranked_tasks), 2)
    return {
        "total_ranked_tasks": len(ranked_tasks),
        "avg_priority_score": avg_priority,
        "avg_risk_score": avg_risk,
        "avg_deadline_score": avg_deadline,
        "avg_criticality_score": avg_crit,
        "critical_count": crit_count,
        "high_count": high_count,
        "medium_count": med_count,
        "low_count": low_count
    }

@router.get("/status")
def get_dataset_status(db: Session = Depends(get_db)):
    tms_count = db.query(TrainSchedule).count()
    smms_count = db.query(SignalMaintenance).count()
    tdms_count = db.query(TractionMaintenance).count()
    blocks_count = db.query(OptimizedBlock).count()
    summary = get_scoring_summary(db)
    
    return {
        "status": "ready" if (tms_count + smms_count + tdms_count) > 0 else "empty",
        "tms_records": tms_count,
        "smms_records": smms_count,
        "tdms_records": tdms_count,
        "blocks_scheduled": blocks_count,
        "score_summary": summary
    }

@router.post("/batch", response_model=UploadResponse)
async def upload_batch_datasets(
    tms_file: Optional[UploadFile] = File(None),
    smms_file: Optional[UploadFile] = File(None),
    tdms_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    if not tms_file and not smms_file and not tdms_file:
        raise HTTPException(status_code=400, detail="Please upload at least one CSV dataset file (TMS, SMMS, or TDMS).")

    tms_buf = io.BytesIO(await tms_file.read()) if tms_file else None
    smms_buf = io.BytesIO(await smms_file.read()) if smms_file else None
    tdms_buf = io.BytesIO(await tdms_file.read()) if tdms_file else None

    try:
        res = parse_and_import_batch_csvs(
            db=db,
            tms_file=tms_buf,
            smms_file=smms_buf,
            tdms_file=tdms_buf
        )
        return UploadResponse(
            success=True,
            system="BATCH_MULTI_CSV",
            records_processed=res["records_processed"],
            records_inserted=res["records_inserted"],
            records_updated=res["records_updated"],
            duplicates_handled=res["duplicates_handled"],
            warnings=res.get("warnings", []),
            message=res["message"],
            score_summary=res.get("score_summary"),
            details=res.get("details")
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process batch CSV upload: {str(e)}")

@router.post("/auto", response_model=UploadResponse)
async def upload_auto_detect_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are allowed for upload")
        
    contents = await file.read()
    buffer = io.BytesIO(contents)
    try:
        result = auto_detect_and_import_csv(buffer, db, filename=file.filename)
        summary = get_scoring_summary(db)
        return UploadResponse(
            success=True,
            system=result.get("system", "AUTO"),
            records_processed=result["records_processed"],
            records_inserted=result["records_inserted"],
            records_updated=result.get("records_updated", 0),
            duplicates_handled=result.get("duplicates_handled", 0),
            message=result.get("message", "Dataset imported successfully."),
            score_summary=summary
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {str(e)}")

@router.post("/tms", response_model=UploadResponse)
async def upload_tms_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    contents = await file.read()
    buffer = io.BytesIO(contents)
    try:
        result = parse_and_import_tms_csv(buffer, db)
        summary = get_scoring_summary(db)
        return UploadResponse(
            success=True,
            system="TMS",
            records_processed=result["records_processed"],
            records_inserted=result["records_inserted"],
            records_updated=result.get("records_updated", 0),
            duplicates_handled=result.get("duplicates_handled", 0),
            message=result["message"],
            score_summary=summary
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse TMS dataset: {str(e)}")

@router.post("/smms", response_model=UploadResponse)
async def upload_smms_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    contents = await file.read()
    buffer = io.BytesIO(contents)
    try:
        result = parse_and_import_smms_csv(buffer, db)
        summary = get_scoring_summary(db)
        return UploadResponse(
            success=True,
            system="SMMS",
            records_processed=result["records_processed"],
            records_inserted=result["records_inserted"],
            records_updated=result.get("records_updated", 0),
            duplicates_handled=result.get("duplicates_handled", 0),
            message=result["message"],
            score_summary=summary
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse SMMS dataset: {str(e)}")

@router.post("/tdms", response_model=UploadResponse)
async def upload_tdms_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    contents = await file.read()
    buffer = io.BytesIO(contents)
    try:
        result = parse_and_import_tdms_csv(buffer, db)
        summary = get_scoring_summary(db)
        return UploadResponse(
            success=True,
            system="TDMS",
            records_processed=result["records_processed"],
            records_inserted=result["records_inserted"],
            records_updated=result.get("records_updated", 0),
            duplicates_handled=result.get("duplicates_handled", 0),
            message=result["message"],
            score_summary=summary
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse TDMS dataset: {str(e)}")

@router.post("/merged", response_model=UploadResponse)
async def upload_merged_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
        
    contents = await file.read()
    buffer = io.BytesIO(contents)
    try:
        result = parse_and_import_merged_csv(buffer, db)
        summary = get_scoring_summary(db)
        return UploadResponse(
            success=True,
            system="NORMALIZED_MERGED",
            records_processed=result["records_processed"],
            records_inserted=result["records_inserted"],
            records_updated=result.get("records_updated", 0),
            duplicates_handled=result.get("duplicates_handled", 0),
            message=result["message"],
            score_summary=summary
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse normalized dataset: {str(e)}")

@router.get("/template/{system}")
def download_csv_template(system: str):
    sys_clean = system.strip().lower()
    datasets_dir = os.path.join(os.path.dirname(__file__), "../../datasets")
    
    file_map = {
        "tms": "tms_dataset.csv",
        "smms": "smms_dataset.csv",
        "tdms": "tdms_dataset.csv",
        "merged": "normalized_maintenance_dataset.csv",
        "normalized": "normalized_maintenance_dataset.csv"
    }
    
    if sys_clean not in file_map:
        raise HTTPException(status_code=404, detail="Template not found. Supported: tms, smms, tdms, merged")
        
    filename = file_map[sys_clean]
    filepath = os.path.join(datasets_dir, filename)
    
    if os.path.exists(filepath):
        return FileResponse(filepath, media_type="text/csv", filename=filename)
    else:
        raise HTTPException(status_code=404, detail=f"File {filename} not found.")

@router.post("/seed")
def trigger_auto_seed(db: Session = Depends(get_db)):
    result = auto_seed_datasets_if_empty(db)
    return result

@router.delete("/clear/all")
@router.post("/clear/all")
def clear_all_records(db: Session = Depends(get_db)):
    blocks_deleted = db.query(OptimizedBlock).delete()
    tms_deleted = db.query(TrainSchedule).delete()
    smms_deleted = db.query(SignalMaintenance).delete()
    tdms_deleted = db.query(TractionMaintenance).delete()
    db.commit()
    return {
        "status": "cleared",
        "tms_deleted": tms_deleted,
        "smms_deleted": smms_deleted,
        "tdms_deleted": tdms_deleted,
        "blocks_deleted": blocks_deleted
    }

@router.delete("/clear/tms")
@router.post("/clear/tms")
def clear_tms_records(db: Session = Depends(get_db)):
    tms_deleted = db.query(TrainSchedule).delete()
    db.commit()
    return {"status": "cleared", "system": "TMS", "deleted_count": tms_deleted}

@router.delete("/clear/smms")
@router.post("/clear/smms")
def clear_smms_records(db: Session = Depends(get_db)):
    smms_deleted = db.query(SignalMaintenance).delete()
    db.commit()
    return {"status": "cleared", "system": "SMMS", "deleted_count": smms_deleted}

@router.delete("/clear/tdms")
@router.post("/clear/tdms")
def clear_tdms_records(db: Session = Depends(get_db)):
    tdms_deleted = db.query(TractionMaintenance).delete()
    db.commit()
    return {"status": "cleared", "system": "TDMS", "deleted_count": tdms_deleted}

@router.post("/reset")
def reset_database_records(db: Session = Depends(get_db)):
    db.query(OptimizedBlock).delete()
    db.query(TrainSchedule).delete()
    db.query(SignalMaintenance).delete()
    db.query(TractionMaintenance).delete()
    db.commit()
    
    # Re-seed from local real datasets
    auto_seed_datasets_if_empty(db)
    
    return {"status": "reset_and_reseeded"}
