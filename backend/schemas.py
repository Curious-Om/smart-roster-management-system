from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


# -------------------------------------------------------------
# Pod Schemas
# -------------------------------------------------------------
class PodBase(BaseModel):
    name: str
    pod_lead_id: Optional[int] = None


class PodCreate(PodBase):
    pass


class PodUpdate(BaseModel):
    name: Optional[str] = None
    pod_lead_id: Optional[int] = None


class PodResponse(PodBase):
    id: int
    pod_lead_name: Optional[str] = None
    employee_count: Optional[int] = 0
    brand_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Employee Schemas
# -------------------------------------------------------------
class EmployeeBase(BaseModel):
    emp_code: str
    name: str
    role: str = "AGENT"  # AGENT, POD_LEAD, FLOATER
    pod_id: Optional[int] = None
    preferred_weekly_off: int = 6  # 0=Mon, 6=Sun
    max_daily_capacity: int = 100
    skills: List[str] = Field(default_factory=list)


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    emp_code: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    pod_id: Optional[int] = None
    preferred_weekly_off: Optional[int] = None
    max_daily_capacity: Optional[int] = None
    skills: Optional[List[str]] = None


class EmployeeResponse(EmployeeBase):
    id: int
    pod_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Brand Schemas
# -------------------------------------------------------------
class BrandBase(BaseModel):
    name: str
    pod_id: int
    staffing_type: str = "SINGLE_RESOURCE"  # SINGLE_RESOURCE, MULTI_RESOURCE


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: Optional[str] = None
    pod_id: Optional[int] = None
    staffing_type: Optional[str] = None


class BrandResponse(BrandBase):
    id: int
    pod_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Brand Process Rule Schemas
# -------------------------------------------------------------
class BrandProcessRuleBase(BaseModel):
    brand_id: int
    process_code: str  # CS, ACC, NDR, RET
    operating_calendar: str  # DAYS_365, DAILY_EXCEPT_HOLIDAYS, MON_SAT_EXCEPT_HOLIDAYS
    min_daily_staff: int = 1
    sunday_min_staff: int = 0


class BrandProcessRuleCreate(BrandProcessRuleBase):
    pass


class BrandProcessRuleUpdate(BaseModel):
    brand_id: Optional[int] = None
    process_code: Optional[str] = None
    operating_calendar: Optional[str] = None
    min_daily_staff: Optional[int] = None
    sunday_min_staff: Optional[int] = None


class BrandProcessRuleResponse(BrandProcessRuleBase):
    id: int
    brand_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Employee Assignment Schemas
# -------------------------------------------------------------
class EmployeeAssignmentBase(BaseModel):
    employee_id: int
    brand_id: int
    process_code: str
    allocation_pct: int = 100
    is_primary: bool = True


class EmployeeAssignmentCreate(EmployeeAssignmentBase):
    pass


class EmployeeAssignmentUpdate(BaseModel):
    employee_id: Optional[int] = None
    brand_id: Optional[int] = None
    process_code: Optional[str] = None
    allocation_pct: Optional[int] = None
    is_primary: Optional[bool] = None


class EmployeeAssignmentResponse(EmployeeAssignmentBase):
    id: int
    employee_name: Optional[str] = None
    brand_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Public Holiday Schemas
# -------------------------------------------------------------
class PublicHolidayBase(BaseModel):
    date: str  # YYYY-MM-DD
    name: str


class PublicHolidayCreate(PublicHolidayBase):
    pass


