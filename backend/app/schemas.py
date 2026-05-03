"""
Pydantic Schemas — Normalized Schema
======================================

Key change from the old design:
  BEFORE: TripResponse.trip_metadata was a raw Dict[str, Any] blob
  AFTER:  TripResponse has typed nested lists for activities, expenses,
          checklist_items, and saved_travel

This means:
  - The API surface is now self-documenting (Swagger shows exact shapes)
  - Frontend TypeScript types can be generated directly from these
  - Pydantic validates the shape of every response, not just requests
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


# ═════════════════════════════════════════════════════════════
# Auth
# ═════════════════════════════════════════════════════════════

class UserRegister(BaseModel):
    email:     EmailStr
    password:  str       = Field(..., min_length=8)
    full_name: str       = Field(..., min_length=1, max_length=100)


class UserLogin(BaseModel):
    email:    EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ═════════════════════════════════════════════════════════════
# User
# ═════════════════════════════════════════════════════════════

class UserCreate(BaseModel):
    """Legacy — kept for backward compatibility."""
    email:     EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)


class UserResponse(BaseModel):
    id:         int
    email:      str
    full_name:  str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    user:          UserResponse


# ═════════════════════════════════════════════════════════════
# TripActivity
# ═════════════════════════════════════════════════════════════

ActivityType = Literal["activity", "dining", "flight", "hotel", "transport"]


class ActivityCreate(BaseModel):
    day:         int         = Field(..., gt=0)
    time:        Optional[str] = Field(None, description="HH:MM — omit for all-day items")
    type:        ActivityType = "activity"
    title:       str         = Field(..., min_length=1, max_length=200)
    location:    Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    notes:       Optional[str] = Field(None, max_length=500)
    booking_ref: Optional[str] = Field(None, max_length=100)
    sort_order:  int           = 0


class ActivityUpdate(BaseModel):
    """Partial update — all fields optional."""
    time:        Optional[str]          = None
    type:        Optional[ActivityType] = None
    title:       Optional[str]          = Field(None, max_length=200)
    location:    Optional[str]          = Field(None, max_length=200)
    description: Optional[str]          = Field(None, max_length=2000)
    notes:       Optional[str]          = Field(None, max_length=500)
    booking_ref: Optional[str]          = Field(None, max_length=100)
    sort_order:  Optional[int]          = None


class ActivityResponse(BaseModel):
    id:          int
    trip_id:     int
    day:         int
    time:        Optional[str]     = None
    type:        str
    title:       str
    location:    Optional[str]     = None
    description: Optional[str]    = None
    notes:       Optional[str]     = None
    booking_ref: Optional[str]    = None
    sort_order:  int
    created_at:  datetime

    model_config = {"from_attributes": True}


# ═════════════════════════════════════════════════════════════
# TripExpense
# ═════════════════════════════════════════════════════════════

class ExpenseCreate(BaseModel):
    category:    Optional[str]     = Field(None, max_length=50)
    description: Optional[str]     = Field(None, max_length=200)
    amount:      Decimal           = Field(..., gt=0, decimal_places=2)
    currency:    str               = Field("SGD", min_length=3, max_length=3)
    date:        Optional[str]     = Field(None, description="YYYY-MM-DD")


class ExpenseUpdate(BaseModel):
    category:    Optional[str]     = None
    description: Optional[str]     = None
    amount:      Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    currency:    Optional[str]     = None
    date:        Optional[str]     = None


class ExpenseResponse(BaseModel):
    id:          int
    trip_id:     int
    category:    Optional[str]    = None
    description: Optional[str]   = None
    amount:      Decimal
    currency:    str
    date:        Optional[str]   = None
    created_at:  datetime

    model_config = {"from_attributes": True}


# ═════════════════════════════════════════════════════════════
# TripChecklistItem
# ═════════════════════════════════════════════════════════════

class ChecklistItemCreate(BaseModel):
    text:       str = Field(..., min_length=1, max_length=300)
    sort_order: int = 0


class ChecklistItemUpdate(BaseModel):
    text:       Optional[str]  = Field(None, max_length=300)
    is_checked: Optional[bool] = None
    sort_order: Optional[int]  = None


class ChecklistItemResponse(BaseModel):
    id:         int
    trip_id:    int
    text:       str
    is_checked: bool
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ═════════════════════════════════════════════════════════════
# TripSavedTravel
# ═════════════════════════════════════════════════════════════

TravelType = Literal["flight", "hotel", "transport"]


class TravelSaveRequest(BaseModel):
    type: TravelType
    data: Dict[str, Any] = Field(..., description="Full suggestion payload from AI")


class SavedTravelResponse(BaseModel):
    id:         int
    trip_id:    int
    type:       str
    data:       Dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── AI suggest (not persisted — just the request) ─────────────

class TravelSuggestRequest(BaseModel):
    type:        TravelType
    preferences: Optional[str] = Field(None, max_length=500)


class TravelSuggestResponse(BaseModel):
    type:      str
    flights:   Optional[List[Dict[str, Any]]] = None
    hotels:    Optional[List[Dict[str, Any]]] = None
    transport: Optional[List[Dict[str, Any]]] = None


# ═════════════════════════════════════════════════════════════
# Trip
# ═════════════════════════════════════════════════════════════

TripStatus = Literal["planning", "booked", "ongoing", "completed", "cancelled"]


class TripUpdate(BaseModel):
    """
    Partial trip update — all fields optional.
    Only provided fields are written to the DB.
    """
    destination:     Optional[str]   = None
    origin: Optional[str] = None
    start_date:      Optional[str]   = Field(None, description="YYYY-MM-DD")
    end_date:        Optional[str]   = Field(None, description="YYYY-MM-DD")
    duration_days:   Optional[int]   = Field(None, gt=0)
    budget:          Optional[float] = Field(None, gt=0)
    travelers_count: Optional[int]   = Field(None, gt=0)
    status:          Optional[TripStatus] = None
    notes:           Optional[str]   = None
    cover_image_url: Optional[str]   = None
    preferences:     Optional[List[str]] = None

    # AI cache updates — sent by the frontend after regenerating
    ai_alerts:          Optional[List[Dict[str, Any]]] = None
    ai_recommendations: Optional[List[Dict[str, Any]]] = None


class TripResponse(BaseModel):
    """
    Full trip response — includes all related data as typed lists.

    Replaces the old trip_metadata: Dict[str, Any] blob.
    The frontend receives everything it needs in one call.
    """
    id:              int
    user_id:         int
    destination:     str
    start_date:      Optional[str]   = None
    end_date:        Optional[str]   = None
    duration_days:   Optional[int]   = None
    budget:          Optional[float] = None
    travelers_count: int
    status:          str
    notes:           Optional[str]   = None
    cover_image_url: Optional[str]   = None
    preferences:     List[str]       = []

    # Properly typed nested lists — was trip_metadata.* blobs
    activities:      List[ActivityResponse]      = []
    expenses:        List[ExpenseResponse]        = []
    checklist_items: List[ChecklistItemResponse]  = []
    saved_travel:    List[SavedTravelResponse]    = []

    # AI caches — still returned as dicts (shapes vary, not individually addressed)
    ai_alerts:          List[Dict[str, Any]] = []
    ai_recommendations: List[Dict[str, Any]] = []

    created_at:  datetime
    updated_at:  Optional[datetime] = None

    model_config = {"from_attributes": True}


class TripList(BaseModel):
    trips: List[TripResponse]
    total: int


# ═════════════════════════════════════════════════════════════
# Chat
# ═════════════════════════════════════════════════════════════

class ChatHistoryMessage(BaseModel):
    role:    Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message:      str                             = Field(..., min_length=1)
    trip_id:      Optional[int]                   = Field(None, gt=0)
    chat_history: Optional[List[ChatHistoryMessage]] = Field(default_factory=list)

    # Deprecated — user_id now derived from JWT, kept for backward compat
    user_id: Optional[int] = Field(None, exclude=True)


class ChatResponse(BaseModel):
    message:      str
    action_taken: str
    trip_data:    Optional[TripResponse] = None


# ═════════════════════════════════════════════════════════════
# Overview AI — request/response for the OverviewTab panels
# ═════════════════════════════════════════════════════════════

class OverviewAlertsResponse(BaseModel):
    alerts: List[Dict[str, Any]]


class OverviewRecommendationsResponse(BaseModel):
    recommendations: List[Dict[str, Any]]