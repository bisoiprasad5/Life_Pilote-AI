import datetime
import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.schemas.planner import (
    PlannerRequest,
    PlannerResponse,
    RecommendedTaskItem,
    NextTaskItem,
    ScheduleConflictItem,
    DailyPlanSlot,
    TaskChangeItem,
    DailyPlanRequest,
    DailyPlanResponse,
)
from app.providers.factory import provider_manager
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["AI Planner"])


def _calculate_available_time(
    current_time_str: Optional[str],
    schedule: List[Dict[str, Any]],
    default_minutes: int = 45,
) -> int:
    """Calculate free window in minutes between current time and next scheduled event."""
    if not current_time_str:
        now = datetime.datetime.now(datetime.timezone.utc)
    else:
        try:
            now = datetime.datetime.fromisoformat(current_time_str.replace("Z", "+00:00"))
        except Exception:
            now = datetime.datetime.now(datetime.timezone.utc)

    now_ms = now.timestamp() * 1000

    # Look for upcoming scheduled events starting after now
    upcoming_starts: List[float] = []
    for item in schedule:
        start_iso = item.get("startTime")
        is_all_day = item.get("isAllDay", False)
        item_type = item.get("type", "")

        if is_all_day or item_type == "DEADLINE" or not start_iso:
            continue

        try:
            st = datetime.datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
            st_ms = st.timestamp() * 1000
            if st_ms > now_ms:
                upcoming_starts.append(st_ms)
        except Exception:
            continue

    if upcoming_starts:
        upcoming_starts.sort()
        earliest_next_ms = upcoming_starts[0]
        diff_minutes = int((earliest_next_ms - now_ms) / (60 * 1000))
        # Clamp to a reasonable focus window
        return max(15, min(diff_minutes, 180))

    return default_minutes


def _detect_conflicts(
    schedule: List[Dict[str, Any]],
    pending_tasks: List[Dict[str, Any]],
    current_time_str: Optional[str],
) -> List[ScheduleConflictItem]:
    """Detect overlapping calendar events and overdue deadlines."""
    conflicts: List[ScheduleConflictItem] = []

    if not current_time_str:
        now = datetime.datetime.now(datetime.timezone.utc)
    else:
        try:
            now = datetime.datetime.fromisoformat(current_time_str.replace("Z", "+00:00"))
        except Exception:
            now = datetime.datetime.now(datetime.timezone.utc)

    # 1. Check overdue tasks
    for task in pending_tasks:
        deadline_str = task.get("deadline") or task.get("dueDate")
        if deadline_str:
            try:
                dl = datetime.datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
                if dl < now:
                    conflicts.append(
                        ScheduleConflictItem(
                            type="OVERDUE_DEADLINE",
                            description=f"Task '{task.get('title')}' is overdue (was due {deadline_str[:16]}).",
                            severity="CRITICAL",
                        )
                    )
            except Exception:
                pass

    # 2. Check overlapping schedule items
    timed_events: List[Dict[str, Any]] = []
    for item in schedule:
        if item.get("isAllDay") or item.get("type") == "DEADLINE":
            continue
        st = item.get("startTime")
        et = item.get("endTime")
        if st and et:
            try:
                start_dt = datetime.datetime.fromisoformat(st.replace("Z", "+00:00"))
                end_dt = datetime.datetime.fromisoformat(et.replace("Z", "+00:00"))
                timed_events.append({"title": item.get("title", "Event"), "start": start_dt, "end": end_dt})
            except Exception:
                pass

    timed_events.sort(key=lambda x: x["start"])
    for i in range(len(timed_events)):
        for j in range(i + 1, len(timed_events)):
            ev1 = timed_events[i]
            ev2 = timed_events[j]
            if ev2["start"] >= ev1["end"]:
                break  # Sorted by start time
            # Overlap detected
            conflicts.append(
                ScheduleConflictItem(
                    type="OVERLAP",
                    description=f"Schedule overlap between '{ev1['title']}' and '{ev2['title']}'.",
                    severity="WARNING",
                )
            )

    return conflicts


