import os
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from app.models.models import TrainSchedule, SignalMaintenance, TractionMaintenance
from app.core.config import settings
from app.services.prioritizer import calculate_task_priority, get_all_ranked_tasks

def clean_val(val, default=""):
    if pd.isna(val) or val is None or str(val).strip() == "" or str(val).lower() == "nan":
        return default
    return str(val).strip()

def clean_num(val, default=0.0):
    try:
        if pd.isna(val) or val is None:
            return default
        return float(val)
    except:
        return default

def clean_int(val, default=0):
    try:
        if pd.isna(val) or val is None:
            return default
        return int(float(val))
    except:
        return default

def normalize_column_map(df: pd.DataFrame) -> dict:
    """Creates a case-insensitive, whitespace/underscore-agnostic mapping of dataframe columns."""
    mapping = {}
    for col in df.columns:
        norm = col.strip().lower().replace(" ", "_").replace("-", "_")
        mapping[norm] = col
    return mapping

def get_mapped_value(row, norm_map, target_keys, default=""):
    for k in target_keys:
        norm_k = k.strip().lower().replace(" ", "_").replace("-", "_")
        if norm_k in norm_map:
            actual_col = norm_map[norm_k]
            val = clean_val(row.get(actual_col))
            if val != "":
                return val
    return default

def get_mapped_num(row, norm_map, target_keys, default=0.0):
    for k in target_keys:
        norm_k = k.strip().lower().replace(" ", "_").replace("-", "_")
        if norm_k in norm_map:
            actual_col = norm_map[norm_k]
            val = row.get(actual_col)
            if not pd.isna(val) and val is not None and str(val).strip() != "":
                return clean_num(val, default)
    return default

def get_mapped_int(row, norm_map, target_keys, default=0):
    for k in target_keys:
        norm_k = k.strip().lower().replace(" ", "_").replace("-", "_")
        if norm_k in norm_map:
            actual_col = norm_map[norm_k]
            val = row.get(actual_col)
            if not pd.isna(val) and val is not None and str(val).strip() != "":
                return clean_int(val, default)
    return default

def validate_required_columns(norm_map: dict, required_field_groups: list, system_name: str, original_cols: list):
    missing = []
    for group in required_field_groups:
        matched = any(k.strip().lower().replace(" ", "_").replace("-", "_") in norm_map for k in group)
        if not matched:
            missing.append(group[0])
    if missing:
        raise ValueError(
            f"Invalid {system_name} CSV schema: Missing required column(s): {', '.join(missing)}. "
            f"Provided columns: {', '.join(original_cols)}"
        )

