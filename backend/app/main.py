"""
FastAPI Application - Main Entry Point
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
    TripResponse, TripList, TripUpdate,
    ActivityCreate, ActivityResponse,
    TravelSuggestRequest, TravelSuggestResponse, TravelSaveRequest,
    OverviewAlertsResponse, OverviewRecommendationsResponse,
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
    description="AI-powered travel planning assistant with agentic workflows",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============= ROOT ENDPOINTS =============

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "TripMind API",
        "version": "1.0.0",
        "message": "AI Travel Planning Assistant is running!",
    }

@app.get("/ping")
async def ping():
    return {"ping": "pong"}

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    return {"status": "healthy", "database": db_status, "api_version": "1.0.0"}


# ============= USER ENDPOINTS =============

@app.post("/api/users", response_model=UserResponse, status_code=201)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered.")
    db_user = User(email=user.email, full_name=user.full_name)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ============= CHAT ENDPOINT =============

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User {request.user_id} not found")

    try:
        agent = TripMindAgent(db=db, user_id=request.user_id, trip_id=request.trip_id)
        history_dicts = [m.model_dump() for m in request.chat_history]
        response = await agent.process_message(
            message=request.message,
            chat_history=history_dicts,
        )
        if not isinstance(response, dict) or "response" not in response:
            raise ValueError("Unexpected agent response format")
        return ChatResponse(
            message=response["response"],
            action_taken=response.get("action_taken", "answered_question"),
            trip_data=response.get("trip_data", None),
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return ChatResponse(message=f"I encountered an error: {str(e)}", action_taken="error", trip_data=None)


# ============= TRIP ENDPOINTS =============

@app.get("/api/users/{user_id}/trips", response_model=TripList)
async def get_user_trips(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    trips = db.query(Trip).filter(Trip.user_id == user_id).all()
    return TripList(trips=trips, total=len(trips))


@app.get("/api/trips/{trip_id}", response_model=TripResponse)
async def get_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@app.put("/api/trips/{trip_id}", response_model=TripResponse)
async def update_trip(trip_id: int, updates: TripUpdate, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if updates.destination     is not None: trip.destination     = updates.destination
    if updates.start_date      is not None: trip.start_date      = updates.start_date
    if updates.end_date        is not None: trip.end_date        = updates.end_date
    if updates.duration_days   is not None: trip.duration_days   = updates.duration_days
    if updates.budget          is not None: trip.budget          = updates.budget
    if updates.travelers_count is not None: trip.travelers_count = updates.travelers_count
    if updates.status          is not None: trip.status          = updates.status

    if updates.notes is not None or updates.checklist is not None or updates.expenses is not None:
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
async def delete_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
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
async def add_activity(trip_id: int, activity: ActivityCreate, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

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
        activities  = list(day_entry.get("activities", []))
        insert_idx  = next(
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
    trip.trip_metadata    = metadata
    flag_modified(trip, "trip_metadata")
    trip.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(trip)
    return trip


@app.delete("/api/trips/{trip_id}/activities/{activity_id}", response_model=TripResponse)
async def delete_activity(trip_id: int, activity_id: str, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

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
    """
    Build a GPT-4 prompt that returns 3 structured travel suggestions as JSON.
    The prompt adapts based on type (flights / hotels / transport).
    """
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
- Use real airlines and realistic IATA codes for the origin/destination
- Vary the options: different airlines, times, price points
- If origin city is unknown, use the nearest major hub to Singapore (SIN)"""

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
- Use realistic hotel names and actual neighbourhoods in {dest}
- highlights should be 2-4 bullet points"""

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
- Vary options meaningfully (e.g. public transit / private car / day pass)
- Be specific to {dest} — mention real services, apps, or passes where applicable"""


@app.post("/api/trips/{trip_id}/travel/suggest", response_model=TravelSuggestResponse)
async def suggest_travel(
    trip_id: int,
    request: TravelSuggestRequest,
    db: Session = Depends(get_db),
):
    """
    Use GPT-4 to generate 2-3 structured travel suggestions (flights / hotels / transport).

    This is a direct LLM call — not routed through the agent — because we want
    deterministic JSON output, not a conversational response.

    The trip's destination, dates, budget and traveler count are automatically
    injected into the prompt so the user doesn't have to repeat them.
    """
    if request.type not in ("flights", "hotels", "transport"):
        raise HTTPException(status_code=400, detail="type must be flights, hotels, or transport")

    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    try:
        from langchain_openai import ChatOpenAI
        from langchain.schema import HumanMessage

        llm = ChatOpenAI(
            model="gpt-4-0125-preview",
            temperature=0.4,          # lower temp = more consistent JSON
            api_key=settings.OPENAI_API_KEY,
            model_kwargs={"response_format": {"type": "json_object"}},
        )

        prompt  = _build_suggest_prompt(trip, request.type, request.preferences)
        result  = await llm.ainvoke([HumanMessage(content=prompt)])
        raw_json = json.loads(result.content)

        suggestions = raw_json.get("suggestions", [])

        # Stamp a unique ID onto each suggestion so the save endpoint
        # and the frontend can reference individual items
        for s in suggestions:
            s["id"] = f"ai_{uuid.uuid4().hex[:12]}"

        return TravelSuggestResponse(
            type=request.type,
            flights=suggestions   if request.type == "flights"   else None,
            hotels=suggestions    if request.type == "hotels"    else None,
            transport=suggestions if request.type == "transport" else None,
        )

    except json.JSONDecodeError as e:
        print(f"[Travel Suggest] JSON parse error: {e}")
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
):
    """
    Save a single AI-suggested travel item to trip_metadata.

    Appends the item to:
      - trip_metadata.flights[]   if type == "flights"
      - trip_metadata.hotels[]    if type == "hotels"
      - trip_metadata.transport[] if type == "transport"

    Returns the full updated Trip.
    """
    if request.type not in ("flights", "hotels", "transport"):
        raise HTTPException(status_code=400, detail="type must be flights, hotels, or transport")

    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    metadata = dict(trip.trip_metadata) if trip.trip_metadata else {}
    key      = request.type  # "flights" | "hotels" | "transport"

    existing = list(metadata.get(key, []))
    existing.append(request.item)
    metadata[key] = existing

    trip.trip_metadata = metadata
    flag_modified(trip, "trip_metadata")
    trip.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(trip)
    return trip

