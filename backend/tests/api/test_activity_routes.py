"""API tests for trip activity routes."""


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


def test_bulk_delete_all_activities_returns_200_with_count(client, auth_headers, test_trip):
    # Known issue: tracked in KNOWN_ISSUES.md — bulk DELETE returns 200 not 204
    for i in range(3):
        client.post(
            f"/api/trips/{test_trip.id}/activities",
            json={"day": i + 1, "type": "activity", "title": f"Activity {i}"},
            headers=auth_headers,
        )
    resp = client.delete(f"/api/trips/{test_trip.id}/activities", headers=auth_headers)
    assert resp.status_code == 200  # Known issue: should be 204
    assert resp.json()["deleted"] == 3