# ==========================================
# 1. TMS (Train Management System) Parser
# ==========================================
def parse_and_import_tms_csv(file_content_or_path, db: Session) -> dict:
    df = pd.read_csv(file_content_or_path)
    norm_map = normalize_column_map(df)
    
    # Required columns for TMS
    required_field_groups = [
        ["train_id", "train_no", "train_number", "task_id", "task_no"],
        ["track_section", "section", "route_section", "corridor"]
    ]
    validate_required_columns(norm_map, required_field_groups, "TMS (Train Timetables)", list(df.columns))

    inserted_count = 0
    updated_count = 0

    for _, row in df.iterrows():
        train_id = get_mapped_value(row, norm_map, ["train_id", "train_no", "train_number"], f"TRN-{inserted_count+1:04d}")
        train_name = get_mapped_value(row, norm_map, ["train_name", "train_service"], "Express Service")
        track_section = get_mapped_value(row, norm_map, ["track_section", "section", "corridor"], "Pune Jn-Shivajinagar")
        
        # Check for existing record
        existing = db.query(TrainSchedule).filter(
            (TrainSchedule.train_id == train_id) & (TrainSchedule.track_section == track_section)
        ).first()

        if not existing:
            existing = db.query(TrainSchedule).filter(TrainSchedule.train_id == train_id).first()

        health = get_mapped_num(row, norm_map, ["health_score", "health_index", "health"], 70.0)
        sev = get_mapped_value(row, norm_map, ["severity", "fault_severity"], "Medium")

        if existing:
            existing.train_name = train_name
            existing.track_section = track_section
            existing.train_type = get_mapped_value(row, norm_map, ["train_type"], existing.train_type or "Express")
            existing.train_priority = get_mapped_value(row, norm_map, ["train_priority", "priority"], existing.train_priority or "High")
            existing.train_start_time = get_mapped_value(row, norm_map, ["train_start_time", "start_time", "departure_time"], existing.train_start_time or "08:00")
            existing.train_end_time = get_mapped_value(row, norm_map, ["train_end_time", "end_time", "arrival_time"], existing.train_end_time or "10:00")
            existing.direction = get_mapped_value(row, norm_map, ["direction"], existing.direction or "UP")
            existing.city = get_mapped_value(row, norm_map, ["city"], existing.city or "Pune")
            existing.health_score = health
            existing.issue_type = get_mapped_value(row, norm_map, ["issue_type", "defect_type"], existing.issue_type)
            existing.severity = sev
            existing.last_maintenance_date = get_mapped_value(row, norm_map, ["last_maintenance_date"], existing.last_maintenance_date)
            existing.next_due_date = get_mapped_value(row, norm_map, ["next_due_date", "due_date"], existing.next_due_date)
            existing.estimated_duration_minutes = get_mapped_int(row, norm_map, ["estimated_duration_minutes", "duration_minutes"], existing.estimated_duration_minutes or 60)
            existing.maintenance_status = get_mapped_value(row, norm_map, ["maintenance_status", "status"], existing.maintenance_status or "Scheduled")
            existing.asset_criticality = get_mapped_value(row, norm_map, ["asset_criticality", "criticality"], existing.asset_criticality or "Medium")
            existing.safety_impact = get_mapped_value(row, norm_map, ["safety_impact"], existing.safety_impact or "Medium")
            existing.location_km = get_mapped_num(row, norm_map, ["location_km"], existing.location_km or 0.0)
            existing.recent_fault_count = get_mapped_int(row, norm_map, ["recent_fault_count"], existing.recent_fault_count or 0)
            existing.failure_history_count = get_mapped_int(row, norm_map, ["failure_history_count"], existing.failure_history_count or 0)
            existing.work_order_id = get_mapped_value(row, norm_map, ["work_order_id"], existing.work_order_id)
            updated_count += 1
        else:
            new_train = TrainSchedule(
                source_system="TMS",
                task_id=get_mapped_value(row, norm_map, ["task_id", "task_no"], None),
                asset_id=get_mapped_value(row, norm_map, ["asset_id", "track_asset_id"], None),
                city=get_mapped_value(row, norm_map, ["city"], "Pune"),
                track_section=track_section,
                asset_type=get_mapped_value(row, norm_map, ["asset_type"], "Track"),
                asset_condition=get_mapped_value(row, norm_map, ["asset_condition"], "Fair"),
                health_score=health,
                issue_type=get_mapped_value(row, norm_map, ["issue_type", "defect_type"], None),
                severity=sev,
                last_maintenance_date=get_mapped_value(row, norm_map, ["last_maintenance_date"], None),
                next_due_date=get_mapped_value(row, norm_map, ["next_due_date", "due_date"], None),
                estimated_duration_minutes=get_mapped_int(row, norm_map, ["estimated_duration_minutes", "duration_minutes"], 60),
                maintenance_status=get_mapped_value(row, norm_map, ["maintenance_status", "status"], "Scheduled"),
                asset_criticality=get_mapped_value(row, norm_map, ["asset_criticality", "criticality"], "Medium"),
                safety_impact=get_mapped_value(row, norm_map, ["safety_impact"], "Medium"),
                location_km=get_mapped_num(row, norm_map, ["location_km"], 0.0),
                recent_fault_count=get_mapped_int(row, norm_map, ["recent_fault_count"], 0),
                failure_history_count=get_mapped_int(row, norm_map, ["failure_history_count"], 0),
                work_order_id=get_mapped_value(row, norm_map, ["work_order_id"], None),
                train_id=train_id,
                train_name=train_name,
                train_type=get_mapped_value(row, norm_map, ["train_type"], "Express"),
                train_priority=get_mapped_value(row, norm_map, ["train_priority", "priority"], "High"),
                train_start_time=get_mapped_value(row, norm_map, ["train_start_time", "start_time", "departure_time"], "08:00"),
                train_end_time=get_mapped_value(row, norm_map, ["train_end_time", "end_time", "arrival_time"], "10:00"),
                direction=get_mapped_value(row, norm_map, ["direction"], "UP")
            )
            db.add(new_train)
            inserted_count += 1

    db.commit()
    return {
        "status": "success",
        "system": "TMS",
        "records_processed": len(df),
        "records_inserted": inserted_count,
        "records_updated": updated_count,
        "duplicates_handled": updated_count,
        "message": f"Successfully processed {len(df)} TMS train schedules ({inserted_count} new inserted, {updated_count} updated)."
    }

