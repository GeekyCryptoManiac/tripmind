"""baseline_create_base_tables

Revision ID: d9602e0fa271
Revises:
Create Date: 2026-08-12 00:00:00.000000

True root of the migration chain. Every migration downstream of this one
(starting with a58a4bc70073) only ever ALTERs/ADDs columns on `users` and
`trips`, or ADDs columns on `trip_activities` / `trip_expenses` — none of
them ever CREATE these tables. That's because the original schema was
created once, out-of-band (manually / via Base.metadata.create_all()),
before Alembic was introduced to this repo, so the migration history
started mid-stream assuming the base tables already existed.

This migration reconstructs that assumed starting shape so `alembic
upgrade head` works from a genuinely empty database — needed for disaster
recovery and fresh environments. It creates six tables in the exact
pre-normalization shape that a58a4bc70073's upgrade() implies as its
starting point (read backwards from its add_column/alter_column/
drop_column calls):

  users              — as before a58a4bc70073's `created_at` NOT NULL alter
  trips              — pre-normalization: still has trip_metadata (JSON),
                        no notes/cover_image_url/preferences/ai_alerts/
                        ai_recommendations, no origin/country_code (those
                        arrive in b3f9c1d2e4a5), nullable travelers_count/
                        status/created_at, plain (non-CASCADE) user FK,
                        no ix_trips_user_id / ix_trips_user_updated yet
  trip_activities    — pre-diary-columns shape (before d5e6f7a8b9c0 /
                        e6f7a8b9c0d1 / 49a3574fc2df add ai_tip,
                        booking_url, checked_in_at, checked_out_at,
                        user_notes, weather_data)
  trip_expenses      — pre-activity_id shape (before f7a8b9c0d1e2)
  trip_checklist     — never touched by any later migration; matches
                        current models.py in full
  trip_saved_travel  — never touched by any later migration; matches
                        current models.py in full

trip_waypoints and trip_activity_media are deliberately NOT included here
— they already have proper op.create_table() migrations downstream
(b3f9c1d2e4a5 and d5e6f7a8b9c0 respectively).

Note: the CHECK constraints (ck_trips_status, ck_trip_activities_type,
ck_trip_saved_travel_type) and several single/composite indexes are never
created by any migration in the existing chain either — they're only
inferable from models.py. They're included here since this is the only
place they can enter the migration history, and the goal is for a fresh
database built via this chain to match what current models.py (and the
already-hand-repaired production database) actually has.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision:      str                          = 'd9602e0fa271'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users ──────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id',            sa.Integer(),  nullable=False),
        sa.Column('email',         sa.String(255), nullable=False),
        sa.Column('full_name',     sa.String(100), nullable=False),
        sa.Column('password_hash', sa.String(),    nullable=True),
        sa.Column(
            'created_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_id',    'users', ['id'],    unique=False)
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # ── trips ──────────────────────────────────────────────────────
    op.create_table(
        'trips',
        sa.Column('id',              sa.Integer(),   nullable=False),
        sa.Column('user_id',         sa.Integer(),   nullable=False),
        sa.Column('destination',     sa.String(200), nullable=False),
        sa.Column('start_date',      sa.String(10),  nullable=True),
        sa.Column('end_date',        sa.String(10),  nullable=True),
        sa.Column('duration_days',   sa.Integer(),   nullable=True),
        sa.Column('budget',          sa.Float(),     nullable=True),
        sa.Column('travelers_count', sa.Integer(),   nullable=True),
        sa.Column('status',          sa.String(20),  nullable=True),
        sa.Column('trip_metadata',   postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column(
            'created_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=True,
        ),
        sa.Column(
            'updated_at',
            postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            "status IN ('planning','booked','ongoing','completed','cancelled')",
            name='ck_trips_status',
        ),
    )
    op.create_index('ix_trips_id', 'trips', ['id'], unique=False)

    # ── trip_activities ───────────────────────────────────────────
    op.create_table(
        'trip_activities',
        sa.Column('id',          sa.Integer(),   nullable=False),
        sa.Column('trip_id',     sa.Integer(),   nullable=False),
        sa.Column('day',         sa.Integer(),   nullable=False),
        sa.Column('time',        sa.String(5),   nullable=True),
        sa.Column('type',        sa.String(20),  nullable=False),
        sa.Column('title',       sa.String(200), nullable=False),
        sa.Column('location',    sa.String(200), nullable=True),
        sa.Column('description', sa.Text(),      nullable=True),
        sa.Column('notes',       sa.Text(),      nullable=True),
        sa.Column('booking_ref', sa.String(100), nullable=True),
        sa.Column('sort_order',  sa.Integer(),   nullable=False, server_default=sa.text('0')),
        sa.Column(
            'created_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            "type IN ('activity','dining','flight','hotel','transport')",
            name='ck_trip_activities_type',
        ),
    )
    op.create_index('ix_trip_activities_id',       'trip_activities', ['id'],            unique=False)
    op.create_index('ix_trip_activities_trip_id',  'trip_activities', ['trip_id'],       unique=False)
    op.create_index('ix_trip_activities_trip_day', 'trip_activities', ['trip_id', 'day'], unique=False)

    # ── trip_expenses ────────────────────────────────────────────
    op.create_table(
        'trip_expenses',
        sa.Column('id',          sa.Integer(),      nullable=False),
        sa.Column('trip_id',     sa.Integer(),      nullable=False),
        sa.Column('category',    sa.String(50),     nullable=True),
        sa.Column('description', sa.String(200),    nullable=True),
        sa.Column('amount',      sa.Numeric(10, 2), nullable=False),
        sa.Column('currency',    sa.String(3),      nullable=False, server_default=sa.text("'SGD'")),
        sa.Column('date',        sa.String(10),     nullable=True),
        sa.Column(
            'created_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_trip_expenses_id',      'trip_expenses', ['id'],      unique=False)
    op.create_index('ix_trip_expenses_trip_id', 'trip_expenses', ['trip_id'], unique=False)

    # ── trip_checklist ───────────────────────────────────────────
    op.create_table(
        'trip_checklist',
        sa.Column('id',         sa.Integer(),   nullable=False),
        sa.Column('trip_id',    sa.Integer(),   nullable=False),
        sa.Column('text',       sa.String(300), nullable=False),
        sa.Column('is_checked', sa.Boolean(),   nullable=False, server_default=sa.text('false')),
        sa.Column('sort_order', sa.Integer(),   nullable=False, server_default=sa.text('0')),
        sa.Column(
            'created_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_trip_checklist_id',      'trip_checklist', ['id'],      unique=False)
    op.create_index('ix_trip_checklist_trip_id', 'trip_checklist', ['trip_id'], unique=False)

    # ── trip_saved_travel ────────────────────────────────────────
    op.create_table(
        'trip_saved_travel',
        sa.Column('id',      sa.Integer(),  nullable=False),
        sa.Column('trip_id', sa.Integer(),  nullable=False),
        sa.Column('type',    sa.String(20), nullable=False),
        sa.Column('data',    postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            'created_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            "type IN ('flight','hotel','transport')",
            name='ck_trip_saved_travel_type',
        ),
    )
    op.create_index('ix_trip_saved_travel_id',        'trip_saved_travel', ['id'],               unique=False)
    op.create_index('ix_trip_saved_travel_trip_id',   'trip_saved_travel', ['trip_id'],           unique=False)
    op.create_index('ix_trip_saved_travel_trip_type', 'trip_saved_travel', ['trip_id', 'type'],   unique=False)


def downgrade() -> None:
    # Reverse FK dependency order
    op.drop_index('ix_trip_saved_travel_trip_type', table_name='trip_saved_travel')
    op.drop_index('ix_trip_saved_travel_trip_id',    table_name='trip_saved_travel')
    op.drop_index('ix_trip_saved_travel_id',         table_name='trip_saved_travel')
    op.drop_table('trip_saved_travel')

    op.drop_index('ix_trip_checklist_trip_id', table_name='trip_checklist')
    op.drop_index('ix_trip_checklist_id',      table_name='trip_checklist')
    op.drop_table('trip_checklist')

    op.drop_index('ix_trip_expenses_trip_id', table_name='trip_expenses')
    op.drop_index('ix_trip_expenses_id',      table_name='trip_expenses')
    op.drop_table('trip_expenses')

    op.drop_index('ix_trip_activities_trip_day', table_name='trip_activities')
    op.drop_index('ix_trip_activities_trip_id',  table_name='trip_activities')
    op.drop_index('ix_trip_activities_id',       table_name='trip_activities')
    op.drop_table('trip_activities')

    op.drop_index('ix_trips_id', table_name='trips')
    op.drop_table('trips')

    op.drop_index('ix_users_email', table_name='users')
    op.drop_index('ix_users_id',    table_name='users')
    op.drop_table('users')