# ============= OVERVIEW AI ENDPOINTS =============

@app.post("/api/trips/{trip_id}/overview/alerts", response_model=OverviewAlertsResponse)
async def get_travel_alerts(trip_id: int, db: Session = Depends(get_db)):
    """
    Use GPT-4 to generate realistic travel advisory content for the trip destination.
    Direct JSON-mode call — not routed through the agent.
    Results are not persisted; frontend caches in sessionStorage.
    """
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    dest     = trip.destination
    dates    = f"{trip.start_date} to {trip.end_date}" if trip.start_date and trip.end_date else "dates not set"
    pax      = trip.travelers_count or 1

    prompt = f"""You are a travel advisory expert. Generate exactly 5 travel alerts and advisories for a trip to {dest}.

Trip details:
- Destination: {dest}
- Dates: {dates}
- Travelers: {pax}

Return ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{{
  "alerts": [
    {{
      "id": "alert_1",
      "category": "visa",
      "severity": "warning",
      "title": "Visa Requirements",
      "description": "Most passport holders require a visa on arrival for stays up to 30 days. Apply online at least 72 hours before travel."
    }}
  ]
}}

Rules:
- category must be one of: safety, visa, health, weather, local_laws, general
- severity must be one of: info, warning, critical
- Include a mix of categories relevant to {dest}
- Keep descriptions concise (1-2 sentences), factual, and practically useful
- Be specific to {dest} — mention real requirements, seasonal conditions, or local regulations
- Use 'critical' sparingly (only for genuine safety or legal issues)"""

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

        # Ensure stable IDs
        for i, alert in enumerate(alerts):
            if not alert.get("id"):
                alert["id"] = f"alert_{uuid.uuid4().hex[:8]}"

        return OverviewAlertsResponse(alerts=alerts)

    except json.JSONDecodeError as e:
        print(f"[Overview Alerts] JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="AI returned malformed JSON. Please try again.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Alerts fetch failed: {str(e)}")


@app.post("/api/trips/{trip_id}/overview/recommendations", response_model=OverviewRecommendationsResponse)
async def get_recommendations(trip_id: int, db: Session = Depends(get_db)):
    """
    Use GPT-4 to generate personalized activity recommendations for the trip.
    Context-aware: uses destination, dates, budget, traveler count and preferences.
    Direct JSON-mode call — not routed through the agent.
    """
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    dest        = trip.destination
    budget      = f"${trip.budget:,.0f} total" if trip.budget else "not specified"
    dates       = f"{trip.start_date} to {trip.end_date}" if trip.start_date and trip.end_date else "dates not set"
    duration    = f"{trip.duration_days} days" if trip.duration_days else "duration not set"
    pax         = trip.travelers_count or 1
    preferences = trip.trip_metadata.get("preferences", []) if trip.trip_metadata else []
    pref_str    = f"\nUser preferences: {', '.join(preferences)}" if preferences else ""

    prompt = f"""You are a knowledgeable travel curator. Generate exactly 6 personalized recommendations for a trip to {dest}.

Trip details:
- Destination: {dest}
- Dates: {dates}
- Duration: {duration}
- Travelers: {pax}
- Budget: {budget}
{pref_str}

Return ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{{
  "recommendations": [
    {{
      "id": "rec_1",
      "category": "must_see",
      "title": "Old Town Tallinn",
      "description": "A UNESCO World Heritage Site with remarkably preserved medieval architecture. The limestone towers and cobbled streets are best explored on foot.",
      "tip": "Go early morning (before 9am) to enjoy the squares without crowds."
    }}
  ]
}}

Rules:
- category must be one of: must_see, food, hidden_gem, practical
- Include at least 1 of each category, with 2 must_see and 2 food entries
- Be specific to {dest} — use real place names, neighbourhoods, dishes, or services
- tip should be a single actionable sentence (optional but preferred)
- Tailor suggestions to the budget and traveler count where relevant
- descriptions should be 2-3 sentences, vivid but concise"""

    try:
        from langchain_openai import ChatOpenAI
        from langchain.schema import HumanMessage

        llm = ChatOpenAI(
            model="gpt-4-0125-preview",
            temperature=0.6,          # slightly higher for more varied recommendations
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

    except json.JSONDecodeError as e:
        print(f"[Overview Recommendations] JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="AI returned malformed JSON. Please try again.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Recommendations fetch failed: {str(e)}")


# ============= STARTUP EVENT =============

@app.on_event("startup")
async def startup_event():
    print("=" * 50)
    print("🚀 TripMind API Starting...")
    print("=" * 50)
    print(f"📊 Database: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'Connected'}")
    print(f"🤖 AI Model: GPT-4 Turbo")
    print(f"🌐 CORS: {settings.FRONTEND_URL}")
    print(f"📝 API Docs: http://localhost:8000/docs")
    print("=" * 50)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")