"""
Database Models — Normalized Schema
====================================

Changes from the original single-table design:

  BEFORE
  ──────
  trips.trip_metadata (JSON) held everything:
    itinerary, activities, flights, hotels, transport,
    expenses, checklist, notes, preferences, alerts, recommendations

  AFTER
  ─────
  trips              — core trip fields + notes column + preferences JSONB
  trip_activities    — one row per activity (was metadata.itinerary[].activities[])
  trip_expenses      — one row per expense  (was metadata.expenses[])
  trip_checklist     — one row per item     (was metadata.checklist[])
  trip_saved_travel  — one row per saved suggestion (was metadata.flights/hotels/transport[])

  AI cache (alerts, recommendations) is intentionally kept as JSONB on trips
  because it is always regenerated wholesale and never individually addressed.

Migration note
──────────────
  Alembic will create these tables fresh.
  The data migration script (scripts/migrate_metadata.py) reads existing
  trip_metadata blobs and populates the new tables before dropping the column.
"""

from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean,
    DateTime, Numeric, ForeignKey, Index,
    CheckConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


# ── Allowed values — enforced by CHECK constraints ────────────
ACTIVITY_TYPES = ('activity', 'dining', 'flight', 'hotel', 'transport')
TRAVEL_TYPES   = ('flight', 'hotel', 'transport')
TRIP_STATUSES  = ('planning', 'booked', 'ongoing', 'completed', 'cancelled')


# ═════════════════════════════════════════════════════════════
# User
# ═════════════════════════════════════════════════════════════

class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String(255), unique=True, index=True, nullable=False)
    full_name     = Column(String(100), nullable=False)
    password_hash = Column(String, nullable=True)   # nullable for legacy guest rows
    created_at    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    trips = relationship(
        "Trip",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self):
        return f"<User id={self.id} email={self.email!r}>"


# ═════════════════════════════════════════════════════════════
# Trip
# ═════════════════════════════════════════════════════════════

class Trip(Base):
    __tablename__ = "trips"
    __table_args__ = (
        CheckConstraint(
            "status IN ('planning','booked','ongoing','completed','cancelled')",
            name="ck_trips_status",
        ),
        # Composite index — trips list is always filtered by user and sorted by recency
        Index("ix_trips_user_updated", "user_id", "updated_at"),
    )

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    # Core fields
    destination     = Column(String(200), nullable=False)
    start_date      = Column(String(10), nullable=True)   # "YYYY-MM-DD" kept as string for flexibility
    end_date        = Column(String(10), nullable=True)
    duration_days   = Column(Integer, nullable=True)
    budget          = Column(Float, nullable=True)
    travelers_count = Column(Integer, default=1, nullable=False)
    status          = Column(String(20), default="planning", nullable=False)

    # Promoted from trip_metadata — now proper columns
    notes           = Column(Text, nullable=True)
    cover_image_url = Column(Text, nullable=True)

    # Small sets — always read as a whole, never individually addressed
    preferences     = Column(JSONB, nullable=False, server_default="[]")

    # AI-generated caches — regenerated wholesale, never individually addressed
    ai_alerts           = Column(JSONB, nullable=False, server_default="[]")
    ai_recommendations  = Column(JSONB, nullable=False, server_default="[]")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    user = relationship("User", back_populates="trips")

    activities = relationship(
        "TripActivity",
        back_populates="trip",
        cascade="all, delete-orphan",
        order_by="TripActivity.day, TripActivity.sort_order",
        lazy="select",
    )
    expenses = relationship(
        "TripExpense",
        back_populates="trip",
        cascade="all, delete-orphan",
        order_by="TripExpense.created_at",
        lazy="select",
    )
    checklist_items = relationship(
        "TripChecklistItem",
        back_populates="trip",
        cascade="all, delete-orphan",
        order_by="TripChecklistItem.sort_order",
        lazy="select",
    )
    saved_travel = relationship(
        "TripSavedTravel",
        back_populates="trip",
        cascade="all, delete-orphan",
        order_by="TripSavedTravel.created_at",
        lazy="select",
    )

    def __repr__(self):
        return f"<Trip id={self.id} destination={self.destination!r} status={self.status!r}>"