# ==========================================
# 2. SMMS (Signal Maintenance) Parser
# ==========================================
def parse_and_import_smms_csv(file_content_or_path, db: Session) -> dict:
    df = pd.read_csv(file_content_or_path)
    norm_map = normalize_column_map(df)

    # Required columns for SMMS
    required_field_groups = [
        ["task_id", "task_no", "work_item_id", "id"],
        ["asset_id", "signal_asset_id", "equipment_id"],
        ["track_section", "section", "location_section", "corridor"],
        ["asset_type", "signal_type", "equipment_type"],
        ["health_score", "health_index", "asset_health", "health"],
        ["issue_type", "fault_type", "defect_type"],
        ["severity", "fault_severity"]
    ]
    validate_required_columns(norm_map, required_field_groups, "SMMS (Signal Maintenance)", list(df.columns))

    inserted_count = 0
    updated_count = 0

    for _, row in df.iterrows():
        task_id = get_mapped_value(row, norm_map, ["task_id", "task_no", "work_item_id", "id"], f"SMMS-TSK-{inserted_count+1:04d}")
        asset_id = get_mapped_value(row, norm_map, ["asset_id", "signal_asset_id", "equipment_id"], f"SIG-PUNE-{inserted_count+1:04d}")
        track_section = get_mapped_value(row, norm_map, ["track_section", "section", "corridor"], "Pune Jn-Shivajinagar")
        health = get_mapped_num(row, norm_map, ["health_score", "health_index", "asset_health", "health"], 60.0)
        severity = get_mapped_value(row, norm_map, ["severity", "fault_severity"], "Medium")

        # Create temporary dummy task object to evaluate exact multi-factor priority score
        class DummyTask:
            pass
        t_temp = DummyTask()
        t_temp.health_score = health
        t_temp.recent_fault_count = get_mapped_int(row, norm_map, ["recent_fault_count"], 0)
        t_temp.failure_history_count = get_mapped_int(row, norm_map, ["failure_history_count"], 0)
        t_temp.severity = severity
        t_temp.next_due_date = get_mapped_value(row, norm_map, ["next_due_date", "due_date"], None)
        t_temp.maintenance_status = get_mapped_value(row, norm_map, ["maintenance_status", "status"], "Pending")
        t_temp.asset_criticality = get_mapped_value(row, norm_map, ["asset_criticality", "criticality"], "Medium")
        t_temp.safety_impact = get_mapped_value(row, norm_map, ["safety_impact"], "Medium")
        t_temp.track_section = track_section
        t_temp.power_shutdown_required = "No"

        score_res = calculate_task_priority(t_temp, "SMMS")
        final_p_score = score_res["final_priority_score"]
        risk_lvl = score_res["risk_level"]

        # Check for existing record
        existing = db.query(SignalMaintenance).filter(SignalMaintenance.task_id == task_id).first()
        if not existing:
            existing = db.query(SignalMaintenance).filter(
                (SignalMaintenance.asset_id == asset_id) & (SignalMaintenance.track_section == track_section)
            ).first()

        if existing:
            existing.asset_id = asset_id
            existing.city = get_mapped_value(row, norm_map, ["city"], existing.city or "Pune")
            existing.track_section = track_section
            existing.asset_type = get_mapped_value(row, norm_map, ["asset_type", "signal_type"], existing.asset_type)
            existing.asset_condition = get_mapped_value(row, norm_map, ["asset_condition"], existing.asset_condition or "Fair")
            existing.health_score = health
            existing.issue_type = get_mapped_value(row, norm_map, ["issue_type", "defect_type"], existing.issue_type)
            existing.severity = severity
            existing.last_maintenance_date = get_mapped_value(row, norm_map, ["last_maintenance_date"], existing.last_maintenance_date)
            existing.next_due_date = get_mapped_value(row, norm_map, ["next_due_date", "due_date"], existing.next_due_date)
            existing.estimated_duration_minutes = get_mapped_int(row, norm_map, ["estimated_duration_minutes", "duration_minutes"], existing.estimated_duration_minutes or 60)
            existing.maintenance_status = get_mapped_value(row, norm_map, ["maintenance_status", "status"], existing.maintenance_status or "Pending")
            existing.asset_criticality = get_mapped_value(row, norm_map, ["asset_criticality", "criticality"], existing.asset_criticality or "Medium")
            existing.safety_impact = get_mapped_value(row, norm_map, ["safety_impact"], existing.safety_impact or "Medium")
            existing.location_km = get_mapped_num(row, norm_map, ["location_km"], existing.location_km or 0.0)
            existing.recent_fault_count = t_temp.recent_fault_count
            existing.failure_history_count = t_temp.failure_history_count
            existing.work_order_id = get_mapped_value(row, norm_map, ["work_order_id"], existing.work_order_id)
            existing.priority_score = final_p_score
            existing.risk_level = risk_lvl
            updated_count += 1
        else:
            signal_task = SignalMaintenance(
                source_system="SMMS",
                task_id=task_id,
                asset_id=asset_id,
                city=get_mapped_value(row, norm_map, ["city"], "Pune"),
                track_section=track_section,
                asset_type=get_mapped_value(row, norm_map, ["asset_type", "signal_type"], "Panel Interlocking"),
                asset_condition=get_mapped_value(row, norm_map, ["asset_condition"], "Fair"),
                health_score=health,
                issue_type=get_mapped_value(row, norm_map, ["issue_type", "defect_type"], "Cable Fault"),
                severity=severity,
                last_maintenance_date=get_mapped_value(row, norm_map, ["last_maintenance_date"], None),
                next_due_date=get_mapped_value(row, norm_map, ["next_due_date", "due_date"], None),
                estimated_duration_minutes=get_mapped_int(row, norm_map, ["estimated_duration_minutes", "duration_minutes"], 60),
                maintenance_status=get_mapped_value(row, norm_map, ["maintenance_status", "status"], "Pending"),
                asset_criticality=get_mapped_value(row, norm_map, ["asset_criticality", "criticality"], "Medium"),
                safety_impact=get_mapped_value(row, norm_map, ["safety_impact"], "Medium"),
                location_km=get_mapped_num(row, norm_map, ["location_km"], 0.0),
                recent_fault_count=t_temp.recent_fault_count,
                failure_history_count=t_temp.failure_history_count,
                work_order_id=get_mapped_value(row, norm_map, ["work_order_id"], None),
                priority_score=final_p_score,
                risk_level=risk_lvl
            )
            db.add(signal_task)
            inserted_count += 1

    db.commit()
    return {
        "status": "success",
        "system": "SMMS",
        "records_processed": len(df),
        "records_inserted": inserted_count,
        "records_updated": updated_count,
        "duplicates_handled": updated_count,
        "message": f"Successfully processed {len(df)} signal tasks ({inserted_count} new inserted, {updated_count} updated)."
    }

