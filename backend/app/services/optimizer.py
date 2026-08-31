"""
Optimization Engine for Railway Maintenance Block Planning

Algorithm:
1. Load all ranked tasks sorted by Final Priority Score (descending)
2. Group by Section_ID (track_section) to enable geographic clustering
3. For each section cluster:
   a. Sort tasks by final_priority_score DESC (schedule high priority first)
   b. Cluster nearby tasks (same section, compatible departments) to maximize block utilization
   c. Find the optimal maintenance window by minimizing train conflict penalty
   d. Pack as many high-priority tasks as possible within block duration limit
4. Output an Optimized Block Plan with conflict resolution details
"""

import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict
from sqlalchemy.orm import Session

from app.models.models import TrainSchedule, SignalMaintenance, TractionMaintenance, OptimizedBlock
from app.services.prioritizer import get_all_ranked_tasks


# ─────────────────────────────────────────────
# Utility Functions
# ─────────────────────────────────────────────

def time_to_min(t: str, default: int = 480) -> int:
    """Convert 'HH:MM' to minutes from midnight."""
    if not t or ":" not in str(t):
        return default
    try:
        h, m = str(t).strip().split(":")[:2]
        return int(h) * 60 + int(m)
    except Exception:
        return default

def min_to_time(m: int) -> str:
    """Convert minutes from midnight to 'HH:MM'."""
    m = int(m) % 1440
    return f"{m // 60:02d}:{m % 60:02d}"

def overlaps(s1: int, e1: int, s2: int, e2: int) -> bool:
    return max(s1, s2) < min(e1, e2)

def overlap_minutes(s1: int, e1: int, s2: int, e2: int) -> int:
    return max(0, min(e1, e2) - max(s1, s2))


# ─────────────────────────────────────────────
# Step 1: Section-wise Train Index
# ─────────────────────────────────────────────

def build_section_train_index(db: Session) -> Dict[str, List[Dict]]:
    """Build a per-section lookup of train schedules (normalized to minutes)."""
    trains = db.query(TrainSchedule).all()
    idx: Dict[str, List[Dict]] = defaultdict(list)
    for tr in trains:
        sec = (tr.track_section or "").strip()
        if not sec:
            continue
        s = time_to_min(tr.train_start_time)
        e = time_to_min(tr.train_end_time)
        if e <= s:
            e = s + 60  # fallback
        idx[sec].append({
            "train_id": tr.train_id,
            "train_name": tr.train_name or "Unknown",
            "train_type": tr.train_type or "Express",
            "train_priority": tr.train_priority or "Medium",
            "direction": tr.direction or "UP",
            "start_min": s,
            "end_min": e,
            "start_str": tr.train_start_time,
            "end_str": tr.train_end_time,
        })
    # Sort trains by start time per section
    for sec in idx:
        idx[sec].sort(key=lambda x: x["start_min"])
    return dict(idx)


# ─────────────────────────────────────────────
# Step 2: Candidate Window Generator
# ─────────────────────────────────────────────

