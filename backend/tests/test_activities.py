def test_add_activity(client, auth_headers, test_trip):
    resp = client.post(
        f"/api/trips/{test_trip.id}/activities",
        json={"day": 1, "type": "activity", "title": "Visit Shibuya", "time": "10:00"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Visit Shibuya"
    assert data["day"] == 1
    assert data["trip_id"] == test_trip.id


def test_add_activity_invalid_day(client, auth_headers, test_trip):
    resp = client.post(
        f"/api/trips/{test_trip.id}/activities",
        json={"day": 0, "type": "activity", "title": "Bad day"},  # day must be > 0
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_update_activity(client, auth_headers, test_trip):
    create_resp = client.post(
        f"/api/trips/{test_trip.id}/activities",
        json={"day": 1, "type": "activity", "title": "Original"},
        headers=auth_headers,
    )
    activity_id = create_resp.json()["id"]

    resp = client.patch(
        f"/api/trips/{test_trip.id}/activities/{activity_id}",
        json={"title": "Updated"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated"


def test_delete_activity(client, auth_headers, test_trip):
    create_resp = client.post(
        f"/api/trips/{test_trip.id}/activities",
        json={"day": 2, "type": "dining", "title": "Sushi dinner"},
        headers=auth_headers,
    )
    activity_id = create_resp.json()["id"]

    resp = client.delete(
        f"/api/trips/{test_trip.id}/activities/{activity_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 204


def test_activity_on_nonexistent_trip(client, auth_headers):
    resp = client.post(
        "/api/trips/99999/activities",
        json={"day": 1, "type": "activity", "title": "Ghost activity"},
        headers=auth_headers,
    )
    assert resp.status_code in (403, 404)
