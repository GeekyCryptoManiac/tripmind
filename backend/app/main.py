"""
FastAPI Application — Main Entry Point

Auth changes (added for beta):
  - POST /api/auth/register  — create account, returns token pair
  - POST /api/auth/login     — returns token pair
  - POST /api/auth/refresh   — exchange refresh token for new pair
  - GET  /api/auth/me        — current user info

All trip and chat endpoints now require a valid Bearer token.
user_id is derived from the JWT — not accepted from the request body.
"""

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.orm.attributes import flag_modified
from typing import List
from datetime import datetime, timedelta
import uuid
import json

from .database import get_db, engine
from .models import Base, User, Trip
from .schemas import (
    ChatRequest, ChatResponse,
    UserCreate, UserResponse,
    UserRegister, UserLogin, RefreshRequest, TokenResponse,
    TripResponse, TripList, TripUpdate,
    ActivityCreate, ActivityResponse,
    TravelSuggestRequest, TravelSuggestResponse, TravelSaveRequest,
    OverviewAlertsResponse, OverviewRecommendationsResponse,
)
from .auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    verify_refresh_token, get_current_user,
)
from .agents.base_agent import TripMindAgent
from .config import settings

# Create all database tables on startup
try:
    with engine.begin() as conn:
        Base.metadata.create_all(conn)
    print("✅ Database tables ready")
except Exception as e:
    print(f"⚠️ create_all failed: {e}")

app = FastAPI(
    title="TripMind API",
    description="AI-powered travel planning assistant",
    version="1.1.0",
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


# ============= ROOT / HEALTH =============

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "TripMind API",
        "version": "1.1.0",
    }


@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    return {"status": "healthy", "database": db_status}


# ============= AUTH ENDPOINTS =============

@app.post("/api/auth/register", response_model=TokenResponse, status_code=201)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Create a new account. Returns an access + refresh token pair."""
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    print(f"DEBUG: Password length is {len(user_data.password)}")
    print(f"DEBUG: Password value is {user_data.password}")
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=hash_password(user_data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=user,
    )


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Log in with email + password. Returns an access + refresh token pair."""
    user = db.query(User).filter(User.email == credentials.email).first()

    # password_hash is None for old guest rows — reject them at login
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=user,
    )


