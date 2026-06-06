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
    # Chat
    ChatRequest, ChatResponse,
    # Overview
    OverviewAlertsResponse, OverviewRecommendationsResponse,
)
from .services.trip_service import TripService
from .routers import auth as auth_router
from .routers import trips as trips_router
from .routers import activities as activities_router
from .routers import expenses as expenses_router
from .routers import checklist as checklist_router
from .routers import waypoints as waypoints_router
from .routers import travel as travel_router
from .limiter import limiter
from slowapi import _rate_limit_exceeded_handler
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
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth_router.router)
app.include_router(trips_router.router)
app.include_router(trips_router.users_router)
app.include_router(activities_router.router)
app.include_router(expenses_router.router)
app.include_router(checklist_router.router)
app.include_router(waypoints_router.router)
app.include_router(travel_router.router)

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