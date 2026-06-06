import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User
from ..schemas import TripCreate, TripList, TripResponse, TripUpdate
from ..services.trip_service import TripService

# Routers
router = APIRouter(prefix="/api/trips", tags=["trips"])
users_router = APIRouter(tags=["trips"])

# Upload directory — one level deeper than main.py, so go up 3 levels to reach backend/
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


# ── User trips (prefix-less — path doesn't fit /api/trips) ───

@users_router.get("/api/users/{user_id}/trips", response_model=TripList)
async def get_user_trips(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    svc   = TripService(db)
    trips = svc.get_user_trips(current_user.id)
    return TripList(trips=trips, total=len(trips))


# ── Trips CRUD ────────────────────────────────────────────────

@router.post("", response_model=TripResponse, status_code=201)
async def create_trip(
    data: TripCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).create_trip(current_user.id, data)


@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).get_trip_or_404(trip_id, current_user.id)


@router.put("/{trip_id}", response_model=TripResponse)
async def update_trip(
    trip_id: int,
    updates: TripUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService(db).update_trip(trip_id, current_user.id, updates)


@router.delete("/{trip_id}", status_code=204)
async def delete_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    TripService(db).delete_trip(trip_id, current_user.id)


# ── Trip Photos ───────────────────────────────────────────────

@router.post("/{trip_id}/photo", response_model=TripResponse)
async def upload_trip_photo(
    trip_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload (or replace) a cover photo for a trip. Returns the updated trip."""
    if file.content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are accepted.")

    content = await file.read()
    if len(content) > _MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be under 5 MB.")

    service = TripService(db)
    trip = service.get_trip_or_404(trip_id, current_user.id)

    # Delete old file from disk if one exists
    if trip.cover_image_url:
        old_filename = Path(trip.cover_image_url).name
        old_path = UPLOAD_DIR / old_filename
        if old_path.exists():
            old_path.unlink()

    # Derive a safe extension
    original_ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    ext = original_ext if original_ext in ("jpg", "jpeg", "png", "webp") else "jpg"
    filename = f"trip_{trip_id}_{uuid.uuid4().hex}.{ext}"
    (UPLOAD_DIR / filename).write_bytes(content)

    updated = service.set_cover_image(trip_id, current_user.id, f"/uploads/{filename}")
    return updated


@router.delete("/{trip_id}/photo", response_model=TripResponse)
def delete_trip_photo(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove the cover photo for a trip. Returns the updated trip."""
    service = TripService(db)
    trip = service.get_trip_or_404(trip_id, current_user.id)

    if trip.cover_image_url:
        old_filename = Path(trip.cover_image_url).name
        old_path = UPLOAD_DIR / old_filename
        if old_path.exists():
            old_path.unlink()

    updated = service.set_cover_image(trip_id, current_user.id, None)
    return updated
