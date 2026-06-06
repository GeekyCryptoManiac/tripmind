# Architecture Decision Records

Six ADRs covering the key design decisions in TripMind. Each record captures the context at the time the decision was made, what was decided, what it costs, and what was considered but rejected.

---

## ADR-001 — Stateless chat history

**Status:** Accepted

**Context:**
The TripMind agent needs conversation context to understand follow-up messages like "update it to December" or "actually, make the budget $3000". The backend uses FastAPI with a stateless request/response model. There is no WebSocket or persistent connection between the frontend and backend, and no in-process session store.

Two approaches were considered: store conversation history server-side (in a DB table or Redis) keyed to a session ID, or have the frontend send the full history on every request.

**Decision:**
The frontend maintains the full conversation history in React state and sends it as `chat_history: [{role, content}]` on every `POST /api/chat` request. The backend converts this list into LangChain `HumanMessage` / `AIMessage` objects and injects them into the `MessagesPlaceholder` in the agent prompt. The backend is fully stateless — no session table, no Redis, no session ID.

**Consequences:**
- Every request carries the full conversation payload. For a long conversation this can be a few kilobytes, which is negligible for a typical HTTP request but increases token consumption for the LLM.
- Context is naturally bounded by the model's context window. Very long conversations (>100 turns) may start truncating early history.
- The frontend is the single source of truth for chat history. Refreshing the page clears the conversation. Cross-device continuation is not possible without persisting history to the backend.
- No backend session management code. No Redis dependency. Horizontal scaling works trivially — any instance can handle any request.
- Aligns with how OpenAI's chat completions API works natively (the full `messages` array is always sent).

**Alternatives considered:**
- **Server-side session store (Redis):** Would enable cross-device persistence and page-refresh recovery, but introduces a Redis dependency, a session creation endpoint, TTL management, and a foreign key relationship between sessions and users. Significantly more infrastructure for an MVP feature.
- **Store history in a `conversations` DB table:** Same persistence benefits as Redis but slower reads. Would also need a conversation cleanup job. Not warranted for the current usage scale.

---

## ADR-002 — JSONB for `ai_alerts` and `ai_recommendations`

**Status:** Accepted

**Context:**
The overview tab generates two sets of AI output per trip: 5 travel alerts and 6 personalized recommendations. These are generated wholesale by GPT-4o and displayed as cards. The question was whether to store them in normalized tables (`trip_alerts`, `trip_recommendations`) or as JSONB columns on the `trips` table.

**Decision:**
Store both as JSONB columns on the `trips` table: `ai_alerts` and `ai_recommendations`, both `JSONB NOT NULL DEFAULT '[]'`. They are written via `TripService.save_ai_alerts()` and `TripService.save_ai_recommendations()`, which overwrite the entire column on each call.

**Consequences:**
- No additional tables, no joins, no migrations for adding or changing alert/recommendation fields.
- The GPT-4o response shape is not constrained at the DB level — new fields from the prompt can be added without a schema migration.
- Alert and recommendation objects are always fetched as part of the trip row. No N+1 query risk.
- Individual alerts and recommendations cannot be addressed by a stable DB-level ID. The frontend relies on the `id` field embedded in the JSON object (e.g. `"alert_abc12345"`).
- Cannot run SQL aggregate queries on individual alert fields (e.g. `COUNT(*) WHERE category = 'visa'`). This is not a current requirement.
- Regenerating alerts overwrites all previous data. There is no audit trail of past alert generations.

**Alternatives considered:**
- **Normalized `trip_alerts` and `trip_recommendations` tables:** Would enable individual addressing (edit one alert, delete one recommendation), but none of these operations are exposed in the UI. The extra tables and joins would add complexity for no functional gain. Revisit if alert management features are added.

---

## ADR-003 — GPT-4o via LangChain function-calling agent instead of direct SDK

**Status:** Accepted

**Context:**
The AI chat feature needs to interpret natural language and take actions: create trips, update them, generate itineraries, retrieve data. The question was whether to write a custom routing layer (parse intent from the message, call the right function) or use a framework that handles this via LLM function calling.

**Decision:**
Use LangChain's `create_openai_functions_agent` with `AgentExecutor`. The agent is given 6 tools as `StructuredTool` objects. GPT-4o receives the tool schemas in the system prompt and returns function-call objects; LangChain dispatches the tool calls and feeds results back to the model. The application code defines tool functions and their argument types; the routing logic lives in GPT-4o.

**Consequences:**
- No hand-written intent classifier or routing logic. Adding a new capability means adding a new `StructuredTool` — GPT-4o learns to use it from the description string.
- The agent can handle multi-step reasoning (e.g. "update my Japan trip budget to $2000" → the agent may first call `get_user_trips` to find the trip ID, then call `update_trip`).
- LangChain adds a dependency layer between the application and the OpenAI SDK. API changes in LangChain or the underlying `langchain_openai` package require updating both.
- `AgentExecutor` with `verbose=True` logs every tool call and result to stdout, which is useful for debugging but noisy in production.
- Synchronous tool functions run in a thread pool executor inside `ainvoke`. `generate_itinerary` must create its own `SessionLocal()` session because the request-scoped session is not thread-safe across async boundaries (see `tools.py` docstring).
- `max_iterations=5` caps the agent's reasoning depth. Pathological inputs could exhaust iterations and return a partial result.
- LangChain version pinning is required. LangChain has a history of breaking changes between minor versions.

**Alternatives considered:**
- **Direct OpenAI SDK with manual tool dispatch:** More control and fewer dependencies. Requires writing the routing table and argument parsing manually. For 6 tools this is feasible, but scaling to 15+ tools becomes unwieldy. Chose LangChain for the declarative tool definition pattern.
- **Structured output prompting (no tools):** Prompt GPT-4o to return JSON with an `action` field and arguments, then dispatch in application code. Simpler but less reliable — the model can return malformed or ambiguous JSON. Function calling is more robust.

