def test_root(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "online"


def test_health_check(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
