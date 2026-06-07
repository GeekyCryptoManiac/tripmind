"""
AIService
=========
Pure prompt-construction helpers for the GPT-4o endpoints.

Contains no DB access and makes no LLM calls.
Each method accepts a Trip ORM object and returns a fully-formatted
prompt string ready to pass to ChatOpenAI.

LLM invocation and response handling stay in the router handlers;
this service only isolates the prompt-building logic so it can be
read, tested, and modified independently of the HTTP layer.
"""

from ..models import Trip


class AIService:

    @staticmethod
    def build_alerts_prompt(trip: Trip) -> str:
        dest  = trip.destination
        dates = f"{trip.start_date} to {trip.end_date}" if trip.start_date and trip.end_date else "not set"
        pax   = trip.travelers_count or 1

        return f"""You are a travel advisory expert. Generate exactly 5 travel alerts for a trip to {dest}.

Trip: {dest} | Dates: {dates} | Travelers: {pax}

Return ONLY valid JSON, no markdown:
{{
  "alerts": [
    {{
      "id": "alert_1",
      "category": "visa",
      "severity": "warning",
      "title": "Visa Requirements",
      "description": "1-2 sentence specific advisory for {dest}."
    }}
  ]
}}
Rules: category: safety|visa|health|weather|local_laws|general  severity: info|warning|critical"""

    @staticmethod
    def build_recommendations_prompt(trip: Trip) -> str:
        dest     = trip.destination
        budget   = f"${trip.budget:,.0f}" if trip.budget else "not specified"
        dates    = f"{trip.start_date} to {trip.end_date}" if trip.start_date and trip.end_date else "not set"
        duration = f"{trip.duration_days} days" if trip.duration_days else "not set"
        pax      = trip.travelers_count or 1
        prefs    = ", ".join(trip.preferences) if trip.preferences else ""
        pref_str = f"\nPreferences: {prefs}" if prefs else ""

        return f"""You are a travel curator. Generate exactly 6 personalised recommendations for {dest}.

Trip: {dest} | Dates: {dates} | Duration: {duration} | Travelers: {pax} | Budget: {budget}{pref_str}

Return ONLY valid JSON, no markdown:
{{
  "recommendations": [
    {{
      "id": "rec_1",
      "category": "must_see",
      "title": "Place or experience name",
      "description": "1-2 sentences specific to {dest}.",
      "tip": "Practical insider tip."
    }}
  ]
}}
Rules: category: must_see|food|hidden_gem|practical. Include 2 must_see, 2 food, 1 hidden_gem, 1 practical."""

    @staticmethod
    def build_travel_suggest_prompt(
        trip: Trip,
        suggest_type: str,
        preferences: str | None,
    ) -> str:
        dest     = trip.destination
        origin   = getattr(trip, "origin", "Singapore")
        budget   = f"${trip.budget:,.0f} total" if trip.budget else "not specified"
        dates    = f"{trip.start_date} to {trip.end_date}" if trip.start_date and trip.end_date else "not set"
        duration = f"{trip.duration_days} days" if trip.duration_days else "not set"
        pax      = trip.travelers_count or 1
        prefs    = f"\nUser preferences: {preferences}" if preferences else ""

        # waypoints includes origin (index 0) and destination (last) — join them all
        wps   = sorted(getattr(trip, "waypoints", None) or [], key=lambda w: w.order_index)
        route = " → ".join(w.city for w in wps) if wps else f"{origin} → {dest}"

        if suggest_type == "flight":
            return f"""You are a travel expert. Generate exactly 3 realistic flight suggestions.

Trip: {route} | Dates: {dates} | Travelers: {pax} | Budget: {budget}{prefs}

Return ONLY valid JSON, no markdown:
{{
  "suggestions": [
    {{
      "airline": "Singapore Airlines", "flight_number": "SQ621",
      "from": "SIN", "to": "KIX",
      "departure": "08:15", "arrival": "14:45", "duration": "6h 30m",
      "estimated_price": 420, "currency": "USD", "cabin": "Economy",
      "notes": "Direct flight", "status": "ai_suggested"
    }}
  ]
}}
Rules: estimated_price is per person USD. Use real airlines. Vary price points."""

        elif suggest_type == "hotel":
            city_list = ", ".join(w.city for w in wps) if wps else dest
            return f"""You are a travel expert. Generate exactly 3 realistic hotel suggestions spread across all stops.

Trip: {route} | Stops: {city_list} | Dates: {dates} | Duration: {duration} | Travelers: {pax} | Budget: {budget}{prefs}

Spread the 3 suggestions across all stop cities — at least 1 hotel per city if possible. Each suggestion must specify the city it belongs to.

Return ONLY valid JSON, no markdown:
{{
  "suggestions": [
    {{
      "name": "Hotel Name", "location": "City Name", "area": "District Name",
      "star_rating": 4, "price_per_night": 120, "currency": "USD",
      "highlights": ["Central location", "Free breakfast"],
      "check_in": "15:00", "check_out": "11:00",
      "notes": "Short description", "status": "ai_suggested"
    }}
  ]
}}
Rules: price_per_night is total for all travelers USD. Vary budget/mid/luxury. Cover all stop cities."""

        else:  # transport
            return f"""You are a travel expert. Generate exactly 3 local transport options for {dest}.

Trip: {dest} | Duration: {duration} | Travelers: {pax} | Budget: {budget}{prefs}

Return ONLY valid JSON, no markdown:
{{
  "suggestions": [
    {{
      "type": "train", "title": "IC Card (Suica)",
      "description": "Rechargeable transit card for all trains and buses",
      "estimated_cost": 30, "cost_unit": "per person total", "currency": "USD",
      "pros": ["Convenient", "Accepted everywhere"],
      "notes": "Top up at any station", "status": "ai_suggested"
    }}
  ]
}}
Rules: type must be: taxi | train | bus | rental | ferry | other. Be specific to {dest}."""
