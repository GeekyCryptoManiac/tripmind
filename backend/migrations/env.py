"""
Alembic Environment Configuration

This file tells Alembic:
  1. How to connect to the database
  2. Which SQLAlchemy models to compare against (for autogenerate)

Two run modes:
  - offline: generates SQL script without a live DB connection
  - online:  connects to the DB and runs migrations directly (what we always use)
"""

from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os
import sys

# ── Make sure `app` is importable ────────────────────────────
# env.py lives at backend/migrations/env.py
# We need backend/ on the path so `from app.models import Base` works
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ── Import your models so Alembic can see them ───────────────
# This is what makes `alembic revision --autogenerate` work.
# If you add a new model, import it here.
from app.database import Base
from app.models import (   # noqa: F401 — imported for side-effects (registers with Base)
    User,
    Trip,
    TripActivity,
    TripExpense,
    TripChecklistItem,
    TripSavedTravel,
)

# ── Load the alembic.ini config ───────────────────────────────
config = context.config

# Override sqlalchemy.url from the environment variable if set.
# This means Railway and local dev can use different DBs without
# editing alembic.ini — just set DATABASE_URL in the environment.
db_url = os.environ.get("DATABASE_URL")
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)

# Set up Python logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# This is the MetaData object Alembic diffs against
target_metadata = Base.metadata


# ── Offline mode ──────────────────────────────────────────────
# Generates a .sql file instead of running against a live DB.
# Useful for reviewing what will run before applying it.
# Usage: alembic upgrade head --sql > migration.sql
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,          # detect column type changes
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online mode ───────────────────────────────────────────────
# Connects to a live DB and runs migrations directly.
# This is what `alembic upgrade head` uses.
def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,   # NullPool: don't reuse connections in migration context
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,          # detect column type changes
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()