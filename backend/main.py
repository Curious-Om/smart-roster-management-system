import os
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.database import engine, get_db, Base
from backend.models import (
    Pod,
    Employee,
    Brand,
    BrandProcessRule,
    EmployeeAssignment,
    PublicHoliday,
    EmployeeLeave,
    RosterEntry,
    RosterStatus
)
from backend.schemas import (
    PodCreate,
    PodUpdate,
    PodResponse,
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    BrandCreate,
    BrandUpdate,
    BrandResponse,
    BrandProcessRuleCreate,
    BrandProcessRuleUpdate,
    BrandProcessRuleResponse,
    EmployeeAssignmentCreate,
    EmployeeAssignmentUpdate,
    EmployeeAssignmentResponse,
    PublicHolidayCreate,
    PublicHolidayResponse,
    EmployeeLeaveCreate,
    EmployeeLeaveUpdate,
    EmployeeLeaveResponse,
    RosterEntryCreate,
    RosterEntryUpdate,
    RosterEntryResponse,
    ResetDemoResponse,
    ConflictItem,
    AssignBackupRequest,
    CellUpdateRequest,
    CellUpdateResponse,
    SimulateChangeRequest,
    SimulateChangeResponse
)
from backend.seed import seed_data
from backend.services.scheduler import generate_monthly_roster
from backend.services.validator import validate_roster
from backend.services.simulator import apply_cell_update, simulate_roster_change


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed baseline if empty
    Base.metadata.create_all(bind=engine)
    from backend.database import SessionLocal
    db = SessionLocal()
    try:
        emp_count = db.query(Employee).count()
        if emp_count == 0:
            print("Database empty. Auto-seeding initial November 2026 dataset...")
            seed_data(db)
            generate_monthly_roster(db, "2026-11")
            print("Auto-seeding and roster generation complete.")
    finally:
        db.close()
    yield
    # Shutdown logic if any