def candidate_windows_for_section(
    section_trains: List[Dict],
    duration_needed: int,
    buffer_mins: int = 15,
    preferred_window: str = "all"
) -> List[Dict]:
    """
    Scans the 24-hour corridor timeline to find all open headway gaps
    that fit the required duration. Respects headway buffer on both ends.
    Returns windows scored by quality (night slots > day slots).
    """
    if not section_trains:
        # No trains → entire day is open. Return preferred defaults.
        return [
            {"start": 90,  "end": 90 + duration_needed,  "type": "Night Shadow Window",       "score": 1.0, "train_penalty": 0},
            {"start": 330, "end": 330 + duration_needed,  "type": "Early Morning Shadow Slot", "score": 0.9, "train_penalty": 0},
            {"start": 690, "end": 690 + duration_needed,  "type": "Midday Traffic Lull Slot",  "score": 0.7, "train_penalty": 0},
        ]

    # Build busy intervals with buffer
    busy = []
    for tr in section_trains:
        b_start = max(0, tr["start_min"] - buffer_mins)
        b_end   = min(1440, tr["end_min"] + buffer_mins)
        busy.append((b_start, b_end))

    # Merge overlapping busy intervals
    busy.sort()
    merged = [list(busy[0])]
    for s, e in busy[1:]:
        if s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])

    # Compute free gaps
    free_gaps = []
    cursor = 0
    for b_s, b_e in merged:
        if b_s > cursor:
            free_gaps.append((cursor, b_s))
        cursor = max(cursor, b_e)
    if cursor < 1440:
        free_gaps.append((cursor, 1440))

    windows = []
    for gap_s, gap_e in free_gaps:
        gap_dur = gap_e - gap_s
        if gap_dur < duration_needed:
            continue
        # Slide window to beginning of gap
        w_start = gap_s
        w_end   = gap_s + duration_needed
        # Classify window quality
        if w_end <= 330:            # 00:00 – 05:30
            w_type  = "Night Prime Shadow Window"
            w_score = 1.0
        elif w_end <= 420:          # 05:30 – 07:00
            w_type  = "Early Morning Shadow Slot"
            w_score = 0.88
        elif w_start >= 1350:       # 22:30+
            w_type  = "Late Night Off-Peak Slot"
            w_score = 0.92
        elif 690 <= w_start <= 870: # 11:30 – 14:30
            w_type  = "Midday Traffic Lull Slot"
            w_score = 0.72
        else:
            w_type  = "Regulated Daytime Window"
            w_score = 0.55

        # Filter by preferred_window setting
        if preferred_window == "night_shadow" and w_score < 0.85:
            continue
        if preferred_window == "offpeak_day" and w_score >= 0.85:
            continue

        windows.append({
            "start":         w_start,
            "end":           w_end,
            "type":          w_type,
            "score":         w_score,
            "train_penalty": 0  # already conflict-free by definition
        })

    # If no conflict-free gap fits, generate regulated candidate windows
    if not windows:
        # Pick the 5 canonical time slots, evaluate actual train conflict count
        for w_start, w_name, w_score in [
            (90,   "Night Regulated Slot (01:30)", 0.85),
            (330,  "Early Dawn Regulated Slot",    0.75),
            (690,  "Midday Regulated Slot",        0.60),
            (870,  "Afternoon Regulated Slot",     0.50),
            (1350, "Late Night Regulated Slot",    0.80),
        ]:
            w_end = w_start + duration_needed
            conflicting = sum(
                1 for tr in section_trains
                if overlaps(w_start, w_end, tr["start_min"], tr["end_min"])
            )
            windows.append({
                "start":         w_start,
                "end":           w_end,
                "type":          w_name,
                "score":         w_score,
                "train_penalty": conflicting
            })

    # Sort by (train_penalty ASC, score DESC)
    windows.sort(key=lambda w: (w["train_penalty"], -w["score"]))
    return windows[:6]  # top 6 candidates


# ─────────────────────────────────────────────
# Step 3: Conflict Evaluator
# ─────────────────────────────────────────────

def evaluate_conflict(
    section_trains: List[Dict],
    w_start: int,
    w_end:   int,
    requires_power_shutdown: bool,
    objective: str,
    headway_buffer: int
) -> Tuple[float, List[Dict]]:
    """
    Returns (penalty_score, affected_trains_list) for a given window.
    Penalty formula:
      - High-priority Express/Superfast clash → +60
      - Medium-priority train clash           → +30
      - Low-priority / Freight clash          → +15
      - Power shutdown × Express multiplier   → +40 extra
    Multiplied by objective factor.
    """
    penalty   = 0.0
    affected  = []

    for tr in section_trains:
        ovlp = overlap_minutes(w_start, w_end, tr["start_min"], tr["end_min"])
        if ovlp <= 0:
            continue

        prio = str(tr["train_priority"]).lower()
        t_type = str(tr["train_type"]).lower()
        is_express = t_type in ("express", "superfast")
        is_high    = prio in ("high", "critical")

        if is_high and is_express:
            base_pen = 60
            action   = "Regulated via Loop Line Bypass (10 min headway hold)"
            delay    = 10 + ovlp // 10
        elif is_high:
            base_pen = 40
            action   = "Rescheduled into preceding traffic slot"
            delay    = 8 + ovlp // 12
        else:
            base_pen = 20
            action   = "Pre-poned 15 min; minor schedule adjustment"
            delay    = 5 + ovlp // 15

        if requires_power_shutdown and is_express:
            base_pen += 40
            action   = "25kV OHE isolation – mandatory loop diversion"
            delay    += 15

        penalty += base_pen
        affected.append({
            "train_id":             tr["train_id"],
            "train_name":           tr["train_name"],
            "train_type":           tr["train_type"],
            "original_start":       tr["start_str"],
            "original_end":         tr["end_str"],
            "direction":            tr["direction"],
            "action_taken":         action,
            "delay_impact_minutes": max(5, delay)
        })

    # Objective multipliers
    if objective == "minimize_delay":
        penalty *= 1.7
    elif objective == "maximize_throughput":
        penalty = max(0, penalty - 20)

    return penalty, affected