# ==========================================
# 3. TDMS (Traction Maintenance) Parser
# ==========================================
def parse_and_import_tdms_csv(file_content_or_path, db: Session) -> dict:
    df = pd.read_csv(file_content_or_path)
    norm_map = normalize_column_map(df)

    # Required columns for TDMS
    required_field_groups = [
        ["task_id", "task_no", "work_item_id", "id"],
        ["asset_id", "traction_asset_id", "equipment_id", "ohe_asset_id"],
        ["track_section", "section", "location_section", "corridor"],
        ["asset_type", "traction_type", "equipment_type"],
        ["health_score", "health_index", "asset_health", "health"],
        ["issue_type", "fault_type", "defect_type"],
        ["severity", "fault_severity"]
    ]
    validate_required_columns(norm_map, required_field_groups, "TDMS (Traction Maintenance)", list(df.columns))

    inserted_count = 0
    updated_count = 0

    for _, row in df.iterrows():
        task_id = get_mapped_value(row, norm_map, ["task_id", "task_no", "work_item_id", "id"], f"TDMS-TSK-{inserted_count+1:04d}")
        asset_id = get_mapped_value(row, norm_map, ["asset_id", "traction_asset_id", "equipment_id", "ohe_asset_id"], f"OHE-{inserted_count+1:04d}")
        track_section = get_mapped_value(row, norm_map, ["track_section", "section", "corridor"], "Pune Jn-Shivajinagar")
        health = get_mapped_num(row, norm_map, ["health_score", "health_index", "asset_health", "health"], 60.0)
        severity = get_mapped_value(row, norm_map, ["severity", "fault_severity"], "Medium")
        power_shut = get_mapped_value(row, norm_map, ["power_shutdown_required", "power_shutdown", "power_cut"], "No")

        class DummyTask:
            pass
        t_temp = DummyTask()
        t_temp.health_score = health
        t_temp.recent_fault_count = get_mapped_int(row, norm_map, ["recent_fault_count"], 0)
        t_temp.failure_history_count = get_mapped_int(row, norm_map, ["failure_history_count"], 0)
        t_temp.severity = severity
        t_temp.next_due_date = get_mapped_value(row, norm_map, ["next_due_date", "due_date"], None)
        t_temp.maintenance_status = get_mapped_value(row, norm_map, ["maintenance_status", "status"], "Pending")
        t_temp.asset_criticality = get_mapped_value(row, norm_map, ["asset_criticality", "criticality"], "Medium")
        t_temp.safety_impact = get_mapped_value(row, norm_map, ["safety_impact"], "Medium")
        t_temp.track_section = track_section
        t_temp.power_shutdown_required = power_shut

        score_res = calculate_task_priority(t_temp, "TDMS")
        final_p_score = score_res["final_priority_score"]
        risk_lvl = score_res["risk_level"]

        # Check for existing record
        existing = db.query(TractionMaintenance).filter(TractionMaintenance.task_id == task_id).first()
        if not existing:
            existing = db.query(TractionMaintenance).filter(
                (TractionMaintenance.asset_id == asset_id) & (TractionMaintenance.track_section == track_section)
            ).first()

        if existing:
            existing.asset_id = asset_id
            existing.city = get_mapped_value(row, norm_map, ["city"], existing.city or "Pune")
            existing.track_section = track_section
            existing.asset_type = get_mapped_value(row, norm_map, ["asset_type", "traction_type"], existing.asset_type)
            existing.asset_condition = get_mapped_value(row, norm_map, ["asset_condition"], existing.asset_condition or "Fair")
            existing.health_score = health
            existing.issue_type = get_mapped_value(row, norm_map, ["issue_type", "defect_type"], existing.issue_type)
            existing.severity = severity
            existing.last_maintenance_date = get_mapped_value(row, norm_map, ["last_maintenance_date"], existing.last_maintenance_date)
            existing.next_due_date = get_mapped_value(row, norm_map, ["next_due_date", "due_date"], existing.next_due_date)
            existing.estimated_duration_minutes = get_mapped_int(row, norm_map, ["estimated_duration_minutes", "duration_minutes"], existing.estimated_duration_minutes or 60)
            existing.maintenance_status = get_mapped_value(row, norm_map, ["maintenance_status", "status"], existing.maintenance_status or "Pending")
            existing.asset_criticality = get_mapped_value(row, norm_map, ["asset_criticality", "criticality"], existing.asset_criticality or "Medium")
            existing.safety_impact = get_mapped_value(row, norm_map, ["safety_impact"], existing.safety_impact or "Medium")
            existing.location_km = get_mapped_num(row, norm_map, ["location_km"], existing.location_km or 0.0)
            existing.recent_fault_count = t_temp.recent_fault_count
            existing.failure_history_count = t_temp.failure_history_count
            existing.work_order_id = get_mapped_value(row, norm_map, ["work_order_id"], existing.work_order_id)
            existing.fault_status = get_mapped_value(row, norm_map, ["fault_status"], existing.fault_status or "Normal")
            existing.power_shutdown_required = power_shut
            existing.priority_score = final_p_score
            existing.risk_level = risk_lvl
            updated_count += 1
        else:
            traction_task = TractionMaintenance(
                source_system="TDMS",
                task_id=task_id,
                asset_id=asset_id,
                city=get_mapped_value(row, norm_map, ["city"], "Pune"),
                track_section=track_section,
                asset_type=get_mapped_value(row, norm_map, ["asset_type", "traction_type"], "OHE"),
                asset_condition=get_mapped_value(row, norm_map, ["asset_condition"], "Fair"),
                health_score=health,
                issue_type=get_mapped_value(row, norm_map, ["issue_type", "defect_type"], "Insulator Fault"),
                severity=severity,
                last_maintenance_date=get_mapped_value(row, norm_map, ["last_maintenance_date"], None),
                next_due_date=get_mapped_value(row, norm_map, ["next_due_date", "due_date"], None),
                estimated_duration_minutes=get_mapped_int(row, norm_map, ["estimated_duration_minutes", "duration_minutes"], 60),
                maintenance_status=get_mapped_value(row, norm_map, ["maintenance_status", "status"], "Pending"),
                asset_criticality=get_mapped_value(row, norm_map, ["asset_criticality", "criticality"], "Medium"),
                safety_impact=get_mapped_value(row, norm_map, ["safety_impact"], "Medium"),
                location_km=get_mapped_num(row, norm_map, ["location_km"], 0.0),
                recent_fault_count=t_temp.recent_fault_count,
                failure_history_count=t_temp.failure_history_count,
                work_order_id=get_mapped_value(row, norm_map, ["work_order_id"], None),
                fault_status=get_mapped_value(row, norm_map, ["fault_status"], "Normal"),
                power_shutdown_required=power_shut,
                priority_score=final_p_score,
                risk_level=risk_lvl
            )
            db.add(traction_task)
            inserted_count += 1

    db.commit()
    return {
        "status": "success",
        "system": "TDMS",
        "records_processed": len(df),
        "records_inserted": inserted_count,
        "records_updated": updated_count,
        "duplicates_handled": updated_count,
        "message": f"Successfully processed {len(df)} traction tasks ({inserted_count} new inserted, {updated_count} updated)."
    }

