from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User
from ..schemas import WaypointCreate, WaypointResponse, WaypointUpdate
from ..services.trip_service import TripService

router = APIRouter(prefix="/api/trips", tags=["waypoints"])


@router.post("/{trip_id}/waypoints", response_model=WaypointResponse, status_code=201)
async def add_waypoint(
    trip_id: int,
    data: WaypointCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).add_waypoint(trip_id, current_user.id, data)


@router.patch("/{trip_id}/waypoints/{waypoint_id}", response_model=WaypointResponse)
async def update_waypoint(
    trip_id: int,
    waypoint_id: int,
    data: WaypointUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).update_waypoint(trip_id, waypoint_id, current_user.id, data)


@router.delete("/{trip_id}/waypoints/{waypoint_id}", status_code=204)
async def delete_waypoint(
    trip_id: int,
    waypoint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    TripService(db).delete_waypoint(trip_id, waypoint_id, current_user.id)