# ═════════════════════════════════════════════════════════════
# TripActivity
# ═════════════════════════════════════════════════════════════

class TripActivity(Base):
    """
    One row per itinerary activity.

    Was: trip_metadata.itinerary[day].activities[n]

    sort_order enables drag-and-drop reordering within a day
    without touching time values.
    """
    __tablename__ = "trip_activities"
    __table_args__ = (
        CheckConstraint(
            "type IN ('activity','dining','flight','hotel','transport')",
            name="ck_trip_activities_type",
        ),
        # Most reads are "give me all activities for trip X on day Y"
        Index("ix_trip_activities_trip_day", "trip_id", "day"),
    )

    id          = Column(Integer, primary_key=True, index=True)
    trip_id     = Column(
        Integer, ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    day         = Column(Integer, nullable=False)           # 1-based day number
    time        = Column(String(5), nullable=True)          # "HH:MM", nullable for all-day items
    type        = Column(String(20), nullable=False, default="activity")
    title       = Column(String(200), nullable=False)
    location    = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    notes       = Column(Text, nullable=True)
    booking_ref = Column(String(100), nullable=True)
    sort_order  = Column(Integer, default=0, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    trip = relationship("Trip", back_populates="activities")

    def __repr__(self):
        return f"<TripActivity id={self.id} day={self.day} title={self.title!r}>"


# ═════════════════════════════════════════════════════════════
# TripExpense
# ═════════════════════════════════════════════════════════════

class TripExpense(Base):
    """
    One row per expense entry.

    Was: trip_metadata.expenses[n]

    NUMERIC(10,2) instead of Float — float arithmetic has rounding
    errors that compound in SUM() queries on money values.
    """
    __tablename__ = "trip_expenses"

    id          = Column(Integer, primary_key=True, index=True)
    trip_id     = Column(
        Integer, ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    category    = Column(String(50), nullable=True)    # "food", "transport", "accommodation" …
    description = Column(String(200), nullable=True)
    amount      = Column(Numeric(10, 2), nullable=False)
    currency    = Column(String(3), default="SGD", nullable=False)
    date        = Column(String(10), nullable=True)    # "YYYY-MM-DD"
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    trip = relationship("Trip", back_populates="expenses")

    def __repr__(self):
        return f"<TripExpense id={self.id} {self.amount} {self.currency}>"


# ═════════════════════════════════════════════════════════════
# TripChecklistItem
# ═════════════════════════════════════════════════════════════

class TripChecklistItem(Base):
    """
    One row per checklist item.

    Was: trip_metadata.checklist[n]
    """
    __tablename__ = "trip_checklist"

    id         = Column(Integer, primary_key=True, index=True)
    trip_id    = Column(
        Integer, ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    text       = Column(String(300), nullable=False)
    is_checked = Column(Boolean, default=False, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    trip = relationship("Trip", back_populates="checklist_items")

    def __repr__(self):
        return f"<TripChecklistItem id={self.id} checked={self.is_checked} text={self.text!r}>"


# ═════════════════════════════════════════════════════════════
# TripSavedTravel
# ═════════════════════════════════════════════════════════════

class TripSavedTravel(Base):
    """
    One row per saved travel suggestion (flight, hotel, or transport).

    Was: trip_metadata.flights[n] / hotels[n] / transport[n]

    The payload shape varies by type so the full AI-returned object
    lives in JSONB. The type column allows filtering without parsing.

    type="flight"    → data = { airline, flight_number, from, to, ... }
    type="hotel"     → data = { name, location, star_rating, ... }
    type="transport" → data = { title, description, estimated_cost, ... }
    """
    __tablename__ = "trip_saved_travel"
    __table_args__ = (
        CheckConstraint(
            "type IN ('flight','hotel','transport')",
            name="ck_trip_saved_travel_type",
        ),
        # Fetch all saved flights for a trip → filtered by trip_id + type
        Index("ix_trip_saved_travel_trip_type", "trip_id", "type"),
    )

    id         = Column(Integer, primary_key=True, index=True)
    trip_id    = Column(
        Integer, ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    type       = Column(String(20), nullable=False)
    data       = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    trip = relationship("Trip", back_populates="saved_travel")

    def __repr__(self):
        return f"<TripSavedTravel id={self.id} type={self.type!r}>"