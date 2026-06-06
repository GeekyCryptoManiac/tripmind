"""Integration tests for TripService — trip CRUD via SQLite in-memory."""
import pytest
from fastapi import HTTPException

from app.models import TripWaypoint
from app.schemas import TripCreate, TripUpdate
from app.services.trip_service import TripService


@pytest.fixture
def svc(db):
    return TripService(db)


@pytest.fixture
def trip(svc, test_user):
    return svc.create_trip(test_user.id, TripCreate(destination="Tokyo", origin="Singapore", country_code="JP"))


# ── create_trip ───────────────────────────────────────────────

def test_create_trip_returns_trip_with_correct_destination(svc, test_user):
    t = svc.create_trip(test_user.id, TripCreate(destination="Bali"))
    assert t.destination == "Bali"


def test_create_trip_sets_status_to_planning(svc, test_user):
    t = svc.create_trip(test_user.id, TripCreate(destination="Paris"))
    assert t.status == "planning"


def test_create_trip_seeds_two_waypoints(svc, test_user, db):
    t = svc.create_trip(test_user.id, TripCreate(destination="Tokyo", origin="Singapore"))
    waypoints = (
        db.query(TripWaypoint)
        .filter(TripWaypoint.trip_id == t.id)
        .order_by(TripWaypoint.order_index)
        .all()
    )
    assert len(waypoints) == 2


def test_create_trip_origin_waypoint_at_index_0(svc, test_user, db):
    t = svc.create_trip(test_user.id, TripCreate(destination="Tokyo", origin="Singapore"))
    wps = db.query(TripWaypoint).filter(TripWaypoint.trip_id == t.id).order_by(TripWaypoint.order_index).all()
    assert wps[0].city == "Singapore"
    assert wps[0].order_index == 0


def test_create_trip_destination_waypoint_at_index_1(svc, test_user, db):
    t = svc.create_trip(test_user.id, TripCreate(destination="Tokyo", origin="Singapore", country_code="JP"))
    wps = db.query(TripWaypoint).filter(TripWaypoint.trip_id == t.id).order_by(TripWaypoint.order_index).all()
    assert wps[1].city == "Tokyo"
    assert wps[1].order_index == 1
    assert wps[1].country_code == "JP"


# ── get_trip_or_404 ───────────────────────────────────────────

def test_get_trip_or_404_returns_existing_trip(svc, test_user, trip):
    fetched = svc.get_trip_or_404(trip.id, test_user.id)
    assert fetched.id == trip.id


def test_get_trip_or_404_raises_404_for_missing_trip(svc, test_user):
    with pytest.raises(HTTPException) as exc:
        svc.get_trip_or_404(99999, test_user.id)
    assert exc.value.status_code == 404


def test_get_trip_or_404_raises_403_for_other_user(svc, test_user, trip, db):
    from app.models import User
    from app.auth import hash_password
    other = User(email="other@test.com", full_name="Other", password_hash=hash_password("Pass123!"))
    db.add(other)
    db.commit()
    db.refresh(other)

    with pytest.raises(HTTPException) as exc:
        svc.get_trip_or_404(trip.id, other.id)
    assert exc.value.status_code == 403


# ── update_trip ───────────────────────────────────────────────

def test_update_trip_destination(svc, test_user, trip):
    updated = svc.update_trip(trip.id, test_user.id, TripUpdate(destination="Osaka"))
    assert updated.destination == "Osaka"


def test_update_trip_status(svc, test_user, trip):
    updated = svc.update_trip(trip.id, test_user.id, TripUpdate(status="completed"))
    assert updated.status == "completed"


def test_update_trip_notes(svc, test_user, trip):
    updated = svc.update_trip(trip.id, test_user.id, TripUpdate(notes="Great trip"))
    assert updated.notes == "Great trip"


# ── delete_trip ───────────────────────────────────────────────

def test_delete_trip_removes_it_from_db(svc, test_user, trip):
    trip_id = trip.id
    svc.delete_trip(trip_id, test_user.id)
    with pytest.raises(HTTPException) as exc:
        svc.get_trip_or_404(trip_id, test_user.id)
    assert exc.value.status_code == 404


def test_delete_trip_cascade_removes_waypoints(svc, test_user, trip, db):
    trip_id = trip.id
    svc.delete_trip(trip_id, test_user.id)
    wps = db.query(TripWaypoint).filter(TripWaypoint.trip_id == trip_id).all()
    assert wps == []


# ── get_user_trips ────────────────────────────────────────────

def test_get_user_trips_returns_empty_list_for_new_user(svc, test_user):
    assert svc.get_user_trips(test_user.id) == []


def test_get_user_trips_returns_created_trips(svc, test_user):
    svc.create_trip(test_user.id, TripCreate(destination="Tokyo"))
    svc.create_trip(test_user.id, TripCreate(destination="Paris"))
    trips = svc.get_user_trips(test_user.id)
    assert len(trips) == 2
