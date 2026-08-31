from datetime import datetime, date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import SignalMaintenance, TractionMaintenance, TrainSchedule

def parse_date_safe(date_str: Optional[str]) -> Optional[date]:
    if not date_str or str(date_str).strip() == "" or str(date_str).lower() == "none" or str(date_str).lower() == "nan":
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(str(date_str).strip(), fmt).date()
        except ValueError:
            continue
    return None

def compute_ai_risk_score(health_score: float, recent_faults: int, failure_history: int, severity: str) -> float:
    """
    Rule-based AI Risk Score (0 - 100):
    - Health Deficit (100 - health_score)
    - Fault Recurrence: (recent_faults * 12) + (failure_history * 4) capped at 100
    - Severity Multiplier: Critical: 1.30, High: 1.15, Medium: 1.00, Low: 0.85
    """
    health = max(0.0, min(100.0, float(health_score if health_score is not None else 60.0)))
    health_deficit = 100.0 - health
    
    fault_comp = min(100.0, (int(recent_faults or 0) * 12.0) + (int(failure_history or 0) * 4.0))
    
    sev = str(severity or "Medium").strip().lower()
    if sev == "critical":
        sev_mult = 1.30
    elif sev == "high":
        sev_mult = 1.15
    elif sev == "low":
        sev_mult = 0.85
    else:
        sev_mult = 1.00
        
    raw_risk = ((health_deficit * 0.65) + (fault_comp * 0.35)) * sev_mult
    return round(min(100.0, max(0.0, raw_risk)), 2)

def compute_deadline_score(due_date_str: Optional[str], maintenance_status: str) -> float:
    """
    Rule-based Deadline Score (0 - 100):
    - Status 'Overdue' or past due date -> 100.0
    - <= 7 days -> 90.0
    - <= 15 days -> 80.0
    - <= 30 days -> 65.0
    - <= 60 days -> 45.0
    - <= 90 days -> 30.0
    - > 90 days -> 15.0
    """
    st = str(maintenance_status or "").strip().lower()
    if st == "overdue":
        return 100.0
        
    d = parse_date_safe(due_date_str)
    if not d:
        return 50.0
        
    # Reference date around dataset operational horizon (Aug 2026)
    today = date(2026, 8, 29)
    diff = (d - today).days
    
    if diff < 0:
        return 100.0
    elif diff <= 7:
        return 90.0
    elif diff <= 15:
        return 80.0
    elif diff <= 30:
        return 65.0
    elif diff <= 60:
        return 45.0
    elif diff <= 90:
        return 30.0
    else:
        return 15.0

def compute_criticality_score(
    asset_criticality: str,
    safety_impact: str,
    track_section: str,
    power_shutdown: str = "No"
) -> float:
    """
    Rule-based Criticality Score (0 - 100):
    - Asset Criticality: Critical (95), High (80), Medium (55), Low (30)
    - Safety Impact: Critical/High (90), Medium (60), Low/None (20)
    - Mainline Corridor Bonus: +10 pts for high-density corridors
    - Power Isolation Flag: +10 pts if 25kV OHE isolation is required
    """
    crit_str = str(asset_criticality or "Medium").strip().lower()
    if crit_str == "critical":
        crit_val = 95.0
    elif crit_str == "high":
        crit_val = 80.0
    elif crit_str == "low":
        crit_val = 30.0
    else:
        crit_val = 55.0
        
    saf_str = str(safety_impact or "Medium").strip().lower()
    if saf_str in ["critical", "high"]:
        saf_val = 90.0
    elif saf_str in ["none", "low"]:
        saf_val = 20.0
    else:
        saf_val = 60.0
        
    base_crit = (crit_val * 0.60) + (saf_val * 0.40)
    
    # Corridor Importance Bonus
    sec_lower = str(track_section or "").lower()
    bonus = 0.0
    if "pune" in sec_lower or "shivajinagar" in sec_lower or "khadki" in sec_lower:
        bonus += 8.0
    if str(power_shutdown or "").lower() in ["yes", "true", "1"]:
        bonus += 8.0
        
    return round(min(100.0, base_crit + bonus), 2)