# ─────────────────────────────────────────────
# Step 4: Section Cluster Builder (Packing Algorithm)
# ─────────────────────────────────────────────

MAX_BLOCK_DURATION = 360   # 6 hours hard cap per block
MAX_TASKS_PER_BLOCK = 8    # maximum tasks in a single block

def build_clusters_for_section(
    tasks: List[Dict],
    allow_joint: bool,
    objective: str
) -> List[List[Dict]]:
    """
    Packs tasks into clusters that can share a single maintenance block.
    Strategy:
    1. Sort all tasks DESC by final_priority_score (high priority first).
    2. Attempt to combine SMMS + TDMS tasks that share the same section into
       a single Integrated Multi-Dept block (saves a separate possession).
    3. Cap each cluster at MAX_BLOCK_DURATION and MAX_TASKS_PER_BLOCK.
    4. Remainder tasks go into individual or paired clusters.
    """
    # Sort by final_priority_score descending → schedule highest priority first
    tasks_sorted = sorted(tasks, key=lambda t: t.get("final_priority_score", t.get("priority_score", 50.0)), reverse=True)

    clusters: List[List[Dict]] = []
    used = set()

    if allow_joint and objective != "minimize_delay":
        # Attempt to build joint SMMS + TDMS integrated blocks
        smms_tasks = [t for t in tasks_sorted if t["source"] == "SMMS"]
        tdms_tasks = [t for t in tasks_sorted if t["source"] == "TDMS"]
        tms_tasks  = [t for t in tasks_sorted if t["source"] == "TMS"]

        # Build one integrated block per section with top-priority tasks from each dept
        cluster = []
        total_dur = 0
        for src_list in [smms_tasks, tdms_tasks, tms_tasks]:
            for task in src_list:
                if task["task_id"] in used:
                    continue
                dur = task.get("estimated_duration_minutes", 60)
                if total_dur + dur > MAX_BLOCK_DURATION or len(cluster) >= MAX_TASKS_PER_BLOCK:
                    break
                cluster.append(task)
                used.add(task["task_id"])
                total_dur += dur

        if cluster:
            clusters.append(cluster)

    # Fill remaining tasks into clusters of up to MAX_TASKS_PER_BLOCK each
    remaining = [t for t in tasks_sorted if t["task_id"] not in used]
    cluster_r: List[Dict] = []
    cluster_dur = 0

    for task in remaining:
        dur = task.get("estimated_duration_minutes", 60)
        if cluster_dur + dur > MAX_BLOCK_DURATION or len(cluster_r) >= MAX_TASKS_PER_BLOCK:
            if cluster_r:
                clusters.append(cluster_r)
            cluster_r = [task]
            cluster_dur = dur
        else:
            cluster_r.append(task)
            cluster_dur += dur

    if cluster_r:
        clusters.append(cluster_r)

    return clusters


# ─────────────────────────────────────────────
# Step 5: Main Optimization Runner
# ─────────────────────────────────────────────

