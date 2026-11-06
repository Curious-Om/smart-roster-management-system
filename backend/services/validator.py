import calendar
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional, Any
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
    EmployeeRole,
    OperatingCalendar
)
from backend.services.scheduler import is_process_operating_on_date


def calculate_employee_daily_utilization(
    emp_id: int,
    date_str: str,
    emp_assignments: Dict[int, List[EmployeeAssignment]],
    rule_map: Dict[tuple, BrandProcessRule],
    roster_map: Dict[tuple, RosterEntry],
    is_holiday: bool
) -> int:
    """
    Computes total active capacity utilized by an employee on a given date.
    - An assignment only consumes capacity if its brand process is actively operating on that date.
    - If a backup duty is assigned, it adds to capacity.
    """
    entry = roster_map.get((emp_id, date_str))
    if not entry or entry.status != RosterStatus.WORKING.value:
        return 0

    total_util = 0
    for a in emp_assignments.get(emp_id, []):
        r = rule_map.get((a.brand_id, a.process_code))
        if r and is_process_operating_on_date(r, date_str, is_holiday):
            total_util += a.allocation_pct

    # Backup assignment adds 50% capacity load
    if entry.backup_for_brand_id is not None:
        total_util += 50

    return total_util


def find_backup_candidates(
    brand: Brand,
    process_code: str,
    date_str: str,
    exclude_emp_id: Optional[int],
    pod_employees: List[Employee],
    emp_assignments: Dict[int, List[EmployeeAssignment]],
    rule_map: Dict[tuple, BrandProcessRule],
    roster_map: Dict[tuple, RosterEntry],
    is_holiday: bool
) -> List[Dict[str, Any]]:
    """
    Smart Backup Recommendation Logic (SPEC.md Section 5):
    Finds available employees in the SAME POD who:
    1. Are scheduled to status WORKING on date_str.
    2. Have the required process_code in their skills.
    3. Have spare daily capacity (utilization < max_daily_capacity).
    Prioritizes:
    - FLOATER (Score 1)
    - POD_LEAD (Score 2)
    - Cross-trained AGENT whose assigned brand is closed on date_str (Score 3)
    - Cross-trained AGENT with spare capacity (Score 4)
    Returns top 2 candidates packaged with 1-click action payloads for POST /api/roster/assign-backup.
    """
    candidates = []

    # Phase 1: Search employees in same pod who are WORKING with skill and spare capacity
    for c in pod_employees:
        if exclude_emp_id and c.id == exclude_emp_id:
            continue

        skills = c.skills or []
        if process_code not in skills:
            continue

        entry = roster_map.get((c.id, date_str))
        if not entry or entry.status != RosterStatus.WORKING.value:
            continue

        current_util = calculate_employee_daily_utilization(
            c.id, date_str, emp_assignments, rule_map, roster_map, is_holiday
        )

        if current_util >= c.max_daily_capacity:
            continue

        # Check if candidate's assigned brand(s) are closed today
        assigned_brands_closed = True
        cand_assignments = emp_assignments.get(c.id, [])
        if cand_assignments:
            for a in cand_assignments:
                r = rule_map.get((a.brand_id, a.process_code))
                if r and is_process_operating_on_date(r, date_str, is_holiday):
                    assigned_brands_closed = False
                    break
        else:
            # Pod Leads have no direct brand assignments
            assigned_brands_closed = True

        if c.role == EmployeeRole.FLOATER.value:
            score = 1
        elif c.role == EmployeeRole.POD_LEAD.value:
            score = 2
        elif assigned_brands_closed:
            score = 3
        else:
            score = 4

        candidates.append((score, current_util, c, False))

    # Phase 2: If fewer than 2 candidates, fall back to FLOATER or POD_LEAD on WEEKLY_OFF in same pod
    if len(candidates) < 2:
        for c in pod_employees:
            if exclude_emp_id and c.id == exclude_emp_id:
                continue
            if any(cand[2].id == c.id for cand in candidates):
                continue

            skills = c.skills or []
            if process_code not in skills:
                continue

            entry = roster_map.get((c.id, date_str))
            # Must not be on approved hard leave
            if not entry or entry.status in [RosterStatus.LEAVE.value, RosterStatus.COMP_OFF.value]:
                continue

            if c.role in [EmployeeRole.FLOATER.value, EmployeeRole.POD_LEAD.value]:
                score = 5 if c.role == EmployeeRole.FLOATER.value else 6
                candidates.append((score, 0, c, True))

    # Sort by priority score asc, then current_util asc
    candidates.sort(key=lambda x: (x[0], x[1]))

    recommended = []
    for _, util, cand, is_callin in candidates[:2]:
        callin_suffix = " (Call-in from Off)" if is_callin else ""
        recommended.append({
            "action": "ASSIGN_BACKUP",
            "label": f"Assign {cand.name} ({cand.role}) as Backup{callin_suffix}",
            "endpoint": "/api/roster/assign-backup",
            "method": "POST",
            "payload": {
                "date": date_str,
                "employee_id": cand.id,
                "employee_name": cand.name,
                "brand_id": brand.id,
                "brand_name": brand.name,
                "process_code": process_code,
                "notes": f"Assigned as backup for {brand.name} ({process_code})"
            },
            "candidate": {
                "id": cand.id,
                "emp_code": cand.emp_code,
                "name": cand.name,
                "role": cand.role,
                "current_utilization_pct": util
            }
        })

    return recommended


