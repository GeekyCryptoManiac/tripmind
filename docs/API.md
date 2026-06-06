# API Reference

Base URL: `http://localhost:8000` (development) / configured via `FRONTEND_URL` env var in production.

**Authentication:** All protected routes require `Authorization: Bearer <access_token>` header. Tokens are obtained from `/api/auth/register` or `/api/auth/login`.

**Rate limiting:** Endpoints marked ⏱ are limited to **10 requests per minute per IP** via slowapi.

**Interactive docs:** `http://localhost:8000/docs` (Swagger UI) or `http://localhost:8000/redoc` (ReDoc).

---

## Auth — `routers/auth.py` · prefix `/api/auth`

### POST /api/auth/register

Register a new user and receive a token pair.

- **Auth required:** No
- **Request body:**
  ```json
  {
    "email": "string (EmailStr)",
    "password": "string (min 8 chars)",
    "full_name": "string (1–100 chars)"
  }
  ```
- **Response (201):**
  ```json
  {
    "access_token": "string",
    "refresh_token": "string",
    "token_type": "bearer",
    "user": { "id": 1, "email": "...", "full_name": "...", "created_at": "..." }
  }
  ```
- **Errors:** `400` email already registered.

---

### POST /api/auth/login

Authenticate with email and password.

- **Auth required:** No
- **Request body:**
  ```json
  { "email": "string", "password": "string" }
  ```
- **Response (200):** Same `TokenResponse` shape as `/register`.
- **Errors:** `401` invalid credentials.

---

### POST /api/auth/refresh

Exchange a valid refresh token for a new token pair (rotation — old refresh token is invalidated by expiry).

- **Auth required:** No
- **Request body:**
  ```json
  { "refresh_token": "string" }
  ```
- **Response (200):** Same `TokenResponse` shape as `/register`.
- **Errors:** `401` invalid or expired refresh token.

---

### GET /api/auth/me

Return the currently authenticated user.

- **Auth required:** Yes
- **Response (200):**
  ```json
  { "id": 1, "email": "...", "full_name": "...", "created_at": "..." }
  ```

---

## Trips — `routers/trips.py` · prefix `/api/trips`

### GET /api/users/{user_id}/trips

List all trips for a user, ordered by `updated_at` descending.

- **Auth required:** Yes (must match `user_id`)
- **Response (200):**
  ```json
  {
    "trips": [ /* TripResponse[] */ ],
    "total": 3
  }
  ```
- **Errors:** `403` if `current_user.id != user_id`.

---

### POST /api/trips

Create a new trip. Automatically seeds two waypoints (origin at index 0, destination at index 1).

- **Auth required:** Yes
- **Request body:**
  ```json
  {
    "destination": "string (required, 1–200 chars)",
    "origin": "string (default: 'Singapore')",
    "country_code": "string (optional, 2 chars, ISO 3166-1 alpha-2)",
    "start_date": "string (optional, YYYY-MM-DD)",
    "end_date": "string (optional, YYYY-MM-DD)",
    "duration_days": "integer (optional, >0)",
    "budget": "float (optional, >0)",
    "travelers_count": "integer (default: 1, >0)",
    "preferences": "string[] (default: [])",
    "notes": "string (optional, max 2000 chars)"
  }
  ```
- **Response (201):** `TripResponse` (see schema below).

---

### GET /api/trips/{trip_id}

Get a single trip with all related data eagerly loaded.

- **Auth required:** Yes
- **Response (200):** `TripResponse`.
- **Errors:** `404` trip not found, `403` wrong user.

---

### PUT /api/trips/{trip_id}

Partial update — only provided fields are written. Pass only the fields you want to change.

