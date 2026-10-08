# STEP 13: AI Daily Planner - System Architecture & Verification Report

## 1. Architectural Overview

The **LifePilot AI Daily Planner** is an autonomous scheduling engine that generates optimized, collision-free daily schedules while respecting fixed calendar commitments, important deadlines, strategic rest breaks, and cognitive capacity limits.

```mermaid
flowchart TD
    subgraph Client ["Frontend (Next.js - Port 3000)"]
        DashboardBtn["Dashboard Hero Button:\n'AI Daily Planner'"]
        CalendarBtn["Calendar Action Button:\n'AI Daily Planner'"]
        PlannerModal["AiDailyPlannerModal\n(10-Stage Synthesis, Timeline & Diff UI)"]
        ClientActions["User Actions:\n[Apply Plan]\n[Edit Plan]\n[Cancel]"]
    end

    subgraph BackendGateway ["NestJS Backend Gateway (Port 4000)"]
        AiController["AiController\n(POST /api/v1/ai/daily-plan/generate)\n(POST /api/v1/ai/daily-plan/apply)"]
        AiPlanner["AiPlannerService\n(10-Factor Data Aggregator & Safety Auditor)"]
        TaskService["TasksService\n(Pending, Missed & Overdue Tasks)"]
        CalService["CalendarService\n(Fixed Commitments & Schedule Intervals)"]
        PrismaDb["Prisma ORM\n(Habits, Study Plans, User Preferences, Focus Logs)"]
    end

    subgraph AiMicroservice ["AI Service (Python + FastAPI - Port 8000)"]
        FastApiRouter["FastAPI Router\n(POST /api/v1/planner/daily-plan)"]
        OptimizerEngine["Interval Packing & Capacity Engine\n(_optimize_daily_schedule)"]
    end

    DashboardBtn --> PlannerModal
    CalendarBtn --> PlannerModal
    PlannerModal --> |1. Request Plan| AiController
    AiController --> AiPlanner

    %% 10-Factor Data Sourcing
    AiPlanner --> |1. Tasks| TaskService
    AiPlanner --> |2. Deadlines| TaskService
    AiPlanner --> |3. Priorities| TaskService
    AiPlanner --> |4. Available Hours| PrismaDb
    AiPlanner --> |5. Calendar Events| CalService
    AiPlanner --> |6. Active Habits| PrismaDb
    AiPlanner --> |7. Study Goals| PrismaDb
    AiPlanner --> |8. User Preferences| PrismaDb
    AiPlanner --> |9. Previous Productivity| PrismaDb
    AiPlanner --> |10. Missed Tasks| TaskService

    %% Optimization Call
    AiPlanner --> |Send Unified Payload| FastApiRouter
    FastApiRouter --> OptimizerEngine
    OptimizerEngine --> FastApiRouter
    FastApiRouter --> AiPlanner
    AiPlanner --> AiController
    AiController --> PlannerModal

    %% Interactive Review
    PlannerModal --> ClientActions
    ClientActions --> |[Edit Plan]| PlannerModal
    ClientActions --> |[Cancel]| PlannerModal
    ClientActions --> |[Apply Plan]| AiController
    AiController --> |Apply Scheduled Times ONLY| TaskService
    TaskService --> |Deadlines Strictly Preserved| PrismaDb
```

---

## 2. The 10-Factor Analysis Pipeline

The AI Daily Planner analyzes ten distinct productivity dimensions:

| #      | Analysis Factor           | Source & Handling                                | Purpose & Optimization Effect                                               |
| ------ | ------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| **1**  | **Tasks**                 | `TasksService` (`TODO`, `IN_PROGRESS`)           | Categorized by duration and leverage; mapped to open focus slots.           |
| **2**  | **Deadlines**             | Task deadlines, exam dates                       | Guaranteed completion **before** deadline; deadlines are **never altered**. |
| **3**  | **Priorities**            | `CRITICAL`, `URGENT`, `HIGH`, `MEDIUM`, `LOW`    | High-leverage items allocated to peak morning/early cognitive windows.      |
| **4**  | **Available Time**        | Working hours (`08:30` - `18:30`) & quiet limits | Eliminates off-hours scheduling and ensures realistic available spans.      |
| **5**  | **Calendar**              | `CalendarService` fixed events                   | Locked as immutable commitments; focus blocks formed around them.           |
| **6**  | **Habits**                | Prisma `Habit` & daily logs                      | Scheduled in morning/evening routines to sustain compound streaks.          |
| **7**  | **Study Goals**           | `StudyPlan`, topics, exams                       | Deep-work study blocks allocated with optimal duration (30-60m).            |
| **8**  | **User Preferences**      | Energy level (1-5), briefing times               | Adjusts maximum focus block size and daily capacity thresholds.             |
| **9**  | **Previous Productivity** | `FocusSession` 7-day stats                       | Calibrates realistic daily capacity to prevent overload and burnout.        |
| **10** | **Missed Tasks**          | Overdue tasks from previous days                 | Immediate high-priority recovery slots at start of day.                     |

---

## 3. Strict Algorithmic Invariants & Constraints

