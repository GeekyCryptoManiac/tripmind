"""
Agent Tools - Functions the AI Agent Can Call
"""

from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
from ..models import Trip, User
from sqlalchemy.orm.attributes import flag_modified


# ============= VALIDATION CONSTANTS =============

INVALID_DESTINATIONS = {
    # Space
    "moon", "the moon", "mars", "jupiter", "saturn", "venus", "mercury",
    "neptune", "uranus", "pluto", "space", "outer space", "the sun",
    "milky way", "galaxy", "asteroid", "iss", "international space station",
    # Fictional — books
    "hogwarts", "narnia", "middle earth", "the shire", "mordor", "gondor",
    "rivendell", "diagon alley", "hogsmeade", "neverland", "oz", "wonderland",
    # Fictional — games/shows/movies
    "wakanda", "asgard", "pandora", "westeros", "king's landing",
    "dragonstone", "winterfell", "hoth", "tatooine", "endor", "naboo",
    "coruscant", "kamino", "alderaan", "vulcan", "bajor", "Gotham",
    "metropolis", "gotham city", "south park", "springfield",
    # Vague non-destinations
    "somewhere", "anywhere", "everywhere", "nowhere", "paradise",
    "a beach", "the beach", "somewhere warm", "somewhere cold",
    "a country", "a city", "a place", "abroad", "overseas",
}

MAX_BUDGET_USD = 500_000
MAX_DURATION_DAYS = 365


# ============= VALIDATION HELPER =============

def _validate_trip_input(
    destination: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    duration_days: Optional[int] = None,
    budget: Optional[float] = None,
) -> Optional[Dict[str, Any]]:
    """
    Validate trip inputs before any DB write.
    Returns an error dict if validation fails, None if all inputs are valid.
    """
    from datetime import datetime

    # ── Destination checks ────────────────────────────────────────────────
    if not destination or not destination.strip():
        return {
            "status": "validation_error",
            "message": "I need a destination to plan a trip! Where would you like to go?"
        }

    dest_clean = destination.strip()

    if len(dest_clean) <= 1:
        return {
            "status": "validation_error",
            "message": (
                f"'{dest_clean}' doesn't look like a destination. "
                "Could you tell me the full city or country name?"
            )
        }

    if dest_clean.replace(" ", "").isdigit():
        return {
            "status": "validation_error",
            "message": (
                f"'{dest_clean}' doesn't look like a destination. "
                "Could you tell me where you'd like to travel?"
            )
        }

    if dest_clean.lower() in INVALID_DESTINATIONS:
        space_words = {"moon", "the moon", "mars", "jupiter", "saturn", "venus",
                       "mercury", "neptune", "uranus", "pluto", "space",
                       "outer space", "the sun", "iss", "international space station"}
        fictional_words = {"hogwarts", "narnia", "middle earth", "wakanda", "asgard",
                           "pandora", "westeros", "neverland", "oz", "wonderland",
                           "tatooine", "gotham", "metropolis"}

        if dest_clean.lower() in space_words:
            return {
                "status": "validation_error",
                "message": (
                    f"{dest_clean.title()} is a bit out of my range for now! 🚀 "
                    "I can only plan trips to destinations here on Earth. "
                    "Where on Earth would you like to go?"
                )
            }
        elif dest_clean.lower() in fictional_words:
            return {
                "status": "validation_error",
                "message": (
                    f"{dest_clean.title()} is a wonderful place, but sadly only in fiction! "
                    "I can help you plan a trip to a real destination. "
                    "Any real-world places on your bucket list?"
                )
            }
        else:
            return {
                "status": "validation_error",
                "message": (
                    f"I'm not able to plan a trip to '{dest_clean}'. "
                    "Could you give me a specific city or country?"
                )
            }

    # ── Budget checks ─────────────────────────────────────────────────────
    if budget is not None:
        if budget < 0:
            return {
                "status": "validation_error",
                "message": "A budget can't be negative! What budget did you have in mind?"
            }

        if budget == 0:
            return {
                "status": "validation_error",
                "message": (
                    "A $0 budget won't get you very far! "
                    "Did you mean to set a budget, or would you like to skip it for now?"
                )
            }

        if budget > MAX_BUDGET_USD:
            return {
                "status": "validation_error",
                "message": (
                    f"${budget:,.0f} seems unusually high. "
                    "Just confirming — is that the correct budget in USD?"
                )
            }

    # ── Date checks ───────────────────────────────────────────────────────
    today = datetime.utcnow()

    if start_date:
        try:
            parsed_start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            parsed_start = parsed_start.replace(tzinfo=None)

            if parsed_start.year < today.year or (
                parsed_start.year == today.year and parsed_start.month < today.month
            ):
                return {
                    "status": "validation_error",
                    "message": (
                        f"{parsed_start.strftime('%B %Y')} has already passed. "
                        f"Did you mean {parsed_start.strftime('%B')} {today.year + 1}?"
                    )
                }

            if end_date:
                try:
                    parsed_end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                    parsed_end = parsed_end.replace(tzinfo=None)

                    if parsed_end <= parsed_start:
                        return {
                            "status": "validation_error",
                            "message": (
                                "The end date needs to be after the start date. "
                                "Could you double-check your dates?"
                            )
                        }

                    derived_days = (parsed_end - parsed_start).days
                    if derived_days > MAX_DURATION_DAYS:
                        return {
                            "status": "validation_error",
                            "message": (
                                f"That's a {derived_days}-day trip — just confirming, "
                                "did you mean to plan a trip that long?"
                            )
                        }

                except ValueError:
                    pass

        except ValueError:
            pass

    if duration_days is not None:
        if duration_days <= 0:
            return {
                "status": "validation_error",
                "message": "Trip duration needs to be at least 1 day. How long were you thinking?"
            }

        if duration_days > MAX_DURATION_DAYS:
            return {
                "status": "validation_error",
                "message": (
                    f"Just confirming — you'd like to plan a {duration_days}-day trip? "
                    "That's over a year! Let me know if that's correct."
                )
            }

    return None