- **Auth required:** Yes
- **Request body:** Any subset of `TripUpdate` fields:
  ```json
  {
    "destination": "string (optional)",
    "origin": "string (optional)",
    "country_code": "string (optional)",
    "start_date": "string (optional)",
    "end_date": "string (optional)",
    "duration_days": "integer (optional)",
    "budget": "float (optional)",
    "travelers_count": "integer (optional)",
    "status": "planning|booked|ongoing|completed|cancelled (optional)",
    "notes": "string (optional)",
    "cover_image_url": "string (optional)",
    "preferences": "string[] (optional)",
    "ai_alerts": "object[] (optional)",
    "ai_recommendations": "object[] (optional)"
  }
  ```
- **Response (200):** Updated `TripResponse`.

---

### DELETE /api/trips/{trip_id}

Delete a trip and all its related data (cascade).

- **Auth required:** Yes
- **Response (204):** No content.

---

### POST /api/trips/{trip_id}/photo

Upload (or replace) a cover photo. Accepts `multipart/form-data`. Max 5 MB. Allowed types: JPEG, PNG, WebP.

- **Auth required:** Yes
- **Request:** `multipart/form-data` with field `file`.
- **Response (200):** Updated `TripResponse` with `cover_image_url` set to `/uploads/{filename}`.
- **Errors:** `400` unsupported content type, `413` file too large.

---

### DELETE /api/trips/{trip_id}/photo

Remove the cover photo. Deletes the file from disk and clears `cover_image_url`.

- **Auth required:** Yes
- **Response (200):** Updated `TripResponse` with `cover_image_url: null`.

---

## Activities — `routers/activities.py` · prefix `/api/trips`

### POST /api/trips/{trip_id}/activities

Add an activity to the itinerary. Automatically sets `sort_order` after the last activity on the same day unless overridden.

- **Auth required:** Yes
- **Request body:**
  ```json
  {
    "day": "integer (required, >0)",
    "time": "string (optional, HH:MM)",
    "type": "activity|dining|flight|hotel|transport (default: activity)",
    "title": "string (required, 1–200 chars)",
    "location": "string (optional)",
    "description": "string (optional)",
    "notes": "string (optional)",
    "booking_ref": "string (optional)",
    "sort_order": "integer (default: 0)"
  }
  ```
- **Response (201):** `ActivityResponse`.

---

### PATCH /api/trips/{trip_id}/activities/{activity_id}

Partial update of one activity.

- **Auth required:** Yes
- **Request body:** Any subset of `ActivityUpdate` (same fields as create, all optional).
- **Response (200):** Updated `ActivityResponse`.

---

### DELETE /api/trips/{trip_id}/activities/{activity_id}

Delete a single activity.

- **Auth required:** Yes
- **Response (204):** No content.

---

### DELETE /api/trips/{trip_id}/activities

Delete **all** activities for a trip. Used by the "Regenerate Itinerary" button.

- **Auth required:** Yes
- **Response (200):**
  ```json
  { "deleted": 12 }
  ```
- **Note:** Returns HTTP 200 with a body, unlike the single-delete which returns 204. See `KNOWN_ISSUES.md` #5.

---

## Expenses — `routers/expenses.py` · prefix `/api/trips`

### POST /api/trips/{trip_id}/expenses

- **Auth required:** Yes
- **Request body:**
  ```json
  {
    "category": "string (optional, max 50)",
    "description": "string (optional, max 200)",
    "amount": "decimal (required, >0, 2 decimal places)",
    "currency": "string (default: 'SGD', exactly 3 chars, ISO 4217)",
    "date": "string (optional, YYYY-MM-DD)"
  }
  ```
- **Response (201):** `ExpenseResponse`.

---

### PATCH /api/trips/{trip_id}/expenses/{expense_id}

- **Auth required:** Yes
- **Request body:** Any subset of expense fields (all optional).
- **Response (200):** Updated `ExpenseResponse`.

---

### DELETE /api/trips/{trip_id}/expenses/{expense_id}

- **Auth required:** Yes
- **Response (204):** No content.

---

## Checklist — `routers/checklist.py` · prefix `/api/trips`

### POST /api/trips/{trip_id}/checklist

