"""
Pydantic Schemas for API Request/Response Validation
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime


# ============= Auth Schemas =============

class UserRegister(BaseModel):
    """Register a new account with email + password."""
    email:     EmailStr
    password:  str = Field(..., min_length=8, description="Minimum 8 characters")
    full_name: str = Field(..., min_length=1, max_length=100)


class UserLogin(BaseModel):
    """Log in with email + password."""
    email:    EmailStr
    password: str


class RefreshRequest(BaseModel):
    """Exchange a refresh token for a new token pair."""
    refresh_token: str


class TokenResponse(BaseModel):
    """Returned on successful register / login / refresh."""
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    user:          "UserResponse"


# ============= Request Schemas =============

class UserCreate(BaseModel):
    """Internal schema — kept for backward compatibility."""
    email:     EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)


class ChatHistoryMessage(BaseModel):
    role:    str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """
    Chat message sent to the agent.
    user_id is no longer required from the client — it is derived from
    the JWT token on the server. The field is kept optional for backward
    compatibility during the transition.
    """
    message:      str = Field(..., min_length=1)
    user_id:      Optional[int] = Field(None, description="Deprecated — derived from token")
    trip_id:      Optional[int] = Field(None, gt=0)
    chat_history: Optional[List[ChatHistoryMessage]] = Field(default=[])


class TripUpdate(BaseModel):
    destination:     Optional[str]   = None
    start_date:      Optional[str]   = None
    end_date:        Optional[str]   = None
    duration_days:   Optional[int]   = None
    budget:          Optional[float] = None
    travelers_count: Optional[int]   = None
    status:          Optional[str]   = None
    notes:           Optional[str]   = None
    checklist:       Optional[List[Dict[str, Any]]] = None
    expenses:        Optional[List[Dict[str, Any]]] = None


# ── Activity Management ───────────────────────────────────────

class ActivityCreate(BaseModel):
    day:         int  = Field(..., gt=0)
    time:        str  = Field(..., description="HH:MM format")
    type:        str  = Field(..., description="activity | dining | flight | hotel | transport")
    title:       str  = Field(..., min_length=1, max_length=200)
    location:    Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    notes:       Optional[str] = Field(None, max_length=500)


class ActivityResponse(BaseModel):
    id:          str
    day:         int
    time:        str
    type:        str
    title:       str
    location:    Optional[str] = None
    description: Optional[str] = None
    notes:       Optional[str] = None
    booking_ref: Optional[str] = None


# ── Travel AI Suggestions ─────────────────────────────────────

class TravelSuggestRequest(BaseModel):
    type:        str           = Field(..., description="flights | hotels | transport")
    preferences: Optional[str] = Field(None, max_length=500)


class TravelSuggestResponse(BaseModel):
    type:      str
    flights:   Optional[List[Dict[str, Any]]] = None
    hotels:    Optional[List[Dict[str, Any]]] = None
    transport: Optional[List[Dict[str, Any]]] = None


class TravelSaveRequest(BaseModel):
    type: str            = Field(..., description="flights | hotels | transport")
    item: Dict[str, Any] = Field(...)


# ── Overview AI Features ──────────────────────────────────────

class OverviewAlertsResponse(BaseModel):
    alerts: List[Dict[str, Any]]


class OverviewRecommendationsResponse(BaseModel):
    recommendations: List[Dict[str, Any]]


# ============= Response Schemas =============

class UserResponse(BaseModel):
    id:         int
    email:      str
    full_name:  str
    created_at: datetime

    class Config:
        from_attributes = True


class TripResponse(BaseModel):
    id:              int
    user_id:         int
    destination:     str
    start_date:      Optional[str]   = None
    end_date:        Optional[str]   = None
    duration_days:   Optional[int]   = None
    budget:          Optional[float] = None
    travelers_count: int
    status:          str
    trip_metadata:   Dict[str, Any]  = {}
    created_at:      datetime
    updated_at:      Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    message:      str
    action_taken: str
    trip_data:    Optional[TripResponse] = None


class TripList(BaseModel):
    trips: List[TripResponse]
    total: int


# Resolve forward reference in TokenResponse
TokenResponse.model_rebuild()