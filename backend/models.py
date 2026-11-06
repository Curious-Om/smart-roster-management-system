import enum
from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Integer,
    String,
    JSON,
    UniqueConstraint
)
from sqlalchemy.orm import relationship

from .database import Base


class EmployeeRole(str, enum.Enum):
    AGENT = "AGENT"
    POD_LEAD = "POD_LEAD"
    FLOATER = "FLOATER"


class StaffingType(str, enum.Enum):
    SINGLE_RESOURCE = "SINGLE_RESOURCE"
    MULTI_RESOURCE = "MULTI_RESOURCE"


class ProcessCode(str, enum.Enum):
    CS = "CS"
    ACC = "ACC"
    NDR = "NDR"
    RET = "RET"


class OperatingCalendar(str, enum.Enum):
    DAYS_365 = "DAYS_365"
    DAILY_EXCEPT_HOLIDAYS = "DAILY_EXCEPT_HOLIDAYS"
    MON_SAT_EXCEPT_HOLIDAYS = "MON_SAT_EXCEPT_HOLIDAYS"


class LeaveType(str, enum.Enum):
    PLANNED_LEAVE = "PLANNED_LEAVE"
    EMERGENCY_LEAVE = "EMERGENCY_LEAVE"
    COMP_OFF = "COMP_OFF"


class RosterStatus(str, enum.Enum):
    WORKING = "WORKING"
    WEEKLY_OFF = "WEEKLY_OFF"
    PUBLIC_HOLIDAY = "PUBLIC_HOLIDAY"
    LEAVE = "LEAVE"
    COMP_OFF = "COMP_OFF"


class Pod(Base):
    __tablename__ = "pods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    pod_lead_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    employees = relationship(
        "Employee",
        foreign_keys="[Employee.pod_id]",
        back_populates="pod"
    )
    brands = relationship(
        "Brand",
        back_populates="pod",
        cascade="all, delete-orphan"
    )
    pod_lead = relationship(
        "Employee",
        foreign_keys=[pod_lead_id],
        post_update=True
    )


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    emp_code = Column(String(30), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    role = Column(String(30), nullable=False, default=EmployeeRole.AGENT.value)
    pod_id = Column(Integer, ForeignKey("pods.id", ondelete="SET NULL"), nullable=True)
    preferred_weekly_off = Column(Integer, nullable=False, default=6)  # 0=Mon, 6=Sun
    max_daily_capacity = Column(Integer, nullable=False, default=100)  # 100% capacity
    skills = Column(JSON, nullable=False, default=list)  # e.g. ["CS", "ACC", "NDR", "RET"]

    # Relationships
    pod = relationship(
        "Pod",
        foreign_keys=[pod_id],
        back_populates="employees"
    )
    assignments = relationship(
        "EmployeeAssignment",
        back_populates="employee",
        cascade="all, delete-orphan"
    )
    leaves = relationship(
        "EmployeeLeave",
        back_populates="employee",
        cascade="all, delete-orphan"
    )
    roster_entries = relationship(
        "RosterEntry",
        back_populates="employee",
        cascade="all, delete-orphan"
    )


class Brand(Base):
    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    pod_id = Column(Integer, ForeignKey("pods.id", ondelete="CASCADE"), nullable=False)
    staffing_type = Column(String(30), nullable=False, default=StaffingType.SINGLE_RESOURCE.value)

    # Relationships
    pod = relationship("Pod", back_populates="brands")
    process_rules = relationship(
        "BrandProcessRule",
        back_populates="brand",
        cascade="all, delete-orphan"
    )
    assignments = relationship(
        "EmployeeAssignment",
        back_populates="brand",
        cascade="all, delete-orphan"
    )


class BrandProcessRule(Base):
    __tablename__ = "brand_process_rules"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="CASCADE"), nullable=False)
    process_code = Column(String(20), nullable=False)  # CS, ACC, NDR, RET
    operating_calendar = Column(String(50), nullable=False)  # DAYS_365, DAILY_EXCEPT_HOLIDAYS, MON_SAT_EXCEPT_HOLIDAYS
    min_daily_staff = Column(Integer, nullable=False, default=1)
    sunday_min_staff = Column(Integer, nullable=False, default=0)

    # Relationships
    brand = relationship("Brand", back_populates="process_rules")

    __table_args__ = (
        UniqueConstraint("brand_id", "process_code", name="uq_brand_process"),
    )


class EmployeeAssignment(Base):
    __tablename__ = "employee_assignments"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="CASCADE"), nullable=False)
    process_code = Column(String(20), nullable=False)
    allocation_pct = Column(Integer, nullable=False, default=100)
    is_primary = Column(Boolean, nullable=False, default=True)

    # Relationships
    employee = relationship("Employee", back_populates="assignments")
    brand = relationship("Brand", back_populates="assignments")

    __table_args__ = (
        UniqueConstraint("employee_id", "brand_id", "process_code", name="uq_emp_brand_process"),
    )


class PublicHoliday(Base):
    __tablename__ = "public_holidays"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(10), unique=True, nullable=False, index=True)  # YYYY-MM-DD
    name = Column(String(100), nullable=False)


class EmployeeLeave(Base):
    __tablename__ = "employee_leaves"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    leave_type = Column(String(30), nullable=False, default=LeaveType.PLANNED_LEAVE.value)
    reason = Column(String(255), nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="leaves")

    __table_args__ = (
        UniqueConstraint("employee_id", "date", name="uq_emp_leave_date"),
    )


class RosterEntry(Base):
    __tablename__ = "roster_entries"

    id = Column(Integer, primary_key=True, index=True)
    year_month = Column(String(7), nullable=False, index=True)  # YYYY-MM
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(30), nullable=False)  # WORKING, WEEKLY_OFF, PUBLIC_HOLIDAY, LEAVE, COMP_OFF
    is_override = Column(Boolean, nullable=False, default=False)
    backup_for_brand_id = Column(Integer, ForeignKey("brands.id", ondelete="SET NULL"), nullable=True)
    backup_process_code = Column(String(20), nullable=True)
    notes = Column(String(255), nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="roster_entries")
    backup_for_brand = relationship("Brand")

    __table_args__ = (
        UniqueConstraint("employee_id", "date", name="uq_emp_roster_date"),
    )
