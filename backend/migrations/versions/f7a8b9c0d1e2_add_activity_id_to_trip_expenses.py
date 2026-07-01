"""add_activity_id_to_trip_expenses

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-07-01 00:00:00.000000

Adds a nullable activity_id FK to trip_expenses so individual
expenses can be scoped to a specific itinerary stop.  ON DELETE
SET NULL means deleting an activity preserves the expense at the
trip level (activity_id becomes null) rather than cascading the
delete.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision:      str                          = 'f7a8b9c0d1e2'
down_revision: Union[str, Sequence[str], None] = 'e6f7a8b9c0d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'trip_expenses',
        sa.Column('activity_id', sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        'fk_trip_expenses_activity_id',
        'trip_expenses',
        'trip_activities',
        ['activity_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_trip_expenses_activity_id', 'trip_expenses', type_='foreignkey')
    op.drop_column('trip_expenses', 'activity_id')
