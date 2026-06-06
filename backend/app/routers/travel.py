import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import settings
from ..database import get_db
from ..limiter import limiter
from ..models import Trip, User
from ..schemas import (
    SavedTravelResponse,
    TravelSaveRequest,
    TravelSuggestRequest,
    TravelSuggestResponse,
)
from ..services.trip_service import TripService

router = APIRouter(prefix="/api/trips", tags=["travel"])


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


@router.post("/{trip_id}/travel/suggest", response_model=TravelSuggestResponse)
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


@router.post("/{trip_id}/travel/save", response_model=SavedTravelResponse, status_code=201)
async def save_travel_item(
    trip_id: int,
    data: TravelSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).save_travel_item(trip_id, current_user.id, data)


@router.delete("/{trip_id}/travel/{item_id}", status_code=204)
async def delete_saved_travel(
    trip_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    TripService(db).delete_saved_travel(trip_id, item_id, current_user.id)
