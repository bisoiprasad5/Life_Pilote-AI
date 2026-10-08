from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RecommendedTaskItem(BaseModel):
    id: Optional[str] = Field(None, description="Task ID if mapped from existing pending tasks")
    title: str = Field(..., description="Actionable title of the recommended task")
    reason: str = Field(..., description="Clear explanation why this is the highest leverage action now")
    estimatedDuration: str = Field(..., description="Estimated duration (e.g. '30 minutes')")
    priority: str = Field("HIGH", description="Priority level: CRITICAL, HIGH, MEDIUM, LOW")
    category: str = Field("OTHER", description="Category: STUDY, WORK, HEALTH, FITNESS, PERSONAL, OTHER")
    description: Optional[str] = Field(None, description="Optional description or details")
    subtasks: List[str] = Field(default_factory=list, description="Subtasks or steps")


class NextTaskItem(BaseModel):
    title: str = Field(..., description="Actionable follow-up task title")
    estimatedDuration: str = Field(..., description="Estimated duration for follow-up (e.g. '15 minutes')")
    reason: str = Field(..., description="Why this follows the recommended task")


class ScheduleConflictItem(BaseModel):
    type: str = Field(..., description="Type of conflict: OVERLAP, OVERDUE_DEADLINE, TIME_CRUNCH")
    description: str = Field(..., description="Human-readable description of the detected conflict")
    severity: str = Field("WARNING", description="WARNING, CRITICAL, INFO")


class PlannerRequest(BaseModel):
    currentUserTime: Optional[str] = Field(None, description="Current user timestamp (ISO 8601)")
    timezone: Optional[str] = Field("UTC", description="User's local timezone")
    availableTimeMinutes: Optional[int] = Field(None, description="Calculated minutes available before next event")
    schedule: List[Dict[str, Any]] = Field(default_factory=list, description="Today's scheduled calendar items")
    pendingTasks: List[Dict[str, Any]] = Field(default_factory=list, description="User's pending tasks")
    deadlines: List[Dict[str, Any]] = Field(default_factory=list, description="Impending deadlines and exams")
    habits: List[Dict[str, Any]] = Field(default_factory=list, description="Relevant habits and streaks")
    studyGoals: List[Dict[str, Any]] = Field(default_factory=list, description="Active study plans, topics, or goals")
    conflicts: List[Dict[str, Any]] = Field(default_factory=list, description="Detected schedule conflicts")
    userEnergyLevel: Optional[int] = Field(3, description="User's energy level (1-5)")


class PlannerResponse(BaseModel):
    success: bool = Field(True, description="Whether planning succeeded")
    availableTimeMinutes: int = Field(..., description="Calculated free time window in minutes")
    availableTimeFormatted: str = Field(..., description="E.g. 'You have 45 minutes available.'")
    recommendedTask: RecommendedTaskItem = Field(..., description="Top recommended task")
    reason: str = Field(..., description="Primary reason for this recommendation")
    estimatedDuration: str = Field(..., description="Duration string, e.g. '30 minutes'")
    priority: str = Field(..., description="Priority string, e.g. 'HIGH'")
    nextTask: NextTaskItem = Field(..., description="Follow-up task to do after the recommended task")
    conflicts: List[ScheduleConflictItem] = Field(default_factory=list, description="Detected conflicts")
    summaryText: str = Field(..., description="Formatted user-friendly recommendation summary")
    providerUsed: str = Field(..., description="LLM provider or planner engine used")


# =============================================================================
# STEP 13: AI DAILY PLANNER SCHEMAS
# =============================================================================

class DailyPlanSlot(BaseModel):
    id: str = Field(..., description="Unique ID for this slot")
    slotType: str = Field(
        ...,
        description="TASK, CALENDAR_EVENT, HABIT, STUDY_SESSION, BREAK, LUNCH_BREAK, REVIEW",
    )
    taskId: Optional[str] = Field(None, description="Associated task ID if applicable")
    title: str = Field(..., description="Title of the scheduled item or break")
    startTime: str = Field(..., description="24-hour start time (HH:MM)")
    endTime: str = Field(..., description="24-hour end time (HH:MM)")
    durationMinutes: int = Field(..., description="Duration in minutes")
    priority: str = Field("MEDIUM", description="CRITICAL, HIGH, MEDIUM, LOW, NONE")
    category: str = Field("WORK", description="Category: STUDY, WORK, HEALTH, PERSONAL, OTHER")
    isFixed: bool = Field(False, description="True for fixed calendar commitments that cannot move")
    reason: str = Field(..., description="Why this slot is scheduled at this time")
    deadline: Optional[str] = Field(None, description="Task deadline (preserved strictly without modification)")
    status: Optional[str] = Field("TODO", description="Task status")


class TaskChangeItem(BaseModel):
    taskId: str = Field(..., description="ID of the task")
    taskTitle: str = Field(..., description="Title of the task")
    changeType: str = Field(
        ...,
        description="SCHEDULED, RESCHEDULED, DURATION_ADJUSTED, UNCHANGED, POSTPONED",
    )
    previousStartTime: Optional[str] = Field(None, description="Original start time if any")
    newStartTime: Optional[str] = Field(None, description="Proposed start time")
    previousEndTime: Optional[str] = Field(None, description="Original end time if any")
    newEndTime: Optional[str] = Field(None, description="Proposed end time")
    deadline: Optional[str] = Field(None, description="Task deadline (strictly preserved)")
    reason: str = Field(..., description="Why this change was recommended")


class DailyPlanRequest(BaseModel):
    targetDate: Optional[str] = Field(None, description="Target planning date (YYYY-MM-DD)")
    currentUserTime: Optional[str] = Field(None, description="Current ISO timestamp")
    timezone: Optional[str] = Field("UTC", description="User's timezone")
    tasks: List[Dict[str, Any]] = Field(default_factory=list, description="Pending and scheduled tasks")
    missedTasks: List[Dict[str, Any]] = Field(default_factory=list, description="Overdue or missed tasks")
    calendarEvents: List[Dict[str, Any]] = Field(default_factory=list, description="Fixed calendar commitments")
    habits: List[Dict[str, Any]] = Field(default_factory=list, description="Daily habits to integrate")
    studyGoals: List[Dict[str, Any]] = Field(default_factory=list, description="Study goals and exam targets")
    userPreferences: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Working hours, energy, breaks")
    previousProductivity: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Historical productivity metrics")


class DailyPlanResponse(BaseModel):
    success: bool = Field(True, description="Whether plan generation succeeded")
    date: str = Field(..., description="Target date for the plan (YYYY-MM-DD)")
    totalAvailableMinutes: int = Field(..., description="Total minutes in working window")
    scheduledTaskMinutes: int = Field(..., description="Total focus minutes scheduled")
    breakMinutes: int = Field(..., description="Total break minutes included")
    fixedEventMinutes: int = Field(..., description="Total fixed calendar event minutes")
    productivityScoreExpected: int = Field(..., description="Predicted productivity score (0-100)")
    slots: List[DailyPlanSlot] = Field(default_factory=list, description="Optimized schedule slots")
    changes: List[TaskChangeItem] = Field(default_factory=list, description="Changes against existing tasks")
    warnings: List[str] = Field(default_factory=list, description="Schedule warnings or advice")
    summary: str = Field(..., description="Overview and synthesis of the daily plan")
    deadlinesPreserved: bool = Field(True, description="Guarantee that no deadlines were modified")
    providerUsed: str = Field("lifepilot_daily_optimizer", description="Provider or engine used")

