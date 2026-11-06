import calendar
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

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


def is_process_operating_on_date(rule: BrandProcessRule, date_str: str, is_holiday: bool) -> bool:
    """
    Returns True if a brand process is required to operate on date_str based on its operating calendar.
    - DAYS_365: Operates 365 days a year (including Sundays and Public Holidays).
    - DAILY_EXCEPT_HOLIDAYS: Operates every day except Public Holidays.
    - MON_SAT_EXCEPT_HOLIDAYS: Operates Monday through Saturday, closed on Sundays and Public Holidays.
    """
    dt = datetime.strptime(date_str, "%Y-%m-%d").date()
    weekday = dt.weekday()  # 0=Monday, ..., 6=Sunday
    cal = rule.operating_calendar

    if cal == OperatingCalendar.DAYS_365.value:
        return True
    elif cal == OperatingCalendar.DAILY_EXCEPT_HOLIDAYS.value:
        return not is_holiday
    elif cal == OperatingCalendar.MON_SAT_EXCEPT_HOLIDAYS.value:
        return (weekday != 6) and (not is_holiday)
    return (weekday != 6) and (not is_holiday)


def generate_monthly_roster(db: Session, year_month: str = "2026-11") -> Dict:
    """
    Deterministic Monthly Roster Generation Algorithm (Module 3A).
    Generates daily RosterEntry records for all employees across the specified month.
    
    Order of operations for each date d and each employee E:
    1. Hard Leave Check:
       If E has an approved EmployeeLeave on date d, status = LEAVE (or COMP_OFF).
    2. Public Holiday Check:
       If date d is a Public Holiday and all processes assigned to E are closed,
       status = PUBLIC_HOLIDAY.
    3. Weekly Off Assignment & Mandatory Client Coverage:
       - Single-Resource MON_SAT brands: Weekly off locked to Sunday (weekday == 6).
       - Single-Resource 365/Daily brands: Sole employee takes Sunday as Weekly Off
         (exposing single-resource coverage gap for floater backup).
       - Pod Leads: Sunday locked to Weekly Off (or preferred off).
       - Multi-Resource & Shared specialists: Check if weekday == preferred_weekly_off.
         If so, check if taking off drops active working staff below required daily staffing
         (min_daily_staff or sunday_min_staff). If dropping below, Mandatory Client Coverage
         overrides preferred off: status = WORKING with SOFT_PREFERENCE_VIOLATION recorded.
         Otherwise, status = WEEKLY_OFF.
    4. Default:
       status = WORKING.
    """
    year, month = map(int, year_month.split("-"))
    num_days = calendar.monthrange(year, month)[1]
    dates = [f"{year:04d}-{month:02d}-{d:02d}" for d in range(1, num_days + 1)]

    # 1. Fetch reference data
    employees = db.query(Employee).order_by(Employee.id).all()
    holidays = db.query(PublicHoliday).filter(PublicHoliday.date.like(f"{year_month}%")).all()
    holiday_map = {h.date: h.name for h in holidays}

    leaves = db.query(EmployeeLeave).filter(EmployeeLeave.date.like(f"{year_month}%")).all()
    leave_map = {(l.employee_id, l.date): l for l in leaves}

    brands = db.query(Brand).all()
    brand_map = {b.id: b for b in brands}

    rules = db.query(BrandProcessRule).all()
    rule_map = {(r.brand_id, r.process_code): r for r in rules}

    assignments = db.query(EmployeeAssignment).all()
    emp_assignments = defaultdict(list)
    process_assignments = defaultdict(list)  # (brand_id, process_code) -> list of assignments

    for a in assignments:
        emp_assignments[a.employee_id].append(a)
        process_assignments[(a.brand_id, a.process_code)].append(a)

    # 2. Iterate day by day, building schedule for all employees
    roster_entries: List[RosterEntry] = []

    for date_str in dates:
        dt = datetime.strptime(date_str, "%Y-%m-%d").date()
        weekday = dt.weekday()  # 0=Monday, 6=Sunday
        is_holiday = date_str in holiday_map
        holiday_name = holiday_map.get(date_str)

        # Map to track status assigned on this date: emp_id -> status
        daily_emp_status = {}
        daily_emp_notes = {}

        # Pass 1: Handle Hard Leaves and Public Holidays
        for emp in employees:
            # 1. Hard Leave Check
            if (emp.id, date_str) in leave_map:
                leave_obj = leave_map[(emp.id, date_str)]
                if leave_obj.leave_type == LeaveType.COMP_OFF.value:
                    daily_emp_status[emp.id] = RosterStatus.COMP_OFF.value
                else:
                    daily_emp_status[emp.id] = RosterStatus.LEAVE.value
                daily_emp_notes[emp.id] = leave_obj.reason or f"Leave: {leave_obj.leave_type}"
                continue

            # 2. Public Holiday Check
            if is_holiday:
                assigned = emp_assignments.get(emp.id, [])
                if not assigned:
                    # Pod Leads or unassigned floaters on public holiday get PUBLIC_HOLIDAY
                    daily_emp_status[emp.id] = RosterStatus.PUBLIC_HOLIDAY.value
                    daily_emp_notes[emp.id] = f"Public Holiday: {holiday_name}"
                    continue

                # Check if all assigned brand processes are closed on this holiday
                all_closed = True
                for a in assigned:
                    r = rule_map.get((a.brand_id, a.process_code))
                    if r and is_process_operating_on_date(r, date_str, is_holiday=True):
                        all_closed = False
                        break

                if all_closed:
                    daily_emp_status[emp.id] = RosterStatus.PUBLIC_HOLIDAY.value
                    daily_emp_notes[emp.id] = f"Public Holiday: {holiday_name}"
                    continue

        # Pass 2: Handle Weekly Offs and Mandatory Client Coverage
        for emp in employees:
            if emp.id in daily_emp_status:
                continue

            assigned = emp_assignments.get(emp.id, [])
            
            # Case A: Pod Leads (no client assignments)
            if not assigned:
                if weekday == emp.preferred_weekly_off:
                    daily_emp_status[emp.id] = RosterStatus.WEEKLY_OFF.value
                    daily_emp_notes[emp.id] = "Weekly Off"
                else:
                    daily_emp_status[emp.id] = RosterStatus.WORKING.value
                continue

            # Check if all assigned brands are SINGLE_RESOURCE
            is_single_resource = all(
                brand_map.get(a.brand_id) and brand_map[a.brand_id].staffing_type == StaffingType.SINGLE_RESOURCE.value
                for a in assigned
            )

            # Case B: Single-Resource Brand dedicated employees
            if is_single_resource:
                # Weekly off is locked to Sunday (weekday == 6)
                if weekday == 6:
                    daily_emp_status[emp.id] = RosterStatus.WEEKLY_OFF.value
                    daily_emp_notes[emp.id] = "Weekly Off (Fixed Sunday)"
                else:
                    daily_emp_status[emp.id] = RosterStatus.WORKING.value
                continue

            # Case C: Multi-Resource Brand or Shared Floaters
            if weekday == emp.preferred_weekly_off:
                # Employee desires weekly off today. Check Mandatory Client Coverage!
                coverage_violated = False
                violated_details = []

                for a in assigned:
                    r = rule_map.get((a.brand_id, a.process_code))
                    if not r:
                        continue

                    # If process is NOT operating today, required staff is 0 -> no violation
                    if not is_process_operating_on_date(r, date_str, is_holiday):
                        continue

                    required_staff = r.sunday_min_staff if weekday == 6 else r.min_daily_staff

                    # Count how many assigned co-workers are available to work today
                    co_worker_assignments = process_assignments.get((a.brand_id, a.process_code), [])
                    co_worker_ids = [x.employee_id for x in co_worker_assignments if x.employee_id != emp.id]

                    available_count = 0
                    for c_id in co_worker_ids:
                        # If co-worker has leave today, not available
                        if (c_id, date_str) in leave_map:
                            continue
                        # If co-worker already has weekly off or holiday today, not available
                        if daily_emp_status.get(c_id) in [
                            RosterStatus.WEEKLY_OFF.value,
                            RosterStatus.PUBLIC_HOLIDAY.value,
                            RosterStatus.LEAVE.value,
                            RosterStatus.COMP_OFF.value
                        ]:
                            continue
                        # If co-worker also prefers today as weekly off and has not been processed yet
                        # We don't double count if they haven't been forced to work
                        available_count += 1

                    if available_count < required_staff:
                        coverage_violated = True
                        b_name = brand_map[a.brand_id].name if a.brand_id in brand_map else f"Brand #{a.brand_id}"
                        violated_details.append(f"{b_name} {r.process_code} (Req: {required_staff}, Avail: {available_count})")

                if coverage_violated:
                    # Mandatory Client Coverage overrides Preferred Weekly Off
                    daily_emp_status[emp.id] = RosterStatus.WORKING.value
                    daily_emp_notes[emp.id] = f"SOFT_PREFERENCE_VIOLATION: Required for {' & '.join(violated_details)}"
                else:
                    daily_emp_status[emp.id] = RosterStatus.WEEKLY_OFF.value
                    daily_emp_notes[emp.id] = "Weekly Off (Preferred)"
            else:
                daily_emp_status[emp.id] = RosterStatus.WORKING.value

        # Build RosterEntry models for date_str
        for emp in employees:
            status_val = daily_emp_status.get(emp.id, RosterStatus.WORKING.value)
            note_val = daily_emp_notes.get(emp.id)

            entry = RosterEntry(
                year_month=year_month,
                date=date_str,
                employee_id=emp.id,
                status=status_val,
                is_override=False,
                backup_for_brand_id=None,
                backup_process_code=None,
                notes=note_val
            )
            roster_entries.append(entry)

    # 3. Clean existing entries for this year_month and save new entries
    db.query(RosterEntry).filter(RosterEntry.year_month == year_month).delete()
    db.commit()

    db.add_all(roster_entries)
    db.commit()

    return {
        "status": "success",
        "year_month": year_month,
        "total_days": num_days,
        "employees_count": len(employees),
        "entries_count": len(roster_entries),
        "message": f"Successfully generated {len(roster_entries)} roster entries for {year_month}."
    }
