"""Unit tests for Pydantic schemas — validation rules and defaults."""
import pytest
from pydantic import ValidationError

from app.schemas import (
    ActivityCreate,
    ChecklistItemCreate,
    ExpenseCreate,
    TripCreate,
    UserRegister,
    ChatRequest,
    WaypointCreate,
)


# ── TripCreate ────────────────────────────────────────────────

def test_trip_create_requires_destination():
    with pytest.raises(ValidationError):
        TripCreate()


def test_trip_create_default_origin_is_singapore():
    t = TripCreate(destination="Tokyo")
    assert t.origin == "Singapore"


def test_trip_create_country_code_max_two_chars():
    with pytest.raises(ValidationError):
        TripCreate(destination="Tokyo", country_code="JPN")  # alpha-3 rejected


def test_trip_create_valid_country_code():
    t = TripCreate(destination="Tokyo", country_code="JP")
    assert t.country_code == "JP"


def test_trip_create_travelers_count_must_be_positive():
    with pytest.raises(ValidationError):
        TripCreate(destination="Tokyo", travelers_count=0)


def test_trip_create_travelers_count_default_is_one():
    t = TripCreate(destination="Tokyo")
    assert t.travelers_count == 1


# ── ActivityCreate ────────────────────────────────────────────

def test_activity_create_day_must_be_positive():
    with pytest.raises(ValidationError):
        ActivityCreate(day=0, title="Something")


def test_activity_create_title_required():
    with pytest.raises(ValidationError):
        ActivityCreate(day=1)


def test_activity_create_title_cannot_be_empty():
    with pytest.raises(ValidationError):
        ActivityCreate(day=1, title="")


def test_activity_create_title_max_200_chars():
    with pytest.raises(ValidationError):
        ActivityCreate(day=1, title="x" * 201)


def test_activity_create_valid_minimal():
    a = ActivityCreate(day=1, title="Museum visit")
    assert a.day == 1
    assert a.type == "activity"


# ── ExpenseCreate ─────────────────────────────────────────────

def test_expense_amount_must_be_positive():
    with pytest.raises(ValidationError):
        ExpenseCreate(amount=0, category="food")


def test_expense_amount_negative_rejected():
    with pytest.raises(ValidationError):
        ExpenseCreate(amount=-10.0, category="food")


def test_expense_create_valid():
    from app.schemas import ExpenseCreate
    e = ExpenseCreate(amount=50.0, category="food", description="Ramen")
    assert e.amount == 50.0


# ── ChecklistItemCreate ───────────────────────────────────────

def test_checklist_item_text_required():
    with pytest.raises(ValidationError):
        ChecklistItemCreate()


def test_checklist_item_text_cannot_be_empty():
    with pytest.raises(ValidationError):
        ChecklistItemCreate(text="")


def test_checklist_item_text_max_300_chars():
    with pytest.raises(ValidationError):
        ChecklistItemCreate(text="x" * 301)


# ── UserRegister ──────────────────────────────────────────────

def test_user_register_password_min_8_chars():
    with pytest.raises(ValidationError):
        UserRegister(email="a@b.com", password="short", full_name="Alice")


def test_user_register_valid():
    u = UserRegister(email="test@example.com", password="longpassword", full_name="Alice")
    assert u.email == "test@example.com"


def test_user_register_invalid_email():
    with pytest.raises(ValidationError):
        UserRegister(email="not-an-email", password="longpassword", full_name="Alice")


# ── ChatRequest ───────────────────────────────────────────────

def test_chat_request_message_cannot_be_empty():
    with pytest.raises(ValidationError):
        ChatRequest(message="")


def test_chat_request_trip_id_optional():
    r = ChatRequest(message="Plan a trip to Tokyo")
    assert r.trip_id is None


def test_chat_request_valid():
    r = ChatRequest(message="Hello", trip_id=5)
    assert r.message == "Hello"
    assert r.trip_id == 5
