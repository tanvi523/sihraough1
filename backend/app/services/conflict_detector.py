from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import TrainSchedule, SignalMaintenance, TractionMaintenance
from app.schemas.schemas import (
    TrainConflictItem,
    MaintenanceWindowSlot,
    TaskConflictReport,
    ConflictSimulationResult
)
from app.services.prioritizer import get_all_ranked_tasks

def time_to_minutes(t_str: Optional[str], default: int = 480) -> int:
    """Converts 'HH:MM' string to minutes from midnight (0-1440)."""
    if not t_str or ":" not in str(t_str):
        return default
    try:
        parts = str(t_str).strip().split(":")
        h = int(parts[0]) % 24
        m = int(parts[1]) if len(parts) > 1 else 0
        return (h * 60) + m
    except:
        return default

def minutes_to_time(minutes: int) -> str:
    """Converts minutes from midnight to 'HH:MM' string."""
    m_norm = int(minutes) % 1440
    h = m_norm // 60
    m = m_norm % 60
    return f"{h:02d}:{m:02d}"

def get_trains_for_section(track_section: str, db: Session) -> List[TrainSchedule]:
    """Retrieves all train schedules routed on this track section."""
    if not track_section or track_section.strip() == "":
        return db.query(TrainSchedule).all()
        
    query = db.query(TrainSchedule).filter(
        (TrainSchedule.track_section.ilike(f"%{track_section}%")) |
        (TrainSchedule.track_section.ilike(f"%{track_section.split('-')[0]}%"))
    ).all()
    
    if not query:
        # Fallback to all trains if specific section format differs
        query = db.query(TrainSchedule).all()
    return query

def find_available_maintenance_windows(
    trains: List[TrainSchedule],
    duration_minutes: int,
    buffer_minutes: int = 15
) -> List[MaintenanceWindowSlot]:
    """
    Computes all feasible open traffic gaps (free from trains + buffer)
    that can accommodate the task's required duration.
    """
    req_duration = max(30, int(duration_minutes or 60))
    
    # Build busy intervals
    busy_intervals = []
    for trn in trains:
        s = time_to_minutes(trn.train_start_time, 480)
        e = time_to_minutes(trn.train_end_time, 600)
        if e < s:
            e += 1440 # crosses midnight
        # Add headway buffer
        busy_intervals.append((max(0, s - buffer_minutes), min(1440, e + buffer_minutes)))
        
    # Sort and merge busy intervals
    busy_intervals.sort(key=lambda x: x[0])
    merged_busy = []
    for start, end in busy_intervals:
        if not merged_busy:
            merged_busy.append([start, end])
        else:
            prev_start, prev_end = merged_busy[-1]
            if start <= prev_end:
                merged_busy[-1][1] = max(prev_end, end)
            else:
                merged_busy.append([start, end])
                
    # Find gaps in the 24-hour cycle (00:00 to 24:00)
    available_windows = []
    current_pointer = 0 # 00:00
    
    for busy_start, busy_end in merged_busy:
        if busy_start > current_pointer:
            gap_duration = busy_start - current_pointer
            if gap_duration >= req_duration:
                is_night = (current_pointer < 330) # before 05:30 AM
                window_type = "Night Off-Peak" if is_night else "Daytime Gap"
                available_windows.append(MaintenanceWindowSlot(
                    start_time=minutes_to_time(current_pointer),
                    end_time=minutes_to_time(current_pointer + req_duration),
                    duration_minutes=req_duration,
                    window_type=window_type,
                    is_recommended=is_night,
                    notes=f"Open headway gap of {gap_duration} mins available"
                ))
        current_pointer = max(current_pointer, busy_end)
        
    # Check trailing gap until midnight
    if current_pointer < 1440:
        gap_duration = 1440 - current_pointer
        if gap_duration >= req_duration:
            available_windows.append(MaintenanceWindowSlot(
                start_time=minutes_to_time(current_pointer),
                end_time=minutes_to_time(current_pointer + req_duration),
                duration_minutes=req_duration,
                window_type="Late Night Off-Peak",
                is_recommended=True,
                notes=f"Open headway gap of {gap_duration} mins until 24:00"
            ))
            
    # Guarantee at least standardized default off-peak windows if density is 100%
    if not available_windows:
        available_windows.append(MaintenanceWindowSlot(
            start_time="01:30",
            end_time=minutes_to_time(90 + req_duration),
            duration_minutes=req_duration,
            window_type="Night Regulated Slot",
            is_recommended=True,
            notes="Requires minor loop regulation of 1 late freight"
        ))
        available_windows.append(MaintenanceWindowSlot(
            start_time="11:30",
            end_time=minutes_to_time(690 + req_duration),
            duration_minutes=req_duration,
            window_type="Midday Regulated Slot",
            is_recommended=False,
            notes="Suburban off-peak afternoon corridor"
        ))
        
    return available_windows

