from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine, Base
from backend.models import (
    Pod,
    Employee,
    Brand,
    BrandProcessRule,
    EmployeeAssignment,
    PublicHoliday,
    EmployeeLeave,
    RosterEntry,
    EmployeeRole,
    StaffingType,
    ProcessCode,
    OperatingCalendar,
    LeaveType
)


def seed_data(db: Session):
    """
    Clears existing data and seeds the exact November 2026 dataset:
    - 3 Pods (Pod Alpha, Pod Beta, Pod Gamma)
    - 32 Employees (3 Pod Leads, 16 Single-Brand Agents, 11 Multi-Brand Agents, 2 Shared Floaters)
    - 20 Brands (16 Single-Resource [13 Mon-Sat, 3 365/Daily], 4 Multi-Resource)
    - Brand Process Rules for all brands
    - Employee Assignments (including 100% dedicated, 50/50 splits, and 34/33/33 splits)
    - 2 Public Holidays in November 2026
    - 6 Pre-seeded Planned Leaves
    """
    # 1. Clear existing data in reverse foreign key order
    db.query(RosterEntry).delete()
    db.query(EmployeeLeave).delete()
    db.query(EmployeeAssignment).delete()
    db.query(BrandProcessRule).delete()
    db.query(Brand).delete()
    
    # Null out pod_lead_id before clearing employees to avoid circular FK issues
    for pod in db.query(Pod).all():
        pod.pod_lead_id = None
    db.commit()

    db.query(Employee).delete()
    db.query(Pod).delete()
    db.query(PublicHoliday).delete()
    db.commit()

    # 2. Create 3 Pods
    pod_alpha = Pod(name="Pod Alpha")
    pod_beta = Pod(name="Pod Beta")
    pod_gamma = Pod(name="Pod Gamma")
    db.add_all([pod_alpha, pod_beta, pod_gamma])
    db.commit()

    # 3. Create 32 Employees with realistic Indian names
    employees_data = [
        # Pod Leads (3) - skilled in all 4 processes
        {
            "emp_code": "EMP-001",
            "name": "Aarav Sharma",
            "role": EmployeeRole.POD_LEAD.value,
            "pod_id": pod_alpha.id,
            "preferred_weekly_off": 6,  # Sunday
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value, ProcessCode.RET.value]
        },
        {
            "emp_code": "EMP-002",
            "name": "Priya Patel",
            "role": EmployeeRole.POD_LEAD.value,
            "pod_id": pod_beta.id,
            "preferred_weekly_off": 6,  # Sunday
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value, ProcessCode.RET.value]
        },
        {
            "emp_code": "EMP-003",
            "name": "Rohan Mehta",
            "role": EmployeeRole.POD_LEAD.value,
            "pod_id": pod_gamma.id,
            "preferred_weekly_off": 6,  # Sunday
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value, ProcessCode.RET.value]
        },

        # 16 Dedicated Single-Brand Agents (EMP-004 to EMP-019)
        # Pod Alpha (5 single-brand agents)
        {
            "emp_code": "EMP-004",
            "name": "Ananya Iyer",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_alpha.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value]
        },
        {
            "emp_code": "EMP-005",
            "name": "Vikram Singh",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_alpha.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value]
        },
        {
            "emp_code": "EMP-006",
            "name": "Sneha Reddy",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_alpha.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value]
        },
        {
            "emp_code": "EMP-007",
            "name": "Arjun Nair",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_alpha.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value]
        },
        {
            "emp_code": "EMP-008",
            "name": "Neha Gupta",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_alpha.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value]
        },

        # Pod Beta (6 single-brand agents)
        {
            "emp_code": "EMP-009",
            "name": "Rahul Joshi",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_beta.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value]
        },
        {
            "emp_code": "EMP-010",
            "name": "Kavita Deshmukh",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_beta.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value]
        },
        {
            "emp_code": "EMP-011",
            "name": "Rajesh Kulkarni",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_beta.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value]
        },
        {
            "emp_code": "EMP-012",
            "name": "Deepa Sundaram",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_beta.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value]
        },
        {
            "emp_code": "EMP-013",
            "name": "Siddharth Malhotra",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_beta.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value]
        },
        {
            "emp_code": "EMP-014",
            "name": "Meera Nambiar",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_beta.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value]
        },

        # Pod Gamma (5 single-brand agents)
        {
            "emp_code": "EMP-015",
            "name": "Tanvi Sen",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_gamma.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value]
        },
        {
            "emp_code": "EMP-016",
            "name": "Karthik Raman",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_gamma.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value]
        },
        {
            "emp_code": "EMP-017",
            "name": "Divya Pillai",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_gamma.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value]
        },
        {
            "emp_code": "EMP-018",
            "name": "Amit Trivedi",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_gamma.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value]
        },
        {
            "emp_code": "EMP-019",
            "name": "Shalini Saxena",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_gamma.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value]
        },

        # 11 Multi-Resource Brand Agents (EMP-020 to EMP-030)
        # NykaaLuxe D2C (Pod Alpha) - 3 agents
        {
            "emp_code": "EMP-020",
            "name": "Ishaan Bannerjee",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_alpha.id,
            "preferred_weekly_off": 6,  # Sun
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value]
        },
        {
            "emp_code": "EMP-021",
            "name": "Ritu Singhania",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_alpha.id,
            "preferred_weekly_off": 5,  # Saturday (staggered for min 2 staff CS coverage)
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value]
        },
        {
            "emp_code": "EMP-022",
            "name": "Varun Kapoor",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_alpha.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.NDR.value, ProcessCode.RET.value]
        },

        # BoatAudio Care (Pod Alpha) - 3 agents
        {
            "emp_code": "EMP-023",
            "name": "Swati Bhatt",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_alpha.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value]
        },
        {
            "emp_code": "EMP-024",
            "name": "Nikhil Agrawal",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_alpha.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.ACC.value]
        },
        {
            "emp_code": "EMP-025",
            "name": "Sunita Hegde",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_alpha.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.NDR.value]
        },

        # MamaEarth Ops (Pod Beta) - 3 agents
        {
            "emp_code": "EMP-026",
            "name": "Manav Chawla",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_beta.id,
            "preferred_weekly_off": 6,  # Sun
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value]
        },
        {
            "emp_code": "EMP-027",
            "name": "Preeti Mukherjee",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_beta.id,
            "preferred_weekly_off": 0,  # Monday (staggered for min 2 staff CS coverage)
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value]
        },
        {
            "emp_code": "EMP-028",
            "name": "Harish Choudhury",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_beta.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.ACC.value, ProcessCode.RET.value]
        },

        # Wakefit Support (Pod Gamma) - 2 agents
        {
            "emp_code": "EMP-029",
            "name": "Gautam Venkatesh",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_gamma.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value]
        },
        {
            "emp_code": "EMP-030",
            "name": "Shruti Bajpai",
            "role": EmployeeRole.AGENT.value,
            "pod_id": pod_gamma.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.NDR.value]
        },

        # 2 Multi-Brand Shared Specialists (EMP-031 to EMP-032)
        {
            "emp_code": "EMP-031",
            "name": "Aditya Verma",
            "role": EmployeeRole.FLOATER.value,
            "pod_id": pod_alpha.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value, ProcessCode.RET.value]
        },
        {
            "emp_code": "EMP-032",
            "name": "Pooja Rao",
            "role": EmployeeRole.FLOATER.value,
            "pod_id": pod_beta.id,
            "preferred_weekly_off": 6,
            "max_daily_capacity": 100,
            "skills": [ProcessCode.CS.value, ProcessCode.ACC.value, ProcessCode.NDR.value, ProcessCode.RET.value]
        }
    ]

    employees = [Employee(**e) for e in employees_data]
    db.add_all(employees)
    db.commit()

    # Re-fetch employees indexed by emp_code
    emp_map = {e.emp_code: e for e in db.query(Employee).all()}

    # Assign Pod Leads
    pod_alpha.pod_lead_id = emp_map["EMP-001"].id
    pod_beta.pod_lead_id = emp_map["EMP-002"].id
    pod_gamma.pod_lead_id = emp_map["EMP-003"].id
    db.commit()

    # 4. Create 20 Brands (16 Single-Resource, 4 Multi-Resource)
    # 16 Single-Resource Brands:
    # 13 operate MON_SAT_EXCEPT_HOLIDAYS
    # 3 operate CS under DAYS_365 or DAILY_EXCEPT_HOLIDAYS (Sugar Cosmetics, mCaffeine, Foxtale)
    single_brands_meta = [
        # Pod Alpha (5)
        {"name": "Sleepy Owl Coffee", "pod_id": pod_alpha.id, "special_cs": None, "agent_code": "EMP-004"},
        {"name": "The Souled Store", "pod_id": pod_alpha.id, "special_cs": None, "agent_code": "EMP-005"},
        {"name": "Sugar Cosmetics", "pod_id": pod_alpha.id, "special_cs": OperatingCalendar.DAYS_365.value, "agent_code": "EMP-006"},
        {"name": "BlissClub", "pod_id": pod_alpha.id, "special_cs": None, "agent_code": "EMP-007"},
        {"name": "Bombay Shaving Co", "pod_id": pod_alpha.id, "special_cs": None, "agent_code": "EMP-008"},

        # Pod Beta (6)
        {"name": "Slurrp Farm", "pod_id": pod_beta.id, "special_cs": None, "agent_code": "EMP-009"},
        {"name": "Epigamia", "pod_id": pod_beta.id, "special_cs": None, "agent_code": "EMP-010"},
        {"name": "Chaayos D2C", "pod_id": pod_beta.id, "special_cs": None, "agent_code": "EMP-011"},
        {"name": "mCaffeine", "pod_id": pod_beta.id, "special_cs": OperatingCalendar.DAYS_365.value, "agent_code": "EMP-012"},
        {"name": "Kapiva Ayurveda", "pod_id": pod_beta.id, "special_cs": None, "agent_code": "EMP-013"},
        {"name": "Plum Goodness", "pod_id": pod_beta.id, "special_cs": None, "agent_code": "EMP-014"},

        # Pod Gamma (5)
        {"name": "Snitch", "pod_id": pod_gamma.id, "special_cs": None, "agent_code": "EMP-015"},
        {"name": "Foxtale", "pod_id": pod_gamma.id, "special_cs": OperatingCalendar.DAILY_EXCEPT_HOLIDAYS.value, "agent_code": "EMP-016"},
        {"name": "Heads Up For Tails", "pod_id": pod_gamma.id, "special_cs": None, "agent_code": "EMP-017"},
        {"name": "Country Delight", "pod_id": pod_gamma.id, "special_cs": None, "agent_code": "EMP-018"},
        {"name": "Minimalist", "pod_id": pod_gamma.id, "special_cs": None, "agent_code": "EMP-019"}
    ]

    single_brands = []
    for sb in single_brands_meta:
        brand = Brand(
            name=sb["name"],
            pod_id=sb["pod_id"],
            staffing_type=StaffingType.SINGLE_RESOURCE.value
        )
        single_brands.append(brand)
    db.add_all(single_brands)
    db.commit()

    # 4 Multi-Resource Brands
    multi_brands_meta = [
        {"name": "NykaaLuxe D2C", "pod_id": pod_alpha.id},
        {"name": "BoatAudio Care", "pod_id": pod_alpha.id},
        {"name": "MamaEarth Ops", "pod_id": pod_beta.id},
        {"name": "Wakefit Support", "pod_id": pod_gamma.id}
    ]

    multi_brands = []
    for mb in multi_brands_meta:
        brand = Brand(
            name=mb["name"],
            pod_id=mb["pod_id"],
            staffing_type=StaffingType.MULTI_RESOURCE.value
        )
        multi_brands.append(brand)
    db.add_all(multi_brands)
    db.commit()

    brand_map = {b.name: b for b in db.query(Brand).all()}

    # 5. Create Brand Process Rules & Employee Assignments
    process_rules = []
    assignments = []

    # A. Single-Resource Brands (16 brands)
    for sb in single_brands_meta:
        b = brand_map[sb["name"]]
        agent = emp_map[sb["agent_code"]]

        # Process Rules: CS, ACC, NDR
        cs_cal = sb["special_cs"] if sb["special_cs"] else OperatingCalendar.MON_SAT_EXCEPT_HOLIDAYS.value
        cs_sun_staff = 1 if cs_cal in [OperatingCalendar.DAYS_365.value, OperatingCalendar.DAILY_EXCEPT_HOLIDAYS.value] else 0

        # CS Rule
        process_rules.append(BrandProcessRule(
            brand_id=b.id,
            process_code=ProcessCode.CS.value,
            operating_calendar=cs_cal,
            min_daily_staff=1,
            sunday_min_staff=cs_sun_staff
        ))

        # ACC Rule
        process_rules.append(BrandProcessRule(
            brand_id=b.id,
            process_code=ProcessCode.ACC.value,
            operating_calendar=OperatingCalendar.MON_SAT_EXCEPT_HOLIDAYS.value,
            min_daily_staff=1,
            sunday_min_staff=0
        ))

        # NDR Rule
        process_rules.append(BrandProcessRule(
            brand_id=b.id,
            process_code=ProcessCode.NDR.value,
            operating_calendar=OperatingCalendar.MON_SAT_EXCEPT_HOLIDAYS.value,
            min_daily_staff=1,
            sunday_min_staff=0
        ))

        # Assignments: Dedicated employee assigned across CS (34%), ACC (33%), NDR (33%) -> 100%
        assignments.append(EmployeeAssignment(
            employee_id=agent.id,
            brand_id=b.id,
            process_code=ProcessCode.CS.value,
            allocation_pct=34,
            is_primary=True
        ))
        assignments.append(EmployeeAssignment(
            employee_id=agent.id,
            brand_id=b.id,
            process_code=ProcessCode.ACC.value,
            allocation_pct=33,
            is_primary=True
        ))
        assignments.append(EmployeeAssignment(
            employee_id=agent.id,
            brand_id=b.id,
            process_code=ProcessCode.NDR.value,
            allocation_pct=33,
            is_primary=True
        ))

    # B. Multi-Resource Brand 1: NykaaLuxe D2C (Pod Alpha)
    # Rules: CS (DAYS_365, min 2, sun min 1), NDR (MON_SAT, min 1), RET (MON_SAT, min 1)
    b_nykaa = brand_map["NykaaLuxe D2C"]
    process_rules.append(BrandProcessRule(
        brand_id=b_nykaa.id,
        process_code=ProcessCode.CS.value,
        operating_calendar=OperatingCalendar.DAYS_365.value,
        min_daily_staff=2,
        sunday_min_staff=1
    ))
    process_rules.append(BrandProcessRule(
        brand_id=b_nykaa.id,
        process_code=ProcessCode.NDR.value,
        operating_calendar=OperatingCalendar.MON_SAT_EXCEPT_HOLIDAYS.value,
        min_daily_staff=1,
        sunday_min_staff=0
    ))
    process_rules.append(BrandProcessRule(
        brand_id=b_nykaa.id,
        process_code=ProcessCode.RET.value,
        operating_calendar=OperatingCalendar.MON_SAT_EXCEPT_HOLIDAYS.value,
        min_daily_staff=1,
        sunday_min_staff=0
    ))
    # Assignments: Emp 20 -> CS (100%), Emp 21 -> CS (100%), Emp 22 -> NDR (50%) + RET (50%)
    assignments.append(EmployeeAssignment(
        employee_id=emp_map["EMP-020"].id,
        brand_id=b_nykaa.id,
        process_code=ProcessCode.CS.value,
        allocation_pct=100,
        is_primary=True
    ))
    assignments.append(EmployeeAssignment(
        employee_id=emp_map["EMP-021"].id,
        brand_id=b_nykaa.id,
        process_code=ProcessCode.CS.value,
        allocation_pct=100,
        is_primary=True
    ))
    assignments.append(EmployeeAssignment(
        employee_id=emp_map["EMP-022"].id,
        brand_id=b_nykaa.id,
        process_code=ProcessCode.NDR.value,
        allocation_pct=50,
        is_primary=True
    ))
    assignments.append(EmployeeAssignment(
        employee_id=emp_map["EMP-022"].id,
        brand_id=b_nykaa.id,
        process_code=ProcessCode.RET.value,
        allocation_pct=50,
        is_primary=True
    ))

    # C. Multi-Resource Brand 2: BoatAudio Care (Pod Alpha)
    # Rules: CS (DAILY_EXCEPT_HOLIDAYS, min 1, sun min 1), ACC (MON_SAT, min 1), NDR (MON_SAT, min 1)
    b_boat = brand_map["BoatAudio Care"]
    process_rules.append(BrandProcessRule(
        brand_id=b_boat.id,
        process_code=ProcessCode.CS.value,
        operating_calendar=OperatingCalendar.DAILY_EXCEPT_HOLIDAYS.value,
        min_daily_staff=1,
        sunday_min_staff=1
    ))
    process_rules.append(BrandProcessRule(
        brand_id=b_boat.id,
        process_code=ProcessCode.ACC.value,
        operating_calendar=OperatingCalendar.MON_SAT_EXCEPT_HOLIDAYS.value,
        min_daily_staff=1,
        sunday_min_staff=0
    ))
    process_rules.append(BrandProcessRule(
        brand_id=b_boat.id,
        process_code=ProcessCode.NDR.value,
        operating_calendar=OperatingCalendar.MON_SAT_EXCEPT_HOLIDAYS.value,
        min_daily_staff=1,
        sunday_min_staff=0
    ))
    # Assignments: Emp 23 -> CS (100%), Emp 24 -> ACC (100%), Emp 25 -> NDR (100%)
    assignments.append(EmployeeAssignment(
        employee_id=emp_map["EMP-023"].id,
        brand_id=b_boat.id,
        process_code=ProcessCode.CS.value,
        allocation_pct=100,
        is_primary=True
    ))
    assignments.append(EmployeeAssignment(
        employee_id=emp_map["EMP-024"].id,
        brand_id=b_boat.id,
        process_code=ProcessCode.ACC.value,
        allocation_pct=100,
        is_primary=True
    ))
    assignments.append(EmployeeAssignment(
        employee_id=emp_map["EMP-025"].id,
        brand_id=b_boat.id,
        process_code=ProcessCode.NDR.value,
        allocation_pct=100,
        is_primary=True
    ))

    # D. Multi-Resource Brand 3: MamaEarth Ops (Pod Beta)
    # Rules: CS (DAYS_365, min 2, sun min 1), ACC (DAILY_EXCEPT_HOLIDAYS, min 1, sun min 1), RET (MON_SAT, min 1)
    b_mama = brand_map["MamaEarth Ops"]
    process_rules.append(BrandProcessRule(
        brand_id=b_mama.id,
        process_code=ProcessCode.CS.value,
        operating_calendar=OperatingCalendar.DAYS_365.value,
        min_daily_staff=2,
        sunday_min_staff=1
    ))
    process_rules.append(BrandProcessRule(
        brand_id=b_mama.id,
        process_code=ProcessCode.ACC.value,
        operating_calendar=OperatingCalendar.DAILY_EXCEPT_HOLIDAYS.value,
        min_daily_staff=1,
        sunday_min_staff=1
    ))
    process_rules.append(BrandProcessRule(
        brand_id=b_mama.id,
        process_code=ProcessCode.RET.value,
        operating_calendar=OperatingCalendar.MON_SAT_EXCEPT_HOLIDAYS.value,
        min_daily_staff=1,
        sunday_min_staff=0
    ))
    # Assignments: Emp 26 -> CS (100%), Emp 27 -> CS (100%), Emp 28 -> ACC (50%) + RET (50%)
    assignments.append(EmployeeAssignment(
        employee_id=emp_map["EMP-026"].id,
        brand_id=b_mama.id,
        process_code=ProcessCode.CS.value,
        allocation_pct=100,
        is_primary=True
    ))
    assignments.append(EmployeeAssignment(
        employee_id=emp_map["EMP-027"].id,
        brand_id=b_mama.id,
        process_code=ProcessCode.CS.value,
        allocation_pct=100,
        is_primary=True
    ))
    assignments.append(EmployeeAssignment(
        employee_id=emp_map["EMP-028"].id,
        brand_id=b_mama.id,
        process_code=ProcessCode.ACC.value,
        allocation_pct=50,
        is_primary=True
    ))
    assignments.append(EmployeeAssignment(
        employee_id=emp_map["EMP-028"].id,
        brand_id=b_mama.id,
        process_code=ProcessCode.RET.value,
        allocation_pct=50,
        is_primary=True
    ))

    # E. Multi-Resource Brand 4: Wakefit Support (Pod Gamma)
    # Rules: CS (DAYS_365, min 1, sun min 1), NDR (MON_SAT, min 1)
    b_wakefit = brand_map["Wakefit Support"]
    process_rules.append(BrandProcessRule(
        brand_id=b_wakefit.id,
        process_code=ProcessCode.CS.value,
        operating_calendar=OperatingCalendar.DAYS_365.value,
        min_daily_staff=1,
        sunday_min_staff=1
    ))
    process_rules.append(BrandProcessRule(
        brand_id=b_wakefit.id,
        process_code=ProcessCode.NDR.value,
        operating_calendar=OperatingCalendar.MON_SAT_EXCEPT_HOLIDAYS.value,
        min_daily_staff=1,
        sunday_min_staff=0
    ))
    # Assignments: Emp 29 -> CS (100%), Emp 30 -> NDR (100%)
    assignments.append(EmployeeAssignment(
        employee_id=emp_map["EMP-029"].id,
        brand_id=b_wakefit.id,
        process_code=ProcessCode.CS.value,
        allocation_pct=100,
        is_primary=True
    ))
    assignments.append(EmployeeAssignment(
        employee_id=emp_map["EMP-030"].id,
        brand_id=b_wakefit.id,
        process_code=ProcessCode.NDR.value,
        allocation_pct=100,
        is_primary=True
    ))

    # F. Multi-Brand Shared Specialists (2 floaters assigned across 2 brands at 50% capacity each)
    # Emp 31 (Aditya Verma - Pod Alpha): Sleepy Owl Coffee CS (50%) & The Souled Store CS (50%)
    b_sleepy = brand_map["Sleepy Owl Coffee"]
    b_souled = brand_map["The Souled Store"]
    assignments.append(EmployeeAssignment(
        employee_id=emp_map["EMP-031"].id,
        brand_id=b_sleepy.id,
        process_code=ProcessCode.CS.value,
        allocation_pct=50,
        is_primary=False
    ))
    assignments.append(EmployeeAssignment(
        employee_id=emp_map["EMP-031"].id,
        brand_id=b_souled.id,
        process_code=ProcessCode.CS.value,
        allocation_pct=50,
        is_primary=False
    ))

    # Emp 32 (Pooja Rao - Pod Beta): Slurrp Farm ACC (50%) & Epigamia ACC (50%)
    b_slurrp = brand_map["Slurrp Farm"]
    b_epigamia = brand_map["Epigamia"]
    assignments.append(EmployeeAssignment(
        employee_id=emp_map["EMP-032"].id,
        brand_id=b_slurrp.id,
        process_code=ProcessCode.ACC.value,
        allocation_pct=50,
        is_primary=False
    ))
    assignments.append(EmployeeAssignment(
        employee_id=emp_map["EMP-032"].id,
        brand_id=b_epigamia.id,
        process_code=ProcessCode.ACC.value,
        allocation_pct=50,
        is_primary=False
    ))

    db.add_all(process_rules)
    db.add_all(assignments)
    db.commit()

    # 6. Create Public Holidays for November 2026
    holidays = [
        PublicHoliday(date="2026-11-08", name="Diwali"),
        PublicHoliday(date="2026-11-24", name="Guru Nanak Jayanti")
    ]
    db.add_all(holidays)
    db.commit()

    # 7. Create 6 Pre-seeded Planned Leaves
    # - 2 on Single-Resource brands (EMP-006, EMP-016)
    # - 3 on Multi-Resource brands (EMP-020, EMP-023, EMP-026)
    # - 1 on Shared Floater (EMP-031)
    leaves = [
        EmployeeLeave(
            employee_id=emp_map["EMP-006"].id,
            date="2026-11-12",
            leave_type=LeaveType.PLANNED_LEAVE.value,
            reason="Personal family function"
        ),
        EmployeeLeave(
            employee_id=emp_map["EMP-020"].id,
            date="2026-11-10",
            leave_type=LeaveType.PLANNED_LEAVE.value,
            reason="Medical checkup"
        ),
        EmployeeLeave(
            employee_id=emp_map["EMP-026"].id,
            date="2026-11-18",
            leave_type=LeaveType.PLANNED_LEAVE.value,
            reason="Family wedding"
        ),
        EmployeeLeave(
            employee_id=emp_map["EMP-016"].id,
            date="2026-11-17",
            leave_type=LeaveType.PLANNED_LEAVE.value,
            reason="Annual dental surgery"
        ),
        EmployeeLeave(
            employee_id=emp_map["EMP-023"].id,
            date="2026-11-16",
            leave_type=LeaveType.PLANNED_LEAVE.value,
            reason="Urgent personal leave"
        ),
        EmployeeLeave(
            employee_id=emp_map["EMP-031"].id,
            date="2026-11-25",
            leave_type=LeaveType.PLANNED_LEAVE.value,
            reason="House shifting"
        ),
    ]
    db.add_all(leaves)
    db.commit()

    summary = {
        "pods": db.query(Pod).count(),
        "employees": db.query(Employee).count(),
        "brands": db.query(Brand).count(),
        "process_rules": db.query(BrandProcessRule).count(),
        "assignments": db.query(EmployeeAssignment).count(),
        "holidays": db.query(PublicHoliday).count(),
        "leaves": db.query(EmployeeLeave).count()
    }
    return summary


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        summary = seed_data(db)
        print("Database seeding completed successfully!")
        print(f"Summary: {summary}")
    finally:
        db.close()
