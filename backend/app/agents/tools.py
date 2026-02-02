"""
Agent Tools - Functions the AI Agent Can Call
"""

from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
from ..models import Trip, User


# ============= TOOL 1: Plan and Save Trip (Combined) =============

def plan_and_save_trip(
    destination: str,
    user_id: int,
    db: Session,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    duration_days: Optional[int] = None,
    budget: Optional[float] = None,
    travelers_count: int = 1,
    preferences: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Plan and save a new trip to the database.
    
    Use this when user wants to plan a NEW trip.
    Extracts details and immediately saves to database in one step.
    
    Args:
        destination: City or country (REQUIRED)
        user_id: User ID (automatically provided)
        db: Database session (automatically provided)
        start_date: Trip start date
        end_date: Trip end date  
        duration_days: Length of trip
        budget: Total budget in USD
        travelers_count: Number of travelers
        preferences: List like ["food", "culture", "beaches"]
    
    Returns:
        Dictionary with trip_id, destination, and confirmation
    """
    # Create trip directly
    new_trip = Trip(
        user_id=user_id,
        destination=destination,
        start_date=start_date,
        end_date=end_date,
        duration_days=duration_days,
        budget=budget,
        travelers_count=travelers_count,
        trip_metadata={
            "preferences": preferences or [],
            "source": "user_input"
        },
        status="planning"
    )
    
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    
    return {
        "trip_id": new_trip.id,
        "destination": new_trip.destination,
        "duration_days": new_trip.duration_days,
        "budget": new_trip.budget,
        "status": "created",
        "message": f"Successfully planned trip to {new_trip.destination}"
    }


# ============= TOOL 2: Get User's Trips =============

def get_user_trips(user_id: int, db: Session) -> List[Dict[str, Any]]:
    """
    Retrieve all trips for a specific user.
    """
    trips = db.query(Trip).filter(Trip.user_id == user_id).all()
    
    trip_list = []
    for trip in trips:
        trip_list.append({
            "id": trip.id,
            "destination": trip.destination,
            "start_date": trip.start_date,
            "end_date": trip.end_date,
            "duration_days": trip.duration_days,
            "budget": trip.budget,
            "travelers_count": trip.travelers_count,
            "status": trip.status,
            "preferences": trip.trip_metadata.get("preferences", [])
        })
    
    return trip_list


# ============= TOOL 3: Get Specific Trip Details =============

def get_trip_details(trip_id: int, db: Session) -> Dict[str, Any]:
    """Get detailed information about a specific trip."""
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    
    if not trip:
        return {"error": f"Trip with ID {trip_id} not found"}
    
    return {
        "id": trip.id,
        "destination": trip.destination,
        "start_date": trip.start_date,
        "end_date": trip.end_date,
        "duration_days": trip.duration_days,
        "budget": trip.budget,
        "travelers_count": trip.travelers_count,
        "status": trip.status,
        "preferences": trip.trip_metadata.get("preferences", []),
        "notes": trip.trip_metadata.get("notes", ""),
        "created_at": str(trip.created_at)
    }


# ============= TOOL 4: Update Trip =============

def update_trip(
    trip_id: int,
    db: Session,
    destination: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    duration_days: Optional[int] = None,
    budget: Optional[float] = None,
    travelers_count: Optional[int] = None,
    status: Optional[str] = None
) -> Dict[str, Any]:
    """Update an existing trip."""
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    
    if not trip:
        return {"error": f"Trip with ID {trip_id} not found"}
    
    if destination is not None:
        trip.destination = destination
    if start_date is not None:
        trip.start_date = start_date
    if end_date is not None:
        trip.end_date = end_date
    if duration_days is not None:
        trip.duration_days = duration_days
    if budget is not None:
        trip.budget = budget
    if travelers_count is not None:
        trip.travelers_count = travelers_count
    if status is not None:
        trip.status = status
    
    db.commit()
    db.refresh(trip)
    
    return {
        "trip_id": trip.id,
        "destination": trip.destination,
        "status": "updated",
        "message": f"Successfully updated trip to {trip.destination}"
    }


# ============= TOOL 5: Answer General Questions =============

def answer_travel_question(question_type: str, context: str) -> str:
    """Answer general travel questions."""
    return f"General travel question about {question_type}: {context}"


if __name__ == "__main__":
    print("✅ Agent tools defined successfully!")
    print("\nAvailable tools:")
    print("  1. plan_and_save_trip - Extract info and save in one step")
    print("  2. get_user_trips - Retrieve all user's trips")
    print("  3. get_trip_details - Get specific trip")
    print("  4. update_trip - Modify existing trip")
    print("  5. answer_travel_question - Answer general questions")