- **Auth required:** Yes
- **Request body:**
  ```json
  {
    "text": "string (required, 1–300 chars)",
    "sort_order": "integer (default: 0)"
  }
  ```
- **Response (201):** `ChecklistItemResponse`.

---

### PATCH /api/trips/{trip_id}/checklist/{item_id}

- **Auth required:** Yes
- **Request body:**
  ```json
  {
    "text": "string (optional)",
    "is_checked": "boolean (optional)",
    "sort_order": "integer (optional)"
  }
  ```
- **Response (200):** Updated `ChecklistItemResponse`.

---

### DELETE /api/trips/{trip_id}/checklist/{item_id}

- **Auth required:** Yes
- **Response (204):** No content.

---

## Waypoints — `routers/waypoints.py` · prefix `/api/trips`

### POST /api/trips/{trip_id}/waypoints

Add an intermediate stop. New waypoints are inserted immediately before the destination node. Origin and destination nodes are created automatically on trip creation and cannot be added via this endpoint.

- **Auth required:** Yes
- **Request body:**
  ```json
  {
    "city": "string (required, 1–200 chars)",
    "country": "string (optional)",
    "country_code": "string (optional, 2 chars)",
    "order_index": "integer (optional, ≥0 — server handles placement)",
    "arrival_date": "string (optional, YYYY-MM-DD)",
    "departure_date": "string (optional, YYYY-MM-DD)",
    "notes": "string (optional)"
  }
  ```
- **Response (201):** `WaypointResponse`.
- **Errors:** `400` if the trip does not yet have origin and destination waypoints.

---

### PATCH /api/trips/{trip_id}/waypoints/{waypoint_id}

Update a waypoint. Updating the origin city syncs `trips.origin`. Updating the last waypoint's city syncs `trips.destination`. Cannot move a stop to `order_index=0` (origin position).

- **Auth required:** Yes
- **Request body:** Any subset of waypoint fields (all optional).
- **Response (200):** Updated `WaypointResponse`.

---

### DELETE /api/trips/{trip_id}/waypoints/{waypoint_id}

Delete an intermediate waypoint. Cannot delete the origin (first) or destination (last) node.

- **Auth required:** Yes
- **Response (204):** No content.
- **Errors:** `400` if attempting to delete origin or destination.

---

## Travel — `routers/travel.py` · prefix `/api/trips`

### POST /api/trips/{trip_id}/travel/suggest ⏱

Generate AI travel suggestions (flights, hotels, or local transport) using GPT-4o. Suggestions are not persisted — use `/travel/save` to save one.

- **Auth required:** Yes
- **Rate limit:** 10/minute
- **Request body:**
  ```json
  {
    "type": "flight|hotel|transport",
    "preferences": "string (optional, max 500 chars — e.g. 'prefer budget airlines')"
  }
  ```
- **Response (200):**
  ```json
  {
    "type": "flight",
    "flights": [ /* array of suggestion objects, or null if type != flight */ ],
    "hotels": null,
    "transport": null
  }
  ```
  Each suggestion object has an `id` field prefixed with `ai_` and a `status` of `"ai_suggested"`.

---

### POST /api/trips/{trip_id}/travel/save

Save one AI-generated suggestion to the database.

- **Auth required:** Yes
- **Request body:**
  ```json
  {
    "type": "flight|hotel|transport",
    "data": { /* full suggestion object from suggestTravel */ }
  }
  ```
- **Response (201):** `SavedTravelResponse`.

---

### DELETE /api/trips/{trip_id}/travel/{item_id}

Delete a previously saved travel suggestion.

- **Auth required:** Yes
- **Response (204):** No content.

---

## Overview — `routers/overview.py` · prefix `/api/trips`

### POST /api/trips/{trip_id}/overview/alerts ⏱

Generate 5 AI travel alerts for a trip (visa, safety, health, weather, local laws). The result is persisted to `trips.ai_alerts` and returned.

