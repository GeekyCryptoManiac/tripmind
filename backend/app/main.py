"""
FastAPI Application - Main Entry Point
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
try:
    with engine.begin() as conn:
        Base.metadata.create_all(conn)
    print("✅ Database tables ready")
except Exception as e:
    print(f"⚠️ create_all failed: {e}")

# Initialize FastAPI application
app = FastAPI(
    title="TripMind API",
    description="AI-powered travel planning assistant with agentic workflows",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============= ROOT ENDPOINTS =============

@app.get("/")
async def root():
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

@app.get("/ping")
async def ping():
    return {"ping": "pong"}

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))  # ✅ SQLAlchemy 2.x fix
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
    # Check if user already exists — strict check is correct
    # because frontend now sends unique UUID-based guest emails
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered. Please use a different email."
        )
    
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
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ============= CHAT ENDPOINT =============

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User with ID {request.user_id} not found")
    
    try:
        print(f"\n[API] Initializing agent for user {request.user_id}")
        agent = TripMindAgent(db=db, user_id=request.user_id, trip_id=request.trip_id)
        
        print(f"[API] Processing message: {request.message}")
        response = await agent.process_message(message=request.message)
        
        print(f"[API] Agent response: {response}")
        
        if not isinstance(response, dict):
            raise ValueError(f"Agent returned {type(response)}, expected dict")
        
        if "response" not in response:
            raise ValueError(f"Agent response missing 'response' key. Got: {response.keys()}")
        
        return ChatResponse(
            message=response["response"],
            action_taken=response.get("action_taken", "answered_question"),
            trip_data=response.get("trip_data", None)
        )
    
    except Exception as e:
        import traceback
        print(f"\n[ERROR] Chat endpoint exception:")
        print(traceback.format_exc())
        
        return ChatResponse(
            message=f"I encountered an error: {str(e)}",
            action_taken="error",
            trip_data=None
        )


# ============= TRIP ENDPOINTS =============

@app.get("/api/users/{user_id}/trips", response_model=TripList)
async def get_user_trips(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    trips = db.query(Trip).filter(Trip.user_id == user_id).all()
    return TripList(trips=trips, total=len(trips))


@app.get("/api/trips/{trip_id}", response_model=TripResponse)
async def get_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@app.put("/api/trips/{trip_id}", response_model=TripResponse)
async def update_trip(trip_id: int, updates: TripUpdate, db: Session = Depends(get_db)):
    from sqlalchemy.orm.attributes import flag_modified

    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if updates.destination     is not None: trip.destination     = updates.destination
    if updates.start_date      is not None: trip.start_date      = updates.start_date
    if updates.end_date        is not None: trip.end_date        = updates.end_date
    if updates.duration_days   is not None: trip.duration_days   = updates.duration_days
    if updates.budget          is not None: trip.budget          = updates.budget
    if updates.travelers_count is not None: trip.travelers_count = updates.travelers_count
    if updates.status          is not None: trip.status          = updates.status

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

        trip.trip_metadata = metadata
        flag_modified(trip, "trip_metadata")

    trip.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(trip)
    return trip


@app.delete("/api/trips/{trip_id}", status_code=204)
async def delete_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    db.delete(trip)
    db.commit()
    return None


# ============= STARTUP EVENT =============

@app.on_event("startup")
async def startup_event():
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
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )