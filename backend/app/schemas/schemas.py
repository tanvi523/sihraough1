from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- TMS Schemas ---
class TrainScheduleBase(BaseModel):
    train_id: str
    train_name: str
    train_type: str = "Express"
    train_priority: str = "High"
    track_section: str
    train_start_time: str
    train_end_time: str
    direction: str = "UP"
    city: Optional[str] = "Pune"
    asset_id: Optional[str] = None
    task_id: Optional[str] = None
    health_score: Optional[float] = 70.0
    issue_type: Optional[str] = None
    severity: Optional[str] = "Medium"
    last_maintenance_date: Optional[str] = None
    next_due_date: Optional[str] = None
    estimated_duration_minutes: Optional[int] = 60
    maintenance_status: Optional[str] = "Scheduled"
    asset_criticality: Optional[str] = "Medium"
    safety_impact: Optional[str] = "Medium"
    location_km: Optional[float] = 0.0
    recent_fault_count: Optional[int] = 0
    failure_history_count: Optional[int] = 0
    work_order_id: Optional[str] = None

class TrainScheduleCreate(TrainScheduleBase):
    pass

class TrainScheduleOut(TrainScheduleBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- SMMS Schemas ---
class SignalMaintenanceBase(BaseModel):
    task_id: str
    asset_id: str
    city: str = "Pune"
    track_section: str
    asset_type: str
    asset_condition: str = "Fair"
    health_score: float = 60.0
    issue_type: str
    severity: str = "Medium"
    last_maintenance_date: Optional[str] = None
    next_due_date: Optional[str] = None
    estimated_duration_minutes: int = 60
    maintenance_status: str = "Pending"
    asset_criticality: str = "Medium"
    safety_impact: str = "Medium"
    location_km: float = 0.0
    recent_fault_count: int = 0
    failure_history_count: int = 0
    work_order_id: Optional[str] = None

class SignalMaintenanceCreate(SignalMaintenanceBase):
    pass

class SignalMaintenanceOut(SignalMaintenanceBase):
    id: int
    priority_score: float = 50.0
    risk_level: str = "Medium"
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- TDMS Schemas ---
class TractionMaintenanceBase(BaseModel):
    task_id: str
    asset_id: str
    city: str = "Pune"
    track_section: str
    asset_type: str
    asset_condition: str = "Fair"
    health_score: float = 60.0
    issue_type: str
    severity: str = "Medium"
    last_maintenance_date: Optional[str] = None
    next_due_date: Optional[str] = None
    estimated_duration_minutes: int = 60
    maintenance_status: str = "Pending"
    asset_criticality: str = "Medium"
    safety_impact: str = "Medium"
    location_km: float = 0.0
    recent_fault_count: int = 0
    failure_history_count: int = 0
    work_order_id: Optional[str] = None
    fault_status: str = "Normal"
    power_shutdown_required: str = "No"

class TractionMaintenanceCreate(TractionMaintenanceBase):
    pass

class TractionMaintenanceOut(TractionMaintenanceBase):
    id: int
    priority_score: float = 50.0
    risk_level: str = "Medium"
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Prioritizer Schemas ---
class PrioritizationWeightsSchema(BaseModel):
    health_weight: float = Field(0.30, ge=0.0, le=1.0)
    safety_weight: float = Field(0.25, ge=0.0, le=1.0)
    urgency_weight: float = Field(0.20, ge=0.0, le=1.0)
    fault_history_weight: float = Field(0.15, ge=0.0, le=1.0)
    traffic_density_weight: float = Field(0.10, ge=0.0, le=1.0)

class RankedTaskItem(BaseModel):
    source: str # TMS, SMMS, TDMS
    task_id: str
    asset_id: str
    track_section: str
    asset_type: str
    issue_type: str
    severity: str
    health_score: float
    estimated_duration_minutes: int
    power_shutdown_required: str = "No"
    maintenance_status: str
    next_due_date: Optional[str] = None
    ai_risk_score: Optional[float] = 50.0
    deadline_score: Optional[float] = 50.0
    criticality_score: Optional[float] = 50.0
    final_priority_score: Optional[float] = 50.0
    priority_score: float
    risk_level: str # Critical, High, Medium, Low
    scoring_breakdown: Dict[str, Any]
    work_order_id: Optional[str] = None
    location_km: Optional[float] = 0.0


# --- Train Conflict Detection Schemas ---
class TrainConflictItem(BaseModel):
    train_id: str
    train_name: str
    train_type: str
    train_priority: str
    direction: str
    train_start_time: str
    train_end_time: str
    overlap_minutes: int
    impact_level: str

class MaintenanceWindowSlot(BaseModel):
    start_time: str
    end_time: str
    duration_minutes: int
    window_type: str # Night Off-Peak, Daytime Gap, Shadow Window
    is_recommended: bool = False
    notes: Optional[str] = None

class TaskConflictReport(BaseModel):
    task_id: str
    asset_id: str
    source: str # SMMS, TDMS, TMS
    track_section: str
    asset_type: str
    issue_type: str
    severity: str
    estimated_duration_minutes: int
    power_shutdown_required: str
    final_priority_score: float
    tested_window_start: str
    tested_window_end: str
    conflicting_trains_count: int
    conflicting_trains: List[TrainConflictItem]
    conflict_severity: str # Critical (Red), High (Orange), Medium (Yellow), Clear (Green)
    earliest_available_window: Optional[MaintenanceWindowSlot] = None
    recommended_window: Optional[MaintenanceWindowSlot] = None
    available_windows_count: int
    available_windows: List[MaintenanceWindowSlot]

class ConflictSimulationRequest(BaseModel):
    task_id: Optional[str] = None
    track_section: str
    start_time: str = "09:00"
    end_time: str = "11:00"
    duration_minutes: Optional[int] = 120
    power_shutdown_required: Optional[str] = "No"

class ConflictSimulationResult(BaseModel):
    track_section: str
    tested_window: str
    duration_minutes: int
    conflicting_trains_count: int
    conflict_severity: str
    conflicting_trains: List[TrainConflictItem]
    earliest_available_window: Optional[MaintenanceWindowSlot] = None
    recommended_window: Optional[MaintenanceWindowSlot] = None
    available_windows: List[MaintenanceWindowSlot]
    delay_impact_estimate_minutes: int


# --- Optimizer Schemas ---
class OptimizationRunRequest(BaseModel):
    target_date: str = "2026-09-01"
    objective: str = "balanced"
    max_concurrent_blocks: int = 2
    preferred_window: str = "all"
    allow_power_shutdown_joint: bool = True
    train_headway_buffer_minutes: int = 15
    selected_task_ids: Optional[List[str]] = None

class AffectedTrainDetail(BaseModel):
    train_id: str
    train_name: str
    train_type: str
    original_start: str
    original_end: str
    direction: str
    action_taken: str
    delay_impact_minutes: int

class BlockPlanItem(BaseModel):
    id: Optional[int] = None
    block_code: str
    track_section: str
    target_date: str
    start_time: str
    end_time: str
    duration_minutes: int
    block_type: str
    power_shutdown: bool
    tasks_included: List[Dict[str, Any]]
    departments_involved: List[str]
    affected_trains_count: int
    affected_trains_details: List[AffectedTrainDetail]
    delays_averted_minutes: int
    priority_score_cleared: float
    status: str = "Proposed"
    notes: Optional[str] = None

class OptimizationResult(BaseModel):
    job_id: str
    target_date: str
    objective: str
    blocks_generated: int
    total_tasks_scheduled: int
    total_tasks_in_pool: Optional[int] = None
    block_utilization_pct: Optional[float] = None
    sections_covered: Optional[int] = None
    total_maintenance_minutes: int
    estimated_delay_savings_minutes: int
    punctuality_preservation_score: float
    conflicts_detected: int
    conflicts_resolved: int
    blocks: List[BlockPlanItem]


# --- Analytics Schemas ---
class DashboardOverviewStats(BaseModel):
    total_trains: int
    total_signal_tasks: int
    total_traction_tasks: int
    urgent_critical_faults: int
    scheduled_blocks_count: int
    delays_saved_minutes: int
    punctuality_index: float
    average_asset_health: float
    power_blocks_active: int
    pending_work_orders: int

class SectionCongestionItem(BaseModel):
    section: str
    train_count: int
    maintenance_task_count: int
    congestion_score: float
    status: str

class UploadResponse(BaseModel):
    success: bool
    system: str
    records_processed: int
    records_inserted: int
    records_updated: int = 0
    duplicates_handled: int = 0
    warnings: List[str] = []
    message: str
    score_summary: Optional[Dict[str, Any]] = None
    details: Optional[Dict[str, Any]] = None