- **Auth required:** Yes
- **Rate limit:** 10/minute
- **Request body:** None
- **Response (200):**
  ```json
  {
    "alerts": [
      {
        "id": "alert_abc12345",
        "category": "visa|safety|health|weather|local_laws|general",
        "severity": "info|warning|critical",
        "title": "string",
        "description": "string"
      }
    ]
  }
  ```
- **Errors:** `500` if GPT-4o returns malformed JSON.

---

### POST /api/trips/{trip_id}/overview/recommendations ⏱

Generate 6 personalised travel recommendations for a trip (must-see, food, hidden gem, practical). The result is persisted to `trips.ai_recommendations` and returned.

- **Auth required:** Yes
- **Rate limit:** 10/minute
- **Request body:** None
- **Response (200):**
  ```json
  {
    "recommendations": [
      {
        "id": "rec_def67890",
        "category": "must_see|food|hidden_gem|practical",
        "title": "string",
        "description": "string",
        "tip": "string"
      }
    ]
  }
  ```
- **Errors:** `500` if GPT-4o returns malformed JSON.

---

## Chat — `routers/chat.py`

### POST /api/chat ⏱

Send a message to the TripMind AI agent. The agent decides which tool to call (create trip, generate itinerary, update trip, etc.) based on the message and conversation history. Full conversation history must be sent on every request — the backend is stateless.

- **Auth required:** Yes
- **Rate limit:** 10/minute
- **Request body:**
  ```json
  {
    "message": "string (required, min 1 char)",
    "trip_id": "integer (optional) — if provided, agent is given this trip as context",
    "chat_history": [
      { "role": "user|assistant", "content": "string" }
    ]
  }
  ```
- **Response (200):**
  ```json
  {
    "message": "string — agent's reply",
    "action_taken": "created_trip|updated_trip|generated_itinerary|retrieved_trips|answered_question|error",
    "trip_data": { /* TripResponse or null */ }
  }
  ```
  `trip_data` is populated when a `trip_id` was provided and the agent modified or retrieved the trip.

---

## Health

### GET /

- **Auth required:** No
- **Response (200):** `{ "status": "online", "service": "TripMind API", "version": "2.0.0" }`

### GET /health

- **Auth required:** No
- **Response (200):** `{ "status": "healthy", "database": "connected" }` or `{ "status": "healthy", "database": "error: ..." }`

---

## Common Response Schemas

### TripResponse

```json
{
  "id": 1,
  "user_id": 1,
  "destination": "Tokyo",
  "origin": "Singapore",
  "country_code": "JP",
  "start_date": "2026-12-01",
  "end_date": "2026-12-10",
  "duration_days": 9,
  "budget": 3000.0,
  "travelers_count": 2,
  "status": "planning",
  "notes": "...",
  "cover_image_url": "/uploads/trip_1_abc123.jpg",
  "preferences": ["foodie", "culture"],
  "activities": [ /* ActivityResponse[] */ ],
  "expenses": [ /* ExpenseResponse[] */ ],
  "checklist_items": [ /* ChecklistItemResponse[] */ ],
  "saved_travel": [ /* SavedTravelResponse[] */ ],
  "waypoints": [ /* WaypointResponse[] */ ],
  "ai_alerts": [ /* object[] */ ],
  "ai_recommendations": [ /* object[] */ ],
  "created_at": "2026-06-01T10:00:00Z",
  "updated_at": "2026-06-06T12:00:00Z"
}
```

### ActivityResponse

```json
{
  "id": 1, "trip_id": 1, "day": 1, "time": "14:00",
  "type": "activity", "title": "Check in to hotel",
  "location": "Shinjuku", "description": "...", "notes": "...",
  "booking_ref": null, "sort_order": 0, "created_at": "..."
}
```

### WaypointResponse

```json
{
  "id": 1, "trip_id": 1, "order_index": 0, "city": "Singapore",
  "country": "Singapore", "country_code": "SG",
  "arrival_date": null, "departure_date": "2026-12-01",
  "notes": null, "created_at": "..."
}
```