class PublicHolidayResponse(PublicHolidayBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Employee Leave Schemas
# -------------------------------------------------------------
class EmployeeLeaveBase(BaseModel):
    employee_id: int
    date: str  # YYYY-MM-DD
    leave_type: str = "PLANNED_LEAVE"  # PLANNED_LEAVE, EMERGENCY_LEAVE, COMP_OFF
    reason: Optional[str] = None


class EmployeeLeaveCreate(EmployeeLeaveBase):
    pass


class EmployeeLeaveUpdate(BaseModel):
    employee_id: Optional[int] = None
    date: Optional[str] = None
    leave_type: Optional[str] = None
    reason: Optional[str] = None


class EmployeeLeaveResponse(EmployeeLeaveBase):
    id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Roster Entry Schemas
# -------------------------------------------------------------
class RosterEntryBase(BaseModel):
    year_month: str
    date: str
    employee_id: int
    status: str
    is_override: bool = False
    backup_for_brand_id: Optional[int] = None
    backup_process_code: Optional[str] = None
    notes: Optional[str] = None


class RosterEntryCreate(RosterEntryBase):
    pass


class RosterEntryUpdate(BaseModel):
    status: Optional[str] = None
    is_override: Optional[bool] = None
    backup_for_brand_id: Optional[int] = None
    backup_process_code: Optional[str] = None
    notes: Optional[str] = None


class RosterEntryResponse(RosterEntryBase):
    id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    role: Optional[str] = None
    pod_id: Optional[int] = None
    pod_name: Optional[str] = None
    backup_for_brand_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Demo Reset / Summary Schemas
# -------------------------------------------------------------
class ResetDemoResponse(BaseModel):
    status: str
    message: str
    counts: Dict[str, int]


# -------------------------------------------------------------
# Conflict & Validation Schemas (Module 3B)
# -------------------------------------------------------------
class RecommendedCandidate(BaseModel):
    id: int
    emp_code: str
    name: str
    role: str
    current_utilization_pct: int


class RecommendedActionPayload(BaseModel):
    date: str
    employee_id: int
    employee_name: str
    brand_id: int
    brand_name: str
    process_code: str
    notes: Optional[str] = None


class RecommendedAction(BaseModel):
    action: str = "ASSIGN_BACKUP"
    label: str
    endpoint: str = "/api/roster/assign-backup"
    method: str = "POST"
    payload: RecommendedActionPayload
    candidate: RecommendedCandidate


class ConflictItem(BaseModel):
    id: str
    date: str
    severity: str  # CRITICAL | WARNING
    conflict_type: str
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    process_code: Optional[str] = None
    employee_id: Optional[int] = None
    employee_name: Optional[str] = None
    description: str
    ai_explanation: str
    recommended_actions: List[RecommendedAction] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class AssignBackupRequest(BaseModel):
    date: str
    employee_id: int
    brand_id: int
    process_code: str
    notes: Optional[str] = None


# -------------------------------------------------------------
# Module 4: Cell Update & Change Simulator Schemas
# -------------------------------------------------------------
class CellUpdateRequest(BaseModel):
    employee_id: int
    date: str  # YYYY-MM-DD
    status: str  # WORKING, LEAVE, WEEKLY_OFF, COMP_OFF, PUBLIC_HOLIDAY
    notes: Optional[str] = None
    leave_type: Optional[str] = "PLANNED_LEAVE"  # PLANNED_LEAVE, EMERGENCY_LEAVE, COMP_OFF
    reason: Optional[str] = None


class CellUpdateResponse(BaseModel):
    success: bool = True
    message: str
    entry: RosterEntryResponse
    date_conflicts: List[ConflictItem] = Field(default_factory=list)


class SimulateChangeRequest(BaseModel):
    employee_id: int
    date: str  # YYYY-MM-DD
    new_status: str  # WORKING, LEAVE, WEEKLY_OFF, etc.
    notes: Optional[str] = None


class ImpactedProcessCoverage(BaseModel):
    brand_id: int
    brand_name: str
    process_code: str
    required_staff: int
    current_active_staff: int
    simulated_active_staff: int
    coverage_maintained: bool
    gap_size: int
    recommended_backups: List[RecommendedAction] = Field(default_factory=list)


class SimulateChangeResponse(BaseModel):
    employee_id: int
    employee_name: str
    date: str
    current_status: str
    new_status: str
    can_maintain_coverage: bool
    impacted_processes: List[ImpactedProcessCoverage] = Field(default_factory=list)
    simulated_conflicts: List[ConflictItem] = Field(default_factory=list)
    ai_explanation: str
