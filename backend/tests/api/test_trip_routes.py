"""API tests for trip CRUD routes."""
from app.models import User, Trip
from app.auth import hash_password
from tests.conftest import TestSessionLocal


def test_create_trip_returns_201(client, auth_headers):
    resp = client.post(
        "/api/trips",
        json={"destination": "Bali", "origin": "Singapore"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["destination"] == "Bali"
    assert data["status"] == "planning"


def test_create_trip_default_origin_is_singapore(client, auth_headers):
    resp = client.post("/api/trips", json={"destination": "Tokyo"}, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["origin"] == "Singapore"


def test_create_trip_unauthenticated_returns_401(client):
    resp = client.post("/api/trips", json={"destination": "Tokyo"})
    assert resp.status_code == 401


def test_get_trip_by_id_returns_200(client, auth_headers, test_trip):
    resp = client.get(f"/api/trips/{test_trip.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["destination"] == "Tokyo"


def test_get_trip_not_found_returns_404(client, auth_headers):
    resp = client.get("/api/trips/99999", headers=auth_headers)
    assert resp.status_code == 404


def test_get_trip_other_users_trip_returns_403(client, registered_user, auth_headers):
    db = TestSessionLocal()
    try:
        other = User(email="other2@test.com", full_name="Other", password_hash=hash_password("Pass123!"))
        db.add(other)
        db.commit()
        db.refresh(other)
        trip = Trip(
            user_id=other.id, destination="Rome", origin="Singapore",
            travelers_count=1, status="planning",
            preferences=[], ai_alerts=[], ai_recommendations=[],
        )
        db.add(trip)
        db.commit()
        trip_id = trip.id
    finally:
        db.close()

    resp = client.get(f"/api/trips/{trip_id}", headers=auth_headers)
    assert resp.status_code == 403


def test_update_trip_destination(client, auth_headers, test_trip):
    resp = client.put(
        f"/api/trips/{test_trip.id}",
        json={"destination": "Osaka"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["destination"] == "Osaka"


def test_update_trip_forbidden_for_other_user(client, auth_headers):
    db = TestSessionLocal()
    try:
        other = User(email="other3@test.com", full_name="Other3", password_hash=hash_password("Pass123!"))
        db.add(other)
        db.commit()
        db.refresh(other)
        trip = Trip(
            user_id=other.id, destination="Paris", origin="Singapore",
            travelers_count=1, status="planning",
            preferences=[], ai_alerts=[], ai_recommendations=[],
        )
        db.add(trip)
        db.commit()
        trip_id = trip.id
    finally:
        db.close()

    resp = client.put(f"/api/trips/{trip_id}", json={"destination": "Lyon"}, headers=auth_headers)
    assert resp.status_code == 403


def test_delete_trip_returns_204(client, auth_headers, test_trip):
    resp = client.delete(f"/api/trips/{test_trip.id}", headers=auth_headers)
    assert resp.status_code == 204


def test_delete_trip_then_get_returns_404(client, auth_headers, test_trip):
    client.delete(f"/api/trips/{test_trip.id}", headers=auth_headers)
    resp = client.get(f"/api/trips/{test_trip.id}", headers=auth_headers)
    assert resp.status_code == 404


def test_get_user_trips_empty_list(client, registered_user, auth_headers):
    user_id = registered_user["user"]["id"]
    resp = client.get(f"/api/users/{user_id}/trips", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["trips"] == []
    assert resp.json()["total"] == 0


def test_get_user_trips_returns_created_trip(client, registered_user, auth_headers, test_trip):
    user_id = registered_user["user"]["id"]
    resp = client.get(f"/api/users/{user_id}/trips", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


def test_get_other_users_trips_returns_403(client, auth_headers):
    resp = client.get("/api/users/99999/trips", headers=auth_headers)
    assert resp.status_code == 403