@app.post("/api/auth/refresh", response_model=TokenResponse)
async def refresh(request: RefreshRequest, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a fresh token pair."""
    user_id = verify_refresh_token(request.refresh_token)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=user,
    )


@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return current_user


# ============= LEGACY USER ENDPOINTS =============
# Kept for backward compatibility. New code should use /api/auth/register.

@app.post("/api/users", response_model=UserResponse, status_code=201)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")
    db_user = User(email=user.email, full_name=user.full_name)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return current_user


# ============= CHAT ENDPOINT =============

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_agent(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # user_id always comes from the verified JWT — ignore any value in the body
    try:
        agent = TripMindAgent(
            db=db,
            user_id=current_user.id,
            trip_id=request.trip_id,
        )
        history_dicts = [m.model_dump() for m in (request.chat_history or [])]
        response = await agent.process_message(
            message=request.message,
            chat_history=history_dicts,
        )
        if not isinstance(response, dict) or "response" not in response:
            raise ValueError("Unexpected agent response format")

        return ChatResponse(
            message=response["response"],
            action_taken=response.get("action_taken", "answered_question"),
            trip_data=response.get("trip_data"),
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return ChatResponse(
            message=f"I encountered an error: {str(e)}",
            action_taken="error",
            trip_data=None,
        )


# ============= TRIP ENDPOINTS =============

@app.get("/api/users/{user_id}/trips", response_model=TripList)
async def get_user_trips(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Only allow fetching your own trips
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    trips = db.query(Trip).filter(Trip.user_id == current_user.id).all()
    return TripList(trips=trips, total=len(trips))


def _get_trip_or_404(trip_id: int, user_id: int, db: Session) -> Trip:
    """Fetch trip, raising 404 if not found and 403 if it belongs to another user."""
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return trip


@app.get("/api/trips/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_trip_or_404(trip_id, current_user.id, db)


@app.put("/api/trips/{trip_id}", response_model=TripResponse)
async def update_trip(
    trip_id: int,
    updates: TripUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = _get_trip_or_404(trip_id, current_user.id, db)

    if updates.destination     is not None: trip.destination     = updates.destination
    if updates.start_date      is not None: trip.start_date      = updates.start_date
    if updates.end_date        is not None: trip.end_date        = updates.end_date
    if updates.duration_days   is not None: trip.duration_days   = updates.duration_days
    if updates.budget          is not None: trip.budget          = updates.budget
    if updates.travelers_count is not None: trip.travelers_count = updates.travelers_count
    if updates.status          is not None: trip.status          = updates.status

    if any(v is not None for v in [updates.notes, updates.checklist, updates.expenses]):
        metadata = dict(trip.trip_metadata) if trip.trip_metadata else {}
        if updates.notes     is not None: metadata["notes"]     = updates.notes
        if updates.checklist is not None: metadata["checklist"] = updates.checklist
        if updates.expenses  is not None: metadata["expenses"]  = updates.expenses
        trip.trip_metadata = metadata
        flag_modified(trip, "trip_metadata")

    trip.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(trip)
    return trip


@app.delete("/api/trips/{trip_id}", status_code=204)
async def delete_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = _get_trip_or_404(trip_id, current_user.id, db)
    db.delete(trip)
    db.commit()
    return None


# ============= ACTIVITY ENDPOINTS =============

def _compute_day_date(trip: Trip, day: int) -> str:
    if trip.start_date:
        try:
            start = datetime.strptime(trip.start_date, "%Y-%m-%d")
            return (start + timedelta(days=day - 1)).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return ""


@app.post("/api/trips/{trip_id}/activities", response_model=TripResponse, status_code=201)
async def add_activity(
    trip_id: int,
    activity: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = _get_trip_or_404(trip_id, current_user.id, db)
    metadata  = dict(trip.trip_metadata) if trip.trip_metadata else {}
    itinerary = list(metadata.get("itinerary", []))

    new_activity = {
        "id":          f"manual_{uuid.uuid4().hex[:12]}",
        "time":        activity.time,
        "type":        activity.type,
        "title":       activity.title,
        "location":    activity.location or "",
        "description": activity.description or "",
        "notes":       activity.notes or "",
        "booking_ref": None,
    }

    day_entry = next((d for d in itinerary if d.get("day") == activity.day), None)
    if day_entry is not None:
        activities = list(day_entry.get("activities", []))
        insert_idx = next(
            (i for i, a in enumerate(activities) if a.get("time", "00:00") > activity.time),
            len(activities),
        )
        activities.insert(insert_idx, new_activity)
        day_entry["activities"] = activities
    else:
        itinerary.append({
            "day":        activity.day,
            "date":       _compute_day_date(trip, activity.day),
            "title":      f"Day {activity.day}",
            "activities": [new_activity],
        })
        itinerary.sort(key=lambda d: d.get("day", 0))

    metadata["itinerary"] = itinerary
    trip.trip_metadata = metadata
    flag_modified(trip, "trip_metadata")
    trip.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(trip)
    return trip


@app.delete("/api/trips/{trip_id}/activities/{activity_id}", response_model=TripResponse)
async def delete_activity(
    trip_id: int,
    activity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = _get_trip_or_404(trip_id, current_user.id, db)
    metadata  = dict(trip.trip_metadata) if trip.trip_metadata else {}
    itinerary = list(metadata.get("itinerary", []))
    found     = False

    updated_itinerary = []
    for day_entry in itinerary:
        original_count = len(day_entry.get("activities", []))
        activities     = [a for a in day_entry.get("activities", []) if a.get("id") != activity_id]
        if len(activities) != original_count:
            found = True
        updated_day = dict(day_entry)
        updated_day["activities"] = activities
        updated_itinerary.append(updated_day)

    if not found:
        raise HTTPException(status_code=404, detail=f"Activity '{activity_id}' not found")

    metadata["itinerary"] = updated_itinerary
    trip.trip_metadata    = metadata
    flag_modified(trip, "trip_metadata")
    trip.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(trip)
    return trip


# ============= TRAVEL AI ENDPOINTS =============

def _build_suggest_prompt(trip: Trip, suggest_type: str, preferences: str | None) -> str:
    dest     = trip.destination
    budget   = f"${trip.budget:,.0f} total" if trip.budget else "not specified"
    dates    = f"{trip.start_date} to {trip.end_date}" if trip.start_date and trip.end_date else "dates not set"
    duration = f"{trip.duration_days} days" if trip.duration_days else "duration not set"
    pax      = trip.travelers_count or 1
    prefs    = f"\nUser preferences: {preferences}" if preferences else ""

    if suggest_type == "flights":
        return f"""You are a travel expert. Generate exactly 3 realistic flight suggestions for the following trip.

Trip details:
- Destination: {dest}
- Dates: {dates}
- Travelers: {pax}
- Budget: {budget}
{prefs}

Return ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{{
  "suggestions": [
    {{
      "airline": "Singapore Airlines",
      "flight_number": "SQ621",
      "from": "SIN",
      "to": "KIX",
      "departure": "08:15",
      "arrival": "14:45",
      "duration": "6h 30m",
      "estimated_price": 420,
      "currency": "USD",
      "cabin": "Economy",
      "notes": "Direct flight, good for early arrival",
      "status": "ai_suggested"
    }}
  ]
}}

Rules:
- estimated_price is per person in USD
- Use real airlines and realistic IATA codes
- Vary the options: different airlines, times, price points
- If origin city is unknown, use SIN (Singapore) as the origin"""

    elif suggest_type == "hotels":
        return f"""You are a travel expert. Generate exactly 3 realistic hotel suggestions for the following trip.

Trip details:
- Destination: {dest}
- Dates: {dates}
- Duration: {duration}
- Travelers: {pax}
- Budget: {budget}
{prefs}

Return ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{{
  "suggestions": [
    {{
      "name": "Hotel Monterey Grasmere Osaka",
      "location": "{dest}",
      "area": "Shinsaibashi",
      "star_rating": 4,
      "price_per_night": 120,
      "currency": "USD",
      "highlights": ["Central location", "Free breakfast", "Pool"],
      "check_in": "15:00",
      "check_out": "11:00",
      "notes": "Great value, walking distance to Dotonbori",
      "status": "ai_suggested"
    }}
  ]
}}

Rules:
- price_per_night is total for all travelers in USD
- Vary options: budget / mid-range / luxury
- Use realistic hotel names and actual neighbourhoods in {dest}"""

    else:  # transport
        return f"""You are a travel expert. Generate exactly 3 local transport suggestions for a trip to {dest}.

Trip details:
- Destination: {dest}
- Duration: {duration}
- Travelers: {pax}
- Budget: {budget}
{prefs}

Return ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{{
  "suggestions": [
    {{
      "type": "train",
      "title": "IC Card (Suica / ICOCA)",
      "description": "Rechargeable transit card for trains, subways and buses throughout Japan",
      "estimated_cost": 30,
      "cost_unit": "per person total",
      "currency": "USD",
      "duration": null,
      "pros": ["Convenient", "Accepted everywhere", "No need to buy individual tickets"],
      "notes": "Top up at any station machine. Also works at convenience stores.",
      "status": "ai_suggested"
    }}
  ]
}}

Rules:
- estimated_cost is in USD
- type must be one of: taxi, train, bus, rental, ferry, other
- Be specific to {dest} — mention real services, apps, or passes"""


@app.post("/api/trips/{trip_id}/travel/suggest", response_model=TravelSuggestResponse)
async def suggest_travel(
    trip_id: int,
    request: TravelSuggestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if request.type not in ("flights", "hotels", "transport"):
        raise HTTPException(status_code=400, detail="type must be flights, hotels, or transport")

    trip = _get_trip_or_404(trip_id, current_user.id, db)

    try:
        from langchain_openai import ChatOpenAI
        from langchain.schema import HumanMessage

        llm = ChatOpenAI(
            model="gpt-4-0125-preview",
            temperature=0.4,
            api_key=settings.OPENAI_API_KEY,
            model_kwargs={"response_format": {"type": "json_object"}},
        )

        prompt       = _build_suggest_prompt(trip, request.type, request.preferences)
        result       = await llm.ainvoke([HumanMessage(content=prompt)])
        raw_json     = json.loads(result.content)
        suggestions  = raw_json.get("suggestions", [])

        for s in suggestions:
            s["id"] = f"ai_{uuid.uuid4().hex[:12]}"

        return TravelSuggestResponse(
            type=request.type,
            flights=suggestions   if request.type == "flights"   else None,
            hotels=suggestions    if request.type == "hotels"    else None,
            transport=suggestions if request.type == "transport" else None,
        )

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail="AI returned malformed JSON. Please try again.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Suggestion failed: {str(e)}")


@app.post("/api/trips/{trip_id}/travel/save", response_model=TripResponse)
async def save_travel_item(
    trip_id: int,
    request: TravelSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if request.type not in ("flights", "hotels", "transport"):
        raise HTTPException(status_code=400, detail="type must be flights, hotels, or transport")

    trip = _get_trip_or_404(trip_id, current_user.id, db)
    metadata = dict(trip.trip_metadata) if trip.trip_metadata else {}
    existing = list(metadata.get(request.type, []))
    existing.append(request.item)
    metadata[request.type] = existing
    trip.trip_metadata = metadata
    flag_modified(trip, "trip_metadata")
    trip.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(trip)
    return trip


# ============= OVERVIEW AI ENDPOINTS =============

@app.post("/api/trips/{trip_id}/overview/alerts", response_model=OverviewAlertsResponse)
async def get_travel_alerts(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip  = _get_trip_or_404(trip_id, current_user.id, db)
    dest  = trip.destination
    dates = f"{trip.start_date} to {trip.end_date}" if trip.start_date and trip.end_date else "dates not set"
    pax   = trip.travelers_count or 1

    prompt = f"""You are a travel advisory expert. Generate exactly 5 travel alerts and advisories for a trip to {dest}.

Trip details:
- Destination: {dest}
- Dates: {dates}
- Travelers: {pax}

Return ONLY a valid JSON object in this exact format:
{{
  "alerts": [
    {{
      "id": "alert_1",
      "category": "visa",
      "severity": "warning",
      "title": "Visa Requirements",
      "description": "Most passport holders require a visa on arrival for stays up to 30 days."
    }}
  ]
}}

Rules:
- category: safety | visa | health | weather | local_laws | general
- severity: info | warning | critical
- Be specific to {dest}, keep descriptions 1-2 sentences"""

    try:
        from langchain_openai import ChatOpenAI
        from langchain.schema import HumanMessage

        llm = ChatOpenAI(
            model="gpt-4-0125-preview",
            temperature=0.3,
            api_key=settings.OPENAI_API_KEY,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
        result   = await llm.ainvoke([HumanMessage(content=prompt)])
        raw_json = json.loads(result.content)
        alerts   = raw_json.get("alerts", [])

        for i, alert in enumerate(alerts):
            if not alert.get("id"):
                alert["id"] = f"alert_{uuid.uuid4().hex[:8]}"

        return OverviewAlertsResponse(alerts=alerts)

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned malformed JSON. Please try again.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Alerts fetch failed: {str(e)}")


@app.post("/api/trips/{trip_id}/overview/recommendations", response_model=OverviewRecommendationsResponse)
async def get_recommendations(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip        = _get_trip_or_404(trip_id, current_user.id, db)
    dest        = trip.destination
    budget      = f"${trip.budget:,.0f} total" if trip.budget else "not specified"
    dates       = f"{trip.start_date} to {trip.end_date}" if trip.start_date and trip.end_date else "dates not set"
    duration    = f"{trip.duration_days} days" if trip.duration_days else "duration not set"
    pax         = trip.travelers_count or 1
    preferences = trip.trip_metadata.get("preferences", []) if trip.trip_metadata else []
    pref_str    = f"\nUser preferences: {', '.join(preferences)}" if preferences else ""

    prompt = f"""You are a knowledgeable travel curator. Generate exactly 6 personalised recommendations for a trip to {dest}.

Trip details:
- Destination: {dest}
- Dates: {dates}
- Duration: {duration}
- Travelers: {pax}
- Budget: {budget}
{pref_str}

Return ONLY a valid JSON object in this exact format:
{{
  "recommendations": [
    {{
      "id": "rec_1",
      "category": "must_see",
      "title": "Old Town Tallinn",
      "description": "A UNESCO World Heritage Site with medieval architecture.",
      "tip": "Go early morning to avoid crowds."
    }}
  ]
}}

Rules:
- category: must_see | food | hidden_gem | practical
- Include at least 1 of each, with 2 must_see and 2 food
- Be specific to {dest}"""

    try:
        from langchain_openai import ChatOpenAI
        from langchain.schema import HumanMessage

        llm = ChatOpenAI(
            model="gpt-4-0125-preview",
            temperature=0.6,
            api_key=settings.OPENAI_API_KEY,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
        result          = await llm.ainvoke([HumanMessage(content=prompt)])
        raw_json        = json.loads(result.content)
        recommendations = raw_json.get("recommendations", [])

        for i, rec in enumerate(recommendations):
            if not rec.get("id"):
                rec["id"] = f"rec_{uuid.uuid4().hex[:8]}"

        return OverviewRecommendationsResponse(recommendations=recommendations)

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned malformed JSON. Please try again.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Recommendations fetch failed: {str(e)}")


# ============= STARTUP =============

@app.on_event("startup")
async def startup_event():
    print("=" * 50)
    print("🚀 TripMind API v1.1 Starting...")
    print(f"🌐 CORS: {settings.FRONTEND_URL}")
    print(f"📝 API Docs: http://localhost:8000/docs")
    print("=" * 50)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)