from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.analytics import get_dashboard_kpis, get_section_congestion_analytics
from app.models.models import SignalMaintenance, TractionMaintenance, OptimizedBlock, TrainSchedule

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    kpis = get_dashboard_kpis(db)
    sections = get_section_congestion_analytics(db)
    
    # Recent critical alerts
    crit_signals = db.query(SignalMaintenance).filter(SignalMaintenance.health_score < 50).limit(4).all()
    crit_traction = db.query(TractionMaintenance).filter(TractionMaintenance.health_score < 50).limit(4).all()
    
    alerts = []
    for s in crit_signals:
        alerts.append({
            "id": f"SIG-{s.id}",
            "type": "Signal Alert",
            "section": s.track_section,
            "asset": f"{s.asset_id} ({s.asset_type})",
            "issue": s.issue_type,
            "health": s.health_score,
            "severity": s.severity,
            "timestamp": "Active Warning"
        })
    for t in crit_traction:
        alerts.append({
            "id": f"TRC-{t.id}",
            "type": "Traction Alert",
            "section": t.track_section,
            "asset": f"{t.asset_id} ({t.asset_type})",
            "issue": t.issue_type,
            "health": t.health_score,
            "severity": t.severity,
            "power_shutdown": t.power_shutdown_required,
            "timestamp": "Power Block Required" if t.power_shutdown_required == "Yes" else "Active Warning"
        })
        
    # Quick active block summary
    recent_blocks = db.query(OptimizedBlock).order_by(OptimizedBlock.id.desc()).limit(3).all()
    recent_blocks_data = [
        {
            "block_code": b.block_code,
            "track_section": b.track_section,
            "window": f"{b.start_time} - {b.end_time}",
            "duration": f"{b.duration_minutes} min",
            "delays_averted": f"{b.delays_averted_minutes} min",
            "status": b.status
        }
        for b in recent_blocks
    ]
    
    return {
        "kpis": kpis,
        "sections": sections,
        "alerts": alerts,
        "recent_blocks": recent_blocks_data
    }
