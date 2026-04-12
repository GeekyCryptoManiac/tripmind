"""
TripService
============
All database operations for trips and their related data.

Why a service layer?
  - Route handlers in main.py become 3-5 lines each (just call service + return)
  - Business logic is testable without spinning up FastAPI or mocking requests
  - The LangChain agent tools call the same methods the API uses — one code path
  - Adding a new feature means adding a method here, not hunting through main.py

Usage:
    svc = TripService(db)
    trip = svc.get_trip_or_404(trip_id, user_id)
    activity = svc.add_activity(trip_id, user_id, activity_data)
"""

from datetime import datetime, timedelta
from typing import Optional
import json
import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ..models import Trip, TripActivity, TripExpense, TripChecklistItem, TripSavedTravel
from ..schemas import (
    TripUpdate,
    ActivityCreate, ActivityUpdate,
    ExpenseCreate, ExpenseUpdate,
    ChecklistItemCreate, ChecklistItemUpdate,
    TravelSaveRequest,
)


class TripService:
    def __init__(self, db: Session):
        self.db = db

    # ── Internal helpers ──────────────────────────────────────

    def _get_trip(self, trip_id: int) -> Optional[Trip]:
        """Fetch a trip with all relationships eagerly loaded."""
        return (
            self.db.query(Trip)
            .options(
                joinedload(Trip.activities),
                joinedload(Trip.expenses),
                joinedload(Trip.checklist_items),
                joinedload(Trip.saved_travel),
            )
            .filter(Trip.id == trip_id)
            .first()
        )

    def get_trip_or_404(self, trip_id: int, user_id: int) -> Trip:
        """
        Fetch a trip, raising:
          404 if it doesn't exist
          403 if it belongs to another user
        """
        trip = self._get_trip(trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        if trip.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        return trip

    def _touch(self, trip: Trip) -> None:
        """Update the trip's updated_at timestamp."""
        trip.updated_at = datetime.utcnow()

    # ── Trip CRUD ─────────────────────────────────────────────

    def get_user_trips(self, user_id: int) -> list[Trip]:
        return (
            self.db.query(Trip)
            .options(
                joinedload(Trip.activities),
                joinedload(Trip.expenses),
                joinedload(Trip.checklist_items),
                joinedload(Trip.saved_travel),
            )
            .filter(Trip.user_id == user_id)
            .order_by(Trip.updated_at.desc().nullslast(), Trip.created_at.desc())
            .all()
        )

    def update_trip(self, trip_id: int, user_id: int, updates: TripUpdate) -> Trip:
        trip = self.get_trip_or_404(trip_id, user_id)

        # Scalar columns — only write if explicitly provided
        simple_fields = [
            "destination", "start_date", "end_date", "duration_days",
            "budget", "travelers_count", "status",
            "notes", "cover_image_url",
        ]
        for field in simple_fields:
            value = getattr(updates, field)
            if value is not None:
                setattr(trip, field, value)

        # JSONB columns — replace entire array when provided
        if updates.preferences is not None:
            trip.preferences = updates.preferences
        if updates.ai_alerts is not None:
            trip.ai_alerts = updates.ai_alerts
        if updates.ai_recommendations is not None:
            trip.ai_recommendations = updates.ai_recommendations

        self._touch(trip)
        self.db.commit()
        self.db.refresh(trip)
        return trip

    def delete_trip(self, trip_id: int, user_id: int) -> None:
        trip = self.get_trip_or_404(trip_id, user_id)
        self.db.delete(trip)
        self.db.commit()

    # ── Activities ────────────────────────────────────────────

    def add_activity(
        self, trip_id: int, user_id: int, data: ActivityCreate
    ) -> TripActivity:
        # Verify trip ownership
        trip = self.get_trip_or_404(trip_id, user_id)

        # Determine sort_order: place after the last activity on this day
        existing = (
            self.db.query(TripActivity)
            .filter(TripActivity.trip_id == trip_id, TripActivity.day == data.day)
            .order_by(TripActivity.sort_order.desc())
            .first()
        )
        sort_order = (existing.sort_order + 1) if existing else 0
        if data.sort_order:          # caller can override
            sort_order = data.sort_order

        activity = TripActivity(
            trip_id=trip_id,
            day=data.day,
            time=data.time,
            type=data.type,
            title=data.title,
            location=data.location,
            description=data.description,
            notes=data.notes,
            booking_ref=data.booking_ref,
            sort_order=sort_order,
        )
        self.db.add(activity)
        self._touch(trip)
        self.db.commit()
        self.db.refresh(activity)
        return activity

    def update_activity(
        self, trip_id: int, activity_id: int, user_id: int, data: ActivityUpdate
    ) -> TripActivity:
        self.get_trip_or_404(trip_id, user_id)  # ownership check

        activity = (
            self.db.query(TripActivity)
            .filter(TripActivity.id == activity_id, TripActivity.trip_id == trip_id)
            .first()
        )
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")

        for field in ["time", "type", "title", "location", "description", "notes",
                      "booking_ref", "sort_order"]:
            value = getattr(data, field)
            if value is not None:
                setattr(activity, field, value)

        self.db.commit()
        self.db.refresh(activity)
        return activity

    def delete_activity(
        self, trip_id: int, activity_id: int, user_id: int
    ) -> None:
        trip = self.get_trip_or_404(trip_id, user_id)

        activity = (
            self.db.query(TripActivity)
            .filter(TripActivity.id == activity_id, TripActivity.trip_id == trip_id)
            .first()
        )
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")

        self.db.delete(activity)
        self._touch(trip)
        self.db.commit()

    def get_activities_for_day(self, trip_id: int, day: int) -> list[TripActivity]:
        return (
            self.db.query(TripActivity)
            .filter(TripActivity.trip_id == trip_id, TripActivity.day == day)
            .order_by(TripActivity.sort_order, TripActivity.time)
            .all()
        )

    # ── Expenses ──────────────────────────────────────────────

    def add_expense(
        self, trip_id: int, user_id: int, data: ExpenseCreate
    ) -> TripExpense:
        trip = self.get_trip_or_404(trip_id, user_id)

        expense = TripExpense(
            trip_id=trip_id,
            category=data.category,
            description=data.description,
            amount=data.amount,
            currency=data.currency,
            date=data.date,
        )
        self.db.add(expense)
        self._touch(trip)
        self.db.commit()
        self.db.refresh(expense)
        return expense

    def update_expense(
        self, trip_id: int, expense_id: int, user_id: int, data: ExpenseUpdate
    ) -> TripExpense:
        self.get_trip_or_404(trip_id, user_id)

        expense = (
            self.db.query(TripExpense)
            .filter(TripExpense.id == expense_id, TripExpense.trip_id == trip_id)
            .first()
        )
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")

        for field in ["category", "description", "amount", "currency", "date"]:
            value = getattr(data, field)
            if value is not None:
                setattr(expense, field, value)

        self.db.commit()
        self.db.refresh(expense)
        return expense

    def delete_expense(
        self, trip_id: int, expense_id: int, user_id: int
    ) -> None:
        trip = self.get_trip_or_404(trip_id, user_id)

        expense = (
            self.db.query(TripExpense)
            .filter(TripExpense.id == expense_id, TripExpense.trip_id == trip_id)
            .first()
        )
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")

        self.db.delete(expense)
        self._touch(trip)
        self.db.commit()

    # ── Checklist ─────────────────────────────────────────────

    def add_checklist_item(
        self, trip_id: int, user_id: int, data: ChecklistItemCreate
    ) -> TripChecklistItem:
        trip = self.get_trip_or_404(trip_id, user_id)

        # Place at end by default
        last = (
            self.db.query(TripChecklistItem)
            .filter(TripChecklistItem.trip_id == trip_id)
            .order_by(TripChecklistItem.sort_order.desc())
            .first()
        )
        sort_order = (last.sort_order + 1) if last else 0
        if data.sort_order:
            sort_order = data.sort_order

        item = TripChecklistItem(
            trip_id=trip_id,
            text=data.text,
            sort_order=sort_order,
        )
        self.db.add(item)
        self._touch(trip)
        self.db.commit()
        self.db.refresh(item)
        return item

    def update_checklist_item(
        self, trip_id: int, item_id: int, user_id: int, data: ChecklistItemUpdate
    ) -> TripChecklistItem:
        self.get_trip_or_404(trip_id, user_id)

        item = (
            self.db.query(TripChecklistItem)
            .filter(TripChecklistItem.id == item_id, TripChecklistItem.trip_id == trip_id)
            .first()
        )
        if not item:
            raise HTTPException(status_code=404, detail="Checklist item not found")

        if data.text       is not None: item.text       = data.text
        if data.is_checked is not None: item.is_checked = data.is_checked
        if data.sort_order is not None: item.sort_order = data.sort_order

        self.db.commit()
        self.db.refresh(item)
        return item

    def delete_checklist_item(
        self, trip_id: int, item_id: int, user_id: int
    ) -> None:
        trip = self.get_trip_or_404(trip_id, user_id)

        item = (
            self.db.query(TripChecklistItem)
            .filter(TripChecklistItem.id == item_id, TripChecklistItem.trip_id == trip_id)
            .first()
        )
        if not item:
            raise HTTPException(status_code=404, detail="Checklist item not found")

        self.db.delete(item)
        self._touch(trip)
        self.db.commit()

    # ── Saved travel ──────────────────────────────────────────

    def save_travel_item(
        self, trip_id: int, user_id: int, data: TravelSaveRequest
    ) -> TripSavedTravel:
        trip = self.get_trip_or_404(trip_id, user_id)

        item = TripSavedTravel(
            trip_id=trip_id,
            type=data.type,
            data=data.data,
        )
        self.db.add(item)
        self._touch(trip)
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete_saved_travel(
        self, trip_id: int, item_id: int, user_id: int
    ) -> None:
        trip = self.get_trip_or_404(trip_id, user_id)

        item = (
            self.db.query(TripSavedTravel)
            .filter(TripSavedTravel.id == item_id, TripSavedTravel.trip_id == trip_id)
            .first()
        )
        if not item:
            raise HTTPException(status_code=404, detail="Saved travel item not found")

        self.db.delete(item)
        self._touch(trip)
        self.db.commit()