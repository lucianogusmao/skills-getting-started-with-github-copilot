from fastapi.testclient import TestClient
from src.app import app, activities

client = TestClient(app)


def reset_activities():
    # Reset in-memory activities to a known state for tests
    activities.clear()
    activities.update({
        "Test Activity": {
            "description": "A test activity",
            "schedule": "Now",
            "max_participants": 3,
            "participants": ["alice@example.com"]
        }
    })


def test_get_activities():
    reset_activities()
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert "Test Activity" in data
    assert data["Test Activity"]["description"] == "A test activity"


def test_signup_success():
    reset_activities()
    resp = client.post("/activities/Test%20Activity/signup?email=bob%40example.com")
    assert resp.status_code == 200
    assert resp.json()["message"] == "Signed up bob@example.com for Test Activity"
    # verify participant added
    assert "bob@example.com" in activities["Test Activity"]["participants"]


def test_signup_duplicate():
    reset_activities()
    # alice already signed up in reset_activities
    resp = client.post("/activities/Test%20Activity/signup?email=alice%40example.com")
    assert resp.status_code == 400
    assert "already" in resp.json().get("detail", "")


def test_unregister_success():
    reset_activities()
    # unregister existing alice
    resp = client.delete("/activities/Test%20Activity/participants?email=alice%40example.com")
    assert resp.status_code == 200
    assert "Unregistered alice@example.com" in resp.json().get("message", "")
    assert "alice@example.com" not in activities["Test Activity"]["participants"]


def test_unregister_not_found():
    reset_activities()
    resp = client.delete("/activities/Test%20Activity/participants?email=notfound%40example.com")
    assert resp.status_code == 404
    assert "Participant not found" in resp.json().get("detail", "")
