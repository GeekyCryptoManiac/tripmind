"""
WeatherService
==============
Geocoding + weather lookup for a single activity, via Open-Meteo (free,
no API key). Two public entry points:

  days_until_activity(...)   — pure date math, no I/O
  fetch_weather_for_activity(...) — geocode → date-branch → fetch

Mirrors the ai_service.py split: this module does the actual I/O (unlike
AIService, which only builds prompts), but keeps the same "isolate one
concern per module" shape — the router stays thin and just wires the
result to persistence.
"""
from datetime import datetime, timezone
from typing import Optional

import httpx

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL  = "https://api.open-meteo.com/v1/forecast"
ARCHIVE_URL   = "https://archive-api.open-meteo.com/v1/archive"

# Open-Meteo's forecast endpoint covers roughly the next 16 days. Its
# archive endpoint is authoritative for anything older than a few days —
# very recent days may not have been backfilled into the archive yet, so
# there's a gap (older than "forecastable", not yet "archived") where no
# source can answer. This lag is deliberately conservative, not a value
# Open-Meteo publishes as a hard guarantee.
FORECAST_MAX_DAYS = 16
ARCHIVE_LAG_DAYS  = 5

_HTTP_TIMEOUT = httpx.Timeout(5.0)

# Broad WMO weather-code buckets — matches the pill's 3-category design
# (sunny/cloudy/rainy) rather than surfacing Open-Meteo's full code list.
_SUNNY_CODES = {0, 1}
_CLOUDY_CODES = {2, 3, 45, 48}


def _condition_from_code(code: Optional[int]) -> str:
    if code in _SUNNY_CODES:
        return "sunny"
    if code in _CLOUDY_CODES:
        return "cloudy"
    return "rainy"  # drizzle/rain/snow/thunderstorm — everything else


def days_until_activity(trip_start_date: Optional[str], activity_day: int) -> Optional[int]:
    """Signed day-count from today (UTC) to the activity's resolved date.
    Negative = past, 0 = today, positive = future. None if the trip has
    no start_date to anchor the calculation."""
    if not trip_start_date:
        return None

    start = datetime.strptime(trip_start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    activity_date = start.timestamp() + (activity_day - 1) * 86_400

    now = datetime.now(timezone.utc)
    today = datetime(now.year, now.month, now.day, tzinfo=timezone.utc).timestamp()

    return round((activity_date - today) / 86_400)


def _resolve_branch(diff: int) -> Optional[str]:
    """Returns 'archive', 'forecast', or None (no source available)."""
    if diff <= -ARCHIVE_LAG_DAYS:
        return "archive"
    if 0 <= diff <= FORECAST_MAX_DAYS:
        return "forecast"
    return None  # recent-past gap, or too far in the future


def _activity_date_str(trip_start_date: str, activity_day: int) -> str:
    start = datetime.strptime(trip_start_date, "%Y-%m-%d")
    activity_date = start.timestamp() + (activity_day - 1) * 86_400
    return datetime.fromtimestamp(activity_date, tz=timezone.utc).strftime("%Y-%m-%d")


async def _geocode(location: str) -> Optional[tuple[float, float]]:
    """Resolves free-text location to (lat, lon). None on no-match, ambiguous
    empty result, or any request failure — treated as 'weather unavailable',
    never raised as an error."""
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            resp = await client.get(
                GEOCODING_URL,
                params={"name": location, "count": 1, "language": "en", "format": "json"},
            )
            resp.raise_for_status()
            data = resp.json()
    except (httpx.HTTPError, ValueError):
        return None

    results = data.get("results") or []
    if not results:
        return None

    top = results[0]
    try:
        return float(top["latitude"]), float(top["longitude"])
    except (KeyError, TypeError, ValueError):
        return None


async def _fetch_daily_weather(
    lat: float, lon: float, date_str: str, branch: str,
) -> Optional[dict]:
    """Calls the forecast or archive endpoint for a single date. None on
    any failure or missing data for that date — never raised."""
    url = FORECAST_URL if branch == "forecast" else ARCHIVE_URL
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            resp = await client.get(
                url,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "start_date": date_str,
                    "end_date": date_str,
                    "daily": "temperature_2m_max,weathercode",
                    "timezone": "UTC",
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except (httpx.HTTPError, ValueError):
        return None

    daily = data.get("daily") or {}
    temps  = daily.get("temperature_2m_max") or []
    codes  = daily.get("weathercode") or []
    if not temps or temps[0] is None:
        return None

    return {
        "temp_c":    round(float(temps[0]), 1),
        "condition": _condition_from_code(codes[0] if codes else None),
        "source":    branch,
    }


async def fetch_weather_for_activity(
    trip_start_date: Optional[str], activity_day: int, location: str,
) -> tuple[str, Optional[dict]]:
    """
    Orchestrates geocode -> date-branch -> fetch for one activity.
    Returns (status, weather) where status is "fetched" or "not_available".
    Caller is responsible for the "not_applicable" (no location) and
    "cached" (weather_data already set) short-circuits — those don't
    need any of this module's logic.
    """
    diff = days_until_activity(trip_start_date, activity_day)
    if diff is None:
        return "not_available", None

    branch = _resolve_branch(diff)
    if branch is None:
        return "not_available", None

    coords = await _geocode(location)
    if coords is None:
        return "not_available", None

    date_str = _activity_date_str(trip_start_date, activity_day)
    weather = await _fetch_daily_weather(coords[0], coords[1], date_str, branch)
    if weather is None:
        return "not_available", None

    return "fetched", weather