# ==========================================
# 4. Normalized / Merged Dataset Parser
# ==========================================
def parse_and_import_merged_csv(file_content_or_path, db: Session) -> dict:
    df = pd.read_csv(file_content_or_path)
    norm_map = normalize_column_map(df)

    required_field_groups = [
        ["track_section", "section", "corridor"]
    ]
    validate_required_columns(norm_map, required_field_groups, "Normalized Maintenance Dataset", list(df.columns))

    tms_ins, tms_up = 0, 0
    smms_ins, smms_up = 0, 0
    tdms_ins, tdms_up = 0, 0

    for _, row in df.iterrows():
        source = get_mapped_value(row, norm_map, ["source_system", "source"], "").upper()
        train_id = get_mapped_value(row, norm_map, ["train_id", "train_no"], "")
        asset_id = get_mapped_value(row, norm_map, ["asset_id"], "")
        task_id = get_mapped_value(row, norm_map, ["task_id", "id"], "")
        track_section = get_mapped_value(row, norm_map, ["track_section", "section"], "Pune Jn-Shivajinagar")
        health = get_mapped_num(row, norm_map, ["health_score", "health"], 60.0)
        sev = get_mapped_value(row, norm_map, ["severity"], "Medium")

        class DummyTask:
            pass
        t_temp = DummyTask()
        t_temp.health_score = health
        t_temp.recent_fault_count = get_mapped_int(row, norm_map, ["recent_fault_count"], 0)
        t_temp.failure_history_count = get_mapped_int(row, norm_map, ["failure_history_count"], 0)
        t_temp.severity = sev
        t_temp.next_due_date = get_mapped_value(row, norm_map, ["next_due_date", "due_date"], None)
        t_temp.maintenance_status = get_mapped_value(row, norm_map, ["maintenance_status", "status"], "Pending")
        t_temp.asset_criticality = get_mapped_value(row, norm_map, ["asset_criticality", "criticality"], "Medium")
        t_temp.safety_impact = get_mapped_value(row, norm_map, ["safety_impact"], "Medium")
        t_temp.track_section = track_section
        t_temp.power_shutdown_required = get_mapped_value(row, norm_map, ["power_shutdown_required"], "No")

        if source == "TMS" or (train_id != "" and get_mapped_value(row, norm_map, ["train_start_time"]) != ""):
            actual_train_id = train_id if train_id != "" else f"TRN-{tms_ins+1:04d}"
            existing = db.query(TrainSchedule).filter(
                (TrainSchedule.train_id == actual_train_id) & (TrainSchedule.track_section == track_section)
            ).first()
            if not existing:
                existing = db.query(TrainSchedule).filter(TrainSchedule.train_id == actual_train_id).first()

            if existing:
                existing.train_name = get_mapped_value(row, norm_map, ["train_name"], existing.train_name)
                existing.track_section = track_section
                existing.train_type = get_mapped_value(row, norm_map, ["train_type"], existing.train_type or "Express")
                existing.train_priority = get_mapped_value(row, norm_map, ["train_priority"], existing.train_priority or "High")
                existing.train_start_time = get_mapped_value(row, norm_map, ["train_start_time"], existing.train_start_time or "08:00")
                existing.train_end_time = get_mapped_value(row, norm_map, ["train_end_time"], existing.train_end_time or "10:00")
                existing.direction = get_mapped_value(row, norm_map, ["direction"], existing.direction or "UP")
                existing.health_score = health
                existing.issue_type = get_mapped_value(row, norm_map, ["issue_type"], existing.issue_type)
                existing.severity = sev
                tms_up += 1
            else:
                new_trn = TrainSchedule(
                    source_system="TMS",
                    task_id=task_id or None,
                    asset_id=asset_id or None,
                    city=get_mapped_value(row, norm_map, ["city"], "Pune"),
                    track_section=track_section,
                    asset_type=get_mapped_value(row, norm_map, ["asset_type"], "Track"),
                    asset_condition=get_mapped_value(row, norm_map, ["asset_condition"], "Fair"),
                    health_score=health,
                    issue_type=get_mapped_value(row, norm_map, ["issue_type"], None),
                    severity=sev,
                    last_maintenance_date=get_mapped_value(row, norm_map, ["last_maintenance_date"], None),
                    next_due_date=get_mapped_value(row, norm_map, ["next_due_date"], None),
                    estimated_duration_minutes=get_mapped_int(row, norm_map, ["estimated_duration_minutes"], 60),
                    maintenance_status=get_mapped_value(row, norm_map, ["maintenance_status"], "Scheduled"),
                    asset_criticality=get_mapped_value(row, norm_map, ["asset_criticality"], "Medium"),
                    safety_impact=get_mapped_value(row, norm_map, ["safety_impact"], "Medium"),
                    location_km=get_mapped_num(row, norm_map, ["location_km"], 0.0),
                    recent_fault_count=t_temp.recent_fault_count,
                    failure_history_count=t_temp.failure_history_count,
                    work_order_id=get_mapped_value(row, norm_map, ["work_order_id"], None),
                    train_id=actual_train_id,
                    train_name=get_mapped_value(row, norm_map, ["train_name"], "Express Service"),
                    train_type=get_mapped_value(row, norm_map, ["train_type"], "Express"),
                    train_priority=get_mapped_value(row, norm_map, ["train_priority"], "High"),
                    train_start_time=get_mapped_value(row, norm_map, ["train_start_time"], "08:00"),
                    train_end_time=get_mapped_value(row, norm_map, ["train_end_time"], "10:00"),
                    direction=get_mapped_value(row, norm_map, ["direction"], "UP")
                )
                db.add(new_trn)
                tms_ins += 1

        elif source == "TDMS" or "OHE" in str(asset_id).upper() or "TRC" in str(asset_id).upper() or get_mapped_value(row, norm_map, ["power_shutdown_required"]) != "":
            actual_task_id = task_id if task_id != "" else f"TDMS-TSK-{tdms_ins+1:04d}"
            actual_asset_id = asset_id if asset_id != "" else f"OHE-{tdms_ins+1:04d}"
            score_res = calculate_task_priority(t_temp, "TDMS")
            
            existing = db.query(TractionMaintenance).filter(TractionMaintenance.task_id == actual_task_id).first()
            if not existing:
                existing = db.query(TractionMaintenance).filter(
                    (TractionMaintenance.asset_id == actual_asset_id) & (TractionMaintenance.track_section == track_section)
                ).first()

            if existing:
                existing.asset_type = get_mapped_value(row, norm_map, ["asset_type"], existing.asset_type)
                existing.health_score = health
                existing.issue_type = get_mapped_value(row, norm_map, ["issue_type"], existing.issue_type)
                existing.severity = sev
                existing.power_shutdown_required = t_temp.power_shutdown_required
                existing.maintenance_status = t_temp.maintenance_status
                existing.priority_score = score_res["final_priority_score"]
                existing.risk_level = score_res["risk_level"]
                tdms_up += 1
            else:
                new_trc = TractionMaintenance(
                    source_system="TDMS",
                    task_id=actual_task_id,
                    asset_id=actual_asset_id,
                    city=get_mapped_value(row, norm_map, ["city"], "Pune"),
                    track_section=track_section,
                    asset_type=get_mapped_value(row, norm_map, ["asset_type"], "OHE"),
                    asset_condition=get_mapped_value(row, norm_map, ["asset_condition"], "Fair"),
                    health_score=health,
                    issue_type=get_mapped_value(row, norm_map, ["issue_type"], "Section Insulator Damage"),
                    severity=sev,
                    last_maintenance_date=get_mapped_value(row, norm_map, ["last_maintenance_date"], None),
                    next_due_date=get_mapped_value(row, norm_map, ["next_due_date"], None),
                    estimated_duration_minutes=get_mapped_int(row, norm_map, ["estimated_duration_minutes"], 60),
                    maintenance_status=t_temp.maintenance_status,
                    asset_criticality=t_temp.asset_criticality,
                    safety_impact=t_temp.safety_impact,
                    location_km=get_mapped_num(row, norm_map, ["location_km"], 0.0),
                    recent_fault_count=t_temp.recent_fault_count,
                    failure_history_count=t_temp.failure_history_count,
                    work_order_id=get_mapped_value(row, norm_map, ["work_order_id"], None),
                    fault_status=get_mapped_value(row, norm_map, ["fault_status"], "Normal"),
                    power_shutdown_required=t_temp.power_shutdown_required,
                    priority_score=score_res["final_priority_score"],
                    risk_level=score_res["risk_level"]
                )
                db.add(new_trc)
                tdms_ins += 1

        else:
            actual_task_id = task_id if task_id != "" else f"SMMS-TSK-{smms_ins+1:04d}"
            actual_asset_id = asset_id if asset_id != "" else f"SIG-PUNE-{smms_ins+1:04d}"
            score_res = calculate_task_priority(t_temp, "SMMS")

            existing = db.query(SignalMaintenance).filter(SignalMaintenance.task_id == actual_task_id).first()
            if not existing:
                existing = db.query(SignalMaintenance).filter(
                    (SignalMaintenance.asset_id == actual_asset_id) & (SignalMaintenance.track_section == track_section)
                ).first()

            if existing:
                existing.asset_type = get_mapped_value(row, norm_map, ["asset_type"], existing.asset_type)
                existing.health_score = health
                existing.issue_type = get_mapped_value(row, norm_map, ["issue_type"], existing.issue_type)
                existing.severity = sev
                existing.maintenance_status = t_temp.maintenance_status
                existing.priority_score = score_res["final_priority_score"]
                existing.risk_level = score_res["risk_level"]
                smms_up += 1
            else:
                new_sig = SignalMaintenance(
                    source_system="SMMS",
                    task_id=actual_task_id,
                    asset_id=actual_asset_id,
                    city=get_mapped_value(row, norm_map, ["city"], "Pune"),
                    track_section=track_section,
                    asset_type=get_mapped_value(row, norm_map, ["asset_type"], "Panel Interlocking"),
                    asset_condition=get_mapped_value(row, norm_map, ["asset_condition"], "Fair"),
                    health_score=health,
                    issue_type=get_mapped_value(row, norm_map, ["issue_type"], "Cable Fault"),
                    severity=sev,
                    last_maintenance_date=get_mapped_value(row, norm_map, ["last_maintenance_date"], None),
                    next_due_date=get_mapped_value(row, norm_map, ["next_due_date"], None),
                    estimated_duration_minutes=get_mapped_int(row, norm_map, ["estimated_duration_minutes"], 60),
                    maintenance_status=t_temp.maintenance_status,
                    asset_criticality=t_temp.asset_criticality,
                    safety_impact=t_temp.safety_impact,
                    location_km=get_mapped_num(row, norm_map, ["location_km"], 0.0),
                    recent_fault_count=t_temp.recent_fault_count,
                    failure_history_count=t_temp.failure_history_count,
                    work_order_id=get_mapped_value(row, norm_map, ["work_order_id"], None),
                    priority_score=score_res["final_priority_score"],
                    risk_level=score_res["risk_level"]
                )
                db.add(new_sig)
                smms_ins += 1

    db.commit()
    total_ins = tms_ins + smms_ins + tdms_ins
    total_up = tms_up + smms_up + tdms_up

    return {
        "status": "success",
        "system": "NORMALIZED_MERGED",
        "records_processed": len(df),
        "records_inserted": total_ins,
        "records_updated": total_up,
        "duplicates_handled": total_up,
        "tms_inserted": tms_ins,
        "tms_updated": tms_up,
        "smms_inserted": smms_ins,
        "smms_updated": smms_up,
        "tdms_inserted": tdms_ins,
        "tdms_updated": tdms_up,
        "message": f"Successfully parsed normalized dataset: {len(df)} rows processed ({total_ins} new inserted, {total_up} duplicates updated)."
    }

