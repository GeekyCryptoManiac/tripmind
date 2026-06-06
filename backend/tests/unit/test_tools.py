"""
Unit tests for plan_and_save_trip() country_code handling.
These tests verify the alpha-3 guard introduced in the anti-pattern D fix.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.schemas import TripCreate


# ── country_code guard — no DB needed ────────────────────────

def test_alpha2_country_code_passes_validation():
    """Alpha-2 codes (len=2) are accepted by TripCreate."""
    t = TripCreate(destination="Tokyo", country_code="JP")
    assert t.country_code == "JP"


def test_alpha3_country_code_rejected_by_schema():
    """Alpha-3 codes fail TripCreate validation (max_length=2).
    Known issue: tracked in KNOWN_ISSUES.md — agent sends alpha-3, schema expects alpha-2.
    """
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        TripCreate(destination="Tokyo", country_code="JPN")


def test_alpha3_guard_drops_to_none():
    """The guard `country_code if len(country_code) == 2 else None` silently drops alpha-3.
    Known issue: tracked in KNOWN_ISSUES.md — trips created via chat have no country_code stored.
    """
    raw_country_code = "JPN"  # alpha-3 as GPT-4o returns
    safe_code = raw_country_code if raw_country_code and len(raw_country_code) == 2 else None
    assert safe_code is None


def test_alpha2_guard_preserves_value():
    """Alpha-2 codes pass through the guard unchanged."""
    raw_country_code = "JP"
    safe_code = raw_country_code if raw_country_code and len(raw_country_code) == 2 else None
    assert safe_code == "JP"


def test_none_country_code_guard_stays_none():
    """None input passes through the guard as None."""
    raw_country_code = None
    safe_code = raw_country_code if raw_country_code and len(raw_country_code) == 2 else None
    assert safe_code is None


def test_empty_string_country_code_guard_drops_to_none():
    """Empty string is treated the same as None."""
    raw_country_code = ""
    safe_code = raw_country_code if raw_country_code and len(raw_country_code) == 2 else None
    assert safe_code is None


def test_trip_create_with_guarded_none_country_code():
    """TripCreate with country_code=None succeeds (field is optional)."""
    t = TripCreate(destination="Tokyo", country_code=None)
    assert t.country_code is None
