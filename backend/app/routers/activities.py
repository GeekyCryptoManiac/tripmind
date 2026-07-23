import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import settings
from ..database import get_db
from ..limiter import limiter
from ..media_constants import ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES
from ..models import User
from ..schemas import (
    ActivityCreate, ActivityMediaCreate, ActivityMediaResponse,
    ActivityResponse, ActivityUpdate, ActivityWeatherResponse,
)
from ..services.ai_service import AIService
from ..services.s3_service import generate_download_url, generate_upload_url
from ..services.trip_service import TripService
from ..services.weather_service import fetch_weather_for_activity

router = APIRouter(prefix="/api/trips", tags=["activities"])


@router.post("/{trip_id}/activities", response_model=ActivityResponse, status_code=201)
async def add_activity(
    trip_id: int,
    data: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).add_activity(trip_id, current_user.id, data)


@router.get("/{trip_id}/activities/{activity_id}/media/upload-url")
async def get_media_upload_url(
    trip_id: int,
    activity_id: int,
    filename: str = Query(...),
    content_type: str = Query(...),
    content_length: int = Query(..., gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # No media_type param exists on this endpoint today — the only live
    # frontend caller always uploads photos (ActivityDetailPage's "Add doc"
    # button isn't wired up yet), so the image allowlist applies unconditionally.
    # A document allowlist (e.g. PDF) should be added alongside media_type
    # once document upload is actually implemented.
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are accepted.")
    if content_length > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="File must be under 5 MB.")

    TripService(db).get_activity_or_404(trip_id, activity_id, current_user.id)
    upload_url, s3_key = generate_upload_url(activity_id, filename, content_type, content_length)
    return {"upload_url": upload_url, "s3_key": s3_key}


@router.get("/{trip_id}/activities/{activity_id}", response_model=ActivityResponse)
async def get_activity(
    trip_id: int,
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = TripService(db).get_activity_or_404(trip_id, activity_id, current_user.id)
    response = ActivityResponse.model_validate(activity)
    for media in response.media:
        media.presigned_url = generate_download_url(media.storage_url)
    return response


@router.patch("/{trip_id}/activities/{activity_id}", response_model=ActivityResponse)
async def update_activity(
    trip_id: int,
    activity_id: int,
    data: ActivityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).update_activity(trip_id, activity_id, current_user.id, data)


@router.post("/{trip_id}/activities/{activity_id}/checkin", response_model=ActivityResponse)
async def checkin_activity(
    trip_id: int,
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).checkin_activity(trip_id, activity_id, current_user.id)


@router.post(
    "/{trip_id}/activities/{activity_id}/media",
    response_model=ActivityMediaResponse,
    status_code=201,
)
async def add_activity_media(
    trip_id: int,
    activity_id: int,
    data: ActivityMediaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).add_activity_media(trip_id, activity_id, current_user.id, data)


@router.delete("/{trip_id}/activities/{activity_id}/media/{media_id}", status_code=204)
async def delete_activity_media(
    trip_id: int,
    activity_id: int,
    media_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    TripService(db).delete_activity_media(trip_id, activity_id, media_id, current_user.id)


@router.delete("/{trip_id}/activities/{activity_id}", status_code=204)
async def delete_activity(
    trip_id: int,
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    TripService(db).delete_activity(trip_id, activity_id, current_user.id)


@router.delete("/{trip_id}/activities", status_code=204)
async def clear_all_activities(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete all activities for a trip (used by Regenerate Itinerary)."""
    TripService(db).delete_all_activities(trip_id, current_user.id)
    return Response(status_code=204)


@router.post("/{trip_id}/activities/{activity_id}/weather", response_model=ActivityWeatherResponse)
@limiter.limit("10/minute")
async def get_activity_weather(
    request: Request,
    trip_id: int,
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Persist-once weather lookup for a single activity — geocodes
    activity.location, picks Open-Meteo's forecast or archive endpoint
    based on how far the activity's date is from today, and caches the
    result to weather_data. Never re-fetches once cached.
    """
    svc = TripService(db)
    activity = svc.get_activity_or_404(trip_id, activity_id, current_user.id)

    if activity.weather_data:
        return ActivityWeatherResponse(status="cached", weather=activity.weather_data)

    if not activity.location:
        return ActivityWeatherResponse(status="not_applicable", weather=None)

    trip = svc.get_trip_or_404(trip_id, current_user.id)
    status, weather = await fetch_weather_for_activity(
        trip.start_date, activity.day, activity.location,
    )

    if status == "not_available":
        return ActivityWeatherResponse(status="not_available", weather=None)

    activity.weather_data = weather
    db.commit()

    return ActivityWeatherResponse(status="fetched", weather=weather)


@router.post("/{trip_id}/activities/day/{day}/tips", response_model=list[ActivityResponse])
@limiter.limit("10/minute")
async def generate_activity_tips(
    request: Request,
    trip_id: int,
    day: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate one AI tip per activity for a single trip day, one prompt for
    the whole day (not one call per activity) — per the design documented
    in docs/KNOWN_ISSUES.md.

    Persist-once: activities that already have an ai_tip are never re-sent
    to the LLM. If every activity on the day already has a tip, this
    returns immediately with no LLM call at all.
    """
    svc = TripService(db)
    svc.get_trip_or_404(trip_id, current_user.id)

    activities = svc.get_activities_for_day(trip_id, day)
    needing_tips = [a for a in activities if a.ai_tip is None]

    if not needing_tips:
        return activities

    prompt = AIService.build_activity_tips_prompt(needing_tips)

    try:
        from langchain_openai import ChatOpenAI
        from langchain.schema import HumanMessage

        llm = ChatOpenAI(
            model="gpt-4o", temperature=0.5, api_key=settings.OPENAI_API_KEY,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
        result = await llm.ainvoke([HumanMessage(content=prompt)])
        tips = json.loads(result.content).get("tips", {})

        for activity in needing_tips:
            tip = tips.get(str(activity.id))
            if tip:
                activity.ai_tip = tip

        db.commit()

        return activities
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned malformed JSON. Please try again.")
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Tip generation failed: {e}")
