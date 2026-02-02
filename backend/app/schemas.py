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


class ChatRequest(BaseModel):
    """Schema for chat messages sent to the agent"""
    message: str = Field(..., min_length=1, description="User's message to the agent")
    user_id: int = Field(..., gt=0, description="ID of the user sending the message")


# ============= Response Schemas =============

class UserResponse(BaseModel):
    """Schema for user data returned by API"""
    id: int
    email: str
    full_name: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class TripResponse(BaseModel):
    """Schema for trip data returned by API"""
    id: int
    user_id: int
    destination: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration_days: Optional[int] = None
    budget: Optional[float] = None
    travelers_count: int
    status: str
    trip_metadata: Dict[str, Any] = {}
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    """Schema for agent's response to user"""
    message: str = Field(..., description="Agent's natural language response")
    action_taken: str = Field(
        ..., 
        description="What action the agent took"
    )
    trip_data: Optional[TripResponse] = Field(
        None, 
        description="Trip data if a trip was created or updated"
    )


# ============= Helper Schemas =============

class TripList(BaseModel):
    """Schema for list of trips"""
    trips: List[TripResponse]
    total: int


if __name__ == "__main__":
    print("✅ All schemas defined successfully!")
    print("\nRequest Schemas:")
    print("  - UserCreate")
    print("  - ChatRequest")
    print("\nResponse Schemas:")
    print("  - UserResponse")
    print("  - TripResponse")
    print("  - ChatResponse")
    print("  - TripList")