1. **No Overlapping Tasks**:
   - Every slot $[S_i, E_i]$ satisfies $S_i < E_i$ and $E_i \le S_{i+1}$ for all sequential slots.
2. **Respect Fixed Calendar Events**:
   - Calendar meetings retain their exact scheduled times and are flagged with `isFixed: true`.
3. **Respect Important Deadlines**:
   - Tasks with deadlines are scheduled ahead of their deadline timestamp.
4. **Strategic Rest Breaks**:
   - Automatic 15-minute `BREAK` injected after every 75 minutes of continuous focus, plus midday `LUNCH_BREAK` (12:30 - 13:15).
5. **Consider Estimated Duration**:
   - Respects task `estimatedMinutes` (e.g. 30m, 45m, 60m).
6. **Consider User's Available Hours**:
   - Slices fit strictly within working hours window (default `08:30` - `18:30`).
7. **Prioritize Urgent Work & Missed Tasks**:
   - Overdue/missed tasks receive top recovery score (`+300`) and are placed first.
8. **Avoid Unrealistic Schedules**:
   - Daily cognitive load capped according to energy level & past productivity (max 5-6 hours focus). Overflow backlog tasks are marked `POSTPONED` with clear reasoning rather than crammed.
9. **Never Silently Modify Deadlines**:
   - Task `deadline` is strictly immutable during plan application. Only `startTime`, `endTime`, and `date` are updated.

---

## 4. User Interaction & Workflow

Before any changes are committed, the generated plan is presented in an interactive review modal:

### Available User Controls:

- **`[Apply Plan]`**:
  - Sends approved schedule to `POST /api/v1/ai/daily-plan/apply`.
  - Safely updates task start and end times in database.
  - Confirms that **0 deadlines were altered**.
- **`[Edit Plan]`**:
  - Switches slots into interactive edit mode.
  - Users can tweak start/end times, edit titles, add custom breaks, or remove slots.
- **`[Cancel]`**:
  - Closes the modal with zero mutations or side-effects.

### Changes Diff Section:

- Displays _"What will change in your schedule"_:
  - Task title
  - Previous time $\rightarrow$ New time (e.g. `None` $\rightarrow$ `09:30 - 10:30`)
  - Change classification (`SCHEDULED`, `RESCHEDULED`, `DURATION_ADJUSTED`, `POSTPONED`)
  - Clear rationale

---

## 5. Verification Suite Results

Run via `node test_ai_daily_planner.js`:

```text
================================================================================
🚀 STEP 13: "AI DAILY PLANNER" - VERIFICATION TEST SUITE
================================================================================
✅ Python AI Microservice is active on http://localhost:8000
✅ NestJS Backend Gateway is active on port 4000

--- TEST 1: Authentication & User Setup ---
  ✅ PASS: User registered successfully

--- TEST 2: AI Microservice Direct Planning Verification ---
  ✅ PASS: AI Microservice daily-plan endpoint responded 200 OK
  ✅ PASS: Success flag is true
  ✅ PASS: Target date matches request
  ✅ PASS: Deadlines preserved flag is true
  ✅ PASS: Slots array returned
  ✅ PASS: Changes array returned

--- TEST 3: Algorithmic Invariants & Constraint Enforcements ---
  ✅ PASS: No overlapping tasks constraint satisfied
  ✅ PASS: Fixed calendar event is preserved at exact scheduled time
  ✅ PASS: Schedule includes strategic breaks to prevent burnout
  ✅ PASS: Break minutes tracked in summary metrics
  ✅ PASS: Urgent/Missed critical task prioritized at front of work slots
  ✅ PASS: Task deadline strictly preserved without alteration
  ✅ PASS: Task scheduled before its deadline (18:00)

--- TEST 4: NestJS Gateway Plan Generation with Real DB Records ---
  ✅ PASS: Seeded fixed calendar event in NestJS DB
  ✅ PASS: Seeded critical task with strict deadline in NestJS DB
  ✅ PASS: Backend POST /ai/daily-plan/generate responded 200 OK
  ✅ PASS: Backend generated plan returned valid slots
  ✅ PASS: Backend preserved all deadlines
  ✅ PASS: SAFETY CHECK: Tasks NOT automatically modified before user confirmation

--- TEST 5: [Apply Plan] & Strict Deadline Immutability ---
  ✅ PASS: Backend POST /ai/daily-plan/apply responded 200 OK
  ✅ PASS: Apply plan response confirmed success
  ✅ PASS: Applied slots count confirmed
  ✅ PASS: Task scheduled with startTime
  ✅ PASS: Task scheduled with endTime
  ✅ PASS: STRICT GUARANTEE: Task deadline remained EXACTLY IDENTICAL after plan application

--- TEST 6: [Edit Plan] Custom Slot Adjustment Flow ---
  ✅ PASS: Edited plan applied successfully
  ✅ PASS: Task updated to user-edited time (14:00 - 15:00)
  ✅ PASS: Deadline STILL strictly untouched after edit application

================================================================================
VERIFICATION SUMMARY: 29 PASSED, 0 FAILED
================================================================================
🎉 STEP 13: AI DAILY PLANNER FULLY VERIFIED!
```
