"""Unit tests for weather_service.py — date-branch logic, condition
bucketing, and the geocode->fetch orchestration with mocked HTTP calls.
Never hits the real Open-Meteo APIs."""
from datetime import datetime, timedelta, timezone

import pytest

from app.services import weather_service


# ── days_until_activity — pure date math, no mocking needed ─────

def test_days_until_activity_today_is_zero():
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    assert weather_service.days_until_activity(today_str, 1) == 0


def test_days_until_activity_future_day_offset():
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    assert weather_service.days_until_activity(today_str, 6) == 5


def test_days_until_activity_past_start_date():
    ten_days_ago = (datetime.now(timezone.utc) - timedelta(days=10)).strftime("%Y-%m-%d")
    assert weather_service.days_until_activity(ten_days_ago, 1) == -10


def test_days_until_activity_none_without_trip_start_date():
    assert weather_service.days_until_activity(None, 1) is None


# ── _resolve_branch — the three-way date branch ──────────────────

def test_resolve_branch_comfortably_past_uses_archive():
    assert weather_service._resolve_branch(-10) == "archive"
    assert weather_service._resolve_branch(-weather_service.ARCHIVE_LAG_DAYS) == "archive"


def test_resolve_branch_within_forecast_window():
    assert weather_service._resolve_branch(0) == "forecast"
    assert weather_service._resolve_branch(5) == "forecast"
    assert weather_service._resolve_branch(weather_service.FORECAST_MAX_DAYS) == "forecast"


def test_resolve_branch_recent_past_gap_is_unavailable():
    # Yesterday: too recent to be archived (lag), no longer forecastable
    assert weather_service._resolve_branch(-1) is None


def test_resolve_branch_too_far_future_is_unavailable():
    assert weather_service._resolve_branch(weather_service.FORECAST_MAX_DAYS + 1) is None


# ── _condition_from_code — WMO code bucketing ────────────────────

def test_condition_from_code_buckets():
    assert weather_service._condition_from_code(0) == "sunny"
    assert weather_service._condition_from_code(3) == "cloudy"
    assert weather_service._condition_from_code(61) == "rainy"
    assert weather_service._condition_from_code(None) == "rainy"


# ── fetch_weather_for_activity — mocked HTTP orchestration ───────

class _FakeResponse:
    def __init__(self, json_data):
        self._json = json_data

    def raise_for_status(self):
        pass

    def json(self):
        return self._json


def _install_fake_http(monkeypatch, handler):
    """handler(url, params) -> dict json body. Replaces httpx.AsyncClient
    inside weather_service with a fake that routes through `handler`."""

    class _FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, url, params=None):
            return _FakeResponse(handler(url, params))

    monkeypatch.setattr(weather_service.httpx, "AsyncClient", lambda *a, **kw: _FakeClient())


@pytest.mark.asyncio
async def test_fetch_weather_geocode_no_match_is_not_available(monkeypatch):
    def handler(url, params):
        assert url == weather_service.GEOCODING_URL
        return {"results": []}  # no match

    _install_fake_http(monkeypatch, handler)

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    status, weather = await weather_service.fetch_weather_for_activity(
        today_str, 1, "Some Made Up Place That Doesn't Exist"
    )
    assert status == "not_available"
    assert weather is None


@pytest.mark.asyncio
async def test_fetch_weather_forecast_branch_returns_fetched(monkeypatch):
    calls = []

    def handler(url, params):
        calls.append(url)
        if url == weather_service.GEOCODING_URL:
            return {"results": [{"latitude": 35.68, "longitude": 139.69}]}
        assert url == weather_service.FORECAST_URL
        return {"daily": {"temperature_2m_max": [24.3], "weathercode": [1]}}

    _install_fake_http(monkeypatch, handler)

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    status, weather = await weather_service.fetch_weather_for_activity(today_str, 1, "Tokyo")

    assert status == "fetched"
    assert weather == {"temp_c": 24.3, "condition": "sunny", "source": "forecast"}
    assert weather_service.ARCHIVE_URL not in calls


@pytest.mark.asyncio
async def test_fetch_weather_archive_branch_returns_archive_source(monkeypatch):
    calls = []

    def handler(url, params):
        calls.append(url)
        if url == weather_service.GEOCODING_URL:
            return {"results": [{"latitude": 1.35, "longitude": 103.82}]}
        assert url == weather_service.ARCHIVE_URL
        return {"daily": {"temperature_2m_max": [31.0], "weathercode": [61]}}

    _install_fake_http(monkeypatch, handler)

    ten_days_ago = (datetime.now(timezone.utc) - timedelta(days=10)).strftime("%Y-%m-%d")
    status, weather = await weather_service.fetch_weather_for_activity(ten_days_ago, 1, "Singapore")

    assert status == "fetched"
    assert weather == {"temp_c": 31.0, "condition": "rainy", "source": "archive"}
    assert weather_service.FORECAST_URL not in calls


@pytest.mark.asyncio
async def test_fetch_weather_date_gap_skips_geocode_entirely(monkeypatch):
    geocode_calls = {"count": 0}

    def handler(url, params):
        geocode_calls["count"] += 1
        return {"results": []}

    _install_fake_http(monkeypatch, handler)

    # 1 day in the past: too recent for archive, no longer forecastable
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    status, weather = await weather_service.fetch_weather_for_activity(yesterday, 1, "Tokyo")

    assert status == "not_available"
    assert weather is None
    assert geocode_calls["count"] == 0  # never even attempted geocoding
