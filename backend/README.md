# TripMind Backend

FastAPI backend with LangChain agent for trip planning.

## Setup

1. **Create virtual environment:**
```bash
   python3 -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
   pip install -r requirements.txt
```

3. **Configure environment:**
```bash
   cp .env.example .env
   # Edit .env with your credentials
```

4. **Run server:**
```bash
   python -m app.main
```

Server runs at: http://localhost:8000

## API Endpoints

- `GET /` - Health check
- `POST /api/users` - Create user
- `GET /api/users/{user_id}` - Get user
- `POST /api/chat` - Chat with agent
- `GET /api/users/{user_id}/trips` - Get user's trips

## Database

PostgreSQL with SQLAlchemy ORM.

To view database:
```bash
psql tripmind
SELECT * FROM users;
SELECT * FROM trips;
```
