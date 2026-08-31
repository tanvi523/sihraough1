from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.models.models import TrainSchedule, SignalMaintenance, TractionMaintenance
from app.schemas.schemas import (
    TaskConflictReport,
    ConflictSimulationRequest,
    ConflictSimulationResult
)
from app.services.conflict_detector import (
    analyze_all_maintenance_conflicts,
    simulate_custom_window_conflict
)

router = APIRouter(prefix="/conflicts", tags=["Train Conflict Detection"])

@router.get("/sections", response_model=List[str])
def get_conflict_sections(db: Session = Depends(get_db)):
    train_sections = db.query(TrainSchedule.track_section).distinct().all()
    signal_sections = db.query(SignalMaintenance.track_section).distinct().all()
    traction_sections = db.query(TractionMaintenance.track_section).distinct().all()
    
    all_sections = set()
    for rows in (train_sections, signal_sections, traction_sections):
        for s in rows:
            if s and s[0] and str(s[0]).strip():
                all_sections.add(str(s[0]).strip())
            
    return sorted(list(all_sections))

@router.get("/tasks", response_model=List[TaskConflictReport])
def get_task_conflicts(
    section: Optional[str] = None,
    severity: Optional[str] = None,
    subsystem: Optional[str] = None,
    db: Session = Depends(get_db)
):
    reports = analyze_all_maintenance_conflicts(db, section_filter=section)
    
    if severity:
        reports = [r for r in reports if r.conflict_severity.lower() == severity.lower()]
    if subsystem:
        reports = [r for r in reports if r.source.lower() == subsystem.lower()]
        
    return reports

@router.get("/summary")
def get_conflict_summary(db: Session = Depends(get_db)):
    reports = analyze_all_maintenance_conflicts(db)
    
    total = len(reports)
    critical_count = sum(1 for r in reports if r.conflict_severity == "Critical")
    high_count = sum(1 for r in reports if r.conflict_severity == "High")
    medium_count = sum(1 for r in reports if r.conflict_severity == "Medium")
    clear_count = sum(1 for r in reports if r.conflict_severity == "Clear")
    
    return {
        "total_tasks_analyzed": total,
        "critical_conflicts": critical_count,
        "high_conflicts": high_count,
        "medium_conflicts": medium_count,
        "clear_windows_available": clear_count,
        "conflict_free_percentage": round((clear_count / total * 100) if total > 0 else 0, 1)
    }

@router.post("/simulate", response_model=ConflictSimulationResult)
def simulate_window(
    sim_in: ConflictSimulationRequest,
    db: Session = Depends(get_db)
):
    result = simulate_custom_window_conflict(
        track_section=sim_in.track_section,
        start_time=sim_in.start_time,
        end_time=sim_in.end_time,
        power_shutdown=sim_in.power_shutdown_required or "No",
        db=db
    )
    return result
