# Entity-Relationship Diagram

7 tables. All foreign keys use `ON DELETE CASCADE`. All timestamps are `TIMESTAMPTZ` (timezone-aware).

---

## Tables

### `users`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PK, index | |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL, index | |
| `full_name` | VARCHAR(100) | NOT NULL | |
| `password_hash` | VARCHAR | nullable | Nullable to support legacy guest rows |
| `created_at` | TIMESTAMPTZ | NOT NULL, server_default=now() | |

---

### `trips`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PK, index | |
| `user_id` | INTEGER | FK → `users.id`, NOT NULL, index | Cascades on user delete |
| `destination` | VARCHAR(200) | NOT NULL | Mirrors the last waypoint's city |
| `origin` | VARCHAR(200) | NOT NULL, server_default='Singapore' | Mirrors the first waypoint's city |
| `country_code` | VARCHAR(2) | nullable | ISO 3166-1 alpha-2 |
| `start_date` | VARCHAR(10) | nullable | Stored as `YYYY-MM-DD` string |
| `end_date` | VARCHAR(10) | nullable | |
| `duration_days` | INTEGER | nullable | |
| `budget` | FLOAT | nullable | |
| `travelers_count` | INTEGER | NOT NULL, default=1 | |
| `status` | VARCHAR(20) | NOT NULL, default='planning' | CHECK: `planning\|booked\|ongoing\|completed\|cancelled` |
| `notes` | TEXT | nullable | |
| `cover_image_url` | TEXT | nullable | `/uploads/{filename}` or NULL |
| `preferences` | JSONB | NOT NULL, server_default='[]' | Array of preference strings |
| `ai_alerts` | JSONB | NOT NULL, server_default='[]' | See JSONB rationale below |
| `ai_recommendations` | JSONB | NOT NULL, server_default='[]' | See JSONB rationale below |
| `created_at` | TIMESTAMPTZ | NOT NULL, server_default=now() | |
| `updated_at` | TIMESTAMPTZ | nullable, onupdate=now() | |

**Indexes:**
- `ix_trips_user_updated` — composite on `(user_id, updated_at)` — trips list is always filtered by user and sorted by recency.

---

### `trip_activities`

One row per itinerary activity. Was `trips.trip_metadata.itinerary[day].activities[n]`.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PK, index | |
| `trip_id` | INTEGER | FK → `trips.id`, NOT NULL, index | |
| `day` | INTEGER | NOT NULL | 1-based day number |
| `time` | VARCHAR(5) | nullable | `HH:MM` 24-hour; NULL for all-day items |
| `type` | VARCHAR(20) | NOT NULL, default='activity' | CHECK: `activity\|dining\|flight\|hotel\|transport` |
| `title` | VARCHAR(200) | NOT NULL | |
| `location` | VARCHAR(200) | nullable | |
| `description` | TEXT | nullable | |
| `notes` | TEXT | nullable | |
| `booking_ref` | VARCHAR(100) | nullable | |
| `sort_order` | INTEGER | NOT NULL, default=0 | Enables drag-and-drop reordering within a day |
| `created_at` | TIMESTAMPTZ | NOT NULL, server_default=now() | |

**Indexes:**
- `ix_trip_activities_trip_day` — composite on `(trip_id, day)` — most reads are "all activities for trip X on day Y".

---

### `trip_expenses`

One row per expense entry. Was `trips.trip_metadata.expenses[n]`.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PK, index | |
| `trip_id` | INTEGER | FK → `trips.id`, NOT NULL, index | |
| `category` | VARCHAR(50) | nullable | `food`, `transport`, `accommodation`, etc. |
| `description` | VARCHAR(200) | nullable | |
| `amount` | NUMERIC(10,2) | NOT NULL | `NUMERIC` not `FLOAT` — avoids rounding errors in SUM queries |
| `currency` | VARCHAR(3) | NOT NULL, default='SGD' | ISO 4217 currency code |
| `date` | VARCHAR(10) | nullable | `YYYY-MM-DD` |
| `created_at` | TIMESTAMPTZ | NOT NULL, server_default=now() | |

---

### `trip_checklist`

One row per checklist item. Was `trips.trip_metadata.checklist[n]`.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PK, index | |
| `trip_id` | INTEGER | FK → `trips.id`, NOT NULL, index | |
| `text` | VARCHAR(300) | NOT NULL | |
| `is_checked` | BOOLEAN | NOT NULL, default=False | |
| `sort_order` | INTEGER | NOT NULL, default=0 | |
| `created_at` | TIMESTAMPTZ | NOT NULL, server_default=now() | |

---

