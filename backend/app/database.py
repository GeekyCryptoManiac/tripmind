"""
Database Connection and Session Management
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DEBUG
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for all models (updated import - no more warning!)
Base = declarative_base()


# Dependency for FastAPI routes
def get_db():
    """
    Provides a database session for each request.
    Automatically closes after request finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Test connection function
def test_connection():
    """Test if database connection works"""
    try:
        connection = engine.connect()
        connection.close()
        print("✅ Database connection successful!")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


if __name__ == "__main__":
    test_connection()
