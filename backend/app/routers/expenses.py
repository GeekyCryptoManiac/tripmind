from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User
from ..schemas import ExpenseCreate, ExpenseResponse, ExpenseUpdate
from ..services.trip_service import TripService

router = APIRouter(prefix="/api/trips", tags=["expenses"])


@router.post("/{trip_id}/expenses", response_model=ExpenseResponse, status_code=201)
async def add_expense(
    trip_id: int,
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).add_expense(trip_id, current_user.id, data)


@router.patch("/{trip_id}/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    trip_id: int,
    expense_id: int,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).update_expense(trip_id, expense_id, current_user.id, data)


@router.delete("/{trip_id}/expenses/{expense_id}", status_code=204)
async def delete_expense(
    trip_id: int,
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    TripService(db).delete_expense(trip_id, expense_id, current_user.id)
