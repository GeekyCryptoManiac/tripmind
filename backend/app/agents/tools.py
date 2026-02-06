"""
Agent Tools - Functions the AI Agent Can Call
"""

from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
from ..models import Trip, User
from sqlalchemy.orm.attributes import flag_modified


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
    print("  6. generate_itinerary - Generate day-by-day itinerary")  # NEW


# ============= TOOL 6: Generate Itinerary (Adaptive Detail) =============

def generate_itinerary(
    trip_id: int,
    db: Session,
    preferences: Optional[List[str]] = None,
    detail_level: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate a day-by-day itinerary with adaptive detail based on trip length.
    
    Detail levels:
    - full: 1-7 days (4-5 activities/day, detailed descriptions)
    - moderate: 8-14 days (3-4 activities/day, concise descriptions)
    - high_level: 15-25 days (2-3 activities/day, brief descriptions)
    
    Args:
        trip_id: The trip to generate an itinerary for
        db: Database session (automatically provided)
        preferences: Optional preferences like ["food", "culture", "adventure"]
        detail_level: Optional override for detail level
    
    Returns:
        Dictionary with the generated itinerary
    """
    from openai import OpenAI
    from ..config import settings
    from datetime import datetime, timedelta
    import json
    
    # 1. Fetch the trip
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        return {"error": f"Trip with ID {trip_id} not found"}
    
   # 2. Cap duration at 5 days for MVP reliability
    trip_duration = trip.duration_days or 5
    
    if trip_duration > 5:
        # Warn user and cap at 5 days
        duration = 5
        should_warn_user = True
        print(f"[generate_itinerary] Trip is {trip_duration} days, capping generation at 5 days")
    else:
        duration = trip_duration
        should_warn_user = False
    
    # Always use same detail level for 1-5 days
    detail_level = 'full'
    activities_per_day = "3-4"
    description_guideline = "concise descriptions (15-20 words each)"
    max_tokens = 4000
    
    # 3. Calculate dates
    dates = []
    if trip.start_date:
        # Parse start_date (could be string or date object)
        if isinstance(trip.start_date, str):
            current_date = datetime.fromisoformat(trip.start_date.replace('Z', '+00:00'))
        else:
            # It's already a date/datetime object
            current_date = trip.start_date if hasattr(trip.start_date, 'hour') else datetime.combine(trip.start_date, datetime.min.time())
        
        for day_num in range(duration):
            date_str = (current_date + timedelta(days=day_num)).strftime("%Y-%m-%d")
            dates.append(date_str)
    else:
        # No dates, just use day numbers
        dates = [f"Day {i+1}" for i in range(duration)]
    
    # 4. Build user preferences
    user_preferences = preferences or trip.trip_metadata.get("preferences", []) if trip.trip_metadata else []
    
   # 5. Build the prompt for GPT-4
    prompt = f"""Generate a {duration}-day itinerary for {trip.destination}.

**Trip Details:**
- Destination: {trip.destination}
- Days: {duration}
- Travelers: {trip.travelers_count}
- Budget: ${trip.budget or 'Not specified'}
- Interests: {', '.join(user_preferences) if user_preferences else 'General'}

**Instructions:**
- Generate {activities_per_day} activities per day
- Use {description_guideline}
- Try to complete ALL {duration} days if possible
- Be concise to maximize coverage

**JSON Format (no markdown):**
{{
  "itinerary": [
    {{
      "day": 1,
      "date": "{dates[0] if dates else 'Day 1'}",
      "title": "Arrival",
      "activities": [
        {{"id": "act_1_1", "time": "14:00", "type": "activity", "title": "Explore Old Town", "location": "Tallinn", "description": "Walk historic streets", "booking_ref": null}}
      ]
    }}
  ],
  "flights": [{{"id": "flight_1", "from": "SIN", "to": "TLL", "departure": "{dates[0] if dates else 'Day 1'}T08:00:00Z", "arrival": "{dates[0] if dates else 'Day 1'}T16:00:00Z", "airline": "Finnair", "flight_number": "AY123", "status": "mock"}}],
  "hotels": [{{"id": "hotel_1", "name": "Hotel Telegraaf", "location": "Tallinn", "check_in": "{dates[0] if dates else 'Day 1'}", "check_out": "{dates[-1] if dates else 'Last day'}", "status": "mock"}}]
}}

Generate as many days as possible up to {duration}."""
   # 6. Call GPT-4
    try:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
        print(f"[generate_itinerary] Generating {duration} days with {detail_level} detail (max_tokens: {max_tokens})")
        
        response = client.chat.completions.create(
            model="gpt-4-0125-preview",
            messages=[
                {
                    "role": "system",
                    "content": f"Generate travel itineraries. Complete as many days as possible up to {duration}. Keep descriptions brief. Return only JSON."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=max_tokens
        )
        
        # 7. Parse the response
        content = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()
        
        itinerary_data = json.loads(content)
        
        days_generated = len(itinerary_data.get("itinerary", []))
        print(f"[generate_itinerary] Generated {days_generated}/{duration} days")
        
        # 8. Save to database with metadata (BEFORE returning!)
        current_metadata = trip.trip_metadata or {}
        current_metadata["itinerary"] = itinerary_data.get("itinerary", [])
        current_metadata["flights"] = itinerary_data.get("flights", [])
        current_metadata["hotels"] = itinerary_data.get("hotels", [])
        
        # Track generation details
        current_metadata["itinerary_config"] = {
            "destination": trip.destination,
            "duration_days": trip_duration,  # Full trip duration (not capped)
            "start_date": str(trip.start_date) if trip.start_date else None,
            "generated_at": datetime.now().isoformat(),
            "detail_level": detail_level,
            "days_generated": days_generated,
            "total_trip_days": trip_duration,
            "is_partial": trip_duration > 5  # Flag if this is only partial
        }
        
        trip.trip_metadata = current_metadata
        flag_modified(trip, 'trip_metadata')  # ← ADD THIS LINE
        db.commit()
        db.refresh(trip)
        
        # 9. Build appropriate message
        if trip_duration > 5:
            message = (
                f"Generated first {days_generated} days of your {trip_duration}-day trip. "
                f"Due to MVP limitations, I've created a starter itinerary. "
                f"You can manually edit remaining days in the frontend, or ask me to "
                f"generate specific days (e.g., 'Generate itinerary for day 6-10')."
            )
        else:
            message = f"Successfully generated complete {days_generated}-day itinerary"
        
        # 10. Return complete result (ONE return statement)
        return {
            "trip_id": trip.id,
            "destination": trip.destination,
            "status": "generated",
            "days_generated": days_generated,
            "total_trip_days": trip_duration,
            "is_partial": trip_duration > 5,
            "detail_level": detail_level,
            "itinerary": itinerary_data.get("itinerary", []),
            "flights": itinerary_data.get("flights", []),
            "hotels": itinerary_data.get("hotels", []),
            "message": message
        }
        
    except json.JSONDecodeError as e:
        print(f"[generate_itinerary] JSON parsing error: {e}")
        print(f"[generate_itinerary] Raw response (first 500 chars): {content[:500]}")
        return {
            "error": "Failed to parse itinerary from AI response",
            "details": str(e)
        }
    except Exception as e:
        print(f"[generate_itinerary] Error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "error": "Failed to generate itinerary",
            "details": str(e)
        }