import calendar
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.models import (
    Employee,
    Brand,
    BrandProcessRule,
    EmployeeAssignment,
    PublicHoliday,
    EmployeeLeave,
    RosterEntry,
    RosterStatus,
    LeaveType,
    StaffingType,
    OperatingCalendar
)
from backend.services.scheduler import is_process_operating_on_date
from backend.services.validator import (
    validate_roster,
    find_backup_candidates,
    calculate_employee_daily_utilization
)


def apply_cell_update(
    db: Session,
    employee_id: int,
    date_str: str,
    status: str,
    notes: Optional[str] = None,
    leave_type: Optional[str] = "PLANNED_LEAVE",
    reason: Optional[str] = None
) -> Tuple[RosterEntry, List[Dict[str, Any]]]:
    """
    Module 4: Cell Update Engine.
    Updates an employee's roster entry status on a specific date.
    - Synchronizes EmployeeLeave records (creates/updates if status is LEAVE/COMP_OFF; deletes if changed away).
    - Sets is_override = True on the RosterEntry.
    - Runs immediate validation for that date and returns the updated entry and date conflicts.
    """
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail=f"Employee #{employee_id} not found")

    new_status = status.upper().strip()
    year_month = date_str[:7]

    entry = db.query(RosterEntry).filter(
        RosterEntry.employee_id == employee_id,
        RosterEntry.date == date_str
    ).first()

    prev_status = entry.status if entry else None

    if not entry:
        entry = RosterEntry(
            year_month=year_month,
            date=date_str,
            employee_id=employee_id,
            status=new_status,
            is_override=True,
            notes=notes or reason
        )
        db.add(entry)
    else:
        entry.status = new_status
        entry.is_override = True
        if notes:
            entry.notes = notes
        elif reason:
            entry.notes = reason

    # Synchronize EmployeeLeave table
    existing_leave = db.query(EmployeeLeave).filter(
        EmployeeLeave.employee_id == employee_id,
        EmployeeLeave.date == date_str
    ).first()

    if new_status in [RosterStatus.LEAVE.value, RosterStatus.COMP_OFF.value]:
        resolved_leave_type = (
            LeaveType.COMP_OFF.value if new_status == RosterStatus.COMP_OFF.value
            else (leave_type.upper() if leave_type else LeaveType.PLANNED_LEAVE.value)
        )
        leave_reason = reason or notes or "Updated via Roster Matrix"

        if existing_leave:
            existing_leave.leave_type = resolved_leave_type
            existing_leave.reason = leave_reason
        else:
            new_leave = EmployeeLeave(
                employee_id=employee_id,
                date=date_str,
                leave_type=resolved_leave_type,
                reason=leave_reason
            )
            db.add(new_leave)
    else:
        # If employee was previously on leave, remove the leave record
        if existing_leave:
            db.delete(existing_leave)

    db.commit()
    db.refresh(entry)

    # Immediately validate roster and return conflicts for this date
    all_conflicts = validate_roster(db, year_month)
    date_conflicts = [c for c in all_conflicts if c["date"] == date_str]

    return entry, date_conflicts


