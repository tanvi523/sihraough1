from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from datetime import datetime
from app.db.database import Base

class TrainSchedule(Base):
    __tablename__ = "train_schedules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    source_system = Column(String(50), default="TMS")
    task_id = Column(String(50), nullable=True)
    asset_id = Column(String(50), nullable=True)
    city = Column(String(100), default="Pune")
    track_section = Column(String(100), index=True)
    asset_type = Column(String(100), default="Track")
    asset_condition = Column(String(50), nullable=True)
    health_score = Column(Float, default=70.0)
    issue_type = Column(String(100), nullable=True)
    severity = Column(String(50), default="Medium")
    last_maintenance_date = Column(String(50), nullable=True)
    next_due_date = Column(String(50), nullable=True)
    estimated_duration_minutes = Column(Integer, default=60)
    maintenance_status = Column(String(50), default="Scheduled")
    asset_criticality = Column(String(50), default="Medium")
    safety_impact = Column(String(50), default="Medium")
    location_km = Column(Float, default=0.0)
    recent_fault_count = Column(Integer, default=0)
    failure_history_count = Column(Integer, default=0)
    work_order_id = Column(String(50), nullable=True)
    
    # Train specific fields
    train_id = Column(String(50), index=True)
    train_name = Column(String(100))
    train_type = Column(String(50), default="Express") # Passenger, Express, Superfast, Freight, Local
    train_priority = Column(String(50), default="High") # High, Medium, Low
    train_start_time = Column(String(20)) # HH:MM (e.g. 15:20)
    train_end_time = Column(String(20)) # HH:MM (e.g. 17:42)
    direction = Column(String(20), default="UP") # UP, DOWN
    created_at = Column(DateTime, default=datetime.utcnow)


class SignalMaintenance(Base):
    __tablename__ = "signal_maintenance"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    source_system = Column(String(50), default="SMMS")
    task_id = Column(String(50), index=True)
    asset_id = Column(String(50), index=True)
    city = Column(String(100), default="Pune")
    track_section = Column(String(100), index=True)
    asset_type = Column(String(100)) # Panel Interlocking, LC Interlocking, Block Instrument, Axle Counter
    asset_condition = Column(String(50), default="Fair") # Good, Fair, Poor, Critical
    health_score = Column(Float, default=60.0)
    issue_type = Column(String(100)) # Cable Fault, Axle Counter Reset Error, Communication Link Failure
    severity = Column(String(50), default="Medium") # Critical, High, Medium, Low
    last_maintenance_date = Column(String(50), nullable=True)
    next_due_date = Column(String(50), nullable=True)
    estimated_duration_minutes = Column(Integer, default=60)
    maintenance_status = Column(String(50), default="Pending") # Pending, Scheduled, In Progress, Completed
    asset_criticality = Column(String(50), default="Medium") # Critical, High, Medium, Low
    safety_impact = Column(String(50), default="Medium") # High, Medium, Low, None
    location_km = Column(Float, default=0.0)
    recent_fault_count = Column(Integer, default=0)
    failure_history_count = Column(Integer, default=0)
    work_order_id = Column(String(50), nullable=True)
    priority_score = Column(Float, default=50.0)
    risk_level = Column(String(50), default="Medium") # Critical, High, Medium, Low
    created_at = Column(DateTime, default=datetime.utcnow)


class TractionMaintenance(Base):
    __tablename__ = "traction_maintenance"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    source_system = Column(String(50), default="TDMS")
    task_id = Column(String(50), index=True)
    asset_id = Column(String(50), index=True)
    city = Column(String(100), default="Pune")
    track_section = Column(String(100), index=True)
    asset_type = Column(String(100)) # OHE, Feeder, Transformer, Sub-Station
    asset_condition = Column(String(50), default="Fair")
    health_score = Column(Float, default=60.0)
    issue_type = Column(String(100)) # Section Insulator Damage, Feeder Fault, Insulator Fault
    severity = Column(String(50), default="Medium")
    last_maintenance_date = Column(String(50), nullable=True)
    next_due_date = Column(String(50), nullable=True)
    estimated_duration_minutes = Column(Integer, default=60)
    maintenance_status = Column(String(50), default="Pending")
    asset_criticality = Column(String(50), default="Medium")
    safety_impact = Column(String(50), default="Medium")
    location_km = Column(Float, default=0.0)
    recent_fault_count = Column(Integer, default=0)
    failure_history_count = Column(Integer, default=0)
    work_order_id = Column(String(50), nullable=True)
    fault_status = Column(String(50), default="Normal")
    power_shutdown_required = Column(String(20), default="No") # Yes, No
    priority_score = Column(Float, default=50.0)
    risk_level = Column(String(50), default="Medium")
    created_at = Column(DateTime, default=datetime.utcnow)


class OptimizedBlock(Base):
    __tablename__ = "optimized_blocks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    block_code = Column(String(50), unique=True, index=True)
    track_section = Column(String(100), index=True)
    target_date = Column(String(50), default="2026-09-01")
    start_time = Column(String(20)) # HH:MM (e.g. 01:00)
    end_time = Column(String(20)) # HH:MM (e.g. 03:30)
    duration_minutes = Column(Integer, default=120)
    block_type = Column(String(100), default="Integrated Shadow Block")
    power_shutdown = Column(Boolean, default=False)
    tasks_included = Column(Text) # JSON serialized list of task IDs
    departments_involved = Column(String(100), default="TMS, SMMS, TDMS")
    affected_trains_count = Column(Integer, default=0)
    affected_trains_details = Column(Text, nullable=True) # JSON details
    delays_averted_minutes = Column(Integer, default=45)
    priority_score_cleared = Column(Float, default=0.0)
    status = Column(String(50), default="Proposed") # Proposed, Approved, Rejected, Completed
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PrioritizationSetting(Base):
    __tablename__ = "prioritization_settings"

    id = Column(Integer, primary_key=True, index=True)
    health_weight = Column(Float, default=0.30)
    safety_weight = Column(Float, default=0.25)
    urgency_weight = Column(Float, default=0.20)
    fault_history_weight = Column(Float, default=0.15)
    traffic_density_weight = Column(Float, default=0.10)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
