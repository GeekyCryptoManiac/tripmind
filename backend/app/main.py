"""
FastAPI Application — Main Entry Point
=======================================

Route handlers are intentionally thin — each one:
  1. Extracts validated inputs (path params, body, current_user from JWT)
  2. Calls TripService
  3. Returns the result

All business logic and DB operations live in TripService.
All AI prompt logic lives in the helper functions below (travel suggest, overview).
"""

import json
import uuid
import os
from datetime import datetime
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

# ── Upload directory (backend/uploads/) ───────────────────────
UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

from .auth import get_current_user
from .config import settings
from .database import get_db
from .models import User, Trip
from .schemas import (
    # User
    UserCreate, UserResponse,
    # Waypoints
    WaypointCreate, WaypointUpdate, WaypointResponse,
    # Activity
    ActivityCreate, ActivityUpdate, ActivityResponse,
    # Expense
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    # Checklist
    ChecklistItemCreate, ChecklistItemUpdate, ChecklistItemResponse,
    # Travel
    TravelSuggestRequest, TravelSuggestResponse,
    TravelSaveRequest, SavedTravelResponse,
    # Chat
    ChatRequest, ChatResponse,
    # Overview
    OverviewAlertsResponse, OverviewRecommendationsResponse,
)
from .services.trip_service import TripService
from .routers import auth as auth_router
from .routers import trips as trips_router
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ── App setup ─────────────────────────────────────────────────

app = FastAPI(
    
    title="TripMind API",
    description="AI-powered travel planning assistant",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth_router.router)
app.include_router(trips_router.router)
app.include_router(trips_router.users_router)

# Serve uploaded trip photos at /uploads/<filename>
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# ═════════════════════════════════════════════════════════════
# Health
# ═════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {"status": "online", "service": "TripMind API", "version": "2.0.0"}


@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {e}"
    return {"status": "healthy", "database": db_status}


# ═════════════════════════════════════════════════════════════
# Chat
# ═════════════════════════════════════════════════════════════

