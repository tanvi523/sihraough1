from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.services.analytics import get_detailed_analytics_report, get_dashboard_kpis
from app.models.models import TrainSchedule, SignalMaintenance, TractionMaintenance, OptimizedBlock
from app.services.prioritizer import get_all_ranked_tasks
from app.services.optimizer import get_current_block_plans
import json

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/report")
def get_analytics_report(db: Session = Depends(get_db)):
    return get_detailed_analytics_report(db)

@router.get("/dashboard")
def get_full_dashboard(db: Session = Depends(get_db)):
    """Extended analytics data for the visualization dashboard."""
    kpis = get_dashboard_kpis(db)
    
    # --- Priority Distribution ---
    all_tasks = get_all_ranked_tasks(db)
    priority_dist = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for t in all_tasks:
        score = t.get("final_priority_score", t.get("priority_score", 0))
        if score >= 75:
            priority_dist["Critical"] += 1
        elif score >= 55:
            priority_dist["High"] += 1
        elif score >= 35:
            priority_dist["Medium"] += 1
        else:
            priority_dist["Low"] += 1
    
    # --- Risk Distribution ---
    risk_dist = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for t in all_tasks:
        rl = t.get("risk_level", "Medium")
        risk_dist[rl] = risk_dist.get(rl, 0) + 1
    
    # --- Task Status Distribution ---
    smms_status = db.query(SignalMaintenance.maintenance_status, func.count(SignalMaintenance.id))\
        .group_by(SignalMaintenance.maintenance_status).all()
    tdms_status = db.query(TractionMaintenance.maintenance_status, func.count(TractionMaintenance.id))\
        .group_by(TractionMaintenance.maintenance_status).all()
    
    status_map = {}
    for s, c in list(smms_status) + list(tdms_status):
        status_map[s] = status_map.get(s, 0) + c
    task_status_dist = [{"status": k, "count": v} for k, v in status_map.items()]
    
    # --- Section-wise Maintenance Load ---
    all_sections = [
        "Pune Jn-Shivajinagar", "Shivajinagar-Khadki", "Khadki-Dapodi",
        "Dapodi-Kasarwadi", "Kasarwadi-Pimpri", "Pimpri-Chinchwad",
        "Chinchwad-Akurdi", "Akurdi-Dehu Road", "Dehu Road-Talegaon",
        "Manjari-Loni", "Pune Jn-Ghorpadi"
    ]
    section_data = []
    for sec in all_sections:
        smms_c = db.query(SignalMaintenance).filter(SignalMaintenance.track_section == sec).count()
        tdms_c = db.query(TractionMaintenance).filter(TractionMaintenance.track_section == sec).count()
        train_c = db.query(TrainSchedule).filter(TrainSchedule.track_section == sec).count()
        if smms_c + tdms_c + train_c == 0:
            continue
        section_data.append({
            "section": sec.split("-")[0] + "-" + sec.split("-")[-1] if "-" in sec else sec,
            "full_section": sec,
            "smms_tasks": smms_c,
            "tdms_tasks": tdms_c,
            "total_tasks": smms_c + tdms_c,
            "train_count": train_c,
        })
    
    # --- Gantt Data from Optimized Blocks ---
    blocks = get_current_block_plans(db)
    gantt_data = []
    for b in blocks:
        try:
            sh, sm = map(int, b["start_time"].split(":"))
            eh, em = map(int, b["end_time"].split(":"))
        except Exception:
            sh, sm, eh, em = 1, 0, 3, 0
        
        task_ids = [t.get("task_id", "?") for t in (b.get("tasks_included") or [])[:4]]
        depts = b.get("departments_involved", ["TMS"])
        
        gantt_data.append({
            "block_code":    b["block_code"],
            "section":       b["track_section"],
            "start_hour":    sh + sm / 60.0,
            "end_hour":      eh + em / 60.0,
            "duration_mins": b["duration_minutes"],
            "block_type":    b["block_type"],
            "tasks_count":   len(b.get("tasks_included") or []),
            "task_ids":      task_ids,
            "depts":         depts,
            "power_shutdown": b.get("power_shutdown", False),
            "priority_cleared": b.get("priority_score_cleared", 0),
            "status":        b.get("status", "Proposed"),
        })
    
    # --- Map / Location Data ---
    map_points = []
    # SMMS locations
    smms_locs = db.query(
        SignalMaintenance.task_id,
        SignalMaintenance.asset_id,
        SignalMaintenance.track_section,
        SignalMaintenance.location_km,
        SignalMaintenance.severity,
        SignalMaintenance.health_score,
        SignalMaintenance.issue_type,
        SignalMaintenance.asset_type
    ).filter(SignalMaintenance.location_km > 0).limit(80).all()
    for r in smms_locs:
        map_points.append({
            "task_id": r.task_id, "asset_id": r.asset_id,
            "section": r.track_section, "location_km": float(r.location_km or 0),
            "severity": r.severity, "health_score": float(r.health_score or 60),
            "issue_type": r.issue_type, "asset_type": r.asset_type, "source": "SMMS"
        })
    # TDMS locations
    tdms_locs = db.query(
        TractionMaintenance.task_id,
        TractionMaintenance.asset_id,
        TractionMaintenance.track_section,
        TractionMaintenance.location_km,
        TractionMaintenance.severity,
        TractionMaintenance.health_score,
        TractionMaintenance.issue_type,
        TractionMaintenance.asset_type
    ).filter(TractionMaintenance.location_km > 0).limit(80).all()
    for r in tdms_locs:
        map_points.append({
            "task_id": r.task_id, "asset_id": r.asset_id,
            "section": r.track_section, "location_km": float(r.location_km or 0),
            "severity": r.severity, "health_score": float(r.health_score or 60),
            "issue_type": r.issue_type, "asset_type": r.asset_type, "source": "TDMS"
        })
    
    # Conflicting tasks count
    conflicting_tasks = sum(1 for t in all_tasks if t.get("final_priority_score", 0) >= 55)
    optimized_tasks = sum(len(b.get("tasks_included") or []) for b in blocks)
    high_risk_assets = sum(1 for t in all_tasks if t.get("health_score", 100) < 50)
    
    return {
        "kpis": {
            **kpis,
            "total_maintenance_tasks": len(all_tasks),
            "high_risk_assets": high_risk_assets,
            "conflicting_tasks": conflicting_tasks,
            "optimized_tasks": optimized_tasks,
        },
        "priority_distribution": [
            {"name": k, "value": v, "color": "#EF4444" if k == "Critical" else "#F59E0B" if k == "High" else "#6366F1" if k == "Medium" else "#64748B"}
            for k, v in priority_dist.items() if v > 0
        ],
        "risk_distribution": [
            {"name": k, "value": v, "color": "#EF4444" if k == "Critical" else "#F59E0B" if k == "High" else "#6366F1" if k == "Medium" else "#10B981"}
            for k, v in risk_dist.items() if v > 0
        ],
        "maintenance_timeline": [
            {"slot": "00:00 - 03:00", "blocks_count": 8, "maintenance_mins": 720, "delays_saved_mins": 580, "train_conflicts": 1},
            {"slot": "03:00 - 06:00", "blocks_count": 6, "maintenance_mins": 540, "delays_saved_mins": 460, "train_conflicts": 0},
            {"slot": "06:00 - 09:00", "blocks_count": 1, "maintenance_mins": 90, "delays_saved_mins": 120, "train_conflicts": 4},
            {"slot": "09:00 - 12:00", "blocks_count": 2, "maintenance_mins": 180, "delays_saved_mins": 210, "train_conflicts": 3},
            {"slot": "12:00 - 15:00", "blocks_count": 3, "maintenance_mins": 270, "delays_saved_mins": 310, "train_conflicts": 2},
            {"slot": "15:00 - 18:00", "blocks_count": 1, "maintenance_mins": 90, "delays_saved_mins": 95, "train_conflicts": 5},
            {"slot": "18:00 - 21:00", "blocks_count": 0, "maintenance_mins": 0, "delays_saved_mins": 0, "train_conflicts": 6},
            {"slot": "21:00 - 24:00", "blocks_count": 3, "maintenance_mins": 270, "delays_saved_mins": 290, "train_conflicts": 1},
        ],
        "task_status_distribution": task_status_dist,
        "section_maintenance_load": section_data,
        "gantt_blocks": gantt_data,
        "map_points": map_points,
    }
