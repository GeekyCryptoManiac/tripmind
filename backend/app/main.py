"""
FastAPI Application — Main Entry Point
=======================================

All route handlers live in app/routers/. This file is responsible only for:
  - App factory and middleware
  - Rate-limiter wiring
  - Router mounts
  - Static file serving
  - Health / root endpoints
  - Startup logging
"""

from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .config import settings
from .database import get_db
from .limiter import limiter
from .routers import auth as auth_router
from .routers import trips as trips_router
from .routers import activities as activities_router
from .routers import expenses as expenses_router
from .routers import checklist as checklist_router
from .routers import waypoints as waypoints_router
from .routers import travel as travel_router
from .routers import overview as overview_router
from .routers import chat as chat_router

# ── Upload directory (backend/uploads/) ───────────────────────
UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ── App setup ─────────────────────────────────────────────────

app = FastAPI(
    title="TripMind API",
    description="AI-powered travel planning assistant",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth_router.router)
app.include_router(trips_router.router)
app.include_router(trips_router.users_router)
app.include_router(activities_router.router)
app.include_router(expenses_router.router)
app.include_router(checklist_router.router)
app.include_router(waypoints_router.router)
app.include_router(travel_router.router)
app.include_router(overview_router.router)
app.include_router(chat_router.router)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# ═════════════════════════════════════════════════════════════
# Health
# ═════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {"status": "online", "service": "TripMind API", "version": "2.0.0"}


@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {e}"
    return {"status": "healthy", "database": db_status}


# ═════════════════════════════════════════════════════════════
# Startup
# ═════════════════════════════════════════════════════════════

@app.on_event("startup")
async def startup_event():
    print("=" * 50)
    print("🚀 TripMind API v2.1 starting")
    print(f"   CORS origin: {settings.FRONTEND_URL}")
    print(f"   Docs: http://localhost:8000/docs")
    print("=" * 50)