def parse_and_import_batch_csvs(
    db: Session,
    tms_file=None,
    smms_file=None,
    tdms_file=None
) -> dict:
    """Imports batch of TMS, SMMS, and TDMS CSV files together and returns full score calculation metrics."""
    results = {}
    total_processed = 0
    total_inserted = 0
    total_updated = 0
    warnings = []

    if tms_file:
        try:
            res_tms = parse_and_import_tms_csv(tms_file, db)
            results["tms"] = res_tms
            total_processed += res_tms["records_processed"]
            total_inserted += res_tms["records_inserted"]
            total_updated += res_tms.get("records_updated", 0)
        except Exception as e:
            warnings.append(f"TMS CSV Error: {str(e)}")

    if smms_file:
        try:
            res_smms = parse_and_import_smms_csv(smms_file, db)
            results["smms"] = res_smms
            total_processed += res_smms["records_processed"]
            total_inserted += res_smms["records_inserted"]
            total_updated += res_smms.get("records_updated", 0)
        except Exception as e:
            warnings.append(f"SMMS CSV Error: {str(e)}")

    if tdms_file:
        try:
            res_tdms = parse_and_import_tdms_csv(tdms_file, db)
            results["tdms"] = res_tdms
            total_processed += res_tdms["records_processed"]
            total_inserted += res_tdms["records_inserted"]
            total_updated += res_tdms.get("records_updated", 0)
        except Exception as e:
            warnings.append(f"TDMS CSV Error: {str(e)}")

    if not results and warnings:
        raise ValueError("; ".join(warnings))

    # Calculate aggregate scores summary
    ranked_tasks = get_all_ranked_tasks(db)
    crit_count = sum(1 for t in ranked_tasks if t["risk_level"] == "Critical")
    high_count = sum(1 for t in ranked_tasks if t["risk_level"] == "High")
    med_count = sum(1 for t in ranked_tasks if t["risk_level"] == "Medium")
    low_count = sum(1 for t in ranked_tasks if t["risk_level"] == "Low")

    avg_priority = round(sum(t["final_priority_score"] for t in ranked_tasks) / len(ranked_tasks), 2) if ranked_tasks else 0.0
    avg_risk = round(sum(t["ai_risk_score"] for t in ranked_tasks) / len(ranked_tasks), 2) if ranked_tasks else 0.0
    avg_deadline = round(sum(t["deadline_score"] for t in ranked_tasks) / len(ranked_tasks), 2) if ranked_tasks else 0.0
    avg_crit = round(sum(t["criticality_score"] for t in ranked_tasks) / len(ranked_tasks), 2) if ranked_tasks else 0.0

    return {
        "success": True,
        "system": "BATCH_MULTI_CSV",
        "records_processed": total_processed,
        "records_inserted": total_inserted,
        "records_updated": total_updated,
        "duplicates_handled": total_updated,
        "details": results,
        "warnings": warnings,
        "score_summary": {
            "total_ranked_tasks": len(ranked_tasks),
            "avg_priority_score": avg_priority,
            "avg_risk_score": avg_risk,
            "avg_deadline_score": avg_deadline,
            "avg_criticality_score": avg_crit,
            "critical_count": crit_count,
            "high_count": high_count,
            "medium_count": med_count,
            "low_count": low_count
        },
        "message": f"Successfully analysed {total_processed} total records across subsystems."
    }

