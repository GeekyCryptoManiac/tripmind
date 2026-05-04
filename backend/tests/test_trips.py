from app.models import User, Trip
from app.auth import hash_password
from tests.conftest import TestSessionLocal


def test_get_trips_empty(client, registered_user, auth_headers):
    user_id = registered_user["user"]["id"]
    resp = client.get(f"/api/users/{user_id}/trips", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["trips"] == []
    assert resp.json()["total"] == 0


def test_get_trips_returns_created_trip(client, registered_user, auth_headers, test_trip):
    user_id = registered_user["user"]["id"]
    resp = client.get(f"/api/users/{user_id}/trips", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1
    assert resp.json()["trips"][0]["destination"] == "Tokyo"


def test_get_trips_forbidden_for_other_user(client, registered_user, auth_headers):
    resp = client.get("/api/users/99999/trips", headers=auth_headers)
    assert resp.status_code == 403


def test_get_trip_by_id(client, auth_headers, test_trip):
    resp = client.get(f"/api/trips/{test_trip.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["destination"] == "Tokyo"


def test_get_trip_not_found(client, auth_headers):
    resp = client.get("/api/trips/99999", headers=auth_headers)
    assert resp.status_code == 404


def test_update_trip_destination(client, auth_headers, test_trip):
    resp = client.put(
        f"/api/trips/{test_trip.id}",
        json={"destination": "Osaka"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["destination"] == "Osaka"


def test_update_trip_forbidden_for_other_user(client, auth_headers):
    # Create a trip belonging to a second user
    db = TestSessionLocal()
    try:
        other = User(
            email="other@test.com",
            full_name="Other User",
            password_hash=hash_password("pass1234!"),
        )
        db.add(other)
        db.commit()
        db.refresh(other)
        trip = Trip(
            user_id=other.id,
            destination="Paris",
            origin="Singapore",
            travelers_count=1,
            status="planning",
            preferences=[],
            ai_alerts=[],
            ai_recommendations=[],
        )
        db.add(trip)
        db.commit()
        trip_id = trip.id
    finally:
        db.close()

    resp = client.put(
        f"/api/trips/{trip_id}",
        json={"destination": "Lyon"},
        headers=auth_headers,
    )
    assert resp.status_code == 403


def test_delete_trip(client, auth_headers, test_trip):
    resp = client.delete(f"/api/trips/{test_trip.id}", headers=auth_headers)
    assert resp.status_code == 204
    # Confirm it is gone
    resp2 = client.get(f"/api/trips/{test_trip.id}", headers=auth_headers)
    assert resp2.status_code == 404
