"""
Pydantic Schemas for API Request/Response Validation
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime


# ============= Request Schemas =============

class UserCreate(BaseModel):
    """Schema for creating a new user"""
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)

class ChatHistoryMessage(BaseModel):
    """A single message in the chat history."""
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Schema for chat messages sent to the agent"""
    message: str = Field(..., min_length=1, description="User's message to the agent")
    user_id: int = Field(..., gt=0, description="ID of the user sending the message")
    trip_id: Optional[int] = Field(None, gt=0, description="Optional trip ID for trip-specific chat context")
    chat_history: Optional[List[ChatHistoryMessage]] = Field(
        default=[],
        description="Prior messages in this conversation, oldest first"
    )

class TripUpdate(BaseModel):
    """Schema for partial trip updates — all fields optional."""
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


# ── Week 8: Activity Management ───────────────────────────────

class ActivityCreate(BaseModel):
    """Schema for manually adding a single activity to a trip day."""
    day:         int  = Field(..., gt=0)
    time:        str  = Field(..., description="HH:MM format")
    type:        str  = Field(..., description="activity | dining | flight | hotel | transport")
    title:       str  = Field(..., min_length=1, max_length=200)
    location:    Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    notes:       Optional[str] = Field(None, max_length=500)


class ActivityResponse(BaseModel):
    """The created activity as saved, including its generated ID."""
    id:          str
    day:         int
    time:        str
    type:        str
    title:       str
    location:    Optional[str] = None
    description: Optional[str] = None
    notes:       Optional[str] = None
    booking_ref: Optional[str] = None


# ── Week 8: Travel AI Suggestions ────────────────────────────

class TravelSuggestRequest(BaseModel):
    """
    Request body for POST /api/trips/{id}/travel/suggest.

    type        — which sub-tab: flights | hotels | transport
    preferences — optional user-edited prompt, e.g. "direct flights only",
                  "budget hotels near city centre", "prefer trains"
    """
    type:        str           = Field(..., description="flights | hotels | transport")
    preferences: Optional[str] = Field(None, max_length=500)


class TravelSuggestResponse(BaseModel):
    """
    Response from the suggest endpoint.
    Exactly one of flights / hotels / transport is populated.
    """
    type:      str
    flights:   Optional[List[Dict[str, Any]]] = None
    hotels:    Optional[List[Dict[str, Any]]] = None
    transport: Optional[List[Dict[str, Any]]] = None


class TravelSaveRequest(BaseModel):
    """
    Request body for POST /api/trips/{id}/travel/save.
    Appends one suggestion into trip_metadata.flights/hotels/transport.
    """
    type: str            = Field(..., description="flights | hotels | transport")
    item: Dict[str, Any] = Field(..., description="The suggestion dict to persist")

# ── Week 8: Overview AI Features ─────────────────────────────

class OverviewAlertsResponse(BaseModel):
    """
    Response from POST /api/trips/{id}/overview/alerts.
    Each alert has a severity level and category.
    """
    alerts: List[Dict[str, Any]]


class OverviewRecommendationsResponse(BaseModel):
    """
    Response from POST /api/trips/{id}/overview/recommendations.
    Each recommendation is context-aware (destination, dates, budget).
    """
    recommendations: List[Dict[str, Any]]

# ============= Response Schemas =============

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    created_at: datetime

    class Config:
        from_attributes = True


class TripResponse(BaseModel):
    id: int
    user_id: int
    destination: str
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
    message:      str = Field(..., description="Agent's natural language response")
    action_taken: str = Field(..., description="What action the agent took")
    trip_data:    Optional[TripResponse] = Field(None)


class TripList(BaseModel):
    trips: List[TripResponse]
    total: int


if __name__ == "__main__":
    print("✅ All schemas defined successfully!")