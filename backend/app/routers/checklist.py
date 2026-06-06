from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User
from ..schemas import ChecklistItemCreate, ChecklistItemResponse, ChecklistItemUpdate
from ..services.trip_service import TripService

router = APIRouter(prefix="/api/trips", tags=["checklist"])


@router.post("/{trip_id}/checklist", response_model=ChecklistItemResponse, status_code=201)
async def add_checklist_item(
    trip_id: int,
    data: ChecklistItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).add_checklist_item(trip_id, current_user.id, data)


@router.patch("/{trip_id}/checklist/{item_id}", response_model=ChecklistItemResponse)
async def update_checklist_item(
    trip_id: int,
    item_id: int,
    data: ChecklistItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).update_checklist_item(trip_id, item_id, current_user.id, data)


@router.delete("/{trip_id}/checklist/{item_id}", status_code=204)
async def delete_checklist_item(
    trip_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    TripService(db).delete_checklist_item(trip_id, item_id, current_user.id)
