#!/usr/bin/env python3
"""
Verification: agent-created trips now seed waypoints via TripService.

Run from the backend/ directory:
    python verify_waypoint_fix.py

What this checks:
  - TripService.create_trip() seeds exactly 2 TripWaypoint rows
  - waypoints[0]: order_index=0, city=origin ("Singapore")
  - waypoints[1]: order_index=1, city=destination ("Tokyo")
"""
import os
import sys

# ── Path setup ────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))

# Required settings — set dummies before app.config is imported
os.environ.setdefault("DATABASE_URL",   "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY",     "test-secret-key-for-verify")
os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("FRONTEND_URL",   "http://localhost:5173")

# ── SQLite compatibility: JSONB → JSON ────────────────────────
# Must happen BEFORE app.models is imported so the `from ... import JSONB`
# inside models.py picks up the JSON type instead of the PostgreSQL-only JSONB.
from sqlalchemy.dialects import postgresql as _pg
from sqlalchemy.types import JSON as _JSON
_pg.JSONB = _JSON

# ── App imports (after patches) ───────────────────────────────
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, User, TripWaypoint
from app.services.trip_service import TripService
from app.schemas import TripCreate

# ── In-memory SQLite database ─────────────────────────────────
engine = create_engine("sqlite:///:memory:", echo=False)
Base.metadata.create_all(engine)
TestSession = sessionmaker(bind=engine)
db = TestSession()

try:
    # ── Seed a test user (FK required by trips table) ─────────
    user = User(email="verify@tripmind.test", full_name="Verify Script")
    db.add(user)
    db.commit()
    db.refresh(user)

    # ── Call TripService.create_trip() — same path the fixed
    #    plan_and_save_trip() now takes ──────────────────────────
    svc       = TripService(db)
    trip_data = TripCreate(
        destination="Tokyo",
        origin="Singapore",
        country_code="JP",
        start_date="2025-03-01",
        end_date="2025-03-07",
        duration_days=7,
        budget=3000.0,
        travelers_count=2,
        preferences=["culture", "food"],
    )
    trip = svc.create_trip(user.id, trip_data)

    # ── Query waypoints directly ──────────────────────────────
    waypoints = (
        db.query(TripWaypoint)
        .filter(TripWaypoint.trip_id == trip.id)
        .order_by(TripWaypoint.order_index)
        .all()
    )

    # ── Assertions ────────────────────────────────────────────
    failures = []

    if len(waypoints) != 2:
        failures.append(
            f"  expected 2 waypoints, got {len(waypoints)}"
        )
    else:
        origin_wp = waypoints[0]
        dest_wp   = waypoints[1]

        if origin_wp.order_index != 0:
            failures.append(
                f"  waypoints[0].order_index={origin_wp.order_index}, want 0"
            )
        if origin_wp.city != "Singapore":
            failures.append(
                f"  waypoints[0].city={origin_wp.city!r}, want 'Singapore'"
            )
        if dest_wp.order_index != 1:
            failures.append(
                f"  waypoints[1].order_index={dest_wp.order_index}, want 1"
            )
        if dest_wp.city != "Tokyo":
            failures.append(
                f"  waypoints[1].city={dest_wp.city!r}, want 'Tokyo'"
            )

    # ── Result ────────────────────────────────────────────────
    if failures:
        print("FAIL")
        for msg in failures:
            print(msg)
        sys.exit(1)
    else:
        print("PASS — TripService.create_trip() seeds 2 waypoints correctly")
        print(f"  trip_id      : {trip.id}")
        print(f"  waypoints[0] : city={waypoints[0].city!r}, order_index={waypoints[0].order_index}")
        print(f"  waypoints[1] : city={waypoints[1].city!r}, order_index={waypoints[1].order_index}")

except Exception as exc:
    import traceback
    traceback.print_exc()
    print(f"\nFAIL — unexpected exception: {type(exc).__name__}: {exc}")
    sys.exit(1)
finally:
    db.close()
