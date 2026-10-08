import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_planner_what_to_do_now():
    payload = {
        "currentUserTime": "2026-10-08T14:00:00Z",
        "timezone": "Asia/Kolkata",
        "availableTimeMinutes": 45,
        "schedule": [
            {
                "title": "Algorithms Seminar",
                "startTime": "2026-10-08T14:45:00Z",
                "endTime": "2026-10-08T15:45:00Z",
                "isAllDay": False,
                "type": "STUDY"
            }
        ],
        "pendingTasks": [
            {
                "id": "task-dsa-1",
                "title": "Complete pending Java DSA task",
                "description": "Binary search tree rebalancing and AVL rotations",
                "priority": "HIGH",
                "category": "STUDY",
                "estimatedDuration": 30,
                "deadline": "2026-10-08T18:00:00Z",
                "subtasks": [{"title": "Implement rotateLeft"}, {"title": "Test balance factors"}]
            },
            {
                "id": "task-email-2",
                "title": "Reply to low priority emails",
                "priority": "LOW",
                "category": "WORK",
                "estimatedDuration": 15
            }
        ],
        "deadlines": [],
        "habits": [
            {"id": "h1", "title": "Read 20 Pages", "isCompleted": False}
        ],
        "studyGoals": [{"title": "Data Structures & Algorithms"}],
        "conflicts": [],
        "userEnergyLevel": 4
    }

    response = client.post("/api/v1/planner/what-to-do-now", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["availableTimeMinutes"] == 45
    assert "45 minutes available" in data["availableTimeFormatted"]
    assert "Java DSA" in data["recommendedTask"]["title"]
    assert data["recommendedTask"]["priority"] == "HIGH"
    assert data["recommendedTask"]["estimatedDuration"] == "30 minutes"
    assert "reason" in data and len(data["reason"]) > 0
    assert "nextTask" in data and len(data["nextTask"]["title"]) > 0
    print("SUCCESS: test_planner_what_to_do_now passed!")


if __name__ == "__main__":
    test_planner_what_to_do_now()