def run_block_optimization(
    db: Session,
    target_date: str = "2026-09-01",
    objective: str = "balanced",
    preferred_window: str = "all",
    max_concurrent_blocks: int = 3,
    allow_joint_blocks: bool = True,
    headway_buffer_mins: int = 15,
    selected_task_ids: Optional[List[str]] = None
) -> Dict[str, Any]:

    # ── 1. Load tasks ranked by Final Priority Score ─────────────────────
    all_ranked = get_all_ranked_tasks(db)

    if selected_task_ids:
        tasks_pool = [t for t in all_ranked if t["task_id"] in selected_task_ids]
    else:
        # Take pending/scheduled tasks; fallback to top-40 if none
        tasks_pool = [
            t for t in all_ranked
            if t.get("maintenance_status", "").lower() in ("pending", "scheduled", "overdue")
        ]
        if not tasks_pool:
            tasks_pool = all_ranked[:40]

    # ── 2. Build train schedule index per section ─────────────────────────
    section_train_idx = build_section_train_index(db)

    # ── 3. Group tasks by Section_ID (track_section) ──────────────────────
    section_task_map: Dict[str, List[Dict]] = defaultdict(list)
    for t in tasks_pool:
        section_task_map[t["track_section"]].append(t)

    # ── 4. Per-section optimization ───────────────────────────────────────
    generated_blocks: List[Dict] = []
    block_counter    = 1
    total_delay_saved    = 0
    total_conflicts_det  = 0
    total_conflicts_res  = 0
    sections_processed   = set()

    # Sort sections by max priority task in that section (most urgent section first)
    sorted_sections = sorted(
        section_task_map.keys(),
        key=lambda sec: max(
            t.get("final_priority_score", t.get("priority_score", 0)) for t in section_task_map[sec]
        ),
        reverse=True
    )

    for section in sorted_sections:
        tasks = section_task_map[section]
        if not tasks:
            continue

        sec_trains = section_train_idx.get(section, [])

        # ── 4a. Build clusters (high priority first, geographically grouped) ──
        clusters = build_clusters_for_section(tasks, allow_joint_blocks, objective)

        for cluster in clusters:
            if not cluster:
                continue

            requires_power = any(
                t.get("power_shutdown_required", "No").lower() in ("yes", "true", "1")
                for t in cluster
            )
            # Block duration = max single-task duration (parallel work by separate crews)
            block_duration = max(t.get("estimated_duration_minutes", 60) for t in cluster)
            block_duration = min(block_duration, MAX_BLOCK_DURATION)

            depts = sorted(set(t["source"] for t in cluster))
            total_priority_cleared = sum(
                t.get("final_priority_score", t.get("priority_score", 50.0)) for t in cluster
            )

            # ── 4b. Find optimal window ────────────────────────────────────
            cand_windows = candidate_windows_for_section(
                sec_trains, block_duration, headway_buffer_mins, preferred_window
            )

            best_win      = None
            best_penalty  = float("inf")
            best_affected = []

            for cw in cand_windows:
                penalty, affected = evaluate_conflict(
                    sec_trains,
                    cw["start"], cw["end"],
                    requires_power, objective, headway_buffer_mins
                )
                # Combine window quality into score (prefer low penalty AND high-quality window)
                combined_score = penalty - (cw["score"] * 20)
                if combined_score < best_penalty:
                    best_penalty  = combined_score
                    best_win      = cw
                    best_affected = affected

            if not best_win:
                # Guaranteed fallback: 01:30 AM default
                best_win      = {"start": 90, "end": 90 + block_duration, "type": "Emergency Shadow Window", "score": 0.5}
                best_affected = []

            start_str = min_to_time(best_win["start"])
            end_str   = min_to_time(best_win["end"])
            actual_dur = best_win["end"] - best_win["start"]

            # ── 4c. Delay averted calculation ─────────────────────────────
            unoptimized_delays = sum(t.get("estimated_duration_minutes", 60) for t in cluster) * 0.8
            block_delay_cost   = sum(a["delay_impact_minutes"] for a in best_affected)
            delays_averted     = max(20, int(unoptimized_delays - block_delay_cost + 25))

            total_delay_saved    += delays_averted
            total_conflicts_det  += len(best_affected)
            total_conflicts_res  += len(best_affected)  # all mitigated in plan

            # ── 4d. Block type naming ──────────────────────────────────────
            if len(depts) > 1:
                block_type = "Integrated Multi-Dept Shadow Block"
            elif "TDMS" in depts and requires_power:
                block_type = "OHE 25kV Traction Power Block"
            elif "SMMS" in depts:
                block_type = "S&T Signal Maintenance Window"
            else:
                block_type = "Track & Infrastructure Maintenance Block"

            block_code = f"BLK-PUNE-{target_date.replace('-', '')[-6:]}-{block_counter:03d}"

            block_item = {
                "block_code":             block_code,
                "track_section":          section,
                "target_date":            target_date,
                "start_time":             start_str,
                "end_time":               end_str,
                "duration_minutes":       actual_dur,
                "block_type":             block_type,
                "power_shutdown":         requires_power,
                "tasks_included":         cluster,
                "departments_involved":   depts,
                "affected_trains_count":  len(best_affected),
                "affected_trains_details": best_affected,
                "delays_averted_minutes": delays_averted,
                "priority_score_cleared": round(total_priority_cleared, 1),
                "status":                 "Proposed",
                "notes": (
                    f"{best_win['type']} | {len(cluster)} task(s) clustered | "
                    f""
                    f"Depts: {', '.join(depts)}"
                )
            }

            generated_blocks.append(block_item)
            block_counter += 1
            sections_processed.add(section)

            # Respect max concurrent block limit per cycle
            if len(generated_blocks) >= max_concurrent_blocks * 8:
                break

        if len(generated_blocks) >= max_concurrent_blocks * 8:
            break

    # ── 5. Persist to database ─────────────────────────────────────────────
    db.query(OptimizedBlock).filter(OptimizedBlock.target_date == target_date).delete()

    saved_blocks: List[Dict] = []
    for b in generated_blocks:
        db_block = OptimizedBlock(
            block_code=b["block_code"],
            track_section=b["track_section"],
            target_date=b["target_date"],
            start_time=b["start_time"],
            end_time=b["end_time"],
            duration_minutes=b["duration_minutes"],
            block_type=b["block_type"],
            power_shutdown=b["power_shutdown"],
            tasks_included=json.dumps(b["tasks_included"]),
            departments_involved=", ".join(b["departments_involved"]),
            affected_trains_count=b["affected_trains_count"],
            affected_trains_details=json.dumps(b["affected_trains_details"]),
            delays_averted_minutes=b["delays_averted_minutes"],
            priority_score_cleared=b["priority_score_cleared"],
            status="Proposed",
            notes=b["notes"]
        )
        db.add(db_block)
        db.flush()
        b["id"] = db_block.id
        saved_blocks.append(b)

    db.commit()

    total_tasks_scheduled  = sum(len(b["tasks_included"]) for b in saved_blocks)
    total_maint_minutes    = sum(b["duration_minutes"] for b in saved_blocks)
    punctuality_score      = min(99.5, max(90.0, 95.5 + total_delay_saved / 120.0))
    block_utilization_pct  = min(100.0, (total_tasks_scheduled / max(1, len(tasks_pool))) * 100)

    return {
        "job_id":                         f"OPT-{uuid.uuid4().hex[:8].upper()}",
        "target_date":                    target_date,
        "objective":                      objective,
        "blocks_generated":               len(saved_blocks),
        "total_tasks_scheduled":          total_tasks_scheduled,
        "total_tasks_in_pool":            len(tasks_pool),
        "block_utilization_pct":          round(block_utilization_pct, 1),
        "total_maintenance_minutes":      total_maint_minutes,
        "estimated_delay_savings_minutes": total_delay_saved,
        "punctuality_preservation_score": round(punctuality_score, 1),
        "conflicts_detected":             total_conflicts_det,
        "conflicts_resolved":             total_conflicts_res,
        "sections_covered":               len(sections_processed),
        "blocks":                         saved_blocks
    }