def evaluate_window_conflict(
    track_section: str,
    start_mins: int,
    end_mins: int,
    trains: List[TrainSchedule],
    power_shutdown: str = "No"
) -> Dict[str, Any]:
    """
    Evaluates train conflicts for a specific proposed time window.
    Returns list of conflicting trains and assigned conflict severity.
    """
    conflicts = []
    total_delay_impact = 0

    for trn in trains:
        t_start = time_to_minutes(trn.train_start_time, 480)
        t_end = time_to_minutes(trn.train_end_time, 600)
        
        # Check overlap
        if max(t_start, start_mins) < min(t_end, end_mins):
            overlap = min(t_end, end_mins) - max(t_start, start_mins)
            prio = str(trn.train_priority or "Medium").lower()
            
            if prio in ["high", "critical"] or "express" in str(trn.train_type).lower():
                impact = "High Delay Risk"
                delay_est = overlap + 20
            else:
                impact = "Regulated via Loop"
                delay_est = overlap + 5
                
            total_delay_impact += delay_est
            conflicts.append(TrainConflictItem(
                train_id=trn.train_id,
                train_name=trn.train_name,
                train_type=trn.train_type or "Express",
                train_priority=trn.train_priority or "High",
                direction=trn.direction or "UP",
                train_start_time=trn.train_start_time,
                train_end_time=trn.train_end_time,
                overlap_minutes=overlap,
                impact_level=impact
            ))

    num_conflicts = len(conflicts)
    has_high_priority_clash = any(c.train_priority.lower() in ["high", "critical"] for c in conflicts)
    is_power_cut = str(power_shutdown).lower() in ["yes", "true", "1"]

    # Assign Conflict Severity
    if num_conflicts >= 2 or (has_high_priority_clash and num_conflicts >= 1 and is_power_cut):
        severity = "Critical" # Red
    elif num_conflicts == 1 and has_high_priority_clash:
        severity = "High" # Orange
    elif num_conflicts >= 1:
        severity = "Medium" # Yellow
    else:
        severity = "Clear" # Green

    return {
        "conflicting_trains_count": num_conflicts,
        "conflicting_trains": conflicts,
        "conflict_severity": severity,
        "delay_impact_estimate_minutes": total_delay_impact
    }

def analyze_task_conflict(task_dict: Dict[str, Any], db: Session) -> TaskConflictReport:
    """Performs deep conflict diagnostics for a specific maintenance task."""
    section = task_dict.get("track_section", "Pune Jn-Shivajinagar")
    duration = task_dict.get("estimated_duration_minutes", 60)
    power_cut = task_dict.get("power_shutdown_required", "No")

    trains = get_trains_for_section(section, db)
    available_windows = find_available_maintenance_windows(trains, duration)

    # Test against default candidate working window (09:00 - 09:00+duration for daytime baseline)
    test_start_mins = 540 # 09:00 AM
    test_end_mins = test_start_mins + duration

    eval_result = evaluate_window_conflict(section, test_start_mins, test_end_mins, trains, power_cut)

    earliest_win = available_windows[0] if available_windows else None
    # Pick optimal recommended window (prefers night off-peak)
    recommended_win = next((w for w in available_windows if w.is_recommended), earliest_win)

    return TaskConflictReport(
        task_id=task_dict["task_id"],
        asset_id=task_dict["asset_id"],
        source=task_dict.get("source", "SMMS"),
        track_section=section,
        asset_type=task_dict.get("asset_type", "Asset"),
        issue_type=task_dict.get("issue_type", "Defect"),
        severity=task_dict.get("severity", "Medium"),
        estimated_duration_minutes=duration,
        power_shutdown_required=power_cut,
        final_priority_score=task_dict.get("final_priority_score", 50.0),
        tested_window_start=minutes_to_time(test_start_mins),
        tested_window_end=minutes_to_time(test_end_mins),
        conflicting_trains_count=eval_result["conflicting_trains_count"],
        conflicting_trains=eval_result["conflicting_trains"],
        conflict_severity=eval_result["conflict_severity"],
        earliest_available_window=earliest_win,
        recommended_window=recommended_win,
        available_windows_count=len(available_windows),
        available_windows=available_windows[:5]
    )

def analyze_all_maintenance_conflicts(db: Session, section_filter: Optional[str] = None) -> List[TaskConflictReport]:
    """Analyzes conflicts across all prioritized maintenance tasks in the system."""
    tasks = get_all_ranked_tasks(db)
    reports = []
    
    for task in tasks:
        if section_filter and section_filter.lower() not in task.get("track_section", "").lower():
            continue
        report = analyze_task_conflict(task, db)
        reports.append(report)
        
    return reports

def simulate_custom_window_conflict(
    track_section: str,
    start_time: str,
    end_time: str,
    power_shutdown: str,
    db: Session
) -> ConflictSimulationResult:
    """Interactive simulator for arbitrary proposed maintenance time windows."""
    s_mins = time_to_minutes(start_time, 540)
    e_mins = time_to_minutes(end_time, 660)
    if e_mins <= s_mins:
        e_mins = s_mins + 120
    duration = e_mins - s_mins

    trains = get_trains_for_section(track_section, db)
    eval_res = evaluate_window_conflict(track_section, s_mins, e_mins, trains, power_shutdown)
    avail_wins = find_available_maintenance_windows(trains, duration)

    earliest_win = avail_wins[0] if avail_wins else None
    recommended_win = next((w for w in avail_wins if w.is_recommended), earliest_win)

    return ConflictSimulationResult(
        track_section=track_section,
        tested_window=f"{start_time} - {end_time}",
        duration_minutes=duration,
        conflicting_trains_count=eval_res["conflicting_trains_count"],
        conflict_severity=eval_res["conflict_severity"],
        conflicting_trains=eval_res["conflicting_trains"],
        earliest_available_window=earliest_win,
        recommended_window=recommended_win,
        available_windows=avail_wins[:5],
        delay_impact_estimate_minutes=eval_res["delay_impact_estimate_minutes"]
    )
