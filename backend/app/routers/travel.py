import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import settings
from ..database import get_db
from ..limiter import limiter
from ..models import User
from ..schemas import (
    SavedTravelResponse,
    TravelSaveRequest,
    TravelSuggestRequest,
    TravelSuggestResponse,
)
from ..services.ai_service import AIService
from ..services.trip_service import TripService

router = APIRouter(prefix="/api/trips", tags=["travel"])



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
        prompt      = AIService.build_travel_suggest_prompt(trip, body.type, body.preferences)
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
