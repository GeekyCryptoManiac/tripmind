import os

# ── Env vars must be set before any app module is imported ───
os.environ.setdefault("DATABASE_URL",   "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY",     "test-secret-key-not-for-production")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-placeholder")
os.environ.setdefault("FRONTEND_URL",   "http://localhost:5173")

# ── SQLite compatibility: patch JSONB → JSON before app imports
from sqlalchemy.dialects import postgresql as _pg
from sqlalchemy.types import JSON as _JSON
_pg.JSONB = _JSON

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db
from app.models import Base, User, Trip
from app.auth import hash_password, create_access_token
from app.services.trip_service import TripService
from app.schemas import TripCreate

SQLITE_URL = "sqlite:///:memory:"

# StaticPool makes all connections reuse a single in-memory SQLite connection,
# so Base.metadata.create_all() and every test session see the same tables.
engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Schema setup — once per session ──────────────────────────

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


# ── Table wipe — after every test ────────────────────────────

@pytest.fixture(autouse=True)
def clean_tables(setup_database):
    yield
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())


# ── DB session fixture (function scope) ──────────────────────

@pytest.fixture
def db(setup_database):
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


# ── TestClient with get_db override ──────────────────────────

@pytest.fixture
def client(setup_database):
    def override_get_db():
        session = TestSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


# ── User fixtures ─────────────────────────────────────────────

@pytest.fixture
def register_payload():
    return {
        "email":     "testuser@tripmind.com",
        "password":  "Password123!",
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


# ── test_user fixture for service/unit tests ──────────────────

@pytest.fixture
def test_user(db):
    user = User(
        email="unit@tripmind.test",
        full_name="Unit Tester",
        password_hash=hash_password("TestPass123!"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── auth_client: TestClient with Bearer token pre-set ─────────

@pytest.fixture
def auth_client(setup_database, test_user):
    token = create_access_token(test_user.id)

    def override_get_db():
        session = TestSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        c.headers.update({"Authorization": f"Bearer {token}"})
        yield c, test_user
    app.dependency_overrides.clear()


# ── sample_trip fixture via TripService.create_trip() ─────────

@pytest.fixture
def sample_trip(db, test_user):
    svc = TripService(db)
    data = TripCreate(
        destination="Tokyo",
        origin="Singapore",
        country_code="JP",
        travelers_count=2,
    )
    return svc.create_trip(test_user.id, data)


# ── test_trip fixture (legacy — used by root-level test files) ─

@pytest.fixture
def test_trip(registered_user):
    session = TestSessionLocal()
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
        session.add(trip)
        session.commit()
        session.refresh(trip)
        trip_id          = trip.id
        trip_destination = trip.destination
        trip_user_id     = trip.user_id
    finally:
        session.close()

    class _Trip:
        id          = trip_id
        destination = trip_destination
        user_id     = trip_user_id

    return _Trip()
