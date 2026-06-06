"""Unit tests for auth.py — JWT creation, decoding, and password hashing."""
import time

import pytest
from fastapi import HTTPException
from jose import jwt

from app.auth import (
    ALGORITHM,
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_refresh_token,
    _decode_token,
)
from app.config import settings


def test_create_access_token_returns_string():
    token = create_access_token(user_id=1)
    assert isinstance(token, str)
    assert len(token) > 0


def test_access_token_payload_has_correct_type():
    token = create_access_token(user_id=42)
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["type"] == "access"
    assert payload["sub"] == "42"


def test_refresh_token_payload_has_correct_type():
    token = create_refresh_token(user_id=7)
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["type"] == "refresh"
    assert payload["sub"] == "7"


def test_decode_token_accepts_access_type():
    token = create_access_token(user_id=1)
    payload = _decode_token(token, "access")
    assert payload["sub"] == "1"


def test_decode_token_rejects_wrong_type():
    token = create_access_token(user_id=1)
    with pytest.raises(HTTPException) as exc:
        _decode_token(token, "refresh")
    assert exc.value.status_code == 401


def test_decode_token_rejects_tampered_signature():
    token = create_access_token(user_id=1)
    tampered = token[:-4] + "XXXX"
    with pytest.raises(HTTPException) as exc:
        _decode_token(tampered, "access")
    assert exc.value.status_code == 401


def test_decode_token_rejects_wrong_secret():
    from jose import jwt as _jwt
    payload = {"sub": "1", "type": "access"}
    bad_token = _jwt.encode(payload, "wrong-secret", algorithm=ALGORITHM)
    with pytest.raises(HTTPException) as exc:
        _decode_token(bad_token, "access")
    assert exc.value.status_code == 401


def test_verify_refresh_token_returns_user_id():
    token = create_refresh_token(user_id=99)
    user_id = verify_refresh_token(token)
    assert user_id == 99


def test_verify_refresh_token_rejects_access_token():
    token = create_access_token(user_id=99)
    with pytest.raises(HTTPException) as exc:
        verify_refresh_token(token)
    assert exc.value.status_code == 401


def test_hash_password_produces_bcrypt_hash():
    hashed = hash_password("my-secret-pw")
    assert hashed.startswith("$2b$")


def test_verify_password_correct_password():
    hashed = hash_password("correct-password")
    assert verify_password("correct-password", hashed) is True


def test_verify_password_wrong_password():
    hashed = hash_password("correct-password")
    assert verify_password("wrong-password", hashed) is False


def test_two_hashes_of_same_password_are_different():
    h1 = hash_password("same")
    h2 = hash_password("same")
    assert h1 != h2
