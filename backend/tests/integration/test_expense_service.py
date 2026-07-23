"""Integration tests for TripService expense methods."""
import pytest
from fastapi import HTTPException

from app.models import TripExpense
from app.schemas import ActivityCreate, ExpenseCreate, ExpenseUpdate, TripCreate
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


@pytest.fixture
def expense(svc, test_user, trip):
    return svc.add_expense(trip.id, test_user.id, ExpenseCreate(amount=10, description="Snacks"))


def test_add_expense_persists_to_trip(svc, test_user, trip):
    e = svc.add_expense(trip.id, test_user.id, ExpenseCreate(amount=25, category="food"))
    assert e.id is not None
    assert e.trip_id == trip.id
    assert e.category == "food"


def test_update_expense_changes_amount(svc, test_user, trip, expense):
    updated = svc.update_expense(trip.id, expense.id, test_user.id, ExpenseUpdate(amount=50))
    assert updated.amount == 50


def test_update_expense_not_found_raises_404(svc, test_user, trip):
    with pytest.raises(HTTPException) as exc:
        svc.update_expense(trip.id, 99999, test_user.id, ExpenseUpdate(amount=1))
    assert exc.value.status_code == 404


def test_update_expense_can_link_activity_id(svc, test_user, trip, activity, expense):
    updated = svc.update_expense(trip.id, expense.id, test_user.id, ExpenseUpdate(activity_id=activity.id))
    assert updated.activity_id == activity.id


def test_update_expense_can_explicitly_clear_activity_id(svc, test_user, trip, activity, expense):
    svc.update_expense(trip.id, expense.id, test_user.id, ExpenseUpdate(activity_id=activity.id))
    cleared = svc.update_expense(trip.id, expense.id, test_user.id, ExpenseUpdate(activity_id=None))
    assert cleared.activity_id is None


def test_update_expense_omitted_field_is_left_untouched(svc, test_user, trip, activity, expense):
    svc.update_expense(trip.id, expense.id, test_user.id, ExpenseUpdate(activity_id=activity.id))
    updated = svc.update_expense(trip.id, expense.id, test_user.id, ExpenseUpdate(amount=99))
    assert updated.activity_id == activity.id


def test_delete_activity_nulls_linked_expense(svc, test_user, trip, activity):
    """trip_expenses.activity_id has ON DELETE SET NULL — deleting the
    activity must preserve the expense at the trip level, not cascade
    the delete. Relies on real FK enforcement (see conftest.py's SQLite
    PRAGMA foreign_keys=ON hook), not any application-level nulling."""
    linked = svc.add_expense(
        trip.id,
        test_user.id,
        ExpenseCreate(activity_id=activity.id, amount=10, description="Snacks"),
    )
    assert linked.activity_id == activity.id

    svc.delete_activity(trip.id, activity.id, test_user.id)

    survivor = svc.db.query(TripExpense).filter(TripExpense.id == linked.id).first()
    assert survivor is not None
    assert survivor.activity_id is None
