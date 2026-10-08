from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class TaskCategory(str, Enum):
    STUDY = "STUDY"
    WORK = "WORK"
    PERSONAL = "PERSONAL"
    HEALTH = "HEALTH"
    FITNESS = "FITNESS"
    FINANCE = "FINANCE"
    OTHER = "OTHER"


class TaskPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RecurrenceInterval(str, Enum):
    NONE = "NONE"
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    BIWEEKLY = "BIWEEKLY"
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"
    CUSTOM = "CUSTOM"


class ParsedTask(BaseModel):
    title: str = Field(..., description="Cleaned, human-readable task title without command phrases")
    date: Optional[str] = Field(None, description="Scheduled date in YYYY-MM-DD format")
    time: Optional[str] = Field(None, description="Scheduled time in HH:MM (24-hour) format")
    startTime: Optional[str] = Field(None, description="Start time in HH:MM (24-hour) format")
    endTime: Optional[str] = Field(None, description="End time in HH:MM (24-hour) format")
    duration: Optional[int] = Field(None, description="Duration in minutes")
    category: TaskCategory = Field(TaskCategory.OTHER, description="Inferred category of the task")
    priority: TaskPriority = Field(TaskPriority.MEDIUM, description="Inferred priority level")
    isRecurring: bool = Field(False, description="Whether the task repeats periodically")
    recurrenceInterval: Optional[RecurrenceInterval] = Field(None, description="Interval for repetition")
    recurrenceRule: Optional[str] = Field(None, description="iCal-like RRULE pattern if applicable")
    deadline: Optional[str] = Field(None, description="Deadline or due date/time if specified")
    dueDate: Optional[str] = Field(None, description="Due date in YYYY-MM-DD format")
    notes: Optional[str] = Field(None, description="Additional context or notes extracted from prompt")
    tags: List[str] = Field(default_factory=list, description="Relevant semantic tags")


class TaskParseRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Raw natural language task description from user")
    timezone: Optional[str] = Field("UTC", description="User's local timezone (e.g. UTC, America/New_York, Asia/Kolkata)")
    referenceDate: Optional[str] = Field(None, description="ISO timestamp or YYYY-MM-DD for relative date calculation")


class TaskParseResponse(BaseModel):
    intent: str = Field("CREATE_TASK", description="Detected user intent, e.g. CREATE_TASK")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    task: ParsedTask = Field(..., description="Structured task object")
    rawInput: str = Field(..., description="Original input text")
    providerUsed: str = Field(..., description="Identifier of the LLM provider that processed the query")
    explanation: Optional[str] = Field(None, description="Brief rationale or details of extraction")
