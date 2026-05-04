import os

# Set env vars before any app module is imported.
# pydantic-settings reads these when Settings() is instantiated at import time.
os.environ.setdefault("DATABASE_URL",   os.environ.get("TEST_DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/tripmind_test"))
os.environ.setdefault("SECRET_KEY",     "test-secret-key-not-for-production")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-placeholder")
os.environ.setdefault("FRONTEND_URL",   "http://localhost:5173")

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, get_db
from app.models import User, Trip
from app.auth import hash_password

TEST_DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(TEST_DATABASE_URL)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Schema setup — runs once per test session ─────────────────

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


# ── Table cleanup — runs after every test ────────────────────

@pytest.fixture(autouse=True)
def clean_tables(setup_database):
    yield
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())


# ── Test client — each request gets its own DB session ───────

@pytest.fixture
def client(setup_database):
    def override_get_db():
        db = TestSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


# ── Reusable user fixtures ────────────────────────────────────

@pytest.fixture
def register_payload():
    return {
        "email": "testuser@tripmind.com",
        "password": "Password123!",
        "full_name": "Test User",
    }


@pytest.fixture
def registered_user(client, register_payload):
    resp = client.post("/api/auth/register", json=register_payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.fixture
def auth_headers(registered_user):
    return {"Authorization": f"Bearer {registered_user['access_token']}"}


# ── Reusable trip fixture ─────────────────────────────────────

@pytest.fixture
def test_trip(registered_user):
    """Insert a trip directly so tests don't depend on the chat agent."""
    db = TestSessionLocal()
    try:
        trip = Trip(
            user_id=registered_user["user"]["id"],
            destination="Tokyo",
            origin="Singapore",
            travelers_count=2,
            status="planning",
            preferences=[],
            ai_alerts=[],
            ai_recommendations=[],
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)
        # Capture scalars before closing the session
        trip_id          = trip.id
        trip_destination = trip.destination
        trip_user_id     = trip.user_id
    finally:
        db.close()

    # Return a plain namespace so tests can access .id, .destination etc.
    class _Trip:
        id          = trip_id
        destination = trip_destination
        user_id     = trip_user_id

    return _Trip()
