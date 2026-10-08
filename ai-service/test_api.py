from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "active_provider" in data


def test_api_parse_task():
    payload = {
        "text": "Remind me to study Java DSA tomorrow at 7 PM for 1 hour.",
        "timezone": "UTC",
        "referenceDate": "2026-10-05 12:00:00"
    }
    response = client.post("/api/v1/parse-task", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "CREATE_TASK"
    assert data["task"]["title"] == "Study Java DSA"
    assert data["task"]["date"] == "2026-10-06"
    assert data["task"]["time"] == "19:00"
    assert data["task"]["duration"] == 60
    assert data["task"]["category"] == "STUDY"


def test_api_empty_text():
    response = client.post("/api/v1/parse-task", json={"text": "   "})
    assert response.status_code == 400


def test_providers_endpoint():
    response = client.get("/api/v1/providers")
    assert response.status_code == 200
    data = response.json()
    assert "active_provider" in data
    assert "available_providers" in data
