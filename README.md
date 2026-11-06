# Smart Roster Management System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/Frontend-React%2018-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![SQLite](https://img.shields.io/badge/Database-SQLite%20%2F%20SQLAlchemy-003B57.svg?logo=sqlite&logoColor=white)](https://sqlite.org)

An enterprise-grade, deterministic Operations Roster Management System built specifically for high-growth Direct-to-Consumer (D2C) e-commerce brands. Designed to plan, generate, validate, simulate, and operate monthly staff schedules across **32 employees, 20 D2C brands, 4 operational processes, and 3 cross-functional pods**.

The system strictly enforces the architectural separation between **Brand Operating Calendars** (contractual client SLAs) and **Employee Schedules** (human availability, planned leaves, and labor constraints), enabling instantaneous conflict detection and 1-click intelligent backup reassignment without destructive full-roster rebuilds.

---

## Table of Contents
1. [Project Overview & Key Features](#1-project-overview--key-features)
2. [System Architecture & Tech Stack](#2-system-architecture--tech-stack)
3. [The 5 Operational Stakeholder Views](#3-the-5-operational-stakeholder-views)
4. [Local Setup & Run Instructions](#4-local-setup--run-instructions)
5. [Documented Operational Assumptions](#5-documented-operational-assumptions)
6. [API Specifications](#6-api-specifications)
7. [Section 8: "Tell Us How You Think" — Complete Architectural Answers](#7-section-8-tell-us-how-you-think--complete-architectural-answers)
   - [Q1: Modeling Employees, Brands, Processes, Pods, and Relationships](#q1-how-did-you-model-employees-brands-processes-pods-and-their-relationships)
   - [Q2: Roster Generation & Constraint Satisfaction Engine](#q2-how-does-your-system-generate-a-roster-and-determine-whether-it-satisfies-the-required-constraints)
   - [Q3: Single-Resource (80%) vs. Multi-Resource (20%) Brands](#q3-how-did-you-handle-the-difference-between-single-resource-brands-and-brands-with-multiple-employees)
   - [Q4: Sole Employee Unavailability on Single-Resource Brands](#q4-what-happens-when-an-employee-manages-all-processes-for-a-brand-but-is-unavailable-on-a-required-working-day)
   - [Q5: Conflicting Requirements or Insufficient Staffing](#q5-how-does-your-system-handle-conflicting-requirements-or-insufficient-staffing)
   - [Q6: Automation vs. Human Control](#q6-which-parts-of-the-process-did-you-automate-and-which-did-you-leave-under-human-control-why)
   - [Q7: Scaling to Doubled Team and Brand Count](#q7-if-the-company-doubled-its-team-and-brand-count-what-would-you-change-about-your-solution)
   - [Q8: Improvements with One Additional Week](#q8-if-you-had-one-additional-week-to-work-on-this-what-would-you-improve-first)

---

## 1. Project Overview & Key Features

### The Problem
In modern D2C outsourced operations, 70–80% of client brands are lean: they require only 1 dedicated specialist to handle Customer Support (CS), Account Management (ACC), and Non-Delivery Reports (NDR). Meanwhile, remaining enterprise accounts require 2–3 specialists with overlapping or staggered shifts. Traditional scheduling spreadsheets fail because:
- They conflate **when a client brand is open** with **when an employee is scheduled**.
- A single unplanned leave on a single-resource brand causes silent SLA breaches.
- Staggering weekly offs across multi-resource teams requires complex combinatorial logic.
- Mid-month modifications overwrite existing schedules or require regenerating the entire month, discarding existing shift swaps and approved time-offs.

### The Solution: Smart Roster Management System
- **Deterministic Scheduling Engine**: Evaluates hard leaves, public holidays, brand operating calendars, and weekly off staggering across 30 days without stochastic randomness or non-deterministic drift.
- **Realistic 80/20 Staffing Dataset (November 2026)**:
  - **32 Employees**: 16 dedicated single-brand agents, 11 multi-resource agents, 3 Pod Leads (CS/ACC/NDR/RET certified), and 2 multi-brand shared specialists (50/50 capacity).
  - **20 D2C Brands**: 16 Single-Resource (80%) and 4 Multi-Resource (20%).
  - **3 Pods**: Pod Alpha, Pod Beta, and Pod Gamma.
  - **Pre-configured Indian Holidays**: Diwali (Nov 8, 2026) and Guru Nanak Jayanti (Nov 24, 2026).
- **6-Category Conflict & SLA Validator**:
  - `UNMET_BRAND_COVERAGE` (CRITICAL): Daily active staff < required minimum.
  - `SINGLE_RESOURCE_UNAVAILABLE` (CRITICAL): Sole employee off on an active operating day.
  - `OVERLAPPING_CAPACITY_EXCEEDED` (CRITICAL): Employee daily capacity exceeds 100%.
  - `LEAVE_COVERAGE_CONFLICT` (CRITICAL): Employee rostered as WORKING despite approved leave.
  - `PREFERENCE_OVERRIDDEN` (WARNING): Preferred weekly off overridden to preserve client SLA.
  - `CONSECUTIVE_WORK_LIMIT` (WARNING): Employee scheduled > 6 consecutive days without rest.
- **Intelligent Pod-Based Backup Recommender**: Searches the exact same Pod for available working staff (prioritizing Pod Floaters, then Pod Leads, then cross-trained agents with closed brands or spare capacity) and equips the manager with **1-click backup dispatching**.
- **Mid-Month Change Simulator (Zero-Risk What-If Analysis)**: Simulates status changes (e.g. `WORKING` -> `LEAVE`) and displays before-and-after active staffing vs. SLA requirements before saving.
- **Cell-Level Interactive Editing**: Click any cell in the 960-cell matrix to change status, auto-syncing employee leaves and re-evaluating conflicts in real-time.
- **Configuration CRUD Manager**: Complete visual manager to add, edit, or delete Employees, Brands, Process Rules, Assignments, and Leaves without touching database tables or code.
- **Enterprise CSV Export**: One-click download of the active roster matrix for payroll and compliance reporting.

---

## 2. System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Vite + React 18 SPA Frontend                         │
│  ┌───────────────────┐  ┌───────────────────┐  ┌────────────────────┐  │
│  │ Top Command Bar   │  │ 5 Stakeholder     │  │ Conflict Drawer &  │  │
│  │ & Live KPI Stats  │  │ Views (Matrix/Cov)│  │ 1-Click Backup     │  │
│  └─────────┬─────────┘  └─────────┬─────────┘  └──────────┬─────────┘  │
│            │                      │                       │            │
│  ┌─────────┴──────────────────────┴───────────────────────┴─────────┐  │
│  │             REST API Client (frontend/src/api.js)                │  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON
┌───────────────────────────────────▼────────────────────────────────────┐
│                       FastAPI Backend Service                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ REST Endpoints: /api/roster/*, /api/reset-demo, CRUD endpoints   │  │
│  └───────┬────────────────────────┬───────────────────────┬─────────┘  │
│          │                        │                       │            │
│  ┌───────▼──────────────┐ ┌───────▼─────────────┐ ┌───────▼─────────┐  │
│  │ scheduler.py         │ │ validator.py        │ │ simulator.py    │  │
│  │ Deterministic Matrix │ │ 6 Conflict Rules &  │ │ In-Memory What- │  │
│  │ Generation (960 rows)│ │ Pod Backup Ranking  │ │ If Evaluation   │  │
│  └───────┬──────────────┘ └───────┬─────────────┘ └───────┬─────────┘  │
│          └────────────────────────┼───────────────────────┘            │
│                                   ▼                                    │
│                     SQLAlchemy ORM + SQLite DB                         │
│   [Pods] [Employees] [Brands] [ProcessRules] [Assignments] [Leaves]    │
└────────────────────────────────────────────────────────────────────────┘
```

### Technology Choices
- **Backend**: Python 3.11+, FastAPI (high-throughput async endpoints, automatic OpenAPI schema generation, Pydantic v2 data validation).
- **ORM & Database**: SQLAlchemy with SQLite (`roster.db`). Zero external daemon dependencies for straightforward local evaluation and CI/CD testing.
- **Frontend**: React 18, Vite (sub-second hot-reloading and optimized production bundling), Tailwind CSS (responsive operational dashboard design), and `lucide-react` icons.
- **Production Serving**: FastAPI serves pre-built static assets (`frontend/dist`) and provides client-side SPA routing fallback at `/` while serving all JSON API routes under `/api/*`.

---

## 3. The 5 Operational Stakeholder Views

The UI is divided into 5 targeted views accessible via top-level mode switchers:

1. **Company-Wide View (`RosterMatrixView.jsx`)**:
   - Complete 32-employee $\times$ 30-day interactive matrix.
   - Status color coding: `WORKING` (Emerald), `WEEKLY_OFF` (Slate), `PUBLIC_HOLIDAY` (Purple), `LEAVE` (Rose), `COMP_OFF` (Amber), and Backup Override badge (Blue pill).
   - Cell click opens status update popover calling `POST /api/roster/cell-update`.
2. **Pod-Wise View (`RosterMatrixView.jsx`)**:
   - Filterable grouped view for **Pod Alpha**, **Pod Beta**, and **Pod Gamma**.
   - Highlights the designated Pod Lead, assigned agents, and Pod Floater.
3. **Employee-Wise View (`RosterMatrixView.jsx`)**:
   - Deep-dive card for each individual employee.
   - Summarizes working days, weekly offs, holidays, leaves, monthly utilization %, and brand/process assignments.
4. **Brand-Wise View (`BrandCoverageView.jsx`)**:
   - Displays all 20 brands tagged with `SINGLE_RESOURCE (80%)` or `MULTI_RESOURCE (20%)`.
   - 30-day daily SLA coverage status grid (Green = Staffed, Red = Gap, Blue = Backup Covered, Grey = Closed).
5. **Process-Wise View (`BrandCoverageView.jsx`)**:
   - Operational comparison across the 4 functional processes: `CS` (Customer Support), `ACC` (Account Management), `NDR` (Non-Delivery Reports), and `RET` (Returns/Exchanges).
   - Shows active staffing vs. minimum SLA requirement per day.

---

## 4. Local Setup & Run Instructions

### Prerequisites
- Python 3.11 or higher
- Node.js 18 or higher (npm 9+)
- Git

### 1. Clone & Enter Repository
```bash
git clone https://github.com/your-org/SmartRosterManagementSystem.git
cd SmartRosterManagementSystem
```

### 2. Backend Setup
```bash
# Create and activate virtual environment (optional but recommended)
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Start backend server
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
*Note: On first startup, the database auto-initializes and auto-seeds the 32-employee, 20-brand November 2026 dataset and generates all 960 roster entries.*

### 3. Frontend Setup (Development Mode)
```bash
# In a new terminal:
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173`. The dev server proxies or connects directly to `http://localhost:8000`.

### 4. Full-Stack Production Mode (Single Port Serving)
To build the frontend and serve everything directly from FastAPI on `http://localhost:8000`:
```bash
# Build the frontend bundle
cd frontend
npm run build
cd ..

# Start FastAPI
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
Open `http://localhost:8000` to view the full application served directly by FastAPI.

### 5. Automated Verification & Testing
Run the complete automated test suite verifying all 5 phases:
```bash
# Verify backend integration & endpoints
python test_checkpoint4.py

# Verify Module 4 cell updates and change simulator
python test_module4.py
```

---

## 5. Documented Operational Assumptions

1. **Brand Operating Calendars vs. Employee Availability**:
   - Client SLAs are defined at the `BrandProcessRule` level:
     - `DAYS_365`: Mandatory coverage every single calendar day (including Sundays and Public Holidays).
     - `DAILY_EXCEPT_HOLIDAYS`: Mandatory coverage Monday through Sunday, except on gazetted Public Holidays.
     - `MON_SAT_EXCEPT_HOLIDAYS`: Mandatory coverage Monday through Saturday; closed on Sundays and Public Holidays.
   - Employee contracts guarantee 1 Weekly Off per 7-day period. The operational schedule strictly reconciles this constraint against client operating days.
2. **Priority Hierarchy for Schedule Assignment**:
   ```
   Hard Leave (PLANNED / EMERGENCY / COMP_OFF)
      ▼
   Public Holiday (if brand is closed)
      ▼
   Mandatory Brand SLA Coverage (min_daily_staff)
      ▼
   Preferred Weekly Off (Soft Preference)
      ▼
   Default Working Schedule
   ```
3. **80/20 Single vs. Multi-Resource Distribution**:
   - For `SINGLE_RESOURCE` brands operating `MON_SAT_EXCEPT_HOLIDAYS`, the sole assigned employee's weekly off is locked to **Sunday**, achieving zero SLA conflict.
   - For `SINGLE_RESOURCE` brands operating `DAYS_365` or `DAILY_EXCEPT_HOLIDAYS`, the sole employee takes their weekly off while a designated **Pod Floater** or **Pod Lead** covers the brand to maintain `sunday_min_staff = 1`.
   - For `MULTI_RESOURCE` brands, weekly offs are staggered across teammates so that active on-duty staff never falls below `min_daily_staff`.
4. **Capacity Allocation Math**:
   - Each employee has a maximum daily capacity of 100%.
   - Dedicated single-brand agents divide capacity across their brand's processes (e.g. 34% CS, 33% ACC, 33% NDR).
   - Shared specialists divide capacity across brands (e.g. 50% Brand A, 50% Brand B).
   - Backup assignments consume 50% daily capacity; assigning backup to an employee with insufficient spare capacity triggers an `OVERLAPPING_CAPACITY_EXCEEDED` conflict.
5. **Pod Locality Assumption**:
   - Backup recommendations are strictly constrained to the **same Pod** to preserve brand domain knowledge, team familiarity, and supervisory oversight.

---

## 6. API Specifications

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status. |
| `POST` | `/api/reset-demo` | Clears and re-seeds the exact November 2026 dataset (32 emps, 20 brands, 960 entries). |
| `POST` | `/api/roster/generate?year_month=YYYY-MM` | Deterministic generation of monthly roster entries. |
| `GET` | `/api/roster?year_month=YYYY-MM` | Retrieves monthly roster matrix with optional filters (`employee_id`, `pod_id`, `date`, `status`). |
| `GET` | `/api/roster/validate?year_month=YYYY-MM` | Scans roster for all 6 conflict categories and returns ranked backup candidates. |
| `POST` | `/api/roster/cell-update` | Updates a single cell status, synchronizes leave tables, and returns updated conflicts. |
| `POST` | `/api/roster/simulate-change` | In-memory evaluation of an availability change before committing. |
| `POST` | `/api/roster/assign-backup` | Dispatches a Pod backup employee to cover a brand gap on a specific date. |
| `CRUD` | `/api/employees`, `/api/brands`, `/api/pods` | Full Create, Read, Update, Delete for core organizational entities. |
| `CRUD` | `/api/process-rules`, `/api/assignments` | Full management for SLA operating rules and employee allocations. |
| `CRUD` | `/api/leaves`, `/api/holidays` | Full management for employee time-off and calendar holidays. |

---

## 7. Section 8: "Tell Us How You Think" — Complete Architectural Answers

### Q1: How did you model employees, brands, processes, pods, and their relationships?

When I first read the problem statement, my biggest takeaway was that you can't just treat this like a simple Google Calendar or a basic employee shift table. In a real operations setup, client contracts and operating requirements are completely separate from who actually shows up to do the work. If you mix the two together, the moment someone takes a sick leave, your entire schedule definition breaks.

So in my database schema (`backend/models.py`), I intentionally broke this down into a few distinct relational pieces:

```
┌──────────────────┐               ┌──────────────────┐
│       Pod        │ 1           * │      Brand       │
│  (Alpha/Beta/..) │───────────────│ (Mamaearth, Boat)│
└────────┬─────────┘               └────────┬─────────┘
         │ 1                                │ 1
         │                                  │
         │ *                                │ *
┌────────▼─────────┐               ┌────────▼─────────┐
│     Employee     │ 1           * │ BrandProcessRule │
│ (Agent/Lead/..)  │───┐       ┌───│  (CS/ACC/NDR/..) │
└──────────────────┘   │       │   └──────────────────┘
                       │       │
                     * ▼       ▼ *
                 ┌───────────────────┐
                 │EmployeeAssignment │
                 │ (Capacity % / Prim│
                 └───────────────────┘
```

1. **`Pod`**: Represents the operational boundary. Every pod has a name and an assigned `pod_lead_id`. In my design, backups are strictly scoped to the same pod because you don't want an agent from an unrelated team covering a brand they know nothing about.
2. **`Brand`**: Contains the client account info and a `staffing_type` flag (`SINGLE_RESOURCE` for 80% of brands, `MULTI_RESOURCE` for 20%). Each brand belongs to exactly one pod.
3. **`BrandProcessRule`**: This was probably the most crucial modeling choice I made. Instead of attaching working hours or calendars to people, I attached them to the **(Brand, Process)** pair. For example, Sugar Cosmetics might have Customer Support operating 365 days a year, while its NDR or Abandoned Cart team only operates Mon–Sat except holidays. By defining `operating_calendar` (`DAYS_365`, `DAILY_EXCEPT_HOLIDAYS`, `MON_SAT_EXCEPT_HOLIDAYS`), `min_daily_staff`, and `sunday_min_staff` at this rule level, client contracts stay rock-solid regardless of staffing turnover.
4. **`Employee`**: Tracks the person's core data: `emp_code`, `name`, `role` (`AGENT`, `POD_LEAD`, `FLOATER`), `pod_id`, `preferred_weekly_off`, `max_daily_capacity` (100%), and a JSON array of certified `skills` (`["CS", "ACC", "NDR", "RET"]`).
5. **`EmployeeAssignment`**: The junction table that maps employees to a brand and process. It tracks `allocation_pct` (e.g. 100% dedicated, 34/33/33 across three processes of a single-resource brand, or 50/50 split across two brands) and an `is_primary` flag.
6. **`RosterEntry`**: The daily schedule fact table. One record per employee per day ($32 \times 30 = 960$ rows for November 2026), capturing their `status` (`WORKING`, `WEEKLY_OFF`, `PUBLIC_HOLIDAY`, `LEAVE`, `COMP_OFF`), `is_override` flag, and backup tracking fields (`backup_for_brand_id`, `backup_process_code`).

This separation makes everything so much cleaner to maintain. If an employee takes an emergency leave, I don't touch the brand's contract at all—I just update that employee's daily status for that date.

---

### Q2: How does your system generate a roster and determine whether it satisfies the required constraints?

For generating the monthly roster (`backend/services/scheduler.py`), I went with a clean, deterministic 4-step pipeline rather than some random or black-box solver. In real operations, managers need schedules to be 100% predictable and reproducible.

Here is how the generation loop works for each day $d$ and each employee $E$:
1. **Hard Leave Check**: First thing, I check the `EmployeeLeave` table. If someone has an approved planned leave, emergency leave, or comp-off on date $d$, their status is immediately locked to `LEAVE` or `COMP_OFF`. No questions asked.
2. **Brand Operating Calendar vs. Holidays**: Next, I inspect all processes assigned to employee $E$. If date $d$ is a gazetted public holiday (like Diwali on Nov 8 or Guru Nanak Jayanti on Nov 24) and all of their assigned brand processes are closed on holidays, their status is set to `PUBLIC_HOLIDAY`.
3. **Weekly Off Assignment (Staggered vs. Fixed)**:
   - If $E$ is the sole dedicated person for a Mon–Sat brand, I lock their Weekly Off to **Sunday**. Since the client is closed on Sunday anyway, there's zero coverage conflict.
   - If $E$ works on a multi-resource brand or a 365-day process, weekly offs are staggered across teammates. We check if giving $E$ their `preferred_weekly_off` would drop on-duty staff below `min_daily_staff`. If it's safe, they get their preferred off. If not, the engine staggers them to another day and flags a `PREFERENCE_OVERRIDDEN` warning.
4. **Default Working State**: If none of the above conditions trigger, the employee is set to `WORKING`.

```
For each Date d in [1..30]:
  1. Approved Leave on date d?  --> Set status = LEAVE
  2. All assigned brands closed? --> Set status = PUBLIC_HOLIDAY
  3. Weekly Off logic:
     - Single-resource Mon-Sat  --> Lock off to Sunday
     - Multi-resource / 365-day --> Stagger across teammates; respect preference if SLA safe
  4. Otherwise                  --> Set status = WORKING
```

#### How Validation Works (`backend/services/validator.py`)
Validation runs as a separate, read-only pass that inspects the generated matrix against operational rules. It builds an active headcount map for every `(date, brand, process)`:
$$\text{ActiveStaff}(d, B, P) = \sum \text{WorkingPrimary} + \sum \text{WorkingBackups}$$

Then it checks for 6 specific conflict types:
- **`UNMET_BRAND_COVERAGE` (CRITICAL)**: $\text{ActiveStaff} < \text{min\_daily\_staff}$ on an active operating day.
- **`SINGLE_RESOURCE_UNAVAILABLE` (CRITICAL)**: The sole employee running a single-resource brand is off or on leave without backup.
- **`OVERLAPPING_CAPACITY_EXCEEDED` (CRITICAL)**: An employee is assigned to duties exceeding 100% daily capacity.
- **`LEAVE_COVERAGE_CONFLICT` (CRITICAL)**: An employee with an approved leave is accidentally marked `WORKING`.
- **`PREFERENCE_OVERRIDDEN` (WARNING)**: Employee had their preferred off moved to keep client coverage intact.
- **`CONSECUTIVE_WORK_LIMIT` (WARNING)**: Employee scheduled $> 6$ days in a row without a weekly off or comp-off.

---

### Q3: How did you handle the difference between single-resource brands and brands with multiple employees?

This was honestly the core puzzle of the assignment. Single-resource and multi-resource brands have fundamentally different operational dynamics:

#### 1. Single-Resource Brands (80% / 16 Brands)
In our dataset, 16 brands are run by a single dedicated agent who handles CS, ACC, and NDR (split roughly 34%/33%/33% capacity).
- **For the 13 Mon–Sat brands**: The client is closed on Sundays and public holidays. So I simply locked the assigned employee's weekly off to Sunday. Because the employee takes off exactly when the client is closed, you get **100% coverage with zero SLA conflicts**. It just works.
- **For the 3 365-Day / Daily brands**: The client needs daily coverage, but the employee still legally and humanly deserves a weekly off. So when the employee takes their weekly off (or goes on leave), the engine permits it, immediately flags a `SINGLE_RESOURCE_UNAVAILABLE` conflict, and uses the backup recommender to assign a **Pod Floater** to cover that specific day.

#### 2. Multi-Resource Brands (20% / 4 Brands)
For the 4 high-volume brands (like NykaaLuxe D2C or BoatAudio Care), we have 2 to 3 employees assigned.
- Here, we have flexibility, but we need coordination. If two employees share CS with a `min_daily_staff = 1`, they cannot both take Sunday off. The scheduler staggers them—Employee A takes Sunday off, and Employee B takes Monday or Wednesday off.
- On peak weekdays where `min_daily_staff = 2`, the engine ensures that leave or off days are staggered so that at least two agents remain on duty simultaneously.

---

### Q4: What happens when an employee manages all processes for a brand but is unavailable on a required working day?

This is the classic nightmare scenario for an operations manager: the sole person running a brand takes sick leave or planned time off, leaving the client completely stranded.

Here is how my application handles this end-to-end:
1. **Instant Detection**: The moment that employee's status becomes `LEAVE` or `WEEKLY_OFF` on an active day, the validator flags a `SINGLE_RESOURCE_UNAVAILABLE` critical conflict with a plain-English explanation:
   > *"Sole assigned employee Priya Sharma is unavailable (status: LEAVE) on an active operating day for Soulflower Organics (CS). Brand requires min_daily_staff = 1."*
2. **Pod-Scoped Candidate Search**: The system immediately scans the employee's **same Pod** for backup candidates. I deliberately restricted this to the same pod because in real operations, you don't want a random agent from Pod Gamma who has never touched this client's products or tone of voice.
3. **Candidate Ranking**: The recommender filters for people who:
   - Are working on that date.
   - Have the required process in their `skills` list (e.g., certified in `CS`).
   - Have spare daily capacity ($\le 50\%$).
   - And ranks them: **Dedicated FLOATER first**, then the **POD_LEAD**, and finally **cross-trained AGENTs** whose own brand happens to be closed that day.
4. **1-Click Resolution**: The conflict payload includes `recommended_actions`. In the UI Conflict Drawer, the operations manager sees a button like **"Assign Aarav Sharma (POD_LEAD) as Backup"**. Clicking it calls `POST /api/roster/assign-backup`, sets the override flag, updates the roster cell, and immediately clears the conflict.

---

### Q5: How does your system handle conflicting requirements or insufficient staffing?

Whenever requirements clash or headcount falls short, I enforced a very strict rule: **mandatory client SLA coverage always beats personal employee preference.**

Here is the hierarchy I implemented:
```
Priority 1 (Hard Invariant): Approved Employee Leaves (medical/planned)
    ▼
Priority 2 (Hard Invariant): Client SLA Minimum Staffing (BrandProcessRule)
    ▼
Priority 3 (Hard Invariant): Employee Capacity Limit (Max 100%)
    ▼
Priority 4 (Soft Warning):   Consecutive Work Limit (<= 6 days)
    ▼
Priority 5 (Soft Warning):   Employee Preferred Weekly Off Day
```

- **When Preferences Conflict with Coverage**: If Rahul prefers Sunday off, but he is the only assigned agent on a 365-day brand with `min_daily_staff = 1`, the engine schedules him to work on Sunday and moves his weekly off to Tuesday. But it doesn't do it silently—it generates a `PREFERENCE_OVERRIDDEN` warning explaining exactly why it happened so the manager can review it or arrange a comp-off.
- **When There's an Unresolvable Shortage**: If an employee is on emergency leave, and all floaters and leads in the Pod are already at 100% capacity or off duty, the system will **never silently generate a fake valid roster**. It keeps the conflict in `CRITICAL` state, marks the date red on the brand coverage grid, drops the navbar Coverage Health score, and leaves it prominently displayed for the manager to either negotiate with the client or authorize overtime.

---

### Q6: Which parts of the process did you automate, and which did you leave under human control? Why?

I tried to be very pragmatic about what software does best versus what actually requires human judgment in a fast-paced ops team.

#### What I Automated (The Engine):
- **Combinatorial Rule Checking**: Checking 960 calendar cells across 20 brand contracts, 4 processes, holidays, and leaves takes $< 25\text{ ms}$ programmatically. Doing this manually in Excel takes hours and is where human mistakes always happen.
- **Capacity Accounting**: Enforcing that no employee is allocated more than 100% capacity across primary assignments and backup shifts.
- **Candidate Pool Filtering**: Instantly filtering 32 employees down to the 2 qualified, on-duty teammates in the same Pod who have the right skill certification.

#### Why I Left the Final Decisions Under Human Control:
- **Emergency Trade-Offs**: If two brands have simultaneous unstaffed gaps and there's only one floater available in the Pod, an algorithm can't know business context—like which client is threatening to churn or which contract has bigger SLA penalties. The operations manager has to make that call.
- **Context-Aware Exceptions**: Nuances like employee burnout history, personal emergencies, or a client specifically requesting a certain veteran agent can't be reduced to a simple if-else statement.
- **Zero-Risk Simulation Before Committing**: Instead of automatically scrambling the roster whenever someone asks about taking leave, I built a **Change Simulator**. The manager can test "what happens if Sneha takes leave on Nov 14?", see the exact impact on active staff, and only click "Commit & Assign Backup" once they're comfortable with the outcome.

---

### Q7: If the company doubled its team and brand count, what would you change about your solution?

If the company doubled to 64 people or expanded to 300+ people and 100+ brands, here is how I'd evolve the architecture:

1. **Pod-Level Parallel Scheduling**: Because brands and employees are grouped into independent Pods, the problem has natural boundaries. Backups are sourced within the same pod, so Pod Alpha has zero operational dependency on Pod Delta. We could partition scheduling and validation jobs by `pod_id` and run them in parallel across Celery or Temporal workers:
   $$\mathcal{O}(N \times D) \longrightarrow \sum_{p \in \text{Pods}} \mathcal{O}(N_p \times D)$$
   Even at 300 employees across 10 pods, each pod would process in $< 40\text{ ms}$.
2. **Migration to Google OR-Tools CP-SAT**: For 32 employees, our deterministic heuristic is instant ($\approx 25\text{ ms}$). But at 300+ employees with complex multi-skill certifications and rotating shifts, finding a globally optimal schedule becomes an NP-hard constraint satisfaction problem. I'd delegate the core assignment loop to Google OR-Tools CP-SAT solver.
3. **Database & Query Optimization**:
   - Move from SQLite to PostgreSQL with table partitioning on `roster_entries` by `year_month`.
   - Add composite indexes on `(year_month, employee_id)` and `(year_month, date)`.
   - Cache the monthly matrix in Redis as a serialized blob, invalidating only the affected dates when a single cell is updated (`POST /api/roster/cell-update`).
4. **Frontend Virtualization**: Rendering 300+ rows and 30 columns in a plain HTML table would make the DOM sluggish. I'd add `@tanstack/react-virtual` to `RosterMatrixView.jsx` so only the 20 visible rows in the viewport are rendered while scrolling at 60 FPS.

---

### Q8: If you had one additional week to work on this, what would you improve first?

If I had one more week, these are the 4 features I would build next:

1. **Shift-Level Rotations (24/7 Support)**: Currently, the system works at a daily calendar grain (an employee either works or is off on date $d$). High-growth D2C brands often need 24/7 CS coverage with Morning (08:00–16:00), Evening (16:00–00:00), and Night (00:00–08:00) shifts, plus enforcing mandatory 12-hour rest periods between shifts. Moving from daily to shift granularity would be my top priority.
2. **Predictive SLA Risk Index (Monte Carlo Simulation)**: I'd build an analytics module that analyzes historical unplanned absence rates per employee and pod. Before the month even begins, it could flag vulnerable single-resource brands with a "High SLA Risk" score, helping the manager proactively reserve floater capacity.
3. **Interactive Slack / WhatsApp Bot**: Instead of requiring the manager to manually input leaves, employees could type `/leave 2026-11-12` in Slack. The backend would run the Change Simulator in the background and send an actionable message to the Pod Lead: *"Priya requested leave on Nov 12 for Soulflower CS. Floater Rohan is on duty and available. [Approve & Assign Backup]"*.
4. **Multi-Tier Skill Competencies (L1 / L2 / L3)**: Right now skills are binary flags (you either have `CS` or you don't). In reality, there are L1 agents (basic chat), L2 agents (disputes & escalations), and L3 leads (VIP accounts). Matching backup candidates based on competency depth would prevent putting a novice on an enterprise account.


---

## 8. License & Acknowledgments
Built for the **Datastraw Senior Full-Stack Engineering Assessment**.
Licensed under the [MIT License](LICENSE).