def auto_detect_and_import_csv(file_content_or_path, db: Session, filename: str = "") -> dict:
    """Smart CSV detector that determines whether file is TMS, SMMS, TDMS, or Normalized based on filename and header columns."""
    df = pd.read_csv(file_content_or_path)
    if hasattr(file_content_or_path, "seek"):
        file_content_or_path.seek(0)

    norm_map = normalize_column_map(df)
    fn_lower = filename.lower()

    if "smms" in fn_lower or ("signal" in fn_lower and "tms" not in fn_lower and "merged" not in fn_lower):
        return parse_and_import_smms_csv(file_content_or_path, db)
    elif "tdms" in fn_lower or ("traction" in fn_lower and "merged" not in fn_lower):
        return parse_and_import_tdms_csv(file_content_or_path, db)
    elif "tms" in fn_lower and "merged" not in fn_lower:
        return parse_and_import_tms_csv(file_content_or_path, db)
    elif "merged" in fn_lower or "normalized" in fn_lower or "source_system" in norm_map:
        return parse_and_import_merged_csv(file_content_or_path, db)
    
    # Inspect columns
    if "power_shutdown_required" in norm_map or "fault_status" in norm_map:
        return parse_and_import_tdms_csv(file_content_or_path, db)
    elif "train_id" in norm_map and "train_start_time" in norm_map:
        return parse_and_import_tms_csv(file_content_or_path, db)
    elif "asset_id" in norm_map and ("signal" in norm_map.get("asset_type", "") or "interlocking" in norm_map.get("asset_type", "")):
        return parse_and_import_smms_csv(file_content_or_path, db)
    else:
        return parse_and_import_merged_csv(file_content_or_path, db)

