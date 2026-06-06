"""Integration tests for TripService activity methods."""
import pytest
from fastapi import HTTPException

from app.schemas import ActivityCreate, ActivityUpdate, TripCreate
from app.services.trip_service import TripService


@pytest.fixture
def svc(db):
    return TripService(db)


@pytest.fixture
def trip(svc, test_user):
    return svc.create_trip(test_user.id, TripCreate(destination="Tokyo"))


@pytest.fixture
def activity(svc, test_user, trip):
    return svc.add_activity(trip.id, test_user.id, ActivityCreate(day=1, title="Shibuya crossing"))


def test_add_activity_persists_to_trip(svc, test_user, trip):
    a = svc.add_activity(trip.id, test_user.id, ActivityCreate(day=1, title="Senso-ji"))
    assert a.id is not None
    assert a.trip_id == trip.id
    assert a.title == "Senso-ji"


def test_add_activity_day_stored_correctly(svc, test_user, trip):
    a = svc.add_activity(trip.id, test_user.id, ActivityCreate(day=3, title="Day 3 tour"))
    assert a.day == 3


def test_add_activity_increments_sort_order(svc, test_user, trip):
    a1 = svc.add_activity(trip.id, test_user.id, ActivityCreate(day=1, title="First"))
    a2 = svc.add_activity(trip.id, test_user.id, ActivityCreate(day=1, title="Second"))
    assert a2.sort_order > a1.sort_order


def test_update_activity_changes_title(svc, test_user, trip, activity):
    updated = svc.update_activity(trip.id, activity.id, test_user.id, ActivityUpdate(title="New title"))
    assert updated.title == "New title"


def test_update_activity_not_found_raises_404(svc, test_user, trip):
    with pytest.raises(HTTPException) as exc:
        svc.update_activity(trip.id, 99999, test_user.id, ActivityUpdate(title="x"))
    assert exc.value.status_code == 404


def test_delete_activity_removes_it(svc, test_user, trip, activity):
    activity_id = activity.id
    svc.delete_activity(trip.id, activity_id, test_user.id)
    with pytest.raises(HTTPException) as exc:
        svc.update_activity(trip.id, activity_id, test_user.id, ActivityUpdate(title="Ghost"))
    assert exc.value.status_code == 404


def test_delete_all_activities_returns_count(svc, test_user, trip):
    svc.add_activity(trip.id, test_user.id, ActivityCreate(day=1, title="A"))
    svc.add_activity(trip.id, test_user.id, ActivityCreate(day=2, title="B"))
    svc.add_activity(trip.id, test_user.id, ActivityCreate(day=3, title="C"))
    deleted = svc.delete_all_activities(trip.id, test_user.id)
    assert deleted == 3


def test_delete_all_activities_does_not_affect_other_trips(svc, test_user, db):
    t1 = svc.create_trip(test_user.id, TripCreate(destination="Tokyo"))
    t2 = svc.create_trip(test_user.id, TripCreate(destination="Paris"))
    svc.add_activity(t1.id, test_user.id, ActivityCreate(day=1, title="Tokyo thing"))
    svc.add_activity(t2.id, test_user.id, ActivityCreate(day=1, title="Paris thing"))

    svc.delete_all_activities(t1.id, test_user.id)

    remaining = svc.get_activities_for_day(t2.id, 1)
    assert len(remaining) == 1
    assert remaining[0].title == "Paris thing"