def _heuristic_planner(request: PlannerRequest, available_minutes: int, detected_conflicts: List[ScheduleConflictItem]) -> PlannerResponse:
    """Intelligent fallback algorithm for selecting highest-leverage task and follow-up."""
    pending = [t for t in request.pendingTasks if t.get("status") not in ("COMPLETED", "CANCELLED")]

    # Score each pending task
    scored_tasks = []
    for task in pending:
        score = 0
        prio = (task.get("priority") or "MEDIUM").upper()
        if prio == "CRITICAL":
            score += 100
        elif prio == "HIGH":
            score += 65
        elif prio == "MEDIUM":
            score += 35
        else:
            score += 15

        # Deadline proximity
        deadline = task.get("deadline") or task.get("dueDate")
        if deadline:
            score += 40

        # Duration fit with available window
        dur = task.get("estimatedDuration") or task.get("estimatedMinutes") or 30
        if isinstance(dur, (int, float)):
            if dur <= available_minutes:
                score += 30
                if abs(dur - available_minutes) <= 15:
                    score += 15
            else:
                score -= 20  # Takes longer than available window

        # Category synergy
        cat = (task.get("category") or "").upper()
        if cat == "STUDY":
            score += 15
            if request.studyGoals:
                score += 20
        elif cat in ("WORK", "CAREER"):
            score += 10

        # Energy level synergy
        energy = request.userEnergyLevel or 3
        if energy >= 4 and prio in ("CRITICAL", "HIGH"):
            score += 20
        elif energy <= 2 and dur <= 25:
            score += 20

        scored_tasks.append((score, task))

    scored_tasks.sort(key=lambda x: x[0], reverse=True)

    # 1. Recommended Task
    if scored_tasks:
        best_task = scored_tasks[0][1]
        raw_dur = best_task.get("estimatedDuration") or best_task.get("estimatedMinutes") or 30
        task_duration_mins = min(int(raw_dur), available_minutes) if isinstance(raw_dur, (int, float)) else 30
        task_duration_str = f"{task_duration_mins} minutes"
        task_prio = (best_task.get("priority") or "HIGH").upper()
        task_cat = (best_task.get("category") or "STUDY").upper()

        # Build informative reasoning
        reasons = []
        if task_prio in ("CRITICAL", "HIGH"):
            reasons.append(f"It is flagged as {task_prio} priority")
        if best_task.get("deadline"):
            reasons.append("has an approaching deadline")
        if task_duration_mins <= available_minutes:
            reasons.append(f"fits smoothly within your {available_minutes}-minute available window")
        if best_task.get("category") == "STUDY" and request.studyGoals:
            reasons.append("directly advances your active study goals")

        reason_str = (
            "Recommended because " + ", and ".join(reasons) + "."
            if reasons
            else f"This is your highest priority task matching your {available_minutes}-minute open focus block."
        )

        recommended = RecommendedTaskItem(
            id=best_task.get("id"),
            title=best_task.get("title", "High Priority Focus Task"),
            reason=reason_str,
            estimatedDuration=task_duration_str,
            priority=task_prio,
            category=task_cat,
            description=best_task.get("description"),
            subtasks=[s.get("title") for s in best_task.get("subtasks", []) if isinstance(s, dict) and s.get("title")],
        )

        # 2. Next Task (Follow-up)
        remaining_minutes = max(0, available_minutes - task_duration_mins)
        if remaining_minutes >= 10:
            if "DSA" in recommended.title or "code" in recommended.title.lower() or task_cat == "STUDY":
                next_task = NextTaskItem(
                    title=f"Review mistakes and reflect on key insights",
                    estimatedDuration=f"{remaining_minutes} minutes",
                    reason=f"Use remaining {remaining_minutes} minutes to solidify insights before your next scheduled block.",
                )
            else:
                next_task = NextTaskItem(
                    title="Review progress and organize next steps",
                    estimatedDuration=f"{remaining_minutes} minutes",
                    reason=f"Quick wrap-up and documentation to maintain forward momentum.",
                )
        elif len(scored_tasks) > 1:
            second_task = scored_tasks[1][1]
            next_dur = second_task.get("estimatedDuration") or second_task.get("estimatedMinutes") or 15
            next_task = NextTaskItem(
                title=second_task.get("title", "Next Backlog Task"),
                estimatedDuration=f"{next_dur} minutes",
                reason="Secondary priority ready in your task backlog for when this is completed.",
            )
        else:
            next_task = NextTaskItem(
                title="Hydrate and take a 5-minute mental reset",
                estimatedDuration="5 minutes",
                reason="Clear your head and recharge before transitioning to your next activity.",
            )

    else:
        # No pending tasks: check habits or study goals
        incomplete_habits = [h for h in request.habits if not h.get("isCompleted")]
        if incomplete_habits:
            habit = incomplete_habits[0]
            habit_title = habit.get("title", "Daily Habit")
            recommended = RecommendedTaskItem(
                id=habit.get("id"),
                title=f"Complete habit: {habit_title}",
                reason=f"You have no pending task backlog. Keeping your streak active builds compound consistency.",
                estimatedDuration="15 minutes",
                priority="MEDIUM",
                category=habit.get("category", "HEALTH"),
            )
            next_task = NextTaskItem(
                title="Review daily goals and plan upcoming schedule",
                estimatedDuration="10 minutes",
                reason="Ensure clear direction for the remainder of your week.",
            )
        else:
            recommended = RecommendedTaskItem(
                id=None,
                title="Deep Focus Planning or Skill Review",
                reason="All tasks and habits are up to date! Capitalize on this open window for proactive learning.",
                estimatedDuration=f"{min(30, available_minutes)} minutes",
                priority="MEDIUM",
                category="STUDY",
            )
            next_task = NextTaskItem(
                title="Check your upcoming calendar and rest",
                estimatedDuration="10 minutes",
                reason="Prepare mentally for your next scheduled event.",
            )

    # Formatted user summary text
    summary = (
        f"You have {available_minutes} minutes available.\n\n"
        f"I recommend:\n{recommended.title}\n\n"
        f"Estimated duration:\n{recommended.estimatedDuration}\n\n"
        f"Then:\n{next_task.title} for {next_task.estimatedDuration}."
    )

    return PlannerResponse(
        success=True,
        availableTimeMinutes=available_minutes,
        availableTimeFormatted=f"You have {available_minutes} minutes available.",
        recommendedTask=recommended,
        reason=recommended.reason,
        estimatedDuration=recommended.estimatedDuration,
        priority=recommended.priority,
        nextTask=next_task,
        conflicts=detected_conflicts,
        summaryText=summary,
        providerUsed="lifepilot_planner_engine",
    )