### `trip_saved_travel`

One row per saved travel suggestion (flight, hotel, or transport). Was `trips.trip_metadata.flights[n]` / `hotels[n]` / `transport[n]`.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PK, index | |
| `trip_id` | INTEGER | FK → `trips.id`, NOT NULL, index | |
| `type` | VARCHAR(20) | NOT NULL | CHECK: `flight\|hotel\|transport` |
| `data` | JSONB | NOT NULL | Full AI-returned suggestion object (schema varies by type) |
| `created_at` | TIMESTAMPTZ | NOT NULL, server_default=now() | |

`data` shapes by type:
- `flight` → `{ airline, flight_number, from, to, departure, arrival, duration, estimated_price, currency, cabin, notes, status }`
- `hotel` → `{ name, location, area, star_rating, price_per_night, currency, highlights, check_in, check_out, notes, status }`
- `transport` → `{ type, title, description, estimated_cost, cost_unit, currency, pros, notes, status }`

**Indexes:**
- `ix_trip_saved_travel_trip_type` — composite on `(trip_id, type)` — fetching all saved flights for a trip filters by both columns.

---

### `trip_waypoints`

One ordered stop in a multi-city trip route.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PK, index | |
| `trip_id` | INTEGER | FK → `trips.id`, NOT NULL, index | |
| `order_index` | INTEGER | NOT NULL | 0 = origin, last = destination |
| `city` | VARCHAR(200) | NOT NULL | |
| `country` | VARCHAR(100) | nullable | |
| `country_code` | VARCHAR(2) | nullable | ISO 3166-1 alpha-2 |
| `arrival_date` | VARCHAR(10) | nullable | `YYYY-MM-DD` |
| `departure_date` | VARCHAR(10) | nullable | |
| `notes` | TEXT | nullable | |
| `created_at` | TIMESTAMPTZ | NOT NULL, server_default=now() | |

**Indexes:**
- `ix_trip_waypoints_trip_order` — composite on `(trip_id, order_index)`.

---

## Relationships

```
users (1) ──────────────────────── (N) trips
                                         │
                         ┌───────────────┼───────────────────┐
                         │               │                   │
                    (N) trip_activities  │              (N) trip_waypoints
                                    (N) trip_expenses
                                    (N) trip_checklist
                                    (N) trip_saved_travel
```

All child tables reference `trips.id` with `ON DELETE CASCADE`, so deleting a trip removes all its related rows atomically.

---

## JSONB Rationale

Three columns on `trips` use JSONB instead of normalized child tables:

### `trips.preferences`

An array of freeform preference strings (e.g. `["adventure", "foodie", "budget"]`). Always read and written as a whole array — individual items are never addressed by ID or queried independently. A separate `trip_preferences` table would add a join and migration overhead for no benefit. JSONB preserves the list structure and supports PostgreSQL `@>` containment queries if preference-based filtering is ever added.

### `trips.ai_alerts`

An array of travel alert objects generated by GPT-4o (visa, safety, health, weather, local laws). Alerts are regenerated wholesale each time the user refreshes the panel — `TripService.save_ai_alerts()` overwrites the entire column. Individual alerts are never updated, deleted, or individually queried. Storing them in JSONB co-locates the cache with the trip row it belongs to and avoids a join on every trip load.

### `trips.ai_recommendations`

Same pattern as `ai_alerts`. Personalized recommendations (must-see, food, hidden gem, practical) are always regenerated as a batch and always read as a full list. JSONB is appropriate for data that is consistently read and written as an atomic blob.

**What was not kept as JSONB:** Activities, expenses, checklist items, and saved travel suggestions were extracted into proper tables during the Phase 1 DB normalization (commit `a3f632e`). These needed individual CRUD — the UI can check off a single checklist item, delete a single expense, or reorder activities — which requires addressable rows.

---

## Waypoint Seeding Behaviour

Every call to `TripService.create_trip()` automatically inserts two `TripWaypoint` rows immediately after the `Trip` row is flushed to get its `id`:

```
TripWaypoint(trip_id=trip.id, order_index=0, city=data.origin)
TripWaypoint(trip_id=trip.id, order_index=1, city=data.destination, country_code=data.country_code)
```

This means every trip starts with a minimal two-node route: `origin → destination`. The `trips.origin` and `trips.destination` columns are cache copies of these waypoint cities. When a waypoint is updated or deleted, `TripService.update_waypoint()` recomputes `trips.origin` and `trips.destination` from the current waypoint list.

Origin (index 0) and destination (last index) cannot be deleted — only edited. New intermediate stops are always inserted immediately before the destination node.
