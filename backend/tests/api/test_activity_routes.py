"""API tests for trip activity routes."""

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
