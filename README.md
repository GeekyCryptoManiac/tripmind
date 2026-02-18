# TripMind - AI Travel Planning Assistant

AI-powered travel companion using agentic workflows and LLM function calling.

## Tech Stack

**Backend:**
- FastAPI + PostgreSQL
- LangChain + OpenAI GPT-4
- SQLAlchemy ORM

**Frontend:**
- React + TypeScript
- Tailwind CSS
- Vite

## Project Structure
```
tripmind/
├── backend/          # FastAPI backend with AI agent
├── frontend/         # React frontend
└── README.md
```

## Setup Instructions

See individual README files in `backend/` and `frontend/` directories.

## Development Roadmap

- [x] Week 1-2: MVP with single agent
- [ ] Week 3: Flight search integration
- [ ] Week 4: Hotel search + itinerary
- [ ] Week 5: Web intelligence
- [ ] Week 6: Multi-agent system
- [ ] Week 7: Real-time features
- [ ] Week 8: Production deployment

## Author

Year 2 Software Engineering Student Portfolio Project
# ✈️ TripMind

**Full-stack travel planner with agentic AI**

I built TripMind to explore what it actually feels like to wire a real agentic AI workflow into a production app — not just an API call that returns text, but a multi-tool agent that reasons, plans, and persists state across a conversation. It turned into one of the more interesting things I've built.

**Live demo:** [tripmind-main.vercel.app](https://tripmind-main.vercel.app)

![TripMind Dashboard](./docs/screenshots/dashboard.png)

---

## What it does

You chat with an AI that genuinely understands travel planning context. Tell it "I want to go to Japan in March with a $2000 budget" and it plans the trip, saves it to the database, and colours Japan on your world map — all in one message. Follow up with "actually make it April" and it updates the existing trip instead of creating a duplicate.

Under the hood, a LangChain agent with six tools decides what to do with each message: create a trip, update one, retrieve your trips, generate a full day-by-day itinerary, or just answer a travel question. The agent carries conversation history across turns so context isn't lost between messages.

**Core features:**

- **Conversational trip planning** — describe a trip in natural language, the agent extracts and saves the details
- **Chat memory** — full conversation history passed to the agent on every turn, so "update it to December" works correctly
- **Duplicate detection** — before inserting, checks if a trip to the same destination already exists; upserts if same month/year, inserts if different dates (two legitimate trips), asks for clarification if genuinely ambiguous
- **Itinerary generation** — GPT-4 generates a structured day-by-day itinerary with activities, mock flights, and hotels, saved directly to the trip
- **Interactive world map** — countries colour-coded by trip status (planning / booked / completed); city-based destinations (e.g. "Moscow") resolve to the correct country via ISO alpha-3 codes stored at save time
- **Expense tracker** — log expenses in any currency, converted to USD for totals
- **Pre-trip checklist** — persistent checklist saved per trip
- **PDF export** — one-click export of the full trip plan
- **Input guardrails** — destination validation (no fictional places or space travel), currency clarification, past date detection, duplicate budget confirmation

---

## Tech stack

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-121212?style=flat)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-131415?style=flat&logo=railway&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

| Layer | Stack |
|---|---|
| Backend | FastAPI + SQLAlchemy 2.x + PostgreSQL |
| AI | LangChain `create_openai_functions_agent` + GPT-4 Turbo |
| Frontend | React 19 + TypeScript + Tailwind CSS + Framer Motion |
| Map | react-simple-maps (SVG world map, ISO alpha-3 country codes) |
| Auth | UUID-based guest identity (real auth scaffolded, ready to wire) |
| Hosting | Railway (backend + DB) · Vercel (frontend) |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Frontend (Vercel)                │
│                                                     │
│  ChatInterface → chatService → apiService           │
│       ↑                            ↓                │
│  messages state             POST /api/chat           │
│  (passed as chat_history)   { message, user_id,     │
│                               trip_id,              │
│                               chat_history }        │
└──────────────────────────┬──────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────┐
│                  Backend (Railway)                   │
│                                                     │
│  FastAPI /api/chat                                  │
│       ↓                                             │
│  TripMindAgent(db, user_id, trip_id)                │
│       ↓                                             │
│  LangChain AgentExecutor                            │
│  system prompt + chat_history + input               │
│       ↓                                             │
│  GPT-4 decides which tool to call                   │
│       ↓                                             │
│  ┌──────────────────────────────────┐               │
│  │ Tools (SQLAlchemy → PostgreSQL)  │               │
│  │  • plan_trip    • update_trip    │               │
│  │  • get_trips    • get_trip_details│              │
│  │  • generate_itinerary            │               │
│  │  • answer_question               │               │
│  └──────────────────────────────────┘               │
└─────────────────────────────────────────────────────┘
```

---

## Screenshots

| | |
|---|---|
| ![Chat](./docs/screenshots/chat.png) | ![Trip Details](./docs/screenshots/trip-details.png) |
| *Conversational trip planning* | *Trip details with itinerary* |
| ![World Map](./docs/screenshots/map.png) | ![Expense Tracker](./docs/screenshots/expenses.png) |
| *Interactive world map* | *Expense tracker with currency conversion* |

---

## Local setup

**Prerequisites:** Python 3.11, Node.js 18+, PostgreSQL

### Backend

```bash
# Clone and navigate
git clone https://github.com/your-username/tripmind.git
cd tripmind/backend

