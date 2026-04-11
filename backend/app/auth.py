"""
Authentication Utilities
JWT token creation, verification, and FastAPI dependency injection.

Dependencies already in requirements.txt:
  - python-jose==3.3.0
  - passlib==1.7.4
  - bcrypt==4.0.1
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import bcrypt as _bcrypt
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db

# ── OAuth2 scheme — tokenUrl matches the login endpoint ──────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ── Token expiry constants ────────────────────────────────────
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

ALGORITHM = "HS256"


# ── Password helpers ──────────────────────────────────────────

def verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode(), hashed.encode())


def hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()


# ── Token creation ────────────────────────────────────────────

def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "type": "access", "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "type": "refresh", "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


# ── Token verification ────────────────────────────────────────

def _decode_token(token: str, expected_type: str) -> dict:
    """
    Decode and validate a JWT. Raises 401 on any failure.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise credentials_exception

    if payload.get("type") != expected_type:
        raise credentials_exception

    if not payload.get("sub"):
        raise credentials_exception

    return payload


# ── FastAPI dependencies ──────────────────────────────────────

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    FastAPI dependency — resolves the JWT in the Authorization header
    to a User ORM instance. Add to any endpoint that requires auth:

        @app.get("/api/something")
        async def my_route(current_user: User = Depends(get_current_user)):
            ...
    """
    # Import here to avoid circular imports
    from .models import User

    payload = _decode_token(token, "access")
    user_id: int = int(payload["sub"])

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


def verify_refresh_token(token: str) -> int:
    """
    Decode a refresh token and return the user_id (int).
    Raises 401 on failure.
    """
    payload = _decode_token(token, "refresh")
    return int(payload["sub"])