def auto_seed_datasets_if_empty(db: Session):
    tms_count = db.query(TrainSchedule).count()
    smms_count = db.query(SignalMaintenance).count()
    tdms_count = db.query(TractionMaintenance).count()
    
    if tms_count > 0 and smms_count > 0 and tdms_count > 0:
        return {"status": "already_seeded", "tms": tms_count, "smms": smms_count, "tdms": tdms_count}
        
    dataset_dir = settings.DATASET_DIR
    if not os.path.exists(dataset_dir):
        return {"status": "dir_not_found", "path": dataset_dir}
        
    results = {}
    norm_file = os.path.join(dataset_dir, "normalized_maintenance_dataset.csv")
    if os.path.exists(norm_file) and (tms_count == 0 and smms_count == 0 and tdms_count == 0):
        results["normalized"] = parse_and_import_merged_csv(norm_file, db)
        return {"status": "seeded_from_normalized", "results": results}

    tms_file = os.path.join(dataset_dir, "tms_dataset.csv")
    if not os.path.exists(tms_file):
        tms_file = os.path.join(dataset_dir, "Pune_Division_TMS_Maintenance_Dataset.csv")
    if os.path.exists(tms_file) and tms_count == 0:
        results["tms"] = parse_and_import_tms_csv(tms_file, db)
        
    smms_file = os.path.join(dataset_dir, "smms_dataset.csv")
    if not os.path.exists(smms_file):
        smms_file = os.path.join(dataset_dir, "Pune_Division_Signal_Maintenance_Dataset.csv")
    if os.path.exists(smms_file) and smms_count == 0:
        results["smms"] = parse_and_import_smms_csv(smms_file, db)
        
    tdms_file = os.path.join(dataset_dir, "tdms_dataset.csv")
    if not os.path.exists(tdms_file):
        tdms_file = os.path.join(dataset_dir, "Pune_Division_TDMS_Maintenance_Dataset.csv")
    if os.path.exists(tdms_file) and tdms_count == 0:
        results["tdms"] = parse_and_import_tdms_csv(tdms_file, db)
        
    return {"status": "seeded", "results": results}