# ─────────────────────────────────────────────
# Step 6: Read Current Block Plans
# ─────────────────────────────────────────────

def get_current_block_plans(db: Session, target_date: Optional[str] = None) -> List[Dict]:
    query = db.query(OptimizedBlock)
    if target_date:
        query = query.filter(OptimizedBlock.target_date == target_date)
    records = query.order_by(OptimizedBlock.start_time.asc()).all()

    result = []
    for r in records:
        try:
            tasks_list = json.loads(r.tasks_included) if r.tasks_included else []
        except Exception:
            tasks_list = []
        try:
            train_details = json.loads(r.affected_trains_details) if r.affected_trains_details else []
        except Exception:
            train_details = []

        result.append({
            "id":                    r.id,
            "block_code":            r.block_code,
            "track_section":         r.track_section,
            "target_date":           r.target_date,
            "start_time":            r.start_time,
            "end_time":              r.end_time,
            "duration_minutes":      r.duration_minutes,
            "block_type":            r.block_type,
            "power_shutdown":        r.power_shutdown,
            "tasks_included":        tasks_list,
            "departments_involved":  [d.strip() for d in (r.departments_involved or "TMS").split(",")],
            "affected_trains_count": r.affected_trains_count,
            "affected_trains_details": train_details,
            "delays_averted_minutes": r.delays_averted_minutes,
            "priority_score_cleared": r.priority_score_cleared,
            "status":                r.status,
            "notes":                 r.notes
        })
    return result
