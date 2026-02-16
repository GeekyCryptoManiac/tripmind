"""
FastAPI Application - Main Entry Point

This is the web server that:
1. Receives HTTP requests from frontend
2. Routes them to the appropriate handlers
3. Calls the AI agent
4. Returns responses
"""

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from datetime import datetime


from .database import get_db, engine
from .models import Base, User, Trip
from .schemas import (
    ChatRequest, ChatResponse,
    UserCreate, UserResponse,
    TripResponse, TripList, TripUpdate
)
from .agents.base_agent import TripMindAgent
from .config import settings

# Create all database tables on startup
with engine.begin() as conn:
    Base.metadata.create_all(conn)

# Initialize FastAPI application
app = FastAPI(
    title="TripMind API",
    description="AI-powered travel planning assistant with agentic workflows",
    version="1.0.0",
    docs_url="/docs",  # Swagger UI at http://localhost:8000/docs
    redoc_url="/redoc"  # ReDoc at http://localhost:8000/redoc
)

# Configure CORS - allows frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)


# ============= ROOT ENDPOINTS =============

@app.get("/")
async def root():
    """
    Health check endpoint.
    Returns basic API information.
    """
    return {
        "status": "online",
        "service": "TripMind API",
        "version": "1.0.0",
        "message": "AI Travel Planning Assistant is running!",
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "chat": "/api/chat",
            "users": "/api/users"
        }
    }


@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))  # ✅ wrapped in text()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "database": db_status,
        "api_version": "1.0.0"
    }


# ============= USER ENDPOINTS =============

@app.post("/api/users", response_model=UserResponse, status_code=201)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user account.
    
    For MVP: Simple user creation without password.
    Week 3+: Add password hashing, JWT authentication, email verification.
    
    Args:
        user: UserCreate schema with email and full_name
        db: Database session (injected by FastAPI)
    
    Returns:
        Created user information
    
    Raises:
        400: If email already exists
    """
    # Check if user with this email already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered. Please use a different email."
        )
    
    # Create new user
    db_user = User(
        email=user.email,
        full_name=user.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """
    Get user information by ID.
    
    Args:
        user_id: User's ID
        db: Database session
    
    Returns:
        User information
    
    Raises:
        404: If user not found
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


# ============= CHAT ENDPOINT (Main Agent Interface) =============

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest, db: Session = Depends(get_db)):
    """Main chat endpoint - communicate with TripMind AI agent."""
    
    # Verify user exists
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"User with ID {request.user_id} not found"
        )
    
    try:
        # Initialize agent
        print(f"\n[API] Initializing agent for user {request.user_id}")
        agent = TripMindAgent(db=db, user_id=request.user_id,trip_id=request.trip_id)
        
        # Process message
        print(f"[API] Processing message: {request.message}")
        response = await agent.process_message(message=request.message)
        
        # Debug: show what we got back
        print(f"[API] Agent response type: {type(response)}")
        print(f"[API] Agent response keys: {response.keys() if isinstance(response, dict) else 'NOT A DICT'}")
        print(f"[API] Agent response: {response}")
        
        # Ensure we have all required fields
        if not isinstance(response, dict):
            raise ValueError(f"Agent returned {type(response)}, expected dict")
        
        if "response" not in response:
            raise ValueError(f"Agent response missing 'message'. Got keys: {response.keys()}")
        
        # Return as ChatResponse
        return ChatResponse(
            message=response["response"],
            action_taken=response.get("action_taken", "answered_question"),
            trip_data=response.get("trip_data", None)
        )
    
    except Exception as e:
        # Log the full error
        import traceback
        print(f"\n[ERROR] Chat endpoint exception:")
        print(traceback.format_exc())
        
        # Return error as valid ChatResponse
        return ChatResponse(
            message=f"I encountered an error: {str(e)}",
            action_taken="error",
            trip_data=None
        )



# ============= TRIP ENDPOINTS =============

