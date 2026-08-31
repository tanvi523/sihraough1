from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from typing import List, Optional
import io
import csv
from app.db.database import get_db
from app.schemas.schemas import RankedTaskItem
from app.services.prioritizer import get_all_ranked_tasks

router = APIRouter(prefix="/prioritizer", tags=["Maintenance Prioritizer"])

@router.get("/ranked", response_model=List[RankedTaskItem])
def get_ranked_maintenance_tasks(
    subsystem: Optional[str] = None,
    section: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    min_priority: Optional[float] = None,
    risk_weight: Optional[float] = 0.5,
    deadline_weight: Optional[float] = 0.3,
    criticality_weight: Optional[float] = 0.2,
    db: Session = Depends(get_db)
):
    """
    Returns all maintenance tasks scored by the AI Prioritizer engine with customizable weights,
    sorted dynamically descending by final priority score.
    """
    tasks = get_all_ranked_tasks(
        db,
        risk_weight=risk_weight or 0.5,
        deadline_weight=deadline_weight or 0.3,
        criticality_weight=criticality_weight or 0.2
    )
    
    # Filter by subsystem
    if subsystem:
        tasks = [t for t in tasks if t["source"].upper() == subsystem.upper()]
        
    # Filter by section
    if section:
        tasks = [t for t in tasks if section.lower() in t["track_section"].lower()]
        
    # Filter by severity
    if severity:
        tasks = [t for t in tasks if t["severity"].lower() == severity.lower()]
        
    # Filter by search term
    if search:
        search_lower = search.lower()
        tasks = [
            t for t in tasks if 
            search_lower in t["task_id"].lower() or 
            search_lower in t["asset_id"].lower() or 
            search_lower in t["issue_type"].lower() or 
            search_lower in t["asset_type"].lower()
        ]
        
    # Filter by minimum priority score
    if min_priority is not None:
        tasks = [t for t in tasks if t["final_priority_score"] >= min_priority]
        
    return tasks

@router.get("/export")
def export_ranked_tasks_csv(
    subsystem: Optional[str] = None,
    section: Optional[str] = None,
    risk_weight: Optional[float] = 0.5,
    deadline_weight: Optional[float] = 0.3,
    criticality_weight: Optional[float] = 0.2,
    db: Session = Depends(get_db)
):
    """Exports calculated prioritized maintenance tasks as a downloadable CSV."""
    tasks = get_all_ranked_tasks(
        db,
        risk_weight=risk_weight or 0.5,
        deadline_weight=deadline_weight or 0.3,
        criticality_weight=criticality_weight or 0.2
    )
    
    if subsystem:
        tasks = [t for t in tasks if t["source"].upper() == subsystem.upper()]
    if section:
        tasks = [t for t in tasks if section.lower() in t["track_section"].lower()]

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Rank", "Source_System", "Task_ID", "Asset_ID", "Track_Section",
        "Asset_Type", "Issue_Type", "Severity", "Health_Score",
        "AI_Risk_Score", "Deadline_Score", "Criticality_Score",
        "Final_Priority_Score", "Risk_Level", "Next_Due_Date",
        "Estimated_Duration_Mins", "Power_Shutdown_Required"
    ])
    
    for idx, t in enumerate(tasks, 1):
        writer.writerow([
            idx,
            t["source"],
            t["task_id"],
            t["asset_id"],
            t["track_section"],
            t["asset_type"],
            t["issue_type"],
            t["severity"],
            t["health_score"],
            t["ai_risk_score"],
            t["deadline_score"],
            t["criticality_score"],
            t["final_priority_score"],
            t["risk_level"],
            t.get("next_due_date", ""),
            t["estimated_duration_minutes"],
            t.get("power_shutdown_required", "No")
        ])
        
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=prioritized_maintenance_scores.csv"}
    )