def simulate_roster_change(
    db: Session,
    employee_id: int,
    date_str: str,
    new_status: str,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Module 4: Change Simulator Engine.
    Simulates changing an employee's schedule status on a specific date WITHOUT mutating the database.
    Evaluates:
    1. Impact on remaining employees for all assigned brands/processes.
    2. Whether remaining active staff maintains min_daily_staff (or sunday_min_staff).
    3. Gap size if a coverage deficit occurs.
    4. Smart backup recommendations from the same Pod for any triggered coverage gaps.
    5. Complete list of simulated conflicts on that date.
    6. Natural language AI explanation summarizing impact and recommended next steps.
    """
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail=f"Employee #{employee_id} not found")

    new_status = new_status.upper().strip()
    year_month = date_str[:7]
    dt = datetime.strptime(date_str, "%Y-%m-%d").date()
    weekday = dt.weekday()

    # Reference data
    holidays = db.query(PublicHoliday).filter(PublicHoliday.date == date_str).all()
    is_holiday = len(holidays) > 0

    entry = db.query(RosterEntry).filter(
        RosterEntry.employee_id == employee_id,
        RosterEntry.date == date_str
    ).first()
    current_status = entry.status if entry else RosterStatus.WORKING.value

    # All roster entries on this date
    daily_entries = db.query(RosterEntry).filter(RosterEntry.date == date_str).all()
    daily_roster_map = {r.employee_id: r.status for r in daily_entries}

    # Backup entries on this date: (brand_id, process_code) -> list of employee_ids
    backups_on_date = defaultdict(list)
    for r in daily_entries:
        if r.backup_for_brand_id and r.backup_process_code and r.status == RosterStatus.WORKING.value:
            backups_on_date[(r.backup_for_brand_id, r.backup_process_code)].append(r.employee_id)

    # Assignments for this employee
    emp_assignments = db.query(EmployeeAssignment).filter(EmployeeAssignment.employee_id == employee_id).all()
    
    # Pod reference
    pod_emps = db.query(Employee).filter(Employee.pod_id == emp.pod_id).all() if emp.pod_id else []

    all_assignments = db.query(EmployeeAssignment).all()
    process_assignments = defaultdict(list)
    emp_assignments_all = defaultdict(list)
    for a in all_assignments:
        process_assignments[(a.brand_id, a.process_code)].append(a)
        emp_assignments_all[a.employee_id].append(a)

    all_rules = db.query(BrandProcessRule).all()
    rule_map = {(r.brand_id, r.process_code): r for r in all_rules}

    brand_ids = list({a.brand_id for a in emp_assignments})
    brands = db.query(Brand).filter(Brand.id.in_(brand_ids)).all() if brand_ids else []
    brand_map = {b.id: b for b in brands}

    impacted_processes: List[Dict[str, Any]] = []
    can_maintain_overall = True
    narrative_parts = []

    for a in emp_assignments:
        b = brand_map.get(a.brand_id)
        if not b:
            continue
        r = rule_map.get((a.brand_id, a.process_code))
        if not r:
            continue

        # Check operating calendar
        is_operating = is_process_operating_on_date(r, date_str, is_holiday)
        if not is_operating:
            required_staff = 0
        else:
            required_staff = r.sunday_min_staff if weekday == 6 else r.min_daily_staff

        # Current active staff for (brand, process)
        assigned_peers = process_assignments.get((a.brand_id, a.process_code), [])
        assigned_peer_ids = [p.employee_id for p in assigned_peers]

        current_working_assigned = [
            pid for pid in assigned_peer_ids
            if daily_roster_map.get(pid) == RosterStatus.WORKING.value
        ]
        active_backups = backups_on_date.get((a.brand_id, a.process_code), [])
        current_active = len(current_working_assigned) + len(active_backups)

        # Simulated active staff
        simulated_active = current_active
        if current_status == RosterStatus.WORKING.value and new_status != RosterStatus.WORKING.value:
            simulated_active = max(0, current_active - 1)
        elif current_status != RosterStatus.WORKING.value and new_status == RosterStatus.WORKING.value:
            simulated_active = current_active + 1

        coverage_maintained = (simulated_active >= required_staff)
        gap_size = max(0, required_staff - simulated_active)

        recommended_backups: List[Dict[str, Any]] = []
        if not coverage_maintained and is_operating:
            can_maintain_overall = False
            # Find backup candidates
            full_roster_entries = db.query(RosterEntry).filter(RosterEntry.year_month == year_month).all()
            full_roster_map = {(re.employee_id, re.date): re for re in full_roster_entries}
            
            recommended_backups = find_backup_candidates(
                brand=b,
                process_code=a.process_code,
                date_str=date_str,
                exclude_emp_id=employee_id,
                pod_employees=pod_emps,
                emp_assignments=emp_assignments_all,
                rule_map=rule_map,
                roster_map=full_roster_map,
                is_holiday=is_holiday
            )

        impacted_processes.append({
            "brand_id": b.id,
            "brand_name": b.name,
            "process_code": a.process_code,
            "required_staff": required_staff,
            "current_active_staff": current_active,
            "simulated_active_staff": simulated_active,
            "coverage_maintained": coverage_maintained,
            "gap_size": gap_size,
            "recommended_backups": recommended_backups
        })

        if not is_operating:
            narrative_parts.append(
                f"{b.name} ({a.process_code}) is not operating on {date_str} (closed calendar)."
            )
        elif coverage_maintained:
            narrative_parts.append(
                f"{b.name} ({a.process_code}) will have {simulated_active} active staff, maintaining the required minimum of {required_staff}."
            )
        else:
            cand_desc = (
                f"Recommended backup: {recommended_backups[0]['label']}."
                if recommended_backups else "No immediate same-pod floater found; escalation required."
            )
            narrative_parts.append(
                f"COVERAGE DEFICIT: {b.name} ({a.process_code}) active staff will drop from {current_active} to {simulated_active}, below the required minimum of {required_staff} (gap: {gap_size}). {cand_desc}"
            )

    # If employee has no brand assignments (e.g. Pod Lead)
    if not emp_assignments:
        narrative_parts.append(
            f"{emp.name} ({emp.role}) has no direct brand process assignments. Changing status to {new_status} has zero direct impact on client staffing thresholds."
        )

    # Simulated Conflicts on date_str
    # We simulate applying the change in memory and scanning for conflicts on date_str
    # By temporarily updating entry, validating, and rolling back (or evaluating cleanly)
    simulated_conflicts: List[Dict[str, Any]] = []
    try:
        # Create a savepoint
        sp = db.begin_nested()
        
        # Apply change in savepoint
        if entry:
            entry.status = new_status
            entry.is_override = True
        else:
            entry_sim = RosterEntry(
                year_month=year_month,
                date=date_str,
                employee_id=employee_id,
                status=new_status,
                is_override=True
            )
            db.add(entry_sim)

        # Handle leave sync in savepoint
        existing_leave = db.query(EmployeeLeave).filter(
            EmployeeLeave.employee_id == employee_id,
            EmployeeLeave.date == date_str
        ).first()

        if new_status in [RosterStatus.LEAVE.value, RosterStatus.COMP_OFF.value]:
            if not existing_leave:
                db.add(EmployeeLeave(
                    employee_id=employee_id,
                    date=date_str,
                    leave_type=LeaveType.PLANNED_LEAVE.value,
                    reason=notes or "Simulated Leave"
                ))
        else:
            if existing_leave:
                db.delete(existing_leave)

        # Validate with in-memory transaction
        conflicts_all = validate_roster(db, year_month)
        simulated_conflicts = [c for c in conflicts_all if c["date"] == date_str]

        # Roll back savepoint immediately!
        sp.rollback()
    except Exception:
        db.rollback()

    # Build final AI explanation
    if can_maintain_overall:
        summary_verdict = (
            f"Coverage Safe: Changing {emp.name}'s status from {current_status} to {new_status} on {date_str} "
            f"does not violate client SLAs."
        )
    else:
        summary_verdict = (
            f"Coverage Warning: Changing {emp.name}'s status from {current_status} to {new_status} on {date_str} "
            f"creates a staffing deficit."
        )

    full_ai_explanation = f"{summary_verdict} {' '.join(narrative_parts)}"

    return {
        "employee_id": emp.id,
        "employee_name": emp.name,
        "date": date_str,
        "current_status": current_status,
        "new_status": new_status,
        "can_maintain_coverage": can_maintain_overall,
        "impacted_processes": impacted_processes,
        "simulated_conflicts": simulated_conflicts,
        "ai_explanation": full_ai_explanation
    }