@app.get("/api/users/{user_id}/trips", response_model=TripList)
async def get_user_trips(user_id: int, db: Session = Depends(get_db)):
    """
    Get all trips for a specific user.
    
    Alternative to asking the agent - direct database query.
    Useful for frontend to display trips list.
    
    Args:
        user_id: User's ID
        db: Database session
    
    Returns:
        List of all user's trips
    
    Raises:
        404: If user not found
    """
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all trips
    trips = db.query(Trip).filter(Trip.user_id == user_id).all()
    
    return TripList(trips=trips, total=len(trips))


@app.get("/api/trips/{trip_id}", response_model=TripResponse)
async def get_trip(trip_id: int, db: Session = Depends(get_db)):
    """
    Get detailed information about a specific trip.
    
    Args:
        trip_id: Trip's ID
        db: Database session
    
    Returns:
        Detailed trip information
    
    Raises:
        404: If trip not found
    """
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    return trip

@app.put("/api/trips/{trip_id}", response_model=TripResponse)
async def update_trip(trip_id: int, updates: TripUpdate, db: Session = Depends(get_db)):
    """
    Partially update a trip.

    Only fields included in the request body are changed.
    The following fields are convenience aliases — they get merged
    into trip_metadata so callers don't manage the JSON themselves:
      - notes     (Week 4: auto-save)
      - checklist (Week 5 Day 2: pre-trip checklist)
      - expenses  (Week 5 Day 5: expense tracking)
    """
    from sqlalchemy.orm.attributes import flag_modified

    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # ── Top-level columns ─────────────────────────────────────
    if updates.destination     is not None: trip.destination     = updates.destination
    if updates.start_date      is not None: trip.start_date      = updates.start_date
    if updates.end_date        is not None: trip.end_date        = updates.end_date
    if updates.duration_days   is not None: trip.duration_days   = updates.duration_days
    if updates.budget          is not None: trip.budget          = updates.budget
    if updates.travelers_count is not None: trip.travelers_count = updates.travelers_count
    if updates.status          is not None: trip.status          = updates.status

    # ── trip_metadata merge ───────────────────────────────────
    # Any metadata field: copy the dict first (never mutate in place —
    # SQLAlchemy won't detect in-place mutations on JSON columns),
    # update the key, then reassign + flag_modified for safety.
    needs_metadata_save = (
        updates.notes     is not None or
        updates.checklist is not None or
        updates.expenses  is not None
    )

    if needs_metadata_save:
        metadata = dict(trip.trip_metadata) if trip.trip_metadata else {}

        if updates.notes     is not None: metadata["notes"]     = updates.notes
        if updates.checklist is not None: metadata["checklist"] = updates.checklist
        if updates.expenses  is not None: metadata["expenses"]  = updates.expenses

        trip.trip_metadata = metadata          # reassign → SQLAlchemy sees new object
        flag_modified(trip, "trip_metadata")   # belt-and-suspenders for JSON columns

    # ── Timestamp ─────────────────────────────────────────────
    trip.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(trip)
    return trip


@app.delete("/api/trips/{trip_id}", status_code=204)
async def delete_trip(trip_id: int, db: Session = Depends(get_db)):
    """
    Delete a trip.
    
    Args:
        trip_id: Trip's ID to delete
        db: Database session
    
    Raises:
        404: If trip not found
    """
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    db.delete(trip)
    db.commit()
    
    return None


# ============= STARTUP EVENT =============

@app.on_event("startup")
async def startup_event():
    """
    Runs when the application starts.
    Good place for initialization tasks.
    """
    print("=" * 50)
    print("🚀 TripMind API Starting...")
    print("=" * 50)
    print(f"📊 Database: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'Connected'}")
    print(f"🤖 AI Model: GPT-4 Turbo")
    print(f"🌐 CORS: {settings.FRONTEND_URL}")
    print(f"📝 API Docs: http://localhost:8000/docs")
    print("=" * 50)


# ============= RUN SERVER =============

if __name__ == "__main__":
    import uvicorn
    
    # Run the application
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes (development only)
        log_level="info"
    )