app = FastAPI(
    title="Smart Roster Management System API",
    description="Enterprise D2C Operations Roster Management System for 32+ employees, 20 brands, and 3 pods.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for all origins as requested
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Health & Root Endpoints
# ============================================================================
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")


@app.get("/")
def read_root():
    if os.path.exists(FRONTEND_DIST) and os.path.exists(os.path.join(FRONTEND_DIST, "index.html")):
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
    return {
        "status": "online",
        "app": "Smart Roster Management System API",
        "version": "1.0.0",
        "docs_url": "/docs"
    }


@app.get("/api/health")
def health_check():
    return {"status": "ok", "healthy": True}


# ============================================================================
# Demo Reset Endpoint
# ============================================================================
@app.post("/api/reset-demo", response_model=ResetDemoResponse)
def reset_demo(db: Session = Depends(get_db)):
    """
    Clears all tables and re-seeds the exact November 2026 dataset:
    3 Pods, 32 Employees, 20 Brands, Rules, Assignments, Holidays, Leaves, and 960 Roster Entries.
    """
    try:
        counts = seed_data(db)
        roster_res = generate_monthly_roster(db, "2026-11")
        counts["roster_entries"] = roster_res["entries_count"]
        return ResetDemoResponse(
            status="success",
            message="Demo dataset and November 2026 roster successfully reset to baseline.",
            counts=counts
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset demo dataset: {str(e)}"
        )


# ============================================================================
# Pods CRUD Endpoints
# ============================================================================
def _serialize_pod(pod: Pod) -> PodResponse:
    return PodResponse(
        id=pod.id,
        name=pod.name,
        pod_lead_id=pod.pod_lead_id,
        pod_lead_name=pod.pod_lead.name if pod.pod_lead else None,
        employee_count=len(pod.employees) if pod.employees else 0,
        brand_count=len(pod.brands) if pod.brands else 0
    )


@app.get("/api/pods", response_model=List[PodResponse])
def get_pods(db: Session = Depends(get_db)):
    pods = db.query(Pod).all()
    return [_serialize_pod(p) for p in pods]


@app.get("/api/pods/{pod_id}", response_model=PodResponse)
def get_pod(pod_id: int, db: Session = Depends(get_db)):
    pod = db.query(Pod).filter(Pod.id == pod_id).first()
    if not pod:
        raise HTTPException(status_code=404, detail="Pod not found")
    return _serialize_pod(pod)


@app.post("/api/pods", response_model=PodResponse, status_code=status.HTTP_201_CREATED)
def create_pod(pod_in: PodCreate, db: Session = Depends(get_db)):
    existing = db.query(Pod).filter(Pod.name == pod_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Pod with this name already exists")
    
    pod = Pod(name=pod_in.name, pod_lead_id=pod_in.pod_lead_id)
    db.add(pod)
    db.commit()
    db.refresh(pod)
    return _serialize_pod(pod)


@app.put("/api/pods/{pod_id}", response_model=PodResponse)
def update_pod(pod_id: int, pod_in: PodUpdate, db: Session = Depends(get_db)):
    pod = db.query(Pod).filter(Pod.id == pod_id).first()
    if not pod:
        raise HTTPException(status_code=404, detail="Pod not found")
    
    if pod_in.name is not None:
        name_check = db.query(Pod).filter(Pod.name == pod_in.name, Pod.id != pod_id).first()
        if name_check:
            raise HTTPException(status_code=400, detail="Another pod with this name already exists")
        pod.name = pod_in.name
    
    if pod_in.pod_lead_id is not None:
        pod.pod_lead_id = pod_in.pod_lead_id

    db.commit()
    db.refresh(pod)
    return _serialize_pod(pod)


@app.delete("/api/pods/{pod_id}", status_code=status.HTTP_200_OK)
def delete_pod(pod_id: int, db: Session = Depends(get_db)):
    pod = db.query(Pod).filter(Pod.id == pod_id).first()
    if not pod:
        raise HTTPException(status_code=404, detail="Pod not found")
    db.delete(pod)
    db.commit()
    return {"status": "success", "message": f"Pod '{pod.name}' deleted"}


# ============================================================================
# Employees CRUD Endpoints
# ============================================================================
def _serialize_employee(emp: Employee) -> EmployeeResponse:
    return EmployeeResponse(
        id=emp.id,
        emp_code=emp.emp_code,
        name=emp.name,
        role=emp.role,
        pod_id=emp.pod_id,
        pod_name=emp.pod.name if emp.pod else None,
        preferred_weekly_off=emp.preferred_weekly_off,
        max_daily_capacity=emp.max_daily_capacity,
        skills=emp.skills or []
    )


@app.get("/api/employees", response_model=List[EmployeeResponse])
def get_employees(
    pod_id: Optional[int] = Query(None, description="Filter by Pod ID"),
    role: Optional[str] = Query(None, description="Filter by Role"),
    db: Session = Depends(get_db)
):
    query = db.query(Employee)
    if pod_id is not None:
        query = query.filter(Employee.pod_id == pod_id)
    if role is not None:
        query = query.filter(Employee.role == role)
    employees = query.all()
    return [_serialize_employee(e) for e in employees]


@app.get("/api/employees/{employee_id}", response_model=EmployeeResponse)
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return _serialize_employee(emp)


@app.post("/api/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(emp_in: EmployeeCreate, db: Session = Depends(get_db)):
    existing = db.query(Employee).filter(Employee.emp_code == emp_in.emp_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee with this code already exists")
    
    if emp_in.pod_id is not None:
        pod = db.query(Pod).filter(Pod.id == emp_in.pod_id).first()
        if not pod:
            raise HTTPException(status_code=400, detail="Specified Pod does not exist")

    emp = Employee(
        emp_code=emp_in.emp_code,
        name=emp_in.name,
        role=emp_in.role,
        pod_id=emp_in.pod_id,
        preferred_weekly_off=emp_in.preferred_weekly_off,
        max_daily_capacity=emp_in.max_daily_capacity,
        skills=emp_in.skills
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return _serialize_employee(emp)


@app.put("/api/employees/{employee_id}", response_model=EmployeeResponse)
def update_employee(employee_id: int, emp_in: EmployeeUpdate, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if emp_in.emp_code is not None:
        code_check = db.query(Employee).filter(Employee.emp_code == emp_in.emp_code, Employee.id != employee_id).first()
        if code_check:
            raise HTTPException(status_code=400, detail="Another employee with this code exists")
        emp.emp_code = emp_in.emp_code

    if emp_in.name is not None:
        emp.name = emp_in.name
    if emp_in.role is not None:
        emp.role = emp_in.role
    if emp_in.pod_id is not None:
        pod = db.query(Pod).filter(Pod.id == emp_in.pod_id).first()
        if not pod:
            raise HTTPException(status_code=400, detail="Specified Pod does not exist")
        emp.pod_id = emp_in.pod_id
    if emp_in.preferred_weekly_off is not None:
        emp.preferred_weekly_off = emp_in.preferred_weekly_off
    if emp_in.max_daily_capacity is not None:
        emp.max_daily_capacity = emp_in.max_daily_capacity
    if emp_in.skills is not None:
        emp.skills = emp_in.skills

    db.commit()
    db.refresh(emp)
    return _serialize_employee(emp)


@app.delete("/api/employees/{employee_id}", status_code=status.HTTP_200_OK)
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(emp)
    db.commit()
    return {"status": "success", "message": f"Employee '{emp.name}' ({emp.emp_code}) deleted"}


# ============================================================================
# Brands CRUD Endpoints
# ============================================================================
def _serialize_brand(brand: Brand) -> BrandResponse:
    return BrandResponse(
        id=brand.id,
        name=brand.name,
        pod_id=brand.pod_id,
        pod_name=brand.pod.name if brand.pod else None,
        staffing_type=brand.staffing_type
    )


@app.get("/api/brands", response_model=List[BrandResponse])
def get_brands(
    pod_id: Optional[int] = Query(None, description="Filter by Pod ID"),
    staffing_type: Optional[str] = Query(None, description="Filter by Staffing Type"),
    db: Session = Depends(get_db)
):
    query = db.query(Brand)
    if pod_id is not None:
        query = query.filter(Brand.pod_id == pod_id)
    if staffing_type is not None:
        query = query.filter(Brand.staffing_type == staffing_type)
    brands = query.all()
    return [_serialize_brand(b) for b in brands]


@app.get("/api/brands/{brand_id}", response_model=BrandResponse)
def get_brand(brand_id: int, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return _serialize_brand(brand)


@app.post("/api/brands", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
def create_brand(brand_in: BrandCreate, db: Session = Depends(get_db)):
    existing = db.query(Brand).filter(Brand.name == brand_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Brand with this name already exists")

    pod = db.query(Pod).filter(Pod.id == brand_in.pod_id).first()
    if not pod:
        raise HTTPException(status_code=400, detail="Specified Pod does not exist")

    brand = Brand(
        name=brand_in.name,
        pod_id=brand_in.pod_id,
        staffing_type=brand_in.staffing_type
    )
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return _serialize_brand(brand)


@app.put("/api/brands/{brand_id}", response_model=BrandResponse)
def update_brand(brand_id: int, brand_in: BrandUpdate, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    if brand_in.name is not None:
        name_check = db.query(Brand).filter(Brand.name == brand_in.name, Brand.id != brand_id).first()
        if name_check:
            raise HTTPException(status_code=400, detail="Another brand with this name exists")
        brand.name = brand_in.name

    if brand_in.pod_id is not None:
        pod = db.query(Pod).filter(Pod.id == brand_in.pod_id).first()
        if not pod:
            raise HTTPException(status_code=400, detail="Specified Pod does not exist")
        brand.pod_id = brand_in.pod_id

    if brand_in.staffing_type is not None:
        brand.staffing_type = brand_in.staffing_type

    db.commit()
    db.refresh(brand)
    return _serialize_brand(brand)


@app.delete("/api/brands/{brand_id}", status_code=status.HTTP_200_OK)
def delete_brand(brand_id: int, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    db.delete(brand)
    db.commit()
    return {"status": "success", "message": f"Brand '{brand.name}' deleted"}


# ============================================================================
# Brand Process Rules CRUD Endpoints
# ============================================================================
def _serialize_rule(rule: BrandProcessRule) -> BrandProcessRuleResponse:
    return BrandProcessRuleResponse(
        id=rule.id,
        brand_id=rule.brand_id,
        brand_name=rule.brand.name if rule.brand else None,
        process_code=rule.process_code,
        operating_calendar=rule.operating_calendar,
        min_daily_staff=rule.min_daily_staff,
        sunday_min_staff=rule.sunday_min_staff
    )


@app.get("/api/process-rules", response_model=List[BrandProcessRuleResponse])
def get_process_rules(
    brand_id: Optional[int] = Query(None, description="Filter by Brand ID"),
    db: Session = Depends(get_db)
):
    query = db.query(BrandProcessRule)
    if brand_id is not None:
        query = query.filter(BrandProcessRule.brand_id == brand_id)
    rules = query.all()
    return [_serialize_rule(r) for r in rules]


@app.get("/api/process-rules/{rule_id}", response_model=BrandProcessRuleResponse)
def get_process_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = db.query(BrandProcessRule).filter(BrandProcessRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Process rule not found")
    return _serialize_rule(rule)


@app.post("/api/process-rules", response_model=BrandProcessRuleResponse, status_code=status.HTTP_201_CREATED)
def create_process_rule(rule_in: BrandProcessRuleCreate, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == rule_in.brand_id).first()
    if not brand:
        raise HTTPException(status_code=400, detail="Specified Brand does not exist")

    existing = db.query(BrandProcessRule).filter(
        BrandProcessRule.brand_id == rule_in.brand_id,
        BrandProcessRule.process_code == rule_in.process_code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Process rule for this brand and process code already exists")

    rule = BrandProcessRule(
        brand_id=rule_in.brand_id,
        process_code=rule_in.process_code,
        operating_calendar=rule_in.operating_calendar,
        min_daily_staff=rule_in.min_daily_staff,
        sunday_min_staff=rule_in.sunday_min_staff
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return _serialize_rule(rule)


@app.put("/api/process-rules/{rule_id}", response_model=BrandProcessRuleResponse)
def update_process_rule(rule_id: int, rule_in: BrandProcessRuleUpdate, db: Session = Depends(get_db)):
    rule = db.query(BrandProcessRule).filter(BrandProcessRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Process rule not found")

    if rule_in.brand_id is not None:
        brand = db.query(Brand).filter(Brand.id == rule_in.brand_id).first()
        if not brand:
            raise HTTPException(status_code=400, detail="Specified Brand does not exist")
        rule.brand_id = rule_in.brand_id

    if rule_in.process_code is not None:
        rule.process_code = rule_in.process_code
    if rule_in.operating_calendar is not None:
        rule.operating_calendar = rule_in.operating_calendar
    if rule_in.min_daily_staff is not None:
        rule.min_daily_staff = rule_in.min_daily_staff
    if rule_in.sunday_min_staff is not None:
        rule.sunday_min_staff = rule_in.sunday_min_staff

    db.commit()
    db.refresh(rule)
    return _serialize_rule(rule)


@app.delete("/api/process-rules/{rule_id}", status_code=status.HTTP_200_OK)
def delete_process_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = db.query(BrandProcessRule).filter(BrandProcessRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Process rule not found")
    db.delete(rule)
    db.commit()
    return {"status": "success", "message": "Process rule deleted"}


# ============================================================================
# Employee Assignments CRUD Endpoints
# ============================================================================
def _serialize_assignment(assignment: EmployeeAssignment) -> EmployeeAssignmentResponse:
    return EmployeeAssignmentResponse(
        id=assignment.id,
        employee_id=assignment.employee_id,
        employee_name=assignment.employee.name if assignment.employee else None,
        brand_id=assignment.brand_id,
        brand_name=assignment.brand.name if assignment.brand else None,
        process_code=assignment.process_code,
        allocation_pct=assignment.allocation_pct,
        is_primary=assignment.is_primary
    )


@app.get("/api/assignments", response_model=List[EmployeeAssignmentResponse])
def get_assignments(
    employee_id: Optional[int] = Query(None, description="Filter by Employee ID"),
    brand_id: Optional[int] = Query(None, description="Filter by Brand ID"),
    db: Session = Depends(get_db)
):
    query = db.query(EmployeeAssignment)
    if employee_id is not None:
        query = query.filter(EmployeeAssignment.employee_id == employee_id)
    if brand_id is not None:
        query = query.filter(EmployeeAssignment.brand_id == brand_id)
    assignments = query.all()
    return [_serialize_assignment(a) for a in assignments]


@app.get("/api/assignments/{assignment_id}", response_model=EmployeeAssignmentResponse)
def get_assignment(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(EmployeeAssignment).filter(EmployeeAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return _serialize_assignment(assignment)


@app.post("/api/assignments", response_model=EmployeeAssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_assignment(assign_in: EmployeeAssignmentCreate, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == assign_in.employee_id).first()
    if not emp:
        raise HTTPException(status_code=400, detail="Specified Employee does not exist")
    
    brand = db.query(Brand).filter(Brand.id == assign_in.brand_id).first()
    if not brand:
        raise HTTPException(status_code=400, detail="Specified Brand does not exist")

    existing = db.query(EmployeeAssignment).filter(
        EmployeeAssignment.employee_id == assign_in.employee_id,
        EmployeeAssignment.brand_id == assign_in.brand_id,
        EmployeeAssignment.process_code == assign_in.process_code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This assignment already exists")

    assignment = EmployeeAssignment(
        employee_id=assign_in.employee_id,
        brand_id=assign_in.brand_id,
        process_code=assign_in.process_code,
        allocation_pct=assign_in.allocation_pct,
        is_primary=assign_in.is_primary
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return _serialize_assignment(assignment)


@app.put("/api/assignments/{assignment_id}", response_model=EmployeeAssignmentResponse)
def update_assignment(assignment_id: int, assign_in: EmployeeAssignmentUpdate, db: Session = Depends(get_db)):
    assignment = db.query(EmployeeAssignment).filter(EmployeeAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if assign_in.employee_id is not None:
        emp = db.query(Employee).filter(Employee.id == assign_in.employee_id).first()
        if not emp:
            raise HTTPException(status_code=400, detail="Specified Employee does not exist")
        assignment.employee_id = assign_in.employee_id

    if assign_in.brand_id is not None:
        brand = db.query(Brand).filter(Brand.id == assign_in.brand_id).first()
        if not brand:
            raise HTTPException(status_code=400, detail="Specified Brand does not exist")
        assignment.brand_id = assign_in.brand_id

    if assign_in.process_code is not None:
        assignment.process_code = assign_in.process_code
    if assign_in.allocation_pct is not None:
        assignment.allocation_pct = assign_in.allocation_pct
    if assign_in.is_primary is not None:
        assignment.is_primary = assign_in.is_primary

    db.commit()
    db.refresh(assignment)
    return _serialize_assignment(assignment)


@app.delete("/api/assignments/{assignment_id}", status_code=status.HTTP_200_OK)
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(EmployeeAssignment).filter(EmployeeAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
    return {"status": "success", "message": "Assignment deleted"}


# ============================================================================
# Employee Leaves CRUD Endpoints
# ============================================================================
def _serialize_leave(leave: EmployeeLeave) -> EmployeeLeaveResponse:
    return EmployeeLeaveResponse(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=leave.employee.name if leave.employee else None,
        employee_code=leave.employee.emp_code if leave.employee else None,
        date=leave.date,
        leave_type=leave.leave_type,
        reason=leave.reason
    )


@app.get("/api/leaves", response_model=List[EmployeeLeaveResponse])
def get_leaves(
    employee_id: Optional[int] = Query(None, description="Filter by Employee ID"),
    month: Optional[str] = Query(None, description="Filter by month (YYYY-MM)"),
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    query = db.query(EmployeeLeave)
    if employee_id is not None:
        query = query.filter(EmployeeLeave.employee_id == employee_id)
    if month is not None:
        query = query.filter(EmployeeLeave.date.like(f"{month}%"))
    if date is not None:
        query = query.filter(EmployeeLeave.date == date)
    leaves = query.order_by(EmployeeLeave.date).all()
    return [_serialize_leave(l) for l in leaves]


@app.get("/api/leaves/{leave_id}", response_model=EmployeeLeaveResponse)
def get_leave(leave_id: int, db: Session = Depends(get_db)):
    leave = db.query(EmployeeLeave).filter(EmployeeLeave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    return _serialize_leave(leave)


@app.post("/api/leaves", response_model=EmployeeLeaveResponse, status_code=status.HTTP_201_CREATED)
def create_leave(leave_in: EmployeeLeaveCreate, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == leave_in.employee_id).first()
    if not emp:
        raise HTTPException(status_code=400, detail="Specified Employee does not exist")

    existing = db.query(EmployeeLeave).filter(
        EmployeeLeave.employee_id == leave_in.employee_id,
        EmployeeLeave.date == leave_in.date
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Leave already recorded for this employee on this date")

    leave = EmployeeLeave(
        employee_id=leave_in.employee_id,
        date=leave_in.date,
        leave_type=leave_in.leave_type,
        reason=leave_in.reason
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return _serialize_leave(leave)


@app.put("/api/leaves/{leave_id}", response_model=EmployeeLeaveResponse)
def update_leave(leave_id: int, leave_in: EmployeeLeaveUpdate, db: Session = Depends(get_db)):
    leave = db.query(EmployeeLeave).filter(EmployeeLeave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")

    if leave_in.employee_id is not None:
        emp = db.query(Employee).filter(Employee.id == leave_in.employee_id).first()
        if not emp:
            raise HTTPException(status_code=400, detail="Specified Employee does not exist")
        leave.employee_id = leave_in.employee_id

    if leave_in.date is not None:
        leave.date = leave_in.date
    if leave_in.leave_type is not None:
        leave.leave_type = leave_in.leave_type
    if leave_in.reason is not None:
        leave.reason = leave_in.reason

    db.commit()
    db.refresh(leave)
    return _serialize_leave(leave)


@app.delete("/api/leaves/{leave_id}", status_code=status.HTTP_200_OK)
def delete_leave(leave_id: int, db: Session = Depends(get_db)):
    leave = db.query(EmployeeLeave).filter(EmployeeLeave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    db.delete(leave)
    db.commit()
    return {"status": "success", "message": "Leave deleted"}


# ============================================================================
# Public Holidays Endpoints
# ============================================================================
@app.get("/api/holidays", response_model=List[PublicHolidayResponse])
def get_holidays(
    year_month: Optional[str] = Query(None, description="Filter by YYYY-MM"),
    db: Session = Depends(get_db)
):
    query = db.query(PublicHoliday)
    if year_month is not None:
        query = query.filter(PublicHoliday.date.like(f"{year_month}%"))
    holidays = query.order_by(PublicHoliday.date).all()
    return holidays


@app.post("/api/holidays", response_model=PublicHolidayResponse, status_code=status.HTTP_201_CREATED)
def create_holiday(holiday_in: PublicHolidayCreate, db: Session = Depends(get_db)):
    existing = db.query(PublicHoliday).filter(PublicHoliday.date == holiday_in.date).first()
    if existing:
        raise HTTPException(status_code=400, detail="Holiday already exists on this date")

    holiday = PublicHoliday(date=holiday_in.date, name=holiday_in.name)
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return holiday


@app.delete("/api/holidays/{holiday_id}", status_code=status.HTTP_200_OK)
def delete_holiday(holiday_id: int, db: Session = Depends(get_db)):
    holiday = db.query(PublicHoliday).filter(PublicHoliday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
    db.delete(holiday)
    db.commit()
    return {"status": "success", "message": f"Holiday '{holiday.name}' deleted"}


# ============================================================================
# Roster Generation & Retrieval Endpoints (Module 3A)
# ============================================================================
def _serialize_roster_entry(entry: RosterEntry) -> RosterEntryResponse:
    emp = entry.employee
    brand_name = entry.backup_for_brand.name if entry.backup_for_brand else None
    return RosterEntryResponse(
        id=entry.id,
        year_month=entry.year_month,
        date=entry.date,
        employee_id=entry.employee_id,
        employee_name=emp.name if emp else None,
        employee_code=emp.emp_code if emp else None,
        role=emp.role if emp else None,
        pod_id=emp.pod_id if emp else None,
        pod_name=emp.pod.name if (emp and emp.pod) else None,
        status=entry.status,
        is_override=entry.is_override,
        backup_for_brand_id=entry.backup_for_brand_id,
        backup_for_brand_name=brand_name,
        backup_process_code=entry.backup_process_code,
        notes=entry.notes
    )


@app.post("/api/roster/generate")
def generate_roster(
    year_month: str = Query("2026-11", description="Target year-month (YYYY-MM)"),
    db: Session = Depends(get_db)
):
    """
    Generate or regenerate daily schedule entries for all employees for the specified month.
    Follows deterministic scheduling rules:
    - Hard leaves (LEAVE / COMP_OFF)
    - Public holidays check against brand process operating calendars
    - Fixed Sunday weekly offs for MON_SAT single-resource brands
    - Staggered weekly offs with Mandatory Client Coverage checks for multi-resource brands
    """
    try:
        result = generate_monthly_roster(db, year_month)
        return result
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate roster: {str(e)}"
        )


@app.get("/api/roster", response_model=List[RosterEntryResponse])
def get_roster(
    year_month: str = Query("2026-11", description="Filter by YYYY-MM"),
    employee_id: Optional[int] = Query(None, description="Filter by Employee ID"),
    pod_id: Optional[int] = Query(None, description="Filter by Pod ID"),
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    status: Optional[str] = Query(None, description="Filter by status (WORKING, WEEKLY_OFF, PUBLIC_HOLIDAY, LEAVE, COMP_OFF)"),
    db: Session = Depends(get_db)
):
    """
    Retrieve generated or edited roster schedule entries.
    Supports filtering by year_month, employee_id, pod_id, date, and status.
    """
    query = db.query(RosterEntry).filter(RosterEntry.year_month == year_month)
    if employee_id is not None:
        query = query.filter(RosterEntry.employee_id == employee_id)
    if date is not None:
        query = query.filter(RosterEntry.date == date)
    if status is not None:
        query = query.filter(RosterEntry.status == status)
    if pod_id is not None:
        query = query.join(Employee, RosterEntry.employee_id == Employee.id).filter(Employee.pod_id == pod_id)

    entries = query.order_by(RosterEntry.date, RosterEntry.employee_id).all()
    return [_serialize_roster_entry(e) for e in entries]


# ============================================================================
# Conflict Detection & Validation Engine (Module 3B)
# ============================================================================
@app.get("/api/roster/validate", response_model=List[ConflictItem])
def get_roster_conflicts(
    year_month: str = Query("2026-11", description="Target year-month (YYYY-MM)"),
    db: Session = Depends(get_db)
):
    """
    Conflict Detection & Validation Engine.
    Scans the generated roster and returns a structured list of ConflictItem objects:
    - id, date, severity (CRITICAL | WARNING)
    - conflict_type (UNMET_BRAND_COVERAGE, SINGLE_RESOURCE_UNAVAILABLE, OVERLAPPING_CAPACITY_EXCEEDED,
                     LEAVE_COVERAGE_CONFLICT, PREFERENCE_OVERRIDDEN, CONSECUTIVE_WORK_LIMIT)
    - brand_id, brand_name, process_code, employee_id, employee_name
    - description, ai_explanation
    - recommended_actions (1-click backup resolution candidates)
    """
    conflicts = validate_roster(db, year_month)
    return conflicts


@app.post("/api/roster/assign-backup", response_model=RosterEntryResponse)
def assign_backup(
    req: AssignBackupRequest,
    db: Session = Depends(get_db)
):
    """
    1-click backup resolution endpoint.
    Assigns an available candidate as backup for a specific Brand + Process on a given date.
    Sets status to WORKING, is_override to True, and links backup_for_brand_id and backup_process_code.
    """
    entry = db.query(RosterEntry).filter(
        RosterEntry.employee_id == req.employee_id,
        RosterEntry.date == req.date
    ).first()

    if not entry:
        year_month = req.date[:7]
        entry = RosterEntry(
            year_month=year_month,
            date=req.date,
            employee_id=req.employee_id,
            status=RosterStatus.WORKING.value,
            is_override=True,
            backup_for_brand_id=req.brand_id,
            backup_process_code=req.process_code,
            notes=req.notes or f"Assigned as backup for Brand #{req.brand_id} ({req.process_code})"
        )
        db.add(entry)
    else:
        entry.status = RosterStatus.WORKING.value
        entry.is_override = True
        entry.backup_for_brand_id = req.brand_id
        entry.backup_process_code = req.process_code
        entry.notes = req.notes or f"Assigned as backup for Brand #{req.brand_id} ({req.process_code})"

    db.commit()
    db.refresh(entry)
    return _serialize_roster_entry(entry)


# ============================================================================
# Module 4: Cell Update & Change Simulator Endpoints
# ============================================================================
@app.post("/api/roster/cell-update", response_model=CellUpdateResponse)
def cell_update(
    req: CellUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Module 4: Update a single employee's RosterEntry status on a specific date.
    - Synchronizes EmployeeLeave records (creates/updates if status is LEAVE/COMP_OFF; deletes if changed away).
    - Sets is_override = True on the RosterEntry.
    - Immediately returns the updated entry and validation conflicts for that date.
    """
    try:
        entry, date_conflicts = apply_cell_update(
            db=db,
            employee_id=req.employee_id,
            date_str=req.date,
            status=req.status,
            notes=req.notes,
            leave_type=req.leave_type,
            reason=req.reason
        )
        emp_name = entry.employee.name if entry.employee else f"Employee #{req.employee_id}"
        return CellUpdateResponse(
            success=True,
            message=f"Roster status updated to {entry.status} for {emp_name} on {req.date}.",
            entry=_serialize_roster_entry(entry),
            date_conflicts=[ConflictItem(**c) for c in date_conflicts]
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update roster cell: {str(e)}"
        )


@app.post("/api/roster/simulate-change", response_model=SimulateChangeResponse)
def simulate_change(
    req: SimulateChangeRequest,
    db: Session = Depends(get_db)
):
    """
    Module 4: Change Simulator.
    Evaluates the impact of a status change BEFORE or AFTER saving.
    Explicitly checks whether remaining employees on that brand can maintain min_daily_staff
    or if a coverage gap occurs, plus recommended backups and simulated conflicts without mutating the DB.
    """
    try:
        result = simulate_roster_change(
            db=db,
            employee_id=req.employee_id,
            date_str=req.date,
            new_status=req.new_status,
            notes=req.notes
        )
        return SimulateChangeResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to simulate roster change: {str(e)}"
        )


# ============================================================================
# Static Files & SPA Production Serving
# ============================================================================
if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa_fallback(full_path: str):
        # Don't intercept API endpoints, docs, or openapi schema
        if full_path.startswith("api") or full_path in ["docs", "redoc", "openapi.json"]:
            raise HTTPException(status_code=404, detail="Endpoint not found")
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

