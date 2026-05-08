"""add_trip_waypoints

Revision ID: b3f9c1d2e4a5
Revises: a58a4bc70073
Create Date: 2026-05-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b3f9c1d2e4a5'
down_revision: Union[str, Sequence[str], None] = 'a58a4bc70073'
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add origin to trips (idempotent — production had this added manually before the migration existed)
    op.execute("ALTER TABLE trips ADD COLUMN IF NOT EXISTS origin VARCHAR(200) NOT NULL DEFAULT 'Singapore'")

    # Add country_code to trips
    op.add_column('trips', sa.Column('country_code', sa.String(2), nullable=True))

    # Create trip_waypoints table
    op.create_table(
        'trip_waypoints',
        sa.Column('id',             sa.Integer(),     nullable=False),
        sa.Column('trip_id',        sa.Integer(),     nullable=False),
        sa.Column('order_index',    sa.Integer(),     nullable=False),
        sa.Column('city',           sa.String(200),   nullable=False),
        sa.Column('country',        sa.String(100),   nullable=True),
        sa.Column('country_code',   sa.String(2),     nullable=True),
        sa.Column('arrival_date',   sa.String(10),    nullable=True),
        sa.Column('departure_date', sa.String(10),    nullable=True),
        sa.Column('notes',          sa.Text(),        nullable=True),
        sa.Column(
            'created_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_trip_waypoints_id',          'trip_waypoints', ['id'],                    unique=True)
    op.create_index('ix_trip_waypoints_trip_id',     'trip_waypoints', ['trip_id'],               unique=False)
    op.create_index('ix_trip_waypoints_trip_order',  'trip_waypoints', ['trip_id', 'order_index'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_trip_waypoints_trip_order', table_name='trip_waypoints')
    op.drop_index('ix_trip_waypoints_trip_id',    table_name='trip_waypoints')
    op.drop_index('ix_trip_waypoints_id',         table_name='trip_waypoints')
    op.drop_table('trip_waypoints')
    op.drop_column('trips', 'country_code')
    op.drop_column('trips', 'origin')
