"""Integration tests for TripService waypoint methods."""
import pytest
from fastapi import HTTPException

from app.schemas import TripCreate, WaypointCreate, WaypointUpdate
from app.services.trip_service import TripService


@pytest.fixture
def svc(db):
    return TripService(db)


@pytest.fixture
def trip(svc, test_user):
    return svc.create_trip(
        test_user.id,
        TripCreate(destination="Tokyo", origin="Singapore", country_code="JP"),
    )


def test_create_trip_seeds_origin_and_destination_waypoints(svc, test_user, trip, db):
    from app.models import TripWaypoint
    wps = (
        db.query(TripWaypoint)
        .filter(TripWaypoint.trip_id == trip.id)
        .order_by(TripWaypoint.order_index)
        .all()
    )
    assert len(wps) == 2
    assert wps[0].city == "Singapore"
    assert wps[1].city == "Tokyo"


def test_add_waypoint_inserts_before_destination(svc, test_user, trip, db):
    from app.models import TripWaypoint
    svc.add_waypoint(trip.id, test_user.id, WaypointCreate(city="Osaka"))
    wps = (
        db.query(TripWaypoint)
        .filter(TripWaypoint.trip_id == trip.id)
        .order_by(TripWaypoint.order_index)
        .all()
    )
    assert len(wps) == 3
    cities = [w.city for w in wps]
    assert cities[0] == "Singapore"
    assert cities[-1] == "Tokyo"
    assert "Osaka" in cities


def test_add_waypoint_stores_country_code(svc, test_user, trip):
    wp = svc.add_waypoint(trip.id, test_user.id, WaypointCreate(city="Osaka", country_code="JP"))
    assert wp.country_code == "JP"


def test_update_waypoint_changes_city(svc, test_user, trip, db):
    from app.models import TripWaypoint
    # Get the destination waypoint (index 1)
    wps = db.query(TripWaypoint).filter(TripWaypoint.trip_id == trip.id).order_by(TripWaypoint.order_index).all()
    dest_wp = wps[1]
    updated = svc.update_waypoint(trip.id, dest_wp.id, test_user.id, WaypointUpdate(city="Kyoto"))
    assert updated.city == "Kyoto"


def test_delete_origin_waypoint_raises_400(svc, test_user, trip, db):
    from app.models import TripWaypoint
    wps = db.query(TripWaypoint).filter(TripWaypoint.trip_id == trip.id).order_by(TripWaypoint.order_index).all()
    origin_wp = wps[0]
    with pytest.raises(HTTPException) as exc:
        svc.delete_waypoint(trip.id, origin_wp.id, test_user.id)
    assert exc.value.status_code == 400


def test_delete_destination_waypoint_raises_400(svc, test_user, trip, db):
    from app.models import TripWaypoint
    wps = db.query(TripWaypoint).filter(TripWaypoint.trip_id == trip.id).order_by(TripWaypoint.order_index).all()
    dest_wp = wps[-1]
    with pytest.raises(HTTPException) as exc:
        svc.delete_waypoint(trip.id, dest_wp.id, test_user.id)
    assert exc.value.status_code == 400


def test_delete_middle_waypoint_succeeds(svc, test_user, trip, db):
    from app.models import TripWaypoint
    middle = svc.add_waypoint(trip.id, test_user.id, WaypointCreate(city="Osaka"))
    svc.delete_waypoint(trip.id, middle.id, test_user.id)
    wps = db.query(TripWaypoint).filter(TripWaypoint.trip_id == trip.id).all()
    assert len(wps) == 2
