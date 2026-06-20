"""add_activity_diary_columns_and_media_table

Revision ID: d5e6f7a8b9c0
Revises: c4f5d6e7f8a9
Create Date: 2026-06-21 00:00:00.000000

Adds diary/booking columns to trip_activities and creates the
trip_activity_media table for photo/document attachments.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision:      str                          = 'd5e6f7a8b9c0'
down_revision: Union[str, Sequence[str], None] = 'c4f5d6e7f8a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── New diary/booking columns on trip_activities ─────────────
    op.add_column('trip_activities', sa.Column('ai_tip',        sa.Text(),        nullable=True))
    op.add_column('trip_activities', sa.Column('booking_url',   sa.String(500),   nullable=True))
    op.add_column('trip_activities', sa.Column('checked_in_at',  sa.DateTime(timezone=True), nullable=True))
    op.add_column('trip_activities', sa.Column('checked_out_at', sa.DateTime(timezone=True), nullable=True))

    # ── trip_activity_media table ─────────────────────────────────
    op.create_table(
        'trip_activity_media',
        sa.Column('id',          sa.Integer(),    nullable=False),
        sa.Column('activity_id', sa.Integer(),    nullable=False),
        sa.Column('trip_id',     sa.Integer(),    nullable=False),
        sa.Column('media_type',  sa.String(20),   nullable=False),
        sa.Column('storage_url', sa.String(1000), nullable=False),
        sa.Column('filename',    sa.String(255),  nullable=True),
        sa.Column('caption',     sa.String(500),  nullable=True),
        sa.Column('sort_order',  sa.Integer(),    nullable=False, server_default=sa.text('0')),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.CheckConstraint(
            "media_type IN ('photo', 'document')",
            name='ck_trip_activity_media_type',
        ),
        sa.ForeignKeyConstraint(['activity_id'], ['trip_activities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['trip_id'],     ['trips.id'],           ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_trip_activity_media_id'),       'trip_activity_media', ['id'],          unique=True)
    op.create_index('ix_trip_activity_media_activity',        'trip_activity_media', ['activity_id'], unique=False)
    op.create_index('ix_trip_activity_media_trip',            'trip_activity_media', ['trip_id'],     unique=False)


def downgrade() -> None:
    op.drop_index('ix_trip_activity_media_trip',     table_name='trip_activity_media')
    op.drop_index('ix_trip_activity_media_activity', table_name='trip_activity_media')
    op.drop_index(op.f('ix_trip_activity_media_id'), table_name='trip_activity_media')
    op.drop_table('trip_activity_media')

    op.drop_column('trip_activities', 'checked_out_at')
    op.drop_column('trip_activities', 'checked_in_at')
    op.drop_column('trip_activities', 'booking_url')
    op.drop_column('trip_activities', 'ai_tip')
