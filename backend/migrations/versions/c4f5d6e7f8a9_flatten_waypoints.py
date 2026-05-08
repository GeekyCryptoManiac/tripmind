"""flatten_waypoints_seed_endpoints

Revision ID: c4f5d6e7f8a9
Revises: b3f9c1d2e4a5
Create Date: 2026-05-08 00:00:00.000000

Seeds origin and destination as waypoints (index 0 and last) for all
existing trips, making trip_waypoints the single source of truth for
the full route. Existing middle stops are shifted +1 to make room.
"""
from typing import Sequence, Union
from alembic import op

revision:      str                          = 'c4f5d6e7f8a9'
down_revision: Union[str, Sequence[str], None] = 'b3f9c1d2e4a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Shift existing middle stops up to make room for origin at index 0
    op.execute("UPDATE trip_waypoints SET order_index = order_index + 1")

    # Insert origin at index 0 for every trip
    op.execute("""
        INSERT INTO trip_waypoints (trip_id, order_index, city, created_at)
        SELECT id, 0, origin, NOW()
        FROM trips
    """)

    # Insert destination at (current max + 1) for every trip
    op.execute("""
        INSERT INTO trip_waypoints (trip_id, order_index, city, country_code, created_at)
        SELECT
            t.id,
            (SELECT COALESCE(MAX(tw.order_index), -1) + 1
             FROM trip_waypoints tw
             WHERE tw.trip_id = t.id),
            t.destination,
            t.country_code,
            NOW()
        FROM trips t
    """)


def downgrade() -> None:
    # Remove the seeded endpoint rows (index 0 = origin, max index = destination)
    op.execute("""
        DELETE FROM trip_waypoints
        WHERE id IN (
            SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (PARTITION BY trip_id ORDER BY order_index ASC)  AS rn_asc,
                       ROW_NUMBER() OVER (PARTITION BY trip_id ORDER BY order_index DESC) AS rn_desc
                FROM trip_waypoints
            ) ranked
            WHERE rn_asc = 1 OR rn_desc = 1
        )
    """)
    # Shift remaining middle stops back down
    op.execute("UPDATE trip_waypoints SET order_index = order_index - 1")
