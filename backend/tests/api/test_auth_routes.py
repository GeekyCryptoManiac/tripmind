"""API tests for /api/auth routes."""


def test_register_returns_201_and_tokens(client):
    resp = client.post("/api/auth/register", json={
        "email": "alice@example.com",
        "password": "Password123!",
        "full_name": "Alice",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "alice@example.com"


def test_register_duplicate_email_returns_400(client, register_payload):
    client.post("/api/auth/register", json=register_payload)
    resp = client.post("/api/auth/register", json=register_payload)
    assert resp.status_code == 400


def test_register_password_too_short_returns_422(client):
    resp = client.post("/api/auth/register", json={
        "email": "bob@tripmind.test",
        "password": "short",
        "full_name": "Bob",
    })
    assert resp.status_code == 422


def test_register_invalid_email_returns_422(client):
    resp = client.post("/api/auth/register", json={
        "email": "not-an-email",
        "password": "Password123!",
        "full_name": "Bob",
    })
    assert resp.status_code == 422


def test_login_success_returns_200_and_token(client, register_payload):
    client.post("/api/auth/register", json=register_payload)
    resp = client.post("/api/auth/login", json={
        "email":    register_payload["email"],
        "password": register_payload["password"],
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password_returns_401(client, register_payload):
    client.post("/api/auth/register", json=register_payload)
    resp = client.post("/api/auth/login", json={
        "email":    register_payload["email"],
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


def test_login_nonexistent_user_returns_401(client):
    resp = client.post("/api/auth/login", json={
        "email":    "nobody@nowhere.com",
        "password": "Password123!",
    })
    assert resp.status_code == 401


def test_get_me_authenticated_returns_user(client, registered_user, auth_headers):
    resp = client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == registered_user["user"]["email"]


def test_get_me_unauthenticated_returns_401(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401