def calculate_task_priority(
    task: Any,
    source: str,
    risk_weight: float = 0.5,
    deadline_weight: float = 0.3,
    criticality_weight: float = 0.2
) -> Dict[str, Any]:
    """
    Calculates multi-dimensional priority score for a maintenance task:
    1. AI Risk Score
    2. Deadline Score
    3. Criticality Score
    4. Final Priority Score = (risk_weight * AI Risk) + (deadline_weight * Deadline) + (criticality_weight * Criticality)
    """
    health = float(getattr(task, "health_score", 60.0) if getattr(task, "health_score", None) is not None else 60.0)
    recent_faults = int(getattr(task, "recent_fault_count", 0) or 0)
    failure_history = int(getattr(task, "failure_history_count", 0) or 0)
    severity = getattr(task, "severity", "Medium") or "Medium"
    due_date = getattr(task, "next_due_date", None)
    status = getattr(task, "maintenance_status", "Pending") or "Pending"
    asset_crit = getattr(task, "asset_criticality", "Medium") or "Medium"
    safety_imp = getattr(task, "safety_impact", "Medium") or "Medium"
    section = getattr(task, "track_section", "Pune Jn-Shivajinagar") or "Pune Jn-Shivajinagar"
    power_shut = getattr(task, "power_shutdown_required", "No") or "No"

    # 1. AI Risk Score
    ai_risk = compute_ai_risk_score(health, recent_faults, failure_history, severity)

    # 2. Deadline Score
    deadline = compute_deadline_score(due_date, status)

    # 3. Criticality Score
    criticality = compute_criticality_score(asset_crit, safety_imp, section, power_shut)

    # Normalize weights if their sum is > 0
    total_w = risk_weight + deadline_weight + criticality_weight
    if total_w <= 0:
        total_w = 1.0
        rw, dw, cw = 0.5, 0.3, 0.2
    else:
        rw = risk_weight / total_w
        dw = deadline_weight / total_w
        cw = criticality_weight / total_w

    # 4. Final Priority Score
    final_priority = round((rw * ai_risk) + (dw * deadline) + (cw * criticality), 2)

    # Risk Tier classification
    if final_priority >= 75.0:
        risk_level = "Critical"
    elif final_priority >= 55.0:
        risk_level = "High"
    elif final_priority >= 35.0:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    task_id = getattr(task, "task_id", "") or ""
    if not task_id and source == "TMS":
        train_id = getattr(task, "train_id", "")
        task_id = f"TMS-{train_id}" if train_id else f"TMS-TRK-{getattr(task, 'id', '0')}"

    asset_id = getattr(task, "asset_id", "") or ""
    if not asset_id and source == "TMS":
        asset_id = f"TRK-{section[:4].upper()}"

    issue_type = getattr(task, "issue_type", None)
    if not issue_type and source == "TMS":
        train_name = getattr(task, "train_name", "Train Schedule")
        issue_type = f"Track Slot ({train_name})"

    return {
        "source": source,
        "task_id": task_id,
        "asset_id": asset_id,
        "track_section": section,
        "asset_type": getattr(task, "asset_type", "Track" if source == "TMS" else "General Asset") or ("Track" if source == "TMS" else "General Asset"),
        "issue_type": issue_type or "Standard Maintenance",
        "severity": severity,
        "health_score": health,
        "estimated_duration_minutes": getattr(task, "estimated_duration_minutes", 60) or 60,
        "power_shutdown_required": power_shut,
        "maintenance_status": status,
        "next_due_date": due_date,
        "work_order_id": getattr(task, "work_order_id", None),
        "location_km": getattr(task, "location_km", 0.0) or 0.0,
        "ai_risk_score": ai_risk,
        "deadline_score": deadline,
        "criticality_score": criticality,
        "final_priority_score": final_priority,
        "priority_score": final_priority, # alias for backward compatibility
        "risk_level": risk_level,
        "scoring_breakdown": {
            "ai_risk_score": ai_risk,
            "deadline_score": deadline,
            "criticality_score": criticality,
            "final_priority_score": final_priority,
            "weights": {
                "ai_risk_weight": rw,
                "deadline_weight": dw,
                "criticality_weight": cw
            }
        }
    }

def get_all_ranked_tasks(
    db: Session,
    risk_weight: float = 0.5,
    deadline_weight: float = 0.3,
    criticality_weight: float = 0.2
) -> List[Dict[str, Any]]:
    ranked_list = []

    # 1. Fetch SMMS Signal tasks
    smms_tasks = db.query(SignalMaintenance).all()
    for task in smms_tasks:
        item = calculate_task_priority(task, "SMMS", risk_weight, deadline_weight, criticality_weight)
        task.priority_score = item["final_priority_score"]
        task.risk_level = item["risk_level"]
        ranked_list.append(item)

    # 2. Fetch TDMS Traction tasks
    tdms_tasks = db.query(TractionMaintenance).all()
    for task in tdms_tasks:
        item = calculate_task_priority(task, "TDMS", risk_weight, deadline_weight, criticality_weight)
        task.priority_score = item["final_priority_score"]
        task.risk_level = item["risk_level"]
        ranked_list.append(item)

    # 3. Fetch TMS Track maintenance tasks (where issue_type or track maintenance is flagged)
    tms_tasks = db.query(TrainSchedule).all()
    for task in tms_tasks:
        # Include TMS records that have maintenance issues or track inspection tasks
        if task.issue_type or (task.task_id and "TSK" in str(task.task_id).upper()) or (task.health_score and task.health_score < 90):
            item = calculate_task_priority(task, "TMS", risk_weight, deadline_weight, criticality_weight)
            ranked_list.append(item)

    db.commit()

    # Sort tasks strictly descending by Final Priority Score
    ranked_list.sort(key=lambda x: x["final_priority_score"], reverse=True)
    return ranked_list