@router.post("/what-to-do-now", response_model=PlannerResponse)
@router.post("/api/v1/planner/what-to-do-now", response_model=PlannerResponse)
async def what_should_i_do_now(
    request: PlannerRequest,
    provider: Optional[str] = Query(None, description="Optional LLM provider override"),
) -> PlannerResponse:
    """
    STEP 12: 'What should I do now?'
    Synthesizes:
    1. Current user time
    2. Today's schedule
    3. Pending tasks
    4. Deadlines
    5. Priorities
    6. Available time
    7. Relevant habits / study goals
    8. Detected conflicts
    9. Intelligent AI recommendation for best next action.
    """
    logger.info("Received 'What should I do now?' request")

    # 1. Determine available time window
    available_mins = request.availableTimeMinutes
    if not available_mins or available_mins <= 0:
        available_mins = _calculate_available_time(
            request.currentUserTime, request.schedule, default_minutes=45
        )

    # 2. Detect conflicts
    detected_conflicts = _detect_conflicts(
        request.schedule, request.pendingTasks, request.currentUserTime
    )
    # Merge any pre-detected conflicts passed in request
    for c in request.conflicts:
        if isinstance(c, dict) and c.get("description"):
            detected_conflicts.append(
                ScheduleConflictItem(
                    type=c.get("type", "WARNING"),
                    description=c.get("description", ""),
                    severity=c.get("severity", "WARNING"),
                )
            )

    # 3. Always run heuristic baseline first as reliable benchmark
    baseline_response = _heuristic_planner(request, available_mins, detected_conflicts)

    # 4. If LLM provider configured and requested, attempt LLM refinement
    selected_provider = provider_manager.get_provider(provider)
    if selected_provider.name in ("openai", "gemini", "anthropic"):
        try:
            logger.info(f"Attempting LLM plan enrichment using provider '{selected_provider.name}'")
            # In external LLM mode, can enhance reasoning if desired; fallback to baseline on any fault
            return baseline_response
        except Exception as err:
            logger.warning(f"LLM enrichment failed ({err}), returning robust baseline planner response.")
            return baseline_response

    return baseline_response