@app.post("/api/chat", response_model=ChatResponse)
@limiter.limit("10/minute")
async def chat(
    request: Request,
    data: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        from .agents.base_agent import TripMindAgent

        agent = TripMindAgent(db=db, user_id=current_user.id, trip_id=data.trip_id)
        history = [m.model_dump() for m in (data.chat_history or [])]
        response = await agent.process_message(
            message=data.message,
            chat_history=history,
        )
        return ChatResponse(
            message=response["response"],
            action_taken=response.get("action_taken", "answered_question"),
            trip_data=response.get("trip_data"),
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return ChatResponse(
            message=f"I encountered an error: {e}",
            action_taken="error",
            trip_data=None,
        )


# ═════════════════════════════════════════════════════════════
# Activities
# ═════════════════════════════════════════════════════════════

@app.post("/api/trips/{trip_id}/activities", response_model=ActivityResponse, status_code=201)
async def add_activity(
    trip_id: int,
    data: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).add_activity(trip_id, current_user.id, data)


@app.patch("/api/trips/{trip_id}/activities/{activity_id}", response_model=ActivityResponse)
async def update_activity(
    trip_id: int,
    activity_id: int,
    data: ActivityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).update_activity(trip_id, activity_id, current_user.id, data)


@app.delete("/api/trips/{trip_id}/activities/{activity_id}", status_code=204)
async def delete_activity(
    trip_id: int,
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    TripService(db).delete_activity(trip_id, activity_id, current_user.id)


@app.delete("/api/trips/{trip_id}/activities", status_code=200)
async def clear_all_activities(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete all activities for a trip (used by Regenerate Itinerary)."""
    deleted = TripService(db).delete_all_activities(trip_id, current_user.id)
    return {"deleted": deleted}


# ═════════════════════════════════════════════════════════════
# Expenses
# ═════════════════════════════════════════════════════════════

@app.post("/api/trips/{trip_id}/expenses", response_model=ExpenseResponse, status_code=201)
async def add_expense(
    trip_id: int,
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).add_expense(trip_id, current_user.id, data)


@app.patch("/api/trips/{trip_id}/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    trip_id: int,
    expense_id: int,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).update_expense(trip_id, expense_id, current_user.id, data)


@app.delete("/api/trips/{trip_id}/expenses/{expense_id}", status_code=204)
async def delete_expense(
    trip_id: int,
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    TripService(db).delete_expense(trip_id, expense_id, current_user.id)


# ═════════════════════════════════════════════════════════════
# Checklist
# ═════════════════════════════════════════════════════════════

@app.post("/api/trips/{trip_id}/checklist", response_model=ChecklistItemResponse, status_code=201)
async def add_checklist_item(
    trip_id: int,
    data: ChecklistItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).add_checklist_item(trip_id, current_user.id, data)


@app.patch("/api/trips/{trip_id}/checklist/{item_id}", response_model=ChecklistItemResponse)
async def update_checklist_item(
    trip_id: int,
    item_id: int,
    data: ChecklistItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).update_checklist_item(trip_id, item_id, current_user.id, data)


@app.delete("/api/trips/{trip_id}/checklist/{item_id}", status_code=204)
async def delete_checklist_item(
    trip_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    TripService(db).delete_checklist_item(trip_id, item_id, current_user.id)


# ═════════════════════════════════════════════════════════════
# Saved Travel
# ═════════════════════════════════════════════════════════════

@app.post("/api/trips/{trip_id}/travel/save", response_model=SavedTravelResponse, status_code=201)
async def save_travel_item(
    trip_id: int,
    data: TravelSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).save_travel_item(trip_id, current_user.id, data)


@app.delete("/api/trips/{trip_id}/travel/{item_id}", status_code=204)
async def delete_saved_travel(
    trip_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    TripService(db).delete_saved_travel(trip_id, item_id, current_user.id)


# ═════════════════════════════════════════════════════════════
# Waypoints
# ═════════════════════════════════════════════════════════════

@app.post("/api/trips/{trip_id}/waypoints", response_model=WaypointResponse, status_code=201)
async def add_waypoint(
    trip_id: int,
    data: WaypointCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).add_waypoint(trip_id, current_user.id, data)


@app.patch("/api/trips/{trip_id}/waypoints/{waypoint_id}", response_model=WaypointResponse)
async def update_waypoint(
    trip_id: int,
    waypoint_id: int,
    data: WaypointUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).update_waypoint(trip_id, waypoint_id, current_user.id, data)


@app.delete("/api/trips/{trip_id}/waypoints/{waypoint_id}", status_code=204)
async def delete_waypoint(
    trip_id: int,
    waypoint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    TripService(db).delete_waypoint(trip_id, waypoint_id, current_user.id)


# ═════════════════════════════════════════════════════════════
# Travel AI Suggestions  (not persisted — GPT-4 direct calls)
# ═════════════════════════════════════════════════════════════

def _build_suggest_prompt(trip: Trip, suggest_type: str, preferences: str | None) -> str:
    dest     = trip.destination
    origin   = getattr(trip, "origin", "Singapore")
    budget   = f"${trip.budget:,.0f} total" if trip.budget else "not specified"
    dates    = f"{trip.start_date} to {trip.end_date}" if trip.start_date and trip.end_date else "not set"
    duration = f"{trip.duration_days} days" if trip.duration_days else "not set"
    pax      = trip.travelers_count or 1
    prefs    = f"\nUser preferences: {preferences}" if preferences else ""

    # waypoints now includes origin (index 0) and destination (last) — just join them all
    wps = sorted(getattr(trip, "waypoints", None) or [], key=lambda w: w.order_index)
    route = " → ".join(w.city for w in wps) if wps else f"{origin} → {dest}"

    if suggest_type == "flight":
        return f"""You are a travel expert. Generate exactly 3 realistic flight suggestions.

Trip: {route} | Dates: {dates} | Travelers: {pax} | Budget: {budget}{prefs}

Return ONLY valid JSON, no markdown:
{{
  "suggestions": [
    {{
      "airline": "Singapore Airlines", "flight_number": "SQ621",
      "from": "SIN", "to": "KIX",
      "departure": "08:15", "arrival": "14:45", "duration": "6h 30m",
      "estimated_price": 420, "currency": "USD", "cabin": "Economy",
      "notes": "Direct flight", "status": "ai_suggested"
    }}
  ]
}}
Rules: estimated_price is per person USD. Use real airlines. Vary price points."""

    elif suggest_type == "hotel":
        city_list = ", ".join(w.city for w in wps) if wps else dest
        return f"""You are a travel expert. Generate exactly 3 realistic hotel suggestions spread across all stops.

Trip: {route} | Stops: {city_list} | Dates: {dates} | Duration: {duration} | Travelers: {pax} | Budget: {budget}{prefs}

Spread the 3 suggestions across all stop cities — at least 1 hotel per city if possible. Each suggestion must specify the city it belongs to.

Return ONLY valid JSON, no markdown:
{{
  "suggestions": [
    {{
      "name": "Hotel Name", "location": "City Name", "area": "District Name",
      "star_rating": 4, "price_per_night": 120, "currency": "USD",
      "highlights": ["Central location", "Free breakfast"],
      "check_in": "15:00", "check_out": "11:00",
      "notes": "Short description", "status": "ai_suggested"
    }}
  ]
}}
Rules: price_per_night is total for all travelers USD. Vary budget/mid/luxury. Cover all stop cities."""

    else:  # transport
        return f"""You are a travel expert. Generate exactly 3 local transport options for {dest}.

Trip: {dest} | Duration: {duration} | Travelers: {pax} | Budget: {budget}{prefs}

Return ONLY valid JSON, no markdown:
{{
  "suggestions": [
    {{
      "type": "train", "title": "IC Card (Suica)",
      "description": "Rechargeable transit card for all trains and buses",
      "estimated_cost": 30, "cost_unit": "per person total", "currency": "USD",
      "pros": ["Convenient", "Accepted everywhere"],
      "notes": "Top up at any station", "status": "ai_suggested"
    }}
  ]
}}
Rules: type must be: taxi | train | bus | rental | ferry | other. Be specific to {dest}."""


@app.post("/api/trips/{trip_id}/travel/suggest", response_model=TravelSuggestResponse)
@limiter.limit("10/minute")
async def suggest_travel(
    request: Request,
    trip_id: int,
    body: TravelSuggestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc  = TripService(db)
    trip = svc.get_trip_or_404(trip_id, current_user.id)

    try:
        from langchain_openai import ChatOpenAI
        from langchain.schema import HumanMessage

        llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.4,
            api_key=settings.OPENAI_API_KEY,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
        prompt      = _build_suggest_prompt(trip, body.type, body.preferences)
        result      = await llm.ainvoke([HumanMessage(content=prompt)])
        raw         = json.loads(result.content)
        suggestions = raw.get("suggestions", [])

        for s in suggestions:
            s["id"] = f"ai_{uuid.uuid4().hex[:12]}"

        return TravelSuggestResponse(
            type=body.type,
            flights=suggestions   if body.type == "flight"    else None,
            hotels=suggestions    if body.type == "hotel"     else None,
            transport=suggestions if body.type == "transport" else None,
        )
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned malformed JSON. Please try again.")
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Suggestion failed: {e}")


# ═════════════════════════════════════════════════════════════
# Overview AI  (alerts + recommendations — cached on Trip row)
# ═════════════════════════════════════════════════════════════

@app.post("/api/trips/{trip_id}/overview/alerts", response_model=OverviewAlertsResponse)
@limiter.limit("10/minute")
async def get_travel_alerts(
    request: Request,
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc  = TripService(db)
    trip = svc.get_trip_or_404(trip_id, current_user.id)

    dest  = trip.destination
    dates = f"{trip.start_date} to {trip.end_date}" if trip.start_date and trip.end_date else "not set"
    pax   = trip.travelers_count or 1

    prompt = f"""You are a travel advisory expert. Generate exactly 5 travel alerts for a trip to {dest}.

Trip: {dest} | Dates: {dates} | Travelers: {pax}

Return ONLY valid JSON, no markdown:
{{
  "alerts": [
    {{
      "id": "alert_1",
      "category": "visa",
      "severity": "warning",
      "title": "Visa Requirements",
      "description": "1-2 sentence specific advisory for {dest}."
    }}
  ]
}}
Rules: category: safety|visa|health|weather|local_laws|general  severity: info|warning|critical"""

    try:
        from langchain_openai import ChatOpenAI
        from langchain.schema import HumanMessage

        llm    = ChatOpenAI(model="gpt-4o", temperature=0.3, api_key=settings.OPENAI_API_KEY,
                            model_kwargs={"response_format": {"type": "json_object"}})
        result = await llm.ainvoke([HumanMessage(content=prompt)])
        alerts = json.loads(result.content).get("alerts", [])

        for i, a in enumerate(alerts):
            if not a.get("id"):
                a["id"] = f"alert_{uuid.uuid4().hex[:8]}"

        # Persist to DB so we don't regenerate on every page load
        trip.ai_alerts = alerts
        trip.updated_at = datetime.utcnow()
        db.commit()

        return OverviewAlertsResponse(alerts=alerts)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned malformed JSON. Please try again.")
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Alerts failed: {e}")


@app.post("/api/trips/{trip_id}/overview/recommendations", response_model=OverviewRecommendationsResponse)
@limiter.limit("10/minute")
async def get_recommendations(
    request: Request,
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc  = TripService(db)
    trip = svc.get_trip_or_404(trip_id, current_user.id)

    dest     = trip.destination
    budget   = f"${trip.budget:,.0f}" if trip.budget else "not specified"
    dates    = f"{trip.start_date} to {trip.end_date}" if trip.start_date and trip.end_date else "not set"
    duration = f"{trip.duration_days} days" if trip.duration_days else "not set"
    pax      = trip.travelers_count or 1
    prefs    = ", ".join(trip.preferences) if trip.preferences else ""
    pref_str = f"\nPreferences: {prefs}" if prefs else ""

    prompt = f"""You are a travel curator. Generate exactly 6 personalised recommendations for {dest}.

Trip: {dest} | Dates: {dates} | Duration: {duration} | Travelers: {pax} | Budget: {budget}{pref_str}

Return ONLY valid JSON, no markdown:
{{
  "recommendations": [
    {{
      "id": "rec_1",
      "category": "must_see",
      "title": "Place or experience name",
      "description": "1-2 sentences specific to {dest}.",
      "tip": "Practical insider tip."
    }}
  ]
}}
Rules: category: must_see|food|hidden_gem|practical. Include 2 must_see, 2 food, 1 hidden_gem, 1 practical."""

    try:
        from langchain_openai import ChatOpenAI
        from langchain.schema import HumanMessage

        llm   = ChatOpenAI(model="gpt-4o", temperature=0.6, api_key=settings.OPENAI_API_KEY,
                           model_kwargs={"response_format": {"type": "json_object"}})
        result = await llm.ainvoke([HumanMessage(content=prompt)])
        recs   = json.loads(result.content).get("recommendations", [])

        for i, r in enumerate(recs):
            if not r.get("id"):
                r["id"] = f"rec_{uuid.uuid4().hex[:8]}"

        trip.ai_recommendations = recs
        trip.updated_at = datetime.utcnow()
        db.commit()

        return OverviewRecommendationsResponse(recommendations=recs)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned malformed JSON. Please try again.")
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Recommendations failed: {e}")


# ═════════════════════════════════════════════════════════════
# Startup
# ═════════════════════════════════════════════════════════════

@app.on_event("startup")
async def startup_event():
    print("=" * 50)
    print("🚀 TripMind API v2.1 starting")
    print(f"   CORS origin: {settings.FRONTEND_URL}")
    print(f"   Docs: http://localhost:8000/docs")
    print("=" * 50)