# ============= DEDUPLICATION HELPER =============

def _extract_month_year(date_str: Optional[str]) -> Optional[tuple]:
    """
    Extract (year, month) from a date string for comparison.
    Returns None if date_str is None or unparseable.
    """
    if not date_str:
        return None
    try:
        from datetime import datetime
        dt = datetime.strptime(date_str[:10], "%Y-%m-%d")
        return (dt.year, dt.month)
    except (ValueError, TypeError):
        return None


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
    preferences: Optional[List[str]] = None,
    country_code: Optional[str] = None,  # ← ISO 3166-1 alpha-3, e.g. "RUS", "FRA"
) -> Dict[str, Any]:
    """
    Plan and save a trip. Runs validation first, then deduplication,
    then writes to DB.

    country_code is resolved by the agent (GPT-4) at call time and stored
    in trip_metadata so the world map can colour the correct country regardless
    of whether the user typed a city name or a country name.

    Deduplication logic:
      1. No existing trip found                          → INSERT
      2. Existing found, both have dates, dates differ   → INSERT (two legitimate trips)
      3. Existing found, both have same month/year       → UPDATE existing (upsert)
      4. Both have no dates                              → Return clarification request
      5. Existing has no dates, new has dates            → UPDATE existing
    """
    # ── Layer 1: Validate inputs before touching the DB ───────────────────
    validation_error = _validate_trip_input(
        destination=destination,
        start_date=start_date,
        end_date=end_date,
        duration_days=duration_days,
        budget=budget,
    )
    if validation_error:
        print(f"[plan_and_save_trip] Validation failed: {validation_error['message']}")
        return validation_error

    # ── Normalise destination for comparison ──────────────────────────────
    destination_normalised = destination.strip().lower()

    # ── Look for an existing planning trip to same destination ────────────
    existing_trips = db.query(Trip).filter(
        Trip.user_id == user_id,
        Trip.status == "planning"
    ).all()

    existing = None
    for t in existing_trips:
        if t.destination.strip().lower() == destination_normalised:
            existing = t
            break

    # ── Case 1: No conflict — INSERT ──────────────────────────────────────
    if not existing:
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
                "source": "user_input",
                "country_code": country_code,  # ← stored for map rendering
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

    # ── Existing trip found — compare dates ───────────────────────────────
    existing_month_year = _extract_month_year(
        existing.start_date.isoformat() if hasattr(existing.start_date, "isoformat")
        else existing.start_date
    )
    new_month_year = _extract_month_year(start_date)

    print(f"[plan_and_save_trip] Conflict check — "
          f"existing: {existing.destination} {existing_month_year}, "
          f"new: {destination} {new_month_year}")

    # ── Case 4: Both have no dates — genuinely ambiguous ──────────────────
    if new_month_year is None and existing_month_year is None:
        return {
            "trip_id": existing.id,
            "destination": existing.destination,
            "status": "needs_clarification",
            "message": (
                f"You already have a trip to {existing.destination} in planning "
                f"(ID: {existing.id}). Did you want to update that trip, or are you "
                f"planning a separate new trip to {existing.destination}? "
                f"If it's a new trip, let me know the dates so I can tell them apart."
            )
        }

    # ── Case 5: Existing has no dates, new has dates → UPDATE existing ────
    if existing_month_year is None and new_month_year is not None:
        if start_date is not None:     existing.start_date     = start_date
        if end_date is not None:       existing.end_date       = end_date
        if duration_days is not None:  existing.duration_days  = duration_days
        if budget is not None:         existing.budget         = budget
        if travelers_count != 1:       existing.travelers_count = travelers_count

        metadata = dict(existing.trip_metadata) if existing.trip_metadata else {}
        if preferences:
            metadata["preferences"] = preferences
        if country_code and not metadata.get("country_code"):
            # Only set if not already present — don't overwrite a known good code
            metadata["country_code"] = country_code
        existing.trip_metadata = metadata
        flag_modified(existing, "trip_metadata")

        db.commit()
        db.refresh(existing)

        return {
            "trip_id": existing.id,
            "destination": existing.destination,
            "duration_days": existing.duration_days,
            "budget": existing.budget,
            "status": "updated",
            "message": f"Updated your existing trip to {existing.destination} with the new details."
        }

    # ── Case 2: Both have dates but different month/year → INSERT ─────────
    if existing_month_year != new_month_year:
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
                "source": "user_input",
                "country_code": country_code,  # ← stored for map rendering
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
            "message": (
                f"Created a new trip to {new_trip.destination} "
                f"(different from your existing {existing.destination} trip "
                f"on {existing.start_date})."
            )
        }

    # ── Case 3: Same month/year → upsert the existing trip ────────────────
    if start_date is not None:     existing.start_date     = start_date
    if end_date is not None:       existing.end_date       = end_date
    if duration_days is not None:  existing.duration_days  = duration_days
    if budget is not None:         existing.budget         = budget
    if travelers_count != 1:       existing.travelers_count = travelers_count

    metadata = dict(existing.trip_metadata) if existing.trip_metadata else {}
    if preferences:
        metadata["preferences"] = preferences
    if country_code and not metadata.get("country_code"):
        metadata["country_code"] = country_code
    existing.trip_metadata = metadata
    flag_modified(existing, "trip_metadata")

    db.commit()
    db.refresh(existing)

    return {
        "trip_id": existing.id,
        "destination": existing.destination,
        "duration_days": existing.duration_days,
        "budget": existing.budget,
        "status": "updated",
        "message": (
            f"Updated your existing trip to {existing.destination} "
            f"instead of creating a duplicate."
        )
    }