---

## ADR-004 — Single `TripService` class instead of per-resource service classes

**Status:** Accepted

**Context:**
After the Phase 2 router refactor, all database operations were consolidated into one service class (`TripService`) rather than splitting into `ActivityService`, `ExpenseService`, `WaypointService`, etc.

**Decision:**
Keep all trip-related DB operations in a single `TripService` class in `backend/app/services/trip_service.py`. The class is instantiated per request with `TripService(db)`. Routers and agent tools both call the same service instance.

**Consequences:**
- The `trip_service.py` file is long (~540 lines) but fully navigable by section comments.
- Every write method calls `get_trip_or_404(trip_id, user_id)` first, which enforces ownership checks consistently across all resources without duplication.
- The agent tools and the HTTP handlers use the same code path for every DB write. There is no risk of the agent writing to the DB differently from the API.
- Testing `TripService` tests all DB operations in one place without needing to import from multiple modules.
- Cross-resource operations (e.g. `delete_all_activities` also calls `_touch(trip)`) are straightforward because all state is in one class.
- Adding a new resource (e.g. trip notes revisions) means adding methods to one file. There is no new module structure to decide on.

**Alternatives considered:**
- **Per-resource service classes (`ActivityService`, `ExpenseService`, etc.):** More modular in principle, but for a data model where every child resource is owned by a trip and nearly every operation needs `get_trip_or_404`, it means the trip lookup logic is duplicated or the services need to call each other. The single-class approach avoids this coordination problem at this scale.

---

## ADR-005 — JWT with separate access (30 min) + refresh (7 day) tokens

**Status:** Accepted

**Context:**
The app needs authenticated sessions that persist across page refreshes without requiring the user to log in frequently. The options were: long-lived access tokens, short-lived access tokens with a refresh mechanism, or session cookies.

**Decision:**
Issue two tokens on login/register: a short-lived **access token** (30 minutes, `type: "access"`) and a long-lived **refresh token** (7 days, `type: "refresh"`). Both are HS256 JWTs signed with `SECRET_KEY`. The Axios client has a response interceptor that silently refreshes expired access tokens using the stored refresh token, queuing any concurrent requests until the new token arrives.

**Consequences:**
- Access token compromise window is limited to 30 minutes. A stolen access token cannot be used indefinitely.
- The refresh flow is transparent to the user — they stay logged in for 7 days without re-entering credentials.
- The `type` claim in the JWT payload prevents a refresh token from being used as an access token and vice versa.
- Refresh tokens are not revocable without a server-side blocklist. If a refresh token is stolen, it is valid for its full 7-day lifetime.
- There is no refresh token rotation on every use — the same refresh token is used until it expires. This means a stolen refresh token is valid for its remaining TTL.
- Rotating `SECRET_KEY` invalidates all active sessions (all tokens). This is acceptable for an MVP but would require a key rotation strategy in production.
- Tokens are stored in `localStorage`. This is vulnerable to XSS. An `httpOnly` cookie would be more secure but complicates the refresh flow and CORS configuration.

**Alternatives considered:**
- **Long-lived access tokens (7 days, no refresh):** Simpler implementation, but a stolen token is usable for the full 7 days with no recourse.
- **Session cookies (server-side sessions):** More secure against XSS if `httpOnly`. Requires server-side session storage (DB table or Redis), which adds infrastructure and makes horizontal scaling more complex.
- **OAuth / third-party auth (Google, GitHub):** Would eliminate password management entirely. Out of scope for the initial build; the auth layer is structured to accommodate this in future.

---

## ADR-006 — Disk-based photo storage (current state, not ideal)

**Status:** Accepted (with known limitations — see `KNOWN_ISSUES.md` #1)

**Context:**
Trip cover photos need to be stored somewhere and served back to the frontend. The options were: object storage (S3, R2), a CDN, a database blob column, or local disk.

**Decision:**
Store uploaded photos on the local filesystem at `backend/uploads/`. Files are written by the trip photo upload handler in `routers/trips.py` using `(UPLOAD_DIR / filename).write_bytes(content)`. They are served by FastAPI's `StaticFiles` mounted at `/uploads`. The URL `/uploads/{filename}` is stored in `trips.cover_image_url`.

The file is named `trip_{trip_id}_{uuid4_hex}.{ext}` to avoid collisions. The old file is deleted from disk when a new photo is uploaded or the photo is removed.

**Consequences:**
- Zero external dependencies — no S3 bucket, no CDN configuration, no IAM permissions. Works immediately in development.
- Photos are lost on container rebuild or redeploy. In the current single-instance EC2 deployment this is mitigated by the Docker volume mount, but is fragile.
- Does not scale horizontally. A second instance would not have access to photos uploaded by the first.
- The `UPLOAD_DIR` path calculation differs between `main.py` (2 levels up from `app/`) and `routers/trips.py` (3 levels up from `app/routers/`). This is a correctness footgun documented in the Phase 2 refactor notes.
- 5 MB file size limit is enforced in application code, not by a reverse proxy or CDN edge.

**Alternatives considered:**
- **AWS S3:** Correct long-term solution. Persistent, scalable, CDN-friendly. Requires S3 bucket, IAM role, and `boto3` dependency. The `set_cover_image()` service method already accepts a URL string, so migrating to S3 only requires changing the upload handler in `routers/trips.py` — the service layer does not need to change.
- **Database BLOB column:** Avoids filesystem management but puts binary data in PostgreSQL, inflating backup sizes and adding TOAST overhead. Not appropriate for images.
- **Cloudflare R2:** Same API as S3, no egress fees. Viable alternative to S3 with minor SDK differences.