def validate_roster(db: Session, year_month: str = "2026-11") -> List[Dict[str, Any]]:
    """
    Conflict Detection & Validation Engine (Module 3B).
    Scans the generated/edited roster for the given month and detects all 6 conflict types:
    1. UNMET_BRAND_COVERAGE (CRITICAL)
    2. SINGLE_RESOURCE_UNAVAILABLE (CRITICAL)
    3. OVERLAPPING_CAPACITY_EXCEEDED (CRITICAL)
    4. LEAVE_COVERAGE_CONFLICT (CRITICAL)
    5. PREFERENCE_OVERRIDDEN (WARNING)
    6. CONSECUTIVE_WORK_LIMIT (WARNING)
    """
    year, month = map(int, year_month.split("-"))
    num_days = calendar.monthrange(year, month)[1]
    dates = [f"{year:04d}-{month:02d}-{d:02d}" for d in range(1, num_days + 1)]

    # 1. Fetch reference models
    employees = db.query(Employee).all()
    emp_map = {e.id: e for e in employees}
    
    # Pod map and employees by pod
    pod_employees_map = defaultdict(list)
    for e in employees:
        if e.pod_id:
            pod_employees_map[e.pod_id].append(e)

    brands = db.query(Brand).all()
    brand_map = {b.id: b for b in brands}

    rules = db.query(BrandProcessRule).all()
    rule_map = {(r.brand_id, r.process_code): r for r in rules}

    assignments = db.query(EmployeeAssignment).all()
    emp_assignments = defaultdict(list)
    process_assignments = defaultdict(list)
    for a in assignments:
        emp_assignments[a.employee_id].append(a)
        process_assignments[(a.brand_id, a.process_code)].append(a)

    holidays = db.query(PublicHoliday).filter(PublicHoliday.date.like(f"{year_month}%")).all()
    holiday_map = {h.date: h.name for h in holidays}

    leaves = db.query(EmployeeLeave).filter(EmployeeLeave.date.like(f"{year_month}%")).all()
    leave_map = {(l.employee_id, l.date): l for l in leaves}

    roster_entries = db.query(RosterEntry).filter(RosterEntry.year_month == year_month).all()
    roster_map = {(r.employee_id, r.date): r for r in roster_entries}

    # Backup map: (date, brand_id, process_code) -> list of RosterEntry
    backups_map = defaultdict(list)
    for r in roster_entries:
        if r.backup_for_brand_id is not None and r.backup_process_code:
            backups_map[(r.date, r.backup_for_brand_id, r.backup_process_code)].append(r)

    conflicts: List[Dict[str, Any]] = []
    conflict_seq = 1

    # =========================================================================
    # CHECK 1 & 2: UNMET_BRAND_COVERAGE & SINGLE_RESOURCE_UNAVAILABLE (CRITICAL)
    # =========================================================================
    for b in brands:
        pod_emps = pod_employees_map.get(b.pod_id, [])

        for r in b.process_rules:
            p_code = r.process_code

            for date_str in dates:
                dt = datetime.strptime(date_str, "%Y-%m-%d").date()
                weekday = dt.weekday()
                is_holiday = date_str in holiday_map

                # Check if process is operating on this date
                if not is_process_operating_on_date(r, date_str, is_holiday):
                    continue

                required_staff = r.sunday_min_staff if weekday == 6 else r.min_daily_staff
                if required_staff <= 0:
                    continue

                # Count active assigned workers
                assigned_to_process = process_assignments.get((b.id, p_code), [])
                assigned_emp_ids = [a.employee_id for a in assigned_to_process]

                working_assigned = []
                for emp_id in assigned_emp_ids:
                    entry = roster_map.get((emp_id, date_str))
                    if entry and entry.status == RosterStatus.WORKING.value:
                        working_assigned.append(emp_id)

                # Count active backups
                working_backups = []
                for b_entry in backups_map.get((date_str, b.id, p_code), []):
                    if b_entry.status == RosterStatus.WORKING.value:
                        working_backups.append(b_entry.employee_id)

                active_count = len(working_assigned) + len(working_backups)

                if active_count < required_staff:
                    # Check if single resource brand
                    is_single_resource = (b.staffing_type == StaffingType.SINGLE_RESOURCE.value)
                    gap_emp = emp_map.get(assigned_emp_ids[0]) if assigned_emp_ids else None
                    gap_emp_id = gap_emp.id if gap_emp else None
                    gap_emp_name = gap_emp.name if gap_emp else None

                    rec_actions = find_backup_candidates(
                        brand=b,
                        process_code=p_code,
                        date_str=date_str,
                        exclude_emp_id=gap_emp_id,
                        pod_employees=pod_emps,
                        emp_assignments=emp_assignments,
                        rule_map=rule_map,
                        roster_map=roster_map,
                        is_holiday=is_holiday
                    )

                    # Build candidates description for AI explanation
                    if rec_actions:
                        c1 = rec_actions[0]["candidate"]
                        c_text = f"Top candidate {c1['name']} ({c1['role']}) in Pod '{b.pod.name if b.pod else ''}' has {100 - c1['current_utilization_pct']}% spare capacity and '{p_code}' skill."
                        if len(rec_actions) > 1:
                            c2 = rec_actions[1]["candidate"]
                            c_text += f" Secondary option: {c2['name']} ({c2['role']})."
                    else:
                        c_text = "No immediate same-pod floater with matching skill found; cross-pod escalation recommended."

                    if is_single_resource and gap_emp:
                        entry = roster_map.get((gap_emp.id, date_str))
                        emp_status = entry.status if entry else "OFF"
                        
                        desc = (
                            f"Sole employee {gap_emp.name} ({gap_emp.emp_code}) for single-resource brand '{b.name}' "
                            f"is on {emp_status} on operating day {date_str} for process '{p_code}' with 0 active backups."
                        )
                        ai_exp = (
                            f"Brand '{b.name}' operates on calendar '{r.operating_calendar}' requiring minimum {required_staff} staff "
                            f"for '{p_code}' on {date_str}. Its sole dedicated agent {gap_emp.name} is unavailable ({emp_status}). "
                            f"Single-resource brands must have continuous operational coverage. {c_text}"
                        )
                        conflicts.append({
                            "id": f"SRU-{conflict_seq:04d}",
                            "date": date_str,
                            "severity": "CRITICAL",
                            "conflict_type": "SINGLE_RESOURCE_UNAVAILABLE",
                            "brand_id": b.id,
                            "brand_name": b.name,
                            "process_code": p_code,
                            "employee_id": gap_emp_id,
                            "employee_name": gap_emp_name,
                            "description": desc,
                            "ai_explanation": ai_exp,
                            "recommended_actions": rec_actions
                        })
                    else:
                        desc = (
                            f"Brand '{b.name}' requires {required_staff} staff for process '{p_code}' on {date_str}, "
                            f"but only {active_count} active staff is scheduled ({len(working_assigned)} primary, {len(working_backups)} backup)."
                        )
                        ai_exp = (
                            f"High-volume brand '{b.name}' has mandatory staffing threshold of {required_staff} for '{p_code}'. "
                            f"Due to approved leaves or weekly offs, active staffing dropped to {active_count}. {c_text}"
                        )
                        conflicts.append({
                            "id": f"UBC-{conflict_seq:04d}",
                            "date": date_str,
                            "severity": "CRITICAL",
                            "conflict_type": "UNMET_BRAND_COVERAGE",
                            "brand_id": b.id,
                            "brand_name": b.name,
                            "process_code": p_code,
                            "employee_id": gap_emp_id,
                            "employee_name": gap_emp_name,
                            "description": desc,
                            "ai_explanation": ai_exp,
                            "recommended_actions": rec_actions
                        })

                    conflict_seq += 1

    # =========================================================================
    # CHECK 3: OVERLAPPING_CAPACITY_EXCEEDED (CRITICAL)
    # =========================================================================
    for emp in employees:
        for date_str in dates:
            is_holiday = date_str in holiday_map
            entry = roster_map.get((emp.id, date_str))
            if not entry or entry.status != RosterStatus.WORKING.value:
                continue

            current_util = calculate_employee_daily_utilization(
                emp.id, date_str, emp_assignments, rule_map, roster_map, is_holiday
            )

            if current_util > emp.max_daily_capacity:
                desc = (
                    f"Employee {emp.name} ({emp.emp_code}) is scheduled at {current_util}% workload capacity on {date_str}, "
                    f"exceeding their maximum daily limit of {emp.max_daily_capacity}%."
                )
                ai_exp = (
                    f"{emp.name} has overlapping active assignments and/or backup coverage totaling {current_util}%. "
                    f"Working above 100% capacity leads to SLA breach and operational burnout. "
                    f"Reassign backup duties or redistribute processes across pod peers."
                )
                conflicts.append({
                    "id": f"OCE-{conflict_seq:04d}",
                    "date": date_str,
                    "severity": "CRITICAL",
                    "conflict_type": "OVERLAPPING_CAPACITY_EXCEEDED",
                    "brand_id": None,
                    "brand_name": None,
                    "process_code": None,
                    "employee_id": emp.id,
                    "employee_name": emp.name,
                    "description": desc,
                    "ai_explanation": ai_exp,
                    "recommended_actions": []
                })
                conflict_seq += 1

    # =========================================================================
    # CHECK 4: LEAVE_COVERAGE_CONFLICT (CRITICAL)
    # =========================================================================
    for l in leaves:
        emp = emp_map.get(l.employee_id)
        if not emp:
            continue

        entry = roster_map.get((l.employee_id, l.date))
        
        # Case A: Employee is scheduled to WORKING on an approved leave day
        if entry and entry.status == RosterStatus.WORKING.value:
            desc = (
                f"Employee {emp.name} ({emp.emp_code}) has approved {l.leave_type} on {l.date} "
                f"('{l.reason}'), but schedule has status WORKING."
            )
            ai_exp = (
                f"Policy violation: Employee was granted approved {l.leave_type} on {l.date}, "
                f"yet the schedule forces them to work. Set status to LEAVE and assign backup."
            )
            conflicts.append({
                "id": f"LCC-{conflict_seq:04d}",
                "date": l.date,
                "severity": "CRITICAL",
                "conflict_type": "LEAVE_COVERAGE_CONFLICT",
                "brand_id": None,
                "brand_name": None,
                "process_code": None,
                "employee_id": emp.id,
                "employee_name": emp.name,
                "description": desc,
                "ai_explanation": ai_exp,
                "recommended_actions": []
            })
            conflict_seq += 1

        # Case B: Multi-brand shared specialist on leave causes multi-brand coverage gap
        assigned = emp_assignments.get(emp.id, [])
        assigned_brand_ids = list({a.brand_id for a in assigned})
        if len(assigned_brand_ids) >= 2:
            brand_names = [brand_map[b_id].name for b_id in assigned_brand_ids if b_id in brand_map]
            desc = (
                f"Approved leave for shared specialist {emp.name} ({emp.emp_code}) on {l.date} "
                f"causes concurrent coverage shortages across multiple brands: {', '.join(brand_names)}."
            )
            ai_exp = (
                f"{emp.name} is a multi-brand specialist supporting {len(brand_names)} brands simultaneously. "
                f"Their absence on {l.date} directly impacts operations across all assigned brands. "
                f"Floaters from {emp.pod.name if emp.pod else 'the Pod'} should be dispatched to cover each brand."
            )
            conflicts.append({
                "id": f"LCC-{conflict_seq:04d}",
                "date": l.date,
                "severity": "CRITICAL",
                "conflict_type": "LEAVE_COVERAGE_CONFLICT",
                "brand_id": assigned_brand_ids[0],
                "brand_name": brand_names[0] if brand_names else None,
                "process_code": None,
                "employee_id": emp.id,
                "employee_name": emp.name,
                "description": desc,
                "ai_explanation": ai_exp,
                "recommended_actions": []
            })
            conflict_seq += 1

    # =========================================================================
    # CHECK 5: PREFERENCE_OVERRIDDEN (WARNING)
    # =========================================================================
    for emp in employees:
        for date_str in dates:
            dt = datetime.strptime(date_str, "%Y-%m-%d").date()
            if dt.weekday() == emp.preferred_weekly_off:
                entry = roster_map.get((emp.id, date_str))
                if entry and entry.status == RosterStatus.WORKING.value:
                    day_name = calendar.day_name[emp.preferred_weekly_off]
                    reason = entry.notes or "mandatory client coverage"
                    desc = (
                        f"Employee {emp.name} ({emp.emp_code}) is scheduled to work on their preferred weekly off "
                        f"({day_name}) on {date_str} due to {reason}."
                    )
                    ai_exp = (
                        f"Soft preference violation: {emp.name} has preferred weekly off set to {day_name}. "
                        f"Mandatory client coverage rules required them to work on {date_str}. "
                        f"Consider assigning a floater or granting an alternate comp-off during the week."
                    )
                    conflicts.append({
                        "id": f"PO-{conflict_seq:04d}",
                        "date": date_str,
                        "severity": "WARNING",
                        "conflict_type": "PREFERENCE_OVERRIDDEN",
                        "brand_id": None,
                        "brand_name": None,
                        "process_code": None,
                        "employee_id": emp.id,
                        "employee_name": emp.name,
                        "description": desc,
                        "ai_explanation": ai_exp,
                        "recommended_actions": []
                    })
                    conflict_seq += 1

    # =========================================================================
    # CHECK 6: CONSECUTIVE_WORK_LIMIT (WARNING)
    # =========================================================================
    for emp in employees:
        consecutive_days = 0
        for date_str in dates:
            entry = roster_map.get((emp.id, date_str))
            status_val = entry.status if entry else RosterStatus.WORKING.value

            if status_val == RosterStatus.WORKING.value:
                consecutive_days += 1
                if consecutive_days > 6:
                    desc = (
                        f"Employee {emp.name} ({emp.emp_code}) has worked {consecutive_days} consecutive days "
                        f"as of {date_str} without a scheduled rest day or comp-off (policy limit: 6 days)."
                    )
                    ai_exp = (
                        f"Fatigue compliance warning: Labor standards dictate that employees must receive at least 1 "
                        f"rest day in every 7-day period. {emp.name} has worked continuously for {consecutive_days} days. "
                        f"A mandatory weekly off or comp-off should be granted immediately."
                    )
                    conflicts.append({
                        "id": f"CWL-{conflict_seq:04d}",
                        "date": date_str,
                        "severity": "WARNING",
                        "conflict_type": "CONSECUTIVE_WORK_LIMIT",
                        "brand_id": None,
                        "brand_name": None,
                        "process_code": None,
                        "employee_id": emp.id,
                        "employee_name": emp.name,
                        "description": desc,
                        "ai_explanation": ai_exp,
                        "recommended_actions": []
                    })
                    conflict_seq += 1
            else:
                consecutive_days = 0

    # Sort conflicts: by date ascending, then severity (CRITICAL before WARNING)
    severity_order = {"CRITICAL": 0, "WARNING": 1}
    conflicts.sort(key=lambda c: (c["date"], severity_order.get(c["severity"], 2), c["conflict_type"]))

    return conflicts
