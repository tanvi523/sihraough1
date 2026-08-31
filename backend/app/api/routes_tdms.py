from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.models.models import TractionMaintenance
from app.schemas.schemas import TractionMaintenanceOut, TractionMaintenanceCreate, UploadResponse
from app.services.csv_parser import parse_and_import_tdms_csv
import io

router = APIRouter(prefix="/tdms", tags=["Traction Maintenance (TDMS)"])

@router.get("/", response_model=List[TractionMaintenanceOut])
def get_traction_tasks(
    section: Optional[str] = None,
    power_shutdown: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "health_score",
    sort_order: Optional[str] = "asc",
    db: Session = Depends(get_db)
):
    query = db.query(TractionMaintenance)
    if section:
        query = query.filter(TractionMaintenance.track_section.ilike(f"%{section}%"))
    if power_shutdown:
        query = query.filter(TractionMaintenance.power_shutdown_required.ilike(power_shutdown))
    if severity:
        query = query.filter(TractionMaintenance.severity.ilike(severity))
    if status:
        query = query.filter(TractionMaintenance.maintenance_status.ilike(status))
    if search:
        query = query.filter(
            (TractionMaintenance.asset_id.ilike(f"%{search}%")) |
            (TractionMaintenance.task_id.ilike(f"%{search}%")) |
            (TractionMaintenance.issue_type.ilike(f"%{search}%")) |
            (TractionMaintenance.asset_type.ilike(f"%{search}%")) |
            (TractionMaintenance.track_section.ilike(f"%{search}%"))
        )
        
    # Dynamic Sorting
    col = getattr(TractionMaintenance, sort_by, TractionMaintenance.health_score)
    if sort_order.lower() == "desc":
        query = query.order_by(col.desc())
    else:
        query = query.order_by(col.asc())
        
    return query.all()

@router.post("/", response_model=TractionMaintenanceOut)
def create_traction_task(task_in: TractionMaintenanceCreate, db: Session = Depends(get_db)):
    task = TractionMaintenance(**task_in.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.patch("/{task_id}/status")
def update_traction_task_status(task_id: str, status: str, db: Session = Depends(get_db)):
    task = db.query(TractionMaintenance).filter(TractionMaintenance.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Traction task not found")
    task.maintenance_status = status
    db.commit()
    return {"status": "updated", "task_id": task_id, "new_status": status}

@router.delete("/{task_id}")
def delete_traction_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(TractionMaintenance).filter(
        (TractionMaintenance.task_id == task_id) | (TractionMaintenance.id == int(task_id) if task_id.isdigit() else False)
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Traction maintenance task not found")
    db.delete(task)
    db.commit()
    return {"status": "deleted", "task_id": task_id}

@router.delete("/")
def clear_all_traction_tasks(db: Session = Depends(get_db)):
    count = db.query(TractionMaintenance).delete()
    db.commit()
    return {"status": "cleared", "deleted_count": count}

@router.post("/upload", response_model=UploadResponse)
async def upload_tdms_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    contents = await file.read()
    buffer = io.BytesIO(contents)
    try:
        result = parse_and_import_tdms_csv(buffer, db)
        return UploadResponse(
            success=True,
            system="TDMS",
            records_processed=result["records_processed"],
            records_inserted=result["records_inserted"],
            records_updated=result.get("records_updated", 0),
            duplicates_handled=result.get("duplicates_handled", 0),
            message=result["message"]
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process TDMS file: {str(e)}")
