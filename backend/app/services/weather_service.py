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


async def _geocode_query(location: str) -> Optional[tuple[float, float]]:
    """Single geocoding attempt against Open-Meteo — no fallback logic.
    None on no-match, ambiguous empty result, or any request failure —
    treated as 'weather unavailable', never raised as an error. Every
    None path is logged (same traceback.print_exc() convention as
    overview.py/activities.py) so a silent 'not_available' can still be
    diagnosed from server output."""
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            resp = await client.get(
                GEOCODING_URL,
                params={"name": location, "count": 1, "language": "en", "format": "json"},
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        import traceback; traceback.print_exc()
        print(f"[weather_service._geocode_query] Open-Meteo geocoding returned "
              f"{e.response.status_code} for location={location!r}: {e.response.text}")
        return None
    except (httpx.HTTPError, ValueError) as e:
        import traceback; traceback.print_exc()
        print(f"[weather_service._geocode_query] Request/parse failure for location={location!r}: {e}")
        return None

    results = data.get("results") or []
    if not results:
        print(f"[weather_service._geocode_query] No geocoding match for location={location!r}. "
              f"Raw response: {data}")
        return None

    top = results[0]
    try:
        return float(top["latitude"]), float(top["longitude"])
    except (KeyError, TypeError, ValueError) as e:
        import traceback; traceback.print_exc()
        print(f"[weather_service._geocode_query] Unexpected geocoding result shape for "
              f"location={location!r}: {top!r} ({e})")
        return None


async def _geocode(location: str) -> Optional[tuple[float, float, str]]:
    """
    Resolves free-text location to (lat, lon, precision). Open-Meteo's
    geocoder is a city/place-name gazetteer, not a POI/landmark resolver
    — it can't find "Changi Airport, Singapore" but can find "Singapore".

    Tries the full string first (precision "exact"). If that fails and
    the string contains a comma (the common "Venue, City" activity.location
    format), retries using only the substring after the last comma
    (precision "approximate") — e.g. "Changi Airport, Singapore" ->
    "Singapore". No further fallback chains beyond this one retry; a
    location with no comma, or where even the city-level segment doesn't
    resolve, correctly returns None (see docs/KNOWN_ISSUES.md).
    """
    coords = await _geocode_query(location)
    if coords is not None:
        print(f"[weather_service._geocode] Exact match for location={location!r}")
        return coords[0], coords[1], "exact"

    if "," not in location:
        return None

    fallback = location.rsplit(",", 1)[-1].strip()
    if not fallback:
        return None

    print(f"[weather_service._geocode] No exact match for location={location!r}; "
          f"retrying fallback segment={fallback!r}")
    coords = await _geocode_query(fallback)
    if coords is not None:
        print(f"[weather_service._geocode] Fallback match for location={location!r} "
              f"using segment={fallback!r}")
        return coords[0], coords[1], "approximate"

    print(f"[weather_service._geocode] Fallback segment={fallback!r} also had no match "
          f"for location={location!r}")
    return None


async def _fetch_daily_weather(
    lat: float, lon: float, date_str: str, branch: str,
) -> Optional[dict]:
    """Calls the forecast or archive endpoint for a single date. None on
    any failure or missing data for that date — never raised. Every None
    path is logged (same traceback.print_exc() convention as
    overview.py/activities.py) so a silent 'not_available' can still be
    diagnosed from server output."""
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
    except httpx.HTTPStatusError as e:
        import traceback; traceback.print_exc()
        print(f"[weather_service._fetch_daily_weather] Open-Meteo {branch} endpoint returned "
              f"{e.response.status_code} for lat={lat}, lon={lon}, date={date_str}: {e.response.text}")
        return None
    except (httpx.HTTPError, ValueError) as e:
        import traceback; traceback.print_exc()
        print(f"[weather_service._fetch_daily_weather] Request/parse failure calling {branch} "
              f"endpoint for lat={lat}, lon={lon}, date={date_str}: {e}")
        return None

    daily = data.get("daily") or {}
    temps  = daily.get("temperature_2m_max") or []
    codes  = daily.get("weathercode") or []
    if not temps or temps[0] is None:
        print(f"[weather_service._fetch_daily_weather] Empty/missing daily data from {branch} "
              f"endpoint for lat={lat}, lon={lon}, date={date_str}. Raw response: {data}")
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

    geocoded = await _geocode(location)
    if geocoded is None:
        return "not_available", None
    lat, lon, precision = geocoded

    date_str = _activity_date_str(trip_start_date, activity_day)
    weather = await _fetch_daily_weather(lat, lon, date_str, branch)
    if weather is None:
        return "not_available", None

    weather["location_precision"] = precision
    return "fetched", weather
