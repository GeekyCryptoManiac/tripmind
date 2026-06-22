"""add_user_notes_to_trip_activities

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-06-21 00:01:00.000000

Adds a user_notes column to trip_activities for traveller diary entries.

Background: the existing `notes` column holds AI-generated itinerary
recommendations and must not be repurposed.  This column gives the
frontend a dedicated, collision-free home for free-form notes typed by
the user on the ActivityDetailPage.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision:      str                          = 'e6f7a8b9c0d1'
down_revision: Union[str, Sequence[str], None] = 'd5e6f7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'trip_activities',
        sa.Column('user_notes', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('trip_activities', 'user_notes')
