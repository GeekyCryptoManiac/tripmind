import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import settings
from ..database import get_db
from ..limiter import limiter
from ..models import User
from ..schemas import OverviewAlertsResponse, OverviewRecommendationsResponse
from ..services.ai_service import AIService
from ..services.trip_service import TripService

router = APIRouter(prefix="/api/trips", tags=["overview"])


@router.post("/{trip_id}/overview/alerts", response_model=OverviewAlertsResponse)
@limiter.limit("10/minute")
async def get_travel_alerts(
    request: Request,
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc  = TripService(db)
    trip = svc.get_trip_or_404(trip_id, current_user.id)

    prompt = AIService.build_alerts_prompt(trip)

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

        svc.save_ai_alerts(trip_id, current_user.id, alerts)

        return OverviewAlertsResponse(alerts=alerts)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned malformed JSON. Please try again.")
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Alerts failed: {e}")


@router.post("/{trip_id}/overview/recommendations", response_model=OverviewRecommendationsResponse)
@limiter.limit("10/minute")
async def get_recommendations(
    request: Request,
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc  = TripService(db)
    trip = svc.get_trip_or_404(trip_id, current_user.id)

    prompt = AIService.build_recommendations_prompt(trip)

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

        svc.save_ai_recommendations(trip_id, current_user.id, recs)

        return OverviewRecommendationsResponse(recommendations=recs)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned malformed JSON. Please try again.")
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Recommendations failed: {e}")
