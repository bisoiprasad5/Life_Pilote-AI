import asyncio
import pytest
from app.schemas.task_parser import TaskParseRequest, TaskCategory, TaskPriority, RecurrenceInterval
from app.providers.local_parser import LocalNLPProvider


@pytest.fixture
def parser():
    return LocalNLPProvider()


@pytest.fixture
def ref_date():
    # 2026-10-05 is a Monday
    return "2026-10-05 10:00:00"


def test_study_java_dsa(parser, ref_date):
    req = TaskParseRequest(
        text="Remind me to study Java DSA tomorrow at 7 PM for 1 hour.",
        referenceDate=ref_date
    )
    res = asyncio.run(parser.parse_task(req))
    assert res.intent == "CREATE_TASK"
    assert res.task.title == "Study Java DSA"
    assert res.task.date == "2026-10-06"
    assert res.task.time == "19:00"
    assert res.task.duration == 60
    assert res.task.endTime == "20:00"
    assert res.task.category == TaskCategory.STUDY
    assert "dsa" in res.task.tags
    assert "java" in res.task.tags


def test_study_os_duration(parser, ref_date):
    req = TaskParseRequest(
        text="Study OS for 2 hours tomorrow.",
        referenceDate=ref_date
    )
    res = asyncio.run(parser.parse_task(req))
    assert res.task.title == "Study OS"
    assert res.task.date == "2026-10-06"
    assert res.task.duration == 120
    assert res.task.category == TaskCategory.STUDY


def test_recurring_sunday(parser, ref_date):
    req = TaskParseRequest(
        text="Every Sunday remind me to plan my week.",
        referenceDate=ref_date
    )
    res = asyncio.run(parser.parse_task(req))
    assert "Plan" in res.task.title
    assert res.task.isRecurring is True
    assert res.task.recurrenceInterval == RecurrenceInterval.WEEKLY
    assert res.task.recurrenceRule == "FREQ=WEEKLY;BYDAY=SU"
    assert res.task.category == TaskCategory.PERSONAL


def test_deadline_assignment(parser, ref_date):
    req = TaskParseRequest(
        text="Submit assignment before Friday 5 PM.",
        referenceDate=ref_date
    )
    res = asyncio.run(parser.parse_task(req))
    assert res.task.title == "Submit Assignment"
    assert res.task.deadline is not None
    assert "2026-10-09T17:00:00" in res.task.deadline
    assert res.task.category == TaskCategory.STUDY


def test_high_priority_bill(parser, ref_date):
    req = TaskParseRequest(
        text="Pay electricity bill by end of month high priority",
        referenceDate=ref_date
    )
    res = asyncio.run(parser.parse_task(req))
    assert "Electricity Bill" in res.task.title
    assert res.task.priority == TaskPriority.HIGH
    assert res.task.category == TaskCategory.FINANCE


def test_gym_workout(parser, ref_date):
    req = TaskParseRequest(
        text="Gym workout tomorrow morning at 6:30 AM for 45 minutes",
        referenceDate=ref_date
    )
    res = asyncio.run(parser.parse_task(req))
    assert "Gym Workout" in res.task.title
    assert res.task.date == "2026-10-06"
    assert res.task.time == "06:30"
    assert res.task.duration == 45
    assert res.task.endTime == "07:15"
    assert res.task.category == TaskCategory.FITNESS
