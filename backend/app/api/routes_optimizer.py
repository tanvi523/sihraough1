from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.models.models import OptimizedBlock
from app.schemas.schemas import OptimizationRunRequest, OptimizationResult, BlockPlanItem
from app.services.optimizer import run_block_optimization, get_current_block_plans

router = APIRouter(prefix="/optimizer", tags=["Optimization Engine"])

@router.post("/run", response_model=OptimizationResult)
def execute_optimization(req: OptimizationRunRequest, db: Session = Depends(get_db)):
    """
    Run the full Optimization Engine.
    - Schedules tasks by Final Priority Score (highest first)
    - Clusters tasks by Section_ID
    - Reduces train conflicts using headway window analysis
    - Maximizes block utilization through task packing
    """
    result = run_block_optimization(
        db=db,
        target_date=req.target_date,
        objective=req.objective,
        preferred_window=req.preferred_window,
        max_concurrent_blocks=req.max_concurrent_blocks,
        allow_joint_blocks=req.allow_power_shutdown_joint,
        headway_buffer_mins=req.train_headway_buffer_minutes,
        selected_task_ids=req.selected_task_ids
    )
    return result

@router.get("/blocks", response_model=List[BlockPlanItem])
def get_blocks(
    target_date: Optional[str] = None,
    section: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve all Optimized Block Plan entries, optionally filtered."""
    blocks = get_current_block_plans(db, target_date=target_date)
    if not blocks:
        # Auto-generate an initial plan so the UI is never empty
        result = run_block_optimization(db, target_date="2026-09-01")
        blocks = result["blocks"]

    if section:
        blocks = [b for b in blocks if section.lower() in b["track_section"].lower()]
    if status:
        blocks = [b for b in blocks if b["status"].lower() == status.lower()]

    return blocks

@router.get("/summary")
def get_optimization_summary(db: Session = Depends(get_db)):
    """Summary statistics for the current block plan."""
    blocks = get_current_block_plans(db)
    if not blocks:
        return {"status": "no_plan", "message": "No optimized blocks exist. Run the optimization engine first."}

    total_tasks = sum(len(b["tasks_included"]) for b in blocks)
    total_delay_saved = sum(b["delays_averted_minutes"] for b in blocks)
    total_duration = sum(b["duration_minutes"] for b in blocks)
    power_blocks = sum(1 for b in blocks if b["power_shutdown"])
    by_dept = {}
    for b in blocks:
        for dept in b["departments_involved"]:
            by_dept[dept] = by_dept.get(dept, 0) + 1

    return {
        "total_blocks": len(blocks),
        "total_tasks_scheduled": total_tasks,
        "total_maintenance_minutes": total_duration,
        "total_delay_saved_minutes": total_delay_saved,
        "power_shutdown_blocks": power_blocks,
        "by_department": by_dept,
        "status_breakdown": {
            s: sum(1 for b in blocks if b["status"] == s)
            for s in ["Proposed", "Approved", "In Progress", "Completed", "Cancelled"]
        }
    }

@router.patch("/blocks/{block_id}/status")
def update_block_status(block_id: int, status: str, db: Session = Depends(get_db)):
    block = db.query(OptimizedBlock).filter(OptimizedBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block plan not found")
    block.status = status
    db.commit()
    return {"status": "updated", "block_id": block_id, "new_status": status}

@router.delete("/blocks/{block_id}")
def delete_block(block_id: int, db: Session = Depends(get_db)):
    block = db.query(OptimizedBlock).filter(OptimizedBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block plan not found")
    db.delete(block)
    db.commit()
    return {"status": "deleted", "block_id": block_id}
