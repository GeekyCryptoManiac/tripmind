from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..media_constants import ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES
from ..models import User
from ..schemas import (
    ActivityCreate, ActivityMediaCreate, ActivityMediaResponse,
    ActivityResponse, ActivityUpdate,
)
from ..services.s3_service import generate_download_url, generate_upload_url
from ..services.trip_service import TripService

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
