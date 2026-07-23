"""add_weather_data_to_trip_activities

Revision ID: 49a3574fc2df
Revises: f7a8b9c0d1e2
Create Date: 2026-07-23 00:00:00.000000

Adds a nullable weather_data JSONB column to trip_activities — a
per-activity cache (same precedent as ai_tip), storing whatever minimal
shape the weather pill needs to render: temp_c, condition, and source
("forecast" | "archive") so the UI can distinguish an actual historical
reading from a forecast. Never backfilled or shared across activities —
each row fetches (or not) independently, persist-once.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision:      str                          = '49a3574fc2df'
down_revision: Union[str, Sequence[str], None] = 'f7a8b9c0d1e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'trip_activities',
        sa.Column('weather_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('trip_activities', 'weather_data')