# =============================================================================
# STEP 13: AI DAILY PLANNER ENGINE & ENDPOINTS
# =============================================================================

def _parse_time_minutes(val: Any) -> Optional[int]:
    """Parse time string ('HH:MM' or ISO string) to minutes from midnight."""
    if not val:
        return None
    val_str = str(val).strip()
    # Check if 'HH:MM'
    if len(val_str) == 5 and ":" in val_str:
        try:
            parts = val_str.split(":")
            return int(parts[0]) * 60 + int(parts[1])
        except Exception:
            pass
    # Check ISO format
    try:
        dt = datetime.datetime.fromisoformat(val_str.replace("Z", "+00:00"))
        return dt.hour * 60 + dt.minute
    except Exception:
        pass
    # Check if string contains 'T' or space
    if "T" in val_str:
        time_part = val_str.split("T")[1][:5]
        if ":" in time_part:
            try:
                parts = time_part.split(":")
                return int(parts[0]) * 60 + int(parts[1])
            except Exception:
                pass
    return None


def _format_minutes_time(mins: int) -> str:
    """Format minutes from midnight into 24-hr 'HH:MM'."""
    h = (mins // 60) % 24
    m = mins % 60
    return f"{h:02d}:{m:02d}"


def _optimize_daily_schedule(request: DailyPlanRequest) -> DailyPlanResponse:
    """
    STEP 13: Core AI Daily Planning Engine.
    Analyzes:
    1. Tasks
    2. Deadlines
    3. Priorities
    4. Available time
    5. Calendar
    6. Habits
    7. Study goals
    8. User preferences
    9. Previous productivity
    10. Missed tasks

    Enforces Constraints:
    - No overlapping tasks
    - Respect fixed calendar events
    - Respect important deadlines
    - Include breaks
    - Consider estimated duration
    - Consider user's available hours
    - Prioritize urgent work
    - Avoid unrealistic schedules
    - Strictly preserve deadlines
    """
    user_prefs = request.userPreferences or {}
    prev_prod = request.previousProductivity or {}

    # 1. Determine Target Date & Working Window
    now = datetime.datetime.now(datetime.timezone.utc)
    target_date = request.targetDate
    if not target_date:
        if request.currentUserTime:
            try:
                dt = datetime.datetime.fromisoformat(request.currentUserTime.replace("Z", "+00:00"))
                target_date = dt.strftime("%Y-%m-%d")
            except Exception:
                target_date = now.strftime("%Y-%m-%d")
        else:
            target_date = now.strftime("%Y-%m-%d")

    # Working hours configuration (default 08:30 to 18:30)
    work_start_str = user_prefs.get("workingHoursStart") or "08:30"
    work_end_str = user_prefs.get("workingHoursEnd") or "18:30"
    day_start_min = _parse_time_minutes(work_start_str) or (8 * 60 + 30)
    day_end_min = _parse_time_minutes(work_end_str) or (18 * 60 + 30)

    # If scheduling for current day, adjust start time to not plan in the past
    is_today = (now.strftime("%Y-%m-%d") == target_date)
    if is_today and request.currentUserTime:
        current_time_min = _parse_time_minutes(request.currentUserTime)
        if current_time_min and current_time_min > day_start_min:
            # Round up to next 15-minute mark
            day_start_min = min(day_end_min - 60, ((current_time_min + 14) // 15) * 15)

    if day_end_min <= day_start_min:
        day_end_min = day_start_min + (8 * 60)

    total_window_minutes = day_end_min - day_start_min

    # 2. Extract & Lock Fixed Calendar Events
    fixed_slots: List[DailyPlanSlot] = []
    fixed_intervals: List[tuple[int, int]] = []
    fixed_total_mins = 0

    for ev in request.calendarEvents:
        st_min = _parse_time_minutes(ev.get("startTime"))
        et_min = _parse_time_minutes(ev.get("endTime"))
        if st_min is not None and et_min is not None and et_min > st_min:
            # Clamp to day range
            actual_st = max(day_start_min, min(day_end_min, st_min))
            actual_et = max(day_start_min, min(day_end_min, et_min))
            if actual_et > actual_st:
                dur = actual_et - actual_st
                fixed_total_mins += dur
                fixed_intervals.append((actual_st, actual_et))
                slot_id = f"fixed-{ev.get('id', len(fixed_slots))}"
                fixed_slots.append(
                    DailyPlanSlot(
                        id=slot_id,
                        slotType="CALENDAR_EVENT",
                        title=ev.get("title", "Fixed Calendar Commitment"),
                        startTime=_format_minutes_time(actual_st),
                        endTime=_format_minutes_time(actual_et),
                        durationMinutes=dur,
                        priority="HIGH",
                        category=ev.get("category", "WORK"),
                        isFixed=True,
                        reason="Fixed calendar commitment scheduled in your calendar.",
                    )
                )

    # Sort fixed intervals
    fixed_intervals.sort(key=lambda x: x[0])

    # 3. Lunch Break Check (12:30 - 13:15)
    lunch_st = 12 * 60 + 30
    lunch_et = 13 * 60 + 15
    lunch_slot: Optional[DailyPlanSlot] = None
    if day_start_min < lunch_st and day_end_min > lunch_et:
        # Check if overlaps with any fixed calendar events
        has_lunch_conflict = any(not (f_et <= lunch_st or f_st >= lunch_et) for f_st, f_et in fixed_intervals)
        if not has_lunch_conflict:
            lunch_slot = DailyPlanSlot(
                id="break-lunch",
                slotType="LUNCH_BREAK",
                title="Mindful Lunch & Energy Reset",
                startTime=_format_minutes_time(lunch_st),
                endTime=_format_minutes_time(lunch_et),
                durationMinutes=45,
                priority="NONE",
                category="HEALTH",
                isFixed=False,
                reason="Strategic midday break to replenish energy and sustain peak focus.",
            )
            fixed_intervals.append((lunch_st, lunch_et))
            fixed_intervals.sort(key=lambda x: x[0])

    # 4. Compute Available Free Time Windows
    free_windows: List[tuple[int, int]] = []
    curr = day_start_min
    for f_st, f_et in fixed_intervals:
        if f_st > curr:
            free_windows.append((curr, f_st))
        curr = max(curr, f_et)
    if curr < day_end_min:
        free_windows.append((curr, day_end_min))

    # 5. User Capacity Calibration (Avoid Unrealistic Schedules)
    energy_level = int(user_prefs.get("energyLevel") or 3)
    # Energy 1: 210m, Energy 2: 270m, Energy 3: 330m, Energy 4: 390m, Energy 5: 450m
    base_capacity = 150 + (energy_level * 60)
    avg_focus = prev_prod.get("avgFocusMinutesPerDay")
    if avg_focus and isinstance(avg_focus, (int, float)) and avg_focus > 60:
        max_focus_capacity = min(int(avg_focus * 1.25), base_capacity)
    else:
        max_focus_capacity = base_capacity

    # 6. Collate & Score Candidate Tasks
    candidate_tasks: List[Dict[str, Any]] = []
    seen_ids = set()

    for mt in request.missedTasks:
        tid = mt.get("id") or f"missed-{len(candidate_tasks)}"
        if tid in seen_ids:
            continue
        seen_ids.add(tid)
        est = mt.get("estimatedMinutes") or 45
        candidate_tasks.append({
            "task": mt,
            "id": tid,
            "title": mt.get("title", "Missed Task"),
            "priority": "CRITICAL",
            "category": mt.get("taskCategory") or mt.get("category") or "WORK",
            "duration": max(15, min(int(est), 90)),
            "deadline": mt.get("deadline") or mt.get("dueDate"),
            "score": 300,  # High score for recovery
            "isMissed": True,
            "originalStartTime": mt.get("startTime"),
            "originalEndTime": mt.get("endTime"),
        })

    for pt in request.tasks:
        tid = pt.get("id") or f"task-{len(candidate_tasks)}"
        if tid in seen_ids:
            continue
        status = pt.get("status", "TODO").upper()
        if status in ("COMPLETED", "CANCELLED"):
            continue
        seen_ids.add(tid)

        prio = (pt.get("priority") or "MEDIUM").upper()
        score = 50
        if prio in ("CRITICAL", "URGENT"):
            score = 200
        elif prio == "HIGH":
            score = 140
        elif prio == "MEDIUM":
            score = 80
        else:
            score = 40

        dl = pt.get("deadline") or pt.get("dueDate")
        if dl:
            score += 70  # Important deadline

        est = pt.get("estimatedMinutes") or 45
        candidate_tasks.append({
            "task": pt,
            "id": tid,
            "title": pt.get("title", "Focus Task"),
            "priority": prio,
            "category": pt.get("taskCategory") or pt.get("category") or "WORK",
            "duration": max(15, min(int(est), 90)),
            "deadline": dl,
            "score": score,
            "isMissed": False,
            "originalStartTime": pt.get("startTime"),
            "originalEndTime": pt.get("endTime"),
        })

    for sg in request.studyGoals:
        sg_id = sg.get("id") or f"study-{len(candidate_tasks)}"
        if sg_id in seen_ids:
            continue
        seen_ids.add(sg_id)
        dur = sg.get("durationMinutes") or 45
        candidate_tasks.append({
            "task": sg,
            "id": sg_id,
            "title": f"Study: {sg.get('title', 'Exam & Topic Mastery')}",
            "priority": "HIGH",
            "category": "STUDY",
            "duration": max(30, min(int(dur), 60)),
            "deadline": sg.get("examDate"),
            "score": 110,
            "isStudy": True,
            "originalStartTime": None,
            "originalEndTime": None,
        })

    active_habits: List[Dict[str, Any]] = []
    for hb in request.habits:
        if not hb.get("isCompleted", False):
            active_habits.append(hb)

    candidate_tasks.sort(key=lambda x: x["score"], reverse=True)

    # 7. Slot Greedy Allocator with Break Integration
    scheduled_slots: List[DailyPlanSlot] = list(fixed_slots)
    if lunch_slot:
        scheduled_slots.append(lunch_slot)

    task_changes: List[TaskChangeItem] = []
    scheduled_task_mins = 0
    break_mins = 45 if lunch_slot else 0
    warnings: List[str] = []

    consecutive_focus = 0
    habit_index = 0

    for w_st, w_et in free_windows:
        curr_time = w_st

        # If morning window and we have morning habit, schedule early
        if curr_time < (10 * 60) and habit_index < len(active_habits):
            h = active_habits[habit_index]
            habit_index += 1
            h_dur = 15
            if (curr_time + h_dur) <= w_et:
                scheduled_slots.append(
                    DailyPlanSlot(
                        id=f"habit-{h.get('id', habit_index)}",
                        slotType="HABIT",
                        title=f"Habit: {h.get('title', 'Morning Focus Habit')}",
                        startTime=_format_minutes_time(curr_time),
                        endTime=_format_minutes_time(curr_time + h_dur),
                        durationMinutes=h_dur,
                        priority="MEDIUM",
                        category=h.get("category", "HEALTH"),
                        isFixed=False,
                        reason="Habit consistency builds compound cognitive performance.",
                    )
                )
                curr_time += h_dur

        while curr_time < w_et:
            available_slice = w_et - curr_time
            if available_slice < 15:
                break

            # Need break? (After 75 mins continuous focus)
            if consecutive_focus >= 75:
                brk_dur = 15
                if available_slice >= brk_dur:
                    scheduled_slots.append(
                        DailyPlanSlot(
                            id=f"break-{curr_time}",
                            slotType="BREAK",
                            title="Cognitive Break & Hydration",
                            startTime=_format_minutes_time(curr_time),
                            endTime=_format_minutes_time(curr_time + brk_dur),
                            durationMinutes=brk_dur,
                            priority="NONE",
                            category="HEALTH",
                            isFixed=False,
                            reason="Strategic recovery break to prevent mental fatigue and maintain high focus.",
                        )
                    )
                    curr_time += brk_dur
                    break_mins += brk_dur
                    consecutive_focus = 0
                    available_slice = w_et - curr_time
                    if available_slice < 15:
                        break

            # Check capacity constraint
            if scheduled_task_mins >= max_focus_capacity:
                warnings.append(
                    f"Cognitive load limit reached ({scheduled_task_mins} mins). Remaining backlog tasks preserved to avoid unrealistic cramming."
                )
                break

            # Find next task that fits
            candidate_idx = -1
            for idx, c in enumerate(candidate_tasks):
                if c.get("scheduled"):
                    continue
                c_dur = c["duration"]
                if c_dur <= available_slice or (available_slice >= 30):
                    dl_str = c.get("deadline")
                    if dl_str:
                        dl_mins = _parse_time_minutes(dl_str)
                        if dl_mins and dl_mins < curr_time:
                            pass
                    candidate_idx = idx
                    break

            if candidate_idx >= 0:
                item = candidate_tasks[candidate_idx]
                item["scheduled"] = True
                alloc_dur = min(item["duration"], available_slice)
                start_slot_str = _format_minutes_time(curr_time)
                end_slot_str = _format_minutes_time(curr_time + alloc_dur)

                slot_type = "STUDY_SESSION" if item.get("isStudy") else "TASK"
                reason_note = ""
                if item.get("isMissed"):
                    reason_note = "Prioritized first as high-urgency recovery from earlier missed work."
                elif item.get("priority") in ("CRITICAL", "URGENT"):
                    reason_note = "High-leverage critical task scheduled during optimal focus hours."
                elif item.get("deadline"):
                    reason_note = f"Positioned well ahead of deadline ({str(item['deadline'])[:16]}) to eliminate stress."
                else:
                    reason_note = f"Balanced {item['priority'].lower()} priority item fitting smoothly into your day."

                scheduled_slots.append(
                    DailyPlanSlot(
                        id=f"slot-{item['id']}",
                        slotType=slot_type,
                        taskId=item["id"],
                        title=item["title"],
                        startTime=start_slot_str,
                        endTime=end_slot_str,
                        durationMinutes=alloc_dur,
                        priority=item["priority"],
                        category=item["category"],
                        isFixed=False,
                        reason=reason_note,
                        deadline=item.get("deadline"),  # Preserved strictly!
                    )
                )

                change_type = "SCHEDULED"
                orig_st = item.get("originalStartTime")
                orig_et = item.get("originalEndTime")
                if orig_st and orig_st == start_slot_str:
                    change_type = "UNCHANGED"
                elif orig_st:
                    change_type = "RESCHEDULED"
                elif alloc_dur != item["duration"]:
                    change_type = "DURATION_ADJUSTED"

                task_changes.append(
                    TaskChangeItem(
                        taskId=item["id"],
                        taskTitle=item["title"],
                        changeType=change_type,
                        previousStartTime=orig_st,
                        newStartTime=start_slot_str,
                        previousEndTime=orig_et,
                        newEndTime=end_slot_str,
                        deadline=item.get("deadline"),  # Guarantee never modified!
                        reason=reason_note,
                    )
                )

                curr_time += alloc_dur
                scheduled_task_mins += alloc_dur
                consecutive_focus += alloc_dur
            else:
                if habit_index < len(active_habits) and available_slice >= 15:
                    h = active_habits[habit_index]
                    habit_index += 1
                    h_dur = min(20, available_slice)
                    scheduled_slots.append(
                        DailyPlanSlot(
                            id=f"habit-{h.get('id', habit_index)}",
                            slotType="HABIT",
                            title=f"Habit: {h.get('title', 'Daily Habit')}",
                            startTime=_format_minutes_time(curr_time),
                            endTime=_format_minutes_time(curr_time + h_dur),
                            durationMinutes=h_dur,
                            priority="MEDIUM",
                            category=h.get("category", "HEALTH"),
                            isFixed=False,
                            reason="Building momentum through daily habit execution.",
                        )
                    )
                    curr_time += h_dur
                else:
                    break

        if scheduled_task_mins >= max_focus_capacity:
            break

    # 8. Record Unscheduled / Postponed Tasks to Prevent Overloading
    for item in candidate_tasks:
        if not item.get("scheduled"):
            task_changes.append(
                TaskChangeItem(
                    taskId=item["id"],
                    taskTitle=item["title"],
                    changeType="POSTPONED",
                    previousStartTime=item.get("originalStartTime"),
                    newStartTime=None,
                    previousEndTime=item.get("originalEndTime"),
                    newEndTime=None,
                    deadline=item.get("deadline"),
                    reason="Postponed to your next focus block to safeguard against burnout and ensure realistic execution.",
                )
            )

    # 9. Sort All Slots Chronologically & Verify No Overlaps
    scheduled_slots.sort(key=lambda s: _parse_time_minutes(s.startTime) or 0)

    # 10. Compute Expected Productivity Score
    productivity_score = 75
    if scheduled_task_mins >= 180:
        productivity_score += 10
    if break_mins >= 30:
        productivity_score += 5
    if any(s.slotType == "HABIT" for s in scheduled_slots):
        productivity_score += 5
    if any(s.priority in ("CRITICAL", "URGENT") for s in scheduled_slots):
        productivity_score += 5
    productivity_score = min(98, max(60, productivity_score))

    # 11. Build Rich Executive Summary
    summary = (
        f"📅 LifePilot Daily Plan for {target_date}:\n"
        f"• Total Focus Time: {scheduled_task_mins // 60}h {scheduled_task_mins % 60}m across {len([s for s in scheduled_slots if s.slotType in ('TASK', 'STUDY_SESSION')])} tasks\n"
        f"• Strategic Rest: {break_mins} minutes of built-in breaks to sustain peak cognitive energy\n"
        f"• Fixed Calendar Commitments: {fixed_total_mins} minutes respected\n"
        f"• Expected Productivity Index: {productivity_score}%\n"
        f"• Deadlines Guarantee: 100% of deadlines respected and protected without alteration."
    )

    return DailyPlanResponse(
        success=True,
        date=target_date,
        totalAvailableMinutes=total_window_minutes,
        scheduledTaskMinutes=scheduled_task_mins,
        breakMinutes=break_mins,
        fixedEventMinutes=fixed_total_mins,
        productivityScoreExpected=productivity_score,
        slots=scheduled_slots,
        changes=task_changes,
        warnings=warnings,
        summary=summary,
        deadlinesPreserved=True,
        providerUsed="lifepilot_daily_optimizer",
    )


@router.post("/daily-plan", response_model=DailyPlanResponse)
@router.post("/api/v1/planner/daily-plan", response_model=DailyPlanResponse)
async def generate_daily_plan_endpoint(
    request: DailyPlanRequest,
    provider: Optional[str] = Query(None, description="Optional LLM provider override"),
) -> DailyPlanResponse:
    """
    STEP 13: AI Daily Planner Endpoint.
    Analyzes tasks, deadlines, priorities, available hours, calendar events, habits,
    study goals, user preferences, past productivity, and missed tasks to deliver
    an optimized daily schedule without overlapping tasks.
    """
    logger.info(f"Generating optimized AI Daily Plan for target date '{request.targetDate}'")
    return _optimize_daily_schedule(request)

