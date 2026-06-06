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

from ..models import Trip, TripActivity, TripExpense, TripChecklistItem, TripSavedTravel, TripWaypoint
from ..schemas import (
    TripCreate, TripUpdate,
    WaypointCreate, WaypointUpdate,
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
                joinedload(Trip.waypoints),
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

    def create_trip(self, user_id: int, data: TripCreate) -> Trip:
        trip = Trip(
            user_id=user_id,
            destination=data.destination,
            origin=data.origin,
            country_code=data.country_code,
            start_date=data.start_date,
            end_date=data.end_date,
            duration_days=data.duration_days,
            budget=data.budget,
            travelers_count=data.travelers_count,
            preferences=data.preferences,
            notes=data.notes,
            status="planning",
            ai_alerts=[],
            ai_recommendations=[],
        )
        self.db.add(trip)
        self.db.flush()  # populate trip.id before inserting waypoints

        # Seed origin (index 0) and destination (index 1) as the initial route
        self.db.add(TripWaypoint(trip_id=trip.id, order_index=0, city=data.origin))
        self.db.add(TripWaypoint(
            trip_id=trip.id, order_index=1,
            city=data.destination, country_code=data.country_code,
        ))
        self.db.commit()
        self.db.refresh(trip)
        return trip

    def get_user_trips(self, user_id: int) -> list[Trip]:
        return (
            self.db.query(Trip)
            .options(
                joinedload(Trip.activities),
                joinedload(Trip.expenses),
                joinedload(Trip.checklist_items),
                joinedload(Trip.saved_travel),
                joinedload(Trip.waypoints),
            )
            .filter(Trip.user_id == user_id)
            .order_by(Trip.updated_at.desc().nullslast(), Trip.created_at.desc())
            .all()
        )

    def update_trip(self, trip_id: int, user_id: int, updates: TripUpdate) -> Trip:
        trip = self.get_trip_or_404(trip_id, user_id)

        # Scalar columns — only write if explicitly provided
        simple_fields = [
            "destination", "origin", "country_code", "start_date", "end_date",
            "duration_days", "budget", "travelers_count", "status",
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

    def set_cover_image(self, trip_id: int, user_id: int, url: str | None) -> Trip:
        """Set or clear the cover image URL for a trip."""
        trip = self.get_trip_or_404(trip_id, user_id)
        trip.cover_image_url = url
        self._touch(trip)
        self.db.commit()
        self.db.refresh(trip)
        return trip

    def save_ai_alerts(self, trip_id: int, user_id: int, alerts: list) -> None:
        trip = self.get_trip_or_404(trip_id, user_id)
        trip.ai_alerts = alerts
        self._touch(trip)
        self.db.commit()

    def save_ai_recommendations(self, trip_id: int, user_id: int, recommendations: list) -> None:
        trip = self.get_trip_or_404(trip_id, user_id)
        trip.ai_recommendations = recommendations
        self._touch(trip)
        self.db.commit()

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

    def delete_all_activities(self, trip_id: int, user_id: int) -> int:
        """Delete every activity for a trip. Returns the count deleted."""
        trip = self.get_trip_or_404(trip_id, user_id)
        deleted = (
            self.db.query(TripActivity)
            .filter(TripActivity.trip_id == trip_id)
            .delete(synchronize_session=False)
        )
        self._touch(trip)
        self.db.commit()
        return deleted

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

    # ── Waypoints ─────────────────────────────────────────────

    def _ordered_waypoints(self, trip_id: int) -> list[TripWaypoint]:
        return (
            self.db.query(TripWaypoint)
            .filter(TripWaypoint.trip_id == trip_id)
            .order_by(TripWaypoint.order_index)
            .all()
        )

    def add_waypoint(
        self, trip_id: int, user_id: int, data: WaypointCreate
    ) -> TripWaypoint:
        trip = self.get_trip_or_404(trip_id, user_id)

        wps = self._ordered_waypoints(trip_id)
        if len(wps) < 2:
            raise HTTPException(status_code=400, detail="Trip must have origin and destination first")

        # Always insert immediately before destination (last node)
        dest = wps[-1]
        dest.order_index += 1

        waypoint = TripWaypoint(
            trip_id=trip_id,
            order_index=dest.order_index - 1,
            city=data.city,
            country=data.country,
            country_code=data.country_code,
            arrival_date=data.arrival_date,
            departure_date=data.departure_date,
            notes=data.notes,
        )
        self.db.add(waypoint)
        self._touch(trip)
        self.db.commit()
        self.db.refresh(waypoint)
        return waypoint

    def update_waypoint(
        self, trip_id: int, waypoint_id: int, user_id: int, data: WaypointUpdate
    ) -> TripWaypoint:
        trip = self.get_trip_or_404(trip_id, user_id)

        waypoint = (
            self.db.query(TripWaypoint)
            .filter(TripWaypoint.id == waypoint_id, TripWaypoint.trip_id == trip_id)
            .first()
        )
        if not waypoint:
            raise HTTPException(status_code=404, detail="Waypoint not found")

        wps = self._ordered_waypoints(trip_id)
        is_origin = bool(wps) and waypoint.id == wps[0].id

        # City / country / dates — allowed on any node
        for field in ["city", "country", "country_code", "arrival_date", "departure_date", "notes"]:
            value = getattr(data, field)
            if value is not None:
                setattr(waypoint, field, value)

        # Reordering — allowed on all nodes except origin
        if data.order_index is not None and not is_origin:
            if data.order_index == 0:
                raise HTTPException(status_code=400, detail="Cannot move a stop to the origin position")
            waypoint.order_index = data.order_index

        # Sync origin cache if origin city changed
        if data.city is not None and is_origin:
            trip.origin = data.city

        # Recompute destination cache from whichever waypoint ends up last
        self.db.flush()
        updated_wps = self._ordered_waypoints(trip_id)
        if updated_wps:
            last = updated_wps[-1]
            trip.destination = last.city
            if last.country_code is not None:
                trip.country_code = last.country_code

        self._touch(trip)
        self.db.commit()
        self.db.refresh(waypoint)
        return waypoint

    def delete_waypoint(
        self, trip_id: int, waypoint_id: int, user_id: int
    ) -> None:
        trip = self.get_trip_or_404(trip_id, user_id)

        waypoint = (
            self.db.query(TripWaypoint)
            .filter(TripWaypoint.id == waypoint_id, TripWaypoint.trip_id == trip_id)
            .first()
        )
        if not waypoint:
            raise HTTPException(status_code=404, detail="Waypoint not found")

        wps = self._ordered_waypoints(trip_id)
        if waypoint.id == wps[0].id or waypoint.id == wps[-1].id:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete origin or destination — edit the city instead",
            )

        self.db.delete(waypoint)
        self._touch(trip)
        self.db.commit()