# Create virtual environment (Python 3.11 required — 3.13 breaks some AI packages)
python3.11 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Fill in: DATABASE_URL, OPENAI_API_KEY, SECRET_KEY, FRONTEND_URL

# Run
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd tripmind/frontend

# Install dependencies (legacy-peer-deps required for react-simple-maps + React 19)
npm install

# Set environment variables
cp .env.example .env
# Fill in: VITE_API_URL=http://localhost:8000

# Run
npm run dev
```

API docs available at `http://localhost:8000/docs` once the backend is running.

### Environment variables

**Backend (`.env`)**
```
DATABASE_URL=postgresql://user:password@localhost:5432/tripmind
OPENAI_API_KEY=sk-...
SECRET_KEY=<32-byte hex>
FRONTEND_URL=http://localhost:5173
```

**Frontend (`.env`)**
```
VITE_API_URL=http://localhost:8000
```

---

## Known limitations

- **No real authentication** — users are identified by a UUID stored in localStorage. Trips persist across refreshes on the same browser but not across devices. Real auth is scaffolded (`UserContext` has the full interface ready) but not wired up yet.
- **Itinerary generation capped at 5 days** — longer trips generate the first 5 days only. GPT-4's context window handles more, but response time and token cost made this a reasonable tradeoff for an MVP.
- **City-to-country resolution** — new trips resolve destination → ISO country code via the agent at save time. Trips created before this feature was added fall back to a static lookup table; obscure destinations not in the table won't appear on the map.
- **Mock flights and hotels** — the itinerary generator creates realistic-looking but entirely fictional booking references. No real booking API is integrated.
- **No rate limiting** — the `/api/chat` endpoint calls GPT-4 on every message with no throttling. Fine for a demo, would need rate limiting before any real traffic.

---

## Roadmap

Things I want to explore next:

- [ ] Real auth (JWT or OAuth) — the groundwork is already there
- [ ] Streaming responses — pipe GPT-4 tokens to the frontend as they arrive instead of waiting for the full response
- [ ] Trip sharing — share a read-only trip plan via a public URL
- [ ] Real flight/hotel search — integrate an actual travel API (Amadeus, Skyscanner)
- [ ] Mobile app — the backend is fully API-driven, a React Native frontend would be a natural extension
- [ ] Multi-language support — the agent already handles non-English input reasonably well

---

## What I learned

The interesting problems weren't the ones I expected. Getting GPT-4 to call the right tool was straightforward — the hard parts were:

- **Stateless agents** — each request is a fresh agent instance. Passing conversation history as `HumanMessage`/`AIMessage` objects into the `MessagesPlaceholder` was the fix, but the shape of the data has to be exactly right or the agent ignores it silently.
- **Duplicate trip detection** — "France" vs "France in June 2026" vs "Paris" all require different handling. The deduplication logic went through several iterations before it handled all the edge cases correctly.
- **SQLAlchemy 2.x JSON fields** — mutating a JSON column in place doesn't trigger a dirty check. You have to copy the dict, modify it, reassign, and call `flag_modified()` or the change never gets committed.
- **Python version compatibility** — `psycopg2` and several AI packages don't have wheels for Python 3.13 yet. Pinning to 3.11 was the only reliable fix during deployment.

---

*Built by Daffa — Year 2 Software Engineering, Singapore Institute of Technology*
