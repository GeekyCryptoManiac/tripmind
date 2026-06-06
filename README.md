# TripMind

AI-powered trip planning application. Users describe where they want to go and a GPT-4o agent creates the trip, builds a day-by-day itinerary, and stores everything in a normalized PostgreSQL database. A React frontend provides trip management, expense tracking, checklist, multi-city waypoints, and AI-generated travel suggestions and alerts.

**Live demo:** [tripmind-main.vercel.app](https://tripmind-main.vercel.app)

---

## Tech Stack

| Layer | Technology |
|---|---|
| API framework | FastAPI 0.115 |
| Language | Python 3.11+ |
| ORM | SQLAlchemy 2.0 |
| Database | PostgreSQL 15 |
| Migrations | Alembic |
| AI agent | LangChain 0.3 + `create_openai_functions_agent` |
| LLM | OpenAI GPT-4o (`gpt-4o`) |
| Auth | JWT HS256 via `python-jose`, bcrypt passwords |
| Rate limiting | slowapi |
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS 3 |
| HTTP client | Axios 1.x (with silent 401 refresh interceptor) |
| Animations | Framer Motion 12 |
| Routing | React Router DOM v7 |
| PDF export | jsPDF + jspdf-autotable |
| Infrastructure | AWS EC2 (Docker), GitHub Actions CI/CD, AWS SSM Parameter Store |

---

## Local Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15 running locally
- An OpenAI API key

### Backend

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create the environment file and fill in the values (see table below)
cp .env.example .env

# Apply database migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload --port 8000
```

The API is available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend

npm install

# Point the frontend at the local backend
echo 'VITE_API_URL=http://localhost:8000' > .env.local

npm run dev
```

The frontend is available at `http://localhost:5173`.

### Docker (production)

```bash
cd backend
docker-compose -f docker-compose.prod.yml up --build
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL DSN, e.g. `postgresql://user:pass@localhost:5432/tripmind` |
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `SECRET_KEY` | Yes | — | Random secret for JWT signing — generate with `openssl rand -hex 32` |
| `DEBUG` | No | `False` | Enables debug mode |
| `FRONTEND_URL` | No | `http://localhost:5173` | Allowed CORS origin |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:8000` | Base URL of the backend API |

---

## Running Tests

```bash
cd backend
source venv/bin/activate
pytest -v
```

The GitHub Actions pipeline runs `pytest` on every push to `main` before deploying to EC2. See `.github/workflows/` for the full pipeline definition.

---

## Project Structure

```
tripmind/
├── .github/
│   └── workflows/              # GitHub Actions CI/CD (test → deploy to EC2)
├── backend/
│   ├── alembic/                # Alembic migration scripts
│   │   └── versions/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── base_agent.py   # TripMindAgent — LangChain AgentExecutor
│   │   │   └── tools.py        # 6 tool functions (plan, get, update, itinerary, …)
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py         # POST /register /login /refresh, GET /me
│   │   │   ├── activities.py   # CRUD for itinerary activities
│   │   │   ├── chat.py         # POST /api/chat (AI agent entry point)
│   │   │   ├── checklist.py    # CRUD for packing checklist
│   │   │   ├── expenses.py     # CRUD for expense tracker
│   │   │   ├── overview.py     # AI travel alerts + personalized recommendations
│   │   │   ├── travel.py       # AI travel suggestions + save/delete
│   │   │   ├── trips.py        # Trip CRUD + cover photo upload
│   │   │   └── waypoints.py    # Multi-city waypoint management
│   │   ├── services/
│   │   │   └── trip_service.py # All DB operations — single service class
│   │   ├── auth.py             # JWT helpers and FastAPI get_current_user dependency
│   │   ├── config.py           # Settings from .env via pydantic-settings
│   │   ├── database.py         # SQLAlchemy engine, SessionLocal, Base
│   │   ├── limiter.py          # Shared slowapi Limiter (avoids circular imports)
│   │   ├── main.py             # App factory, middleware, router mounts
│   │   ├── models.py           # 7 SQLAlchemy ORM models
│   │   └── schemas.py          # Pydantic v2 request/response schemas
│   ├── uploads/                # Disk-stored trip cover photos (see KNOWN_ISSUES.md)
│   ├── requirements.txt
│   └── docker-compose.prod.yml
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/         # Shared UI components
│       ├── context/            # UserContext (JWT auth state)
│       ├── pages/              # Route-level page components
│       │   └── TripDetailsPage/
│       ├── services/
│       │   └── api.ts          # Axios instance + every API call
│       └── types/              # TypeScript interfaces mirroring schemas.py
├── docs/
│   ├── API.md                  # Full route reference (32 routes)
│   ├── DECISIONS.md            # Architecture Decision Records (6 ADRs)
│   └── ERD.md                  # Entity-Relationship Diagram (7 tables)
├── ARCHITECTURE.md
├── CHANGELOG.md
├── KNOWN_ISSUES.md
└── TripmindKeyPair.pem         # EC2 key pair — see KNOWN_ISSUES.md
```
