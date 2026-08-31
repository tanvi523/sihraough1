from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.models.models import TrainSchedule
from app.schemas.schemas import TrainScheduleOut, TrainScheduleCreate, UploadResponse
from app.services.csv_parser import parse_and_import_tms_csv
import io

router = APIRouter(prefix="/tms", tags=["Train Schedule (TMS)"])

@router.get("/", response_model=List[TrainScheduleOut])
def get_all_trains(
    section: Optional[str] = None,
    direction: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "train_start_time",
    sort_order: Optional[str] = "asc",
    db: Session = Depends(get_db)
):
    query = db.query(TrainSchedule)
    if section:
        query = query.filter(TrainSchedule.track_section.ilike(f"%{section}%"))
    if direction:
        query = query.filter(TrainSchedule.direction.ilike(direction))
    if priority:
        query = query.filter(TrainSchedule.train_priority.ilike(priority))
    if search:
        query = query.filter(
            (TrainSchedule.train_name.ilike(f"%{search}%")) |
            (TrainSchedule.train_id.ilike(f"%{search}%")) |
            (TrainSchedule.track_section.ilike(f"%{search}%")) |
            (TrainSchedule.train_type.ilike(f"%{search}%"))
        )
        
    # Dynamic Sorting
    col = getattr(TrainSchedule, sort_by, TrainSchedule.train_start_time)
    if sort_order.lower() == "desc":
        query = query.order_by(col.desc())
    else:
        query = query.order_by(col.asc())
        
    return query.all()

@router.post("/", response_model=TrainScheduleOut)
def create_train(train_in: TrainScheduleCreate, db: Session = Depends(get_db)):
    train = TrainSchedule(**train_in.model_dump())
    db.add(train)
    db.commit()
    db.refresh(train)
    return train

@router.delete("/{train_id}")
def delete_train(train_id: str, db: Session = Depends(get_db)):
    train = db.query(TrainSchedule).filter(
        (TrainSchedule.train_id == train_id) |
        (TrainSchedule.id == int(train_id) if train_id.isdigit() else False) |
        (TrainSchedule.train_type.ilike(train_id)) |
        (TrainSchedule.train_name.ilike(f"%{train_id}%"))
    ).first()
    if not train:
        raise HTTPException(status_code=404, detail="Train schedule not found")
    actual_id = train.train_id
    db.delete(train)
    db.commit()
    return {"status": "deleted", "train_id": actual_id}

@router.delete("/")
def clear_all_trains(db: Session = Depends(get_db)):
    count = db.query(TrainSchedule).delete()
    db.commit()
    return {"status": "cleared", "deleted_count": count}

@router.post("/upload", response_model=UploadResponse)
async def upload_tms_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    contents = await file.read()
    buffer = io.BytesIO(contents)
    try:
        result = parse_and_import_tms_csv(buffer, db)
        return UploadResponse(
            success=True,
            system="TMS",
            records_processed=result["records_processed"],
            records_inserted=result["records_inserted"],
            records_updated=result.get("records_updated", 0),
            duplicates_handled=result.get("duplicates_handled", 0),
            message=result["message"]
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process TMS file: {str(e)}")
