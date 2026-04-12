"""
Agent Tools
============
All LangChain tool functions used by TripMindAgent.

Key design decisions:
  - All tools are synchronous — LangChain runs them in a thread pool executor
  - generate_itinerary creates its OWN database session (SessionLocal) instead
    of using the one passed in, because the passed session was created in the
    async context and is not thread-safe across thread pool boundaries
  - All other tools use the passed session because they do simple reads/writes
    that don't cross async/thread boundaries in practice
"""

import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from ..models import Trip, User
from ..services.trip_service import TripService
from ..schemas import ActivityCreate, TripUpdate


# ═════════════════════════════════════════════════════════════
# Tool 1 — plan_and_save_trip
# ═════════════════════════════════════════════════════════════

def plan_and_save_trip(
    destination: str,
    user_id: int,
    db: Session,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    duration_days: Optional[int] = None,
    budget: Optional[float] = None,
    travelers_count: int = 1,
    preferences: Optional[List[str]] = None,
    country_code: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Validate, deduplicate, then save a new trip.

    Deduplication: if the user already has a trip to this destination
    created in the last 5 minutes, return that trip instead of creating
    a duplicate.
    """
    # ── Validation ────────────────────────────────────────────
    FICTIONAL = {
        "the moon", "moon", "mars", "space", "hogwarts", "narnia",
        "middle earth", "wakanda", "pandora", "neverland",
    }
    if destination.lower().strip() in FICTIONAL:
        return {
            "error": "invalid_destination",
            "message": (
                f"'{destination}' is not a real travel destination. "
                "Please provide a real city or country."
            ),
        }

    if budget is not None and budget < 0:
        return {
            "error": "invalid_budget",
            "message": "Budget must be a positive number in SGD.",
        }

    # ── Deduplication ─────────────────────────────────────────
    cutoff = datetime.utcnow() - timedelta(minutes=5)
    existing = (
        db.query(Trip)
        .filter(
            Trip.user_id == user_id,
            Trip.destination.ilike(destination),
            Trip.created_at >= cutoff,
        )
        .first()
    )
    if existing:
        svc  = TripService(db)
        trip = svc._get_trip(existing.id)
        return {
            "status":      "existing_trip",
            "trip_id":     trip.id,
            "destination": trip.destination,
            "message":     f"You already have a recent trip to {destination}. Returning that trip.",
            "trip":        _format_trip_for_agent(trip),
        }

    # ── Create ────────────────────────────────────────────────
    trip = Trip(
        user_id=user_id,
        destination=destination,
        start_date=start_date,
        end_date=end_date,
        duration_days=duration_days,
        budget=budget,
        travelers_count=travelers_count or 1,
        status="planning",
        preferences=preferences or [],
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    svc  = TripService(db)
    trip = svc._get_trip(trip.id)

    return {
        "status":          "created",
        "trip_id":         trip.id,
        "destination":     trip.destination,
        "start_date":      trip.start_date,
        "end_date":        trip.end_date,
        "duration_days":   trip.duration_days,
        "budget":          trip.budget,
        "travelers_count": trip.travelers_count,
        "message":         f"Trip to {destination} has been saved successfully!",
        "trip":            _format_trip_for_agent(trip),
    }


# ═════════════════════════════════════════════════════════════
# Tool 2 — get_user_trips
# ═════════════════════════════════════════════════════════════

def get_user_trips(user_id: int, db: Session) -> Dict[str, Any]:
    """Return a summary list of all trips for this user."""
    svc   = TripService(db)
    trips = svc.get_user_trips(user_id)

    if not trips:
        return {
            "status":  "no_trips",
            "message": "You don't have any trips yet. Tell me where you'd like to go!",
            "trips":   [],
        }

    return {
        "status": "found",
        "count":  len(trips),
        "trips": [
            {
                "id":              t.id,
                "destination":     t.destination,
                "start_date":      t.start_date,
                "end_date":        t.end_date,
                "duration_days":   t.duration_days,
                "budget":          t.budget,
                "travelers_count": t.travelers_count,
                "status":          t.status,
                "activity_count":  len(t.activities),
            }
            for t in trips
        ],
    }


# ═════════════════════════════════════════════════════════════
# Tool 3 — get_trip_details
# ═════════════════════════════════════════════════════════════

def get_trip_details(trip_id: int, user_id: int, db: Session) -> Dict[str, Any]:
    """Return full details of a specific trip including itinerary."""
    svc = TripService(db)
    try:
        trip = svc.get_trip_or_404(trip_id, user_id)
    except Exception:
        return {"error": f"Trip {trip_id} not found"}

    return _format_trip_for_agent(trip)


# ═════════════════════════════════════════════════════════════
# Tool 4 — update_trip
# ═════════════════════════════════════════════════════════════

def update_trip(
    trip_id: int,
    user_id: int,
    db: Session,
    destination: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    duration_days: Optional[int] = None,
    budget: Optional[float] = None,
    travelers_count: Optional[int] = None,
    status: Optional[str] = None,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """Update fields on an existing trip."""
    svc     = TripService(db)
    updates = TripUpdate(
        destination=destination,
        start_date=start_date,
        end_date=end_date,
        duration_days=duration_days,
        budget=budget,
        travelers_count=travelers_count,
        status=status,
        notes=notes,
    )

    try:
        trip = svc.update_trip(trip_id, user_id, updates)
    except Exception as e:
        return {"error": str(e)}

    return {
        "status":      "updated",
        "trip_id":     trip.id,
        "destination": trip.destination,
        "message":     f"Trip to {trip.destination} has been updated.",
        "trip":        _format_trip_for_agent(trip),
    }


# ═════════════════════════════════════════════════════════════
# Tool 5 — answer_travel_question
# ═════════════════════════════════════════════════════════════

def answer_travel_question(
    question: str,
    destination: Optional[str] = None,
) -> str:
    """
    Placeholder — the agent answers conversational questions directly
    using its own knowledge. This tool signals that no DB call is needed.
    """
    if destination:
        return (
            f"General travel question about {destination}. "
            "Answer from your own knowledge — no DB call needed."
        )
    return "General travel question. Answer from your own knowledge."


# ═════════════════════════════════════════════════════════════
# Tool 6 — generate_itinerary
# ═════════════════════════════════════════════════════════════

def generate_itinerary(
    trip_id: int,
    user_id: int,
    db: Session,
    preferences: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Generate a day-by-day itinerary and save each activity as a
    TripActivity row via TripService.

    IMPORTANT — thread safety:
      LangChain runs synchronous tool functions in a thread pool executor.
      The `db` session was created in the main async thread and must NOT
      be used across thread boundaries — SQLAlchemy sessions are not
      thread-safe. We create a fresh SessionLocal() owned by this thread
      and close it in the finally block.

    Caps at 5 days per call due to GPT-4 token limits.
    """
    from langchain_openai import ChatOpenAI
    from langchain.schema import HumanMessage
    from ..config import settings
    from ..database import SessionLocal

    # Fresh session — owned by this thread only
    thread_db = SessionLocal()

    try:
        svc = TripService(thread_db)

        try:
            trip = svc.get_trip_or_404(trip_id, user_id)
        except Exception:
            return {"error": f"Trip {trip_id} not found"}

        # ── Determine which days to generate ──────────────────
        trip_duration = trip.duration_days or 3
        days_to_gen   = min(trip_duration, 5)

        generated_days = {a.day for a in trip.activities}
        days_needed    = [
            d for d in range(1, days_to_gen + 1)
            if d not in generated_days
        ]

        if not days_needed:
            return {
                "status":  "already_generated",
                "message": "This trip already has a full itinerary. Ask me to add specific activities if you'd like changes.",
            }

        # ── Build prompt ───────────────────────────────────────
        dest     = trip.destination
        budget   = f"${trip.budget:,.0f} SGD total" if trip.budget else "not specified"
        dates    = f"{trip.start_date} to {trip.end_date}" if trip.start_date and trip.end_date else "not set"
        pax      = trip.travelers_count or 1
        prefs    = ", ".join(preferences or trip.preferences or [])
        pref_str = f"\nPreferences: {prefs}" if prefs else ""

        prompt = f"""You are a travel itinerary expert. Generate a detailed day-by-day itinerary.

Trip details:
- Destination: {dest}
- Dates: {dates}
- Days to generate: {days_needed}
- Travelers: {pax}
- Budget: {budget}
{pref_str}

Return ONLY valid JSON, no markdown or explanation:
{{
  "itinerary": [
    {{
      "day": 1,
      "title": "Arrival & First Impressions",
      "activities": [
        {{
          "time": "14:00",
          "type": "activity",
          "title": "Check in to hotel",
          "location": "Hotel name, district",
          "description": "2-3 sentence description of what to expect.",
          "notes": "Optional practical tip for the traveller."
        }}
      ]
    }}
  ]
}}

Rules:
- Generate exactly these day numbers: {days_needed}
- type must be one of: activity | dining | flight | hotel | transport
- Include 4-6 activities per day
- Times in HH:MM 24-hour format
- Be specific to {dest} — use real place names and actual neighbourhoods"""

        # ── Sync GPT-4 call — safe inside a thread pool ───────
        llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.7,
            api_key=settings.OPENAI_API_KEY,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
        result    = llm.invoke([HumanMessage(content=prompt)])
        raw       = json.loads(result.content)
        itinerary = raw.get("itinerary", [])

        if not itinerary:
            return {"error": "AI returned an empty itinerary. Please try again."}

        # ── Save each activity via TripService ─────────────────
        total_saved = 0
        for day_data in itinerary:
            day_num    = day_data.get("day")
            activities = day_data.get("activities", [])

            for idx, act in enumerate(activities):
                activity_data = ActivityCreate(
                    day=day_num,
                    time=act.get("time"),
                    type=act.get("type", "activity"),
                    title=act.get("title", "Activity"),
                    location=act.get("location"),
                    description=act.get("description"),
                    notes=act.get("notes"),
                    sort_order=idx,
                )
                try:
                    svc.add_activity(trip_id, user_id, activity_data)
                    total_saved += 1
                except Exception as e:
                    print(f"[generate_itinerary] Failed to save activity on day {day_num}: {e}")
                    continue

        # ── Build response ─────────────────────────────────────
        days_generated = len(itinerary)
        is_partial     = trip_duration > 5

        note = (
            f"Note: Your trip is {trip_duration} days but I've generated {days_generated} days "
            f"due to response limits. Ask me to 'generate days 6 to {trip_duration}' for the rest."
            if is_partial
            else f"Complete {days_generated}-day itinerary generated with {total_saved} activities saved."
        )

        return {
            "status":           "generated",
            "trip_id":          trip_id,
            "destination":      dest,
            "days_generated":   days_generated,
            "activities_saved": total_saved,
            "is_partial":       is_partial,
            "message":          note,
        }

    except json.JSONDecodeError as e:
        return {"error": "Failed to parse itinerary from AI", "details": str(e)}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": "Itinerary generation failed", "details": str(e)}
    finally:
        # Always close the thread-local session regardless of outcome
        thread_db.close()


# ═════════════════════════════════════════════════════════════
# Internal helper
# ═════════════════════════════════════════════════════════════

def _format_trip_for_agent(trip: Trip) -> Dict[str, Any]:
    """
    Format a Trip ORM object as a plain dict the agent can read.
    Groups activities by day so the agent can reason about the itinerary.
    """
    days: Dict[int, list] = {}
    for act in sorted(trip.activities, key=lambda a: (a.day, a.sort_order)):
        days.setdefault(act.day, []).append({
            "id":          act.id,
            "time":        act.time,
            "type":        act.type,
            "title":       act.title,
            "location":    act.location,
            "description": act.description,
            "notes":       act.notes,
            "booking_ref": act.booking_ref,
        })

    itinerary = [
        {"day": day, "activities": acts}
        for day, acts in sorted(days.items())
    ]

    return {
        "id":              trip.id,
        "destination":     trip.destination,
        "start_date":      trip.start_date,
        "end_date":        trip.end_date,
        "duration_days":   trip.duration_days,
        "budget":          float(trip.budget) if trip.budget else None,
        "travelers_count": trip.travelers_count,
        "status":          trip.status,
        "notes":           trip.notes,
        "preferences":     trip.preferences,
        "itinerary":       itinerary,
        "expense_count":   len(trip.expenses),
        "checklist_count": len(trip.checklist_items),
        "saved_flights":   len([t for t in trip.saved_travel if t.type == "flight"]),
        "saved_hotels":    len([t for t in trip.saved_travel if t.type == "hotel"]),
        "saved_transport": len([t for t in trip.saved_travel if t.type == "transport"]),
    }