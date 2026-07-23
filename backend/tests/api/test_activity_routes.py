"""API tests for trip activity routes."""

import json
import re

import pytest


# ── helpers ───────────────────────────────────────────────────

def _create_activity(client, auth_headers, trip_id, **kwargs):
    payload = {"day": 1, "type": "activity", "title": "Test activity", **kwargs}
    resp = client.post(
        f"/api/trips/{trip_id}/activities",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── fake LLM for AI tip generation tests ───────────────────────
# Patches langchain_openai.ChatOpenAI (imported locally inside the
# endpoint at call time) so no real OpenAI call happens. Extracts the
# activity ids the prompt actually asked about — rather than hardcoding
# ids — since SQLite reuses row ids across tests once tables are wiped.

@pytest.fixture
def fake_tip_llm(monkeypatch):
    calls = {"count": 0}

    class _FakeResult:
        def __init__(self, content):
            self.content = content

    class _FakeLLM:
        def __init__(self, *args, **kwargs):
            pass

        async def ainvoke(self, messages):
            calls["count"] += 1
            prompt = messages[0].content
            ids = re.findall(r"id (\d+):", prompt)
            tips = {i: f"Tip for activity {i}" for i in ids}
            return _FakeResult(json.dumps({"tips": tips}))

    monkeypatch.setattr("langchain_openai.ChatOpenAI", _FakeLLM)
    return calls


# ── fake weather fetch for weather endpoint tests ──────────────
# Patches the name bound in app.routers.activities (a `from ... import`
# binding, not a live reference back to weather_service) so no real
# Open-Meteo call happens. weather_service's own geocode/date-branch
# logic is covered separately in tests/unit/test_weather_service.py.

@pytest.fixture
def fake_weather_fetch(monkeypatch):
    calls = {"count": 0}

    async def _fake(trip_start_date, activity_day, location):
        calls["count"] += 1
        return "fetched", {"temp_c": 22.5, "condition": "cloudy", "source": "forecast"}

    monkeypatch.setattr("app.routers.activities.fetch_weather_for_activity", _fake)
    return calls


# ── existing tests ────────────────────────────────────────────

def test_add_activity_returns_201(client, auth_headers, test_trip):
    resp = client.post(
        f"/api/trips/{test_trip.id}/activities",
        json={"day": 1, "type": "activity", "title": "Shibuya crossing"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Shibuya crossing"
    assert data["day"] == 1
    assert data["trip_id"] == test_trip.id


def test_add_activity_invalid_day_returns_422(client, auth_headers, test_trip):
    resp = client.post(
        f"/api/trips/{test_trip.id}/activities",
        json={"day": 0, "type": "activity", "title": "Bad"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_delete_activity_returns_204(client, auth_headers, test_trip):
    create_resp = client.post(
        f"/api/trips/{test_trip.id}/activities",
        json={"day": 1, "type": "dining", "title": "Ramen"},
        headers=auth_headers,
    )
    activity_id = create_resp.json()["id"]
    resp = client.delete(
        f"/api/trips/{test_trip.id}/activities/{activity_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 204


def test_bulk_delete_all_activities_returns_204(client, auth_headers, test_trip):
    for i in range(3):
        client.post(
            f"/api/trips/{test_trip.id}/activities",
            json={"day": i + 1, "type": "activity", "title": f"Activity {i}"},
            headers=auth_headers,
        )
    resp = client.delete(f"/api/trips/{test_trip.id}/activities", headers=auth_headers)
    assert resp.status_code == 204


# ── GET single activity ───────────────────────────────────────

def test_get_activity_returns_200(client, auth_headers, test_trip):
    act = _create_activity(client, auth_headers, test_trip.id, title="Senso-ji temple")
    resp = client.get(
        f"/api/trips/{test_trip.id}/activities/{act['id']}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == act["id"]
    assert data["title"] == "Senso-ji temple"
    assert "media" in data
    assert isinstance(data["media"], list)


def test_get_activity_404_unknown_id(client, auth_headers, test_trip):
    resp = client.get(
        f"/api/trips/{test_trip.id}/activities/999999",
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_get_activity_403_wrong_trip(client, auth_headers, test_trip):
    resp = client.get(
        "/api/trips/999999/activities/1",
        headers=auth_headers,
    )
    assert resp.status_code in (403, 404)


# ── PATCH diary fields ────────────────────────────────────────

def test_patch_diary_fields(client, auth_headers, test_trip):
    act = _create_activity(client, auth_headers, test_trip.id)
    resp = client.patch(
        f"/api/trips/{test_trip.id}/activities/{act['id']}",
        json={
            "user_notes": "Bring cash",
            "ai_tip": "Visit early to avoid crowds",
            "booking_ref": "ABC123",
            "booking_url": "https://example.com/book",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["user_notes"] == "Bring cash"
    assert data["ai_tip"] == "Visit early to avoid crowds"
    assert data["booking_ref"] == "ABC123"
    assert data["booking_url"] == "https://example.com/book"


def test_patch_does_not_touch_omitted_fields(client, auth_headers, test_trip):
    act = _create_activity(client, auth_headers, test_trip.id, title="Original title", notes="Keep me")
    resp = client.patch(
        f"/api/trips/{test_trip.id}/activities/{act['id']}",
        json={"booking_ref": "XYZ"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Original title"
    assert data["notes"] == "Keep me"
    assert data["booking_ref"] == "XYZ"


# ── POST checkin ──────────────────────────────────────────────

def test_checkin_sets_checked_in_at(client, auth_headers, test_trip):
    act = _create_activity(client, auth_headers, test_trip.id)
    assert act["checked_in_at"] is None

    resp = client.post(
        f"/api/trips/{test_trip.id}/activities/{act['id']}/checkin",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["checked_in_at"] is not None


def test_checkin_idempotent(client, auth_headers, test_trip):
    act = _create_activity(client, auth_headers, test_trip.id)
    url = f"/api/trips/{test_trip.id}/activities/{act['id']}/checkin"
    first  = client.post(url, headers=auth_headers).json()["checked_in_at"]
    second = client.post(url, headers=auth_headers).json()["checked_in_at"]
    assert first == second  # timestamp must not change on second call


def test_checkin_404_unknown_activity(client, auth_headers, test_trip):
    resp = client.post(
        f"/api/trips/{test_trip.id}/activities/999999/checkin",
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ── POST media ────────────────────────────────────────────────

def test_add_media_returns_201(client, auth_headers, test_trip):
    act = _create_activity(client, auth_headers, test_trip.id)
    s3_key = f"activities/{act['id']}/uuid-photo.jpg"
    resp = client.post(
        f"/api/trips/{test_trip.id}/activities/{act['id']}/media",
        json={
            "media_type": "photo",
            "s3_key": s3_key,
            "filename": "photo.jpg",
            "caption": "Arrival day",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["media_type"] == "photo"
    assert data["storage_url"] == s3_key
    assert data["activity_id"] == act["id"]
    assert data["trip_id"] == test_trip.id


def test_add_media_invalid_type_returns_422(client, auth_headers, test_trip):
    act = _create_activity(client, auth_headers, test_trip.id)
    resp = client.post(
        f"/api/trips/{test_trip.id}/activities/{act['id']}/media",
        json={"media_type": "video", "s3_key": "activities/1/v.mp4"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_get_activity_includes_media(client, auth_headers, test_trip):
    act = _create_activity(client, auth_headers, test_trip.id)
    client.post(
        f"/api/trips/{test_trip.id}/activities/{act['id']}/media",
        json={"media_type": "document", "s3_key": f"activities/{act['id']}/doc.pdf"},
        headers=auth_headers,
    )
    resp = client.get(
        f"/api/trips/{test_trip.id}/activities/{act['id']}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    media_list = resp.json()["media"]
    assert len(media_list) == 1
    assert media_list[0]["presigned_url"] == "https://s3.example.com/presigned-url"


# ── DELETE media ──────────────────────────────────────────────

def test_delete_media_returns_204(client, auth_headers, test_trip):
    act = _create_activity(client, auth_headers, test_trip.id)
    media = client.post(
        f"/api/trips/{test_trip.id}/activities/{act['id']}/media",
        json={"media_type": "photo", "s3_key": f"activities/{act['id']}/x.jpg"},
        headers=auth_headers,
    ).json()

    resp = client.delete(
        f"/api/trips/{test_trip.id}/activities/{act['id']}/media/{media['id']}",
        headers=auth_headers,
    )
    assert resp.status_code == 204


def test_delete_media_404_unknown(client, auth_headers, test_trip):
    act = _create_activity(client, auth_headers, test_trip.id)
    resp = client.delete(
        f"/api/trips/{test_trip.id}/activities/{act['id']}/media/999999",
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ── POST activity tips (one prompt per day) ────────────────────

def test_generate_tips_persists_for_activities_missing_them(
    client, auth_headers, test_trip, fake_tip_llm
):
    act1 = _create_activity(client, auth_headers, test_trip.id, day=5, title="Shrine visit")
    act2 = _create_activity(client, auth_headers, test_trip.id, day=5, title="Ramen dinner")

    resp = client.post(
        f"/api/trips/{test_trip.id}/activities/day/5/tips",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    tips_by_id = {a["id"]: a["ai_tip"] for a in resp.json()}
    assert tips_by_id[act1["id"]] == f"Tip for activity {act1['id']}"
    assert tips_by_id[act2["id"]] == f"Tip for activity {act2['id']}"
    assert fake_tip_llm["count"] == 1  # one prompt for the whole day, not per activity


def test_generate_tips_skips_llm_when_all_activities_already_have_one(
    client, auth_headers, test_trip, fake_tip_llm
):
    act = _create_activity(client, auth_headers, test_trip.id, day=2, title="Museum")
    client.patch(
        f"/api/trips/{test_trip.id}/activities/{act['id']}",
        json={"ai_tip": "Already have a tip"},
        headers=auth_headers,
    )

    resp = client.post(
        f"/api/trips/{test_trip.id}/activities/day/2/tips",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()[0]["ai_tip"] == "Already have a tip"
    assert fake_tip_llm["count"] == 0  # no LLM call — nothing needed a tip


def test_generate_tips_only_sends_null_tip_activities_to_llm(
    client, auth_headers, test_trip, fake_tip_llm
):
    has_tip     = _create_activity(client, auth_headers, test_trip.id, day=3, title="Has tip")
    needs_tip   = _create_activity(client, auth_headers, test_trip.id, day=3, title="Needs tip")
    client.patch(
        f"/api/trips/{test_trip.id}/activities/{has_tip['id']}",
        json={"ai_tip": "Pre-existing tip"},
        headers=auth_headers,
    )

    resp = client.post(
        f"/api/trips/{test_trip.id}/activities/day/3/tips",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    tips_by_id = {a["id"]: a["ai_tip"] for a in resp.json()}
    assert tips_by_id[has_tip["id"]] == "Pre-existing tip"  # untouched, not overwritten
    assert tips_by_id[needs_tip["id"]] == f"Tip for activity {needs_tip['id']}"
    assert fake_tip_llm["count"] == 1


def test_generate_tips_rate_limited_like_other_ai_endpoints(
    client, auth_headers, test_trip, fake_tip_llm
):
    _create_activity(client, auth_headers, test_trip.id, day=1, title="Something")
    url = f"/api/trips/{test_trip.id}/activities/day/1/tips"

    for _ in range(10):
        resp = client.post(url, headers=auth_headers)
        assert resp.status_code == 200

    resp = client.post(url, headers=auth_headers)
    assert resp.status_code == 429


# ── POST activity weather ───────────────────────────────────────

def test_get_weather_not_applicable_when_no_location(
    client, auth_headers, test_trip, fake_weather_fetch
):
    act = _create_activity(client, auth_headers, test_trip.id, title="No location activity")
    resp = client.post(
        f"/api/trips/{test_trip.id}/activities/{act['id']}/weather",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "not_applicable"
    assert data["weather"] is None
    assert fake_weather_fetch["count"] == 0  # never attempted — nothing to look up


def test_get_weather_fetches_and_persists(client, auth_headers, test_trip, fake_weather_fetch):
    act = _create_activity(client, auth_headers, test_trip.id, location="Shibuya, Tokyo")
    resp = client.post(
        f"/api/trips/{test_trip.id}/activities/{act['id']}/weather",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "fetched"
    assert data["weather"] == {
        "temp_c": 22.5, "condition": "cloudy", "source": "forecast",
        "location_precision": "exact",
    }
    assert fake_weather_fetch["count"] == 1


def test_get_weather_second_call_uses_cache_not_refetched(
    client, auth_headers, test_trip, fake_weather_fetch
):
    act = _create_activity(client, auth_headers, test_trip.id, location="Shibuya, Tokyo")
    url = f"/api/trips/{test_trip.id}/activities/{act['id']}/weather"

    first = client.post(url, headers=auth_headers)
    assert first.json()["status"] == "fetched"

    second = client.post(url, headers=auth_headers)
    assert second.status_code == 200
    data = second.json()
    assert data["status"] == "cached"
    assert data["weather"] == {
        "temp_c": 22.5, "condition": "cloudy", "source": "forecast",
        "location_precision": "exact",
    }
    assert fake_weather_fetch["count"] == 1  # not called again on the second request


def test_get_weather_not_available_distinguished_from_cached_or_applicable(
    client, auth_headers, test_trip, monkeypatch
):
    async def _fake_unavailable(trip_start_date, activity_day, location):
        return "not_available", None

    monkeypatch.setattr("app.routers.activities.fetch_weather_for_activity", _fake_unavailable)

    act = _create_activity(client, auth_headers, test_trip.id, location="Somewhere too far out")
    resp = client.post(
        f"/api/trips/{test_trip.id}/activities/{act['id']}/weather",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "not_available"
    assert data["weather"] is None


def test_get_weather_rate_limited_like_other_ai_endpoints(
    client, auth_headers, test_trip, fake_weather_fetch
):
    act = _create_activity(client, auth_headers, test_trip.id, location="Somewhere")
    url = f"/api/trips/{test_trip.id}/activities/{act['id']}/weather"

    for _ in range(10):
        resp = client.post(url, headers=auth_headers)
        assert resp.status_code == 200

    resp = client.post(url, headers=auth_headers)
    assert resp.status_code == 429