# ============= TOOL 2: Get User's Trips =============

def get_user_trips(user_id: int, db: Session) -> List[Dict[str, Any]]:
    """Retrieve all trips for a specific user."""
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

    if destination is not None:     trip.destination     = destination
    if start_date is not None:      trip.start_date      = start_date
    if end_date is not None:        trip.end_date        = end_date
    if duration_days is not None:   trip.duration_days   = duration_days
    if budget is not None:          trip.budget          = budget
    if travelers_count is not None: trip.travelers_count = travelers_count
    if status is not None:          trip.status          = status

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


# ============= TOOL 6: Generate Itinerary (Adaptive Detail) =============

def generate_itinerary(
    trip_id: int,
    db: Session,
    preferences: Optional[List[str]] = None,
    detail_level: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate a day-by-day itinerary with adaptive detail based on trip length.
    """
    from openai import OpenAI
    from ..config import settings
    from datetime import datetime, timedelta
    import json

    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        return {"error": f"Trip with ID {trip_id} not found"}

    trip_duration = trip.duration_days or 5

    if trip_duration > 5:
        duration = 5
        print(f"[generate_itinerary] Trip is {trip_duration} days, capping generation at 5 days")
    else:
        duration = trip_duration

    detail_level = 'full'
    activities_per_day = "3-4"
    description_guideline = "concise descriptions (15-20 words each)"
    max_tokens = 4000

    dates = []
    if trip.start_date:
        if isinstance(trip.start_date, str):
            current_date = datetime.fromisoformat(trip.start_date.replace('Z', '+00:00'))
        else:
            current_date = trip.start_date if hasattr(trip.start_date, 'hour') else datetime.combine(trip.start_date, datetime.min.time())

        for day_num in range(duration):
            date_str = (current_date + timedelta(days=day_num)).strftime("%Y-%m-%d")
            dates.append(date_str)
    else:
        dates = [f"Day {i+1}" for i in range(duration)]

    user_preferences = preferences or trip.trip_metadata.get("preferences", []) if trip.trip_metadata else []

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

        content = response.choices[0].message.content.strip()

        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()

        itinerary_data = json.loads(content)
        days_generated = len(itinerary_data.get("itinerary", []))
        print(f"[generate_itinerary] Generated {days_generated}/{duration} days")

        current_metadata = trip.trip_metadata or {}
        current_metadata["itinerary"] = itinerary_data.get("itinerary", [])
        current_metadata["flights"] = itinerary_data.get("flights", [])
        current_metadata["hotels"] = itinerary_data.get("hotels", [])
        current_metadata["itinerary_config"] = {
            "destination": trip.destination,
            "duration_days": trip_duration,
            "start_date": str(trip.start_date) if trip.start_date else None,
            "generated_at": datetime.now().isoformat(),
            "detail_level": detail_level,
            "days_generated": days_generated,
            "total_trip_days": trip_duration,
            "is_partial": trip_duration > 5
        }

        trip.trip_metadata = current_metadata
        flag_modified(trip, 'trip_metadata')
        db.commit()
        db.refresh(trip)

        if trip_duration > 5:
            message = (
                f"Generated first {days_generated} days of your {trip_duration}-day trip. "
                f"Due to MVP limitations, I've created a starter itinerary. "
                f"You can manually edit remaining days in the frontend, or ask me to "
                f"generate specific days (e.g., 'Generate itinerary for day 6-10')."
            )
        else:
            message = f"Successfully generated complete {days_generated}-day itinerary"

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


if __name__ == "__main__":
    print("✅ Agent tools defined successfully!")
    print("\nAvailable tools:")
    print("  1. plan_and_save_trip - Validate, deduplicate, then save")
    print("  2. get_user_trips - Retrieve all user's trips")
    print("  3. get_trip_details - Get specific trip")
    print("  4. update_trip - Modify existing trip")
    print("  5. answer_travel_question - Answer general questions")
    print("  6. generate_itinerary - Generate day-by-day itinerary")