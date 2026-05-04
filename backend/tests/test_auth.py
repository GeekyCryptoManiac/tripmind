def test_register_returns_tokens(client, register_payload):
    resp = client.post("/api/auth/register", json=register_payload)
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token"  in data
    assert "refresh_token" in data
    assert data["user"]["email"] == register_payload["email"]


def test_register_duplicate_email(client, register_payload):
    client.post("/api/auth/register", json=register_payload)
    resp = client.post("/api/auth/register", json=register_payload)
    assert resp.status_code == 400


def test_register_password_too_short(client):
    resp = client.post("/api/auth/register", json={
        "email":     "short@test.com",
        "password":  "123",
        "full_name": "Short",
    })
    assert resp.status_code == 422


def test_login_success(client, register_payload):
    client.post("/api/auth/register", json=register_payload)
    resp = client.post("/api/auth/login", json={
        "email":    register_payload["email"],
        "password": register_payload["password"],
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password(client, register_payload):
    client.post("/api/auth/register", json=register_payload)
    resp = client.post("/api/auth/login", json={
        "email":    register_payload["email"],
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


def test_login_nonexistent_user(client):
    resp = client.post("/api/auth/login", json={
        "email":    "nobody@nowhere.com",
        "password": "password123",
    })
    assert resp.status_code == 401


def test_get_me_authenticated(client, registered_user, auth_headers):
    resp = client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == registered_user["user"]["email"]


def test_get_me_unauthenticated(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401
