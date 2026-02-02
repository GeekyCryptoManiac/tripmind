
"""

Database Models

Defines the structure of our database tables using SQLAlchemy ORM.

Each class = one table in PostgreSQL.

"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON

from sqlalchemy.orm import relationship

from sqlalchemy.sql import func

from .database import Base

class User(Base):

    """

    User table - stores user accounts.

    

    For MVP: Simple user creation without passwords.

    Week 3+: Add password_hash, email_verified, etc.

    """

    __tablename__ = "users"

    

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String, unique=True, index=True, nullable=False)

    full_name = Column(String, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    

    # Relationship: One user has many trips

    trips = relationship("Trip", back_populates="user", cascade="all, delete-orphan")

class Trip(Base):

    """

    Trip table - stores trip planning information.

    

    Design decisions:

    - JSON trip_metadata field: Flexible storage for agent-extracted preferences

    - Status field: Workflow tracking (planning → booked → completed)

    - Nullable dates: MVP allows incomplete information

    

    Future expansion (Week 3+):

    - Add Flight, Hotel, Activity tables with ForeignKey to trip_id

    - Add sharing features (shared_with_user_ids)

    """

    __tablename__ = "trips"

    

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    

    # Core trip information

    destination = Column(String, nullable=False)

    start_date = Column(String, nullable=True)  # MVP: String format, Week 3: Date type

    end_date = Column(String, nullable=True)

    duration_days = Column(Integer, nullable=True)

    budget = Column(Float, nullable=True)

    travelers_count = Column(Integer, default=1)

    

    # Status workflow: planning, booked, completed, cancelled

    status = Column(String, default="planning")

    

    # Flexible JSON field for agent-extracted data

    # RENAMED from 'metadata' to 'trip_metadata' (metadata is reserved by SQLAlchemy)

    # Example: {"preferences": ["beaches", "food"], "notes": "Anniversary trip"}

    trip_metadata = Column(JSON, default=dict)

    

    # Timestamps

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    

    # Relationship back to user

    user = relationship("User", back_populates="trips")

# Function to create all tables

def init_db():

    """

    Create all database tables.

    Call this once to initialize the database schema.

    """

    from .database import engine

    Base.metadata.create_all(bind=engine)

    print("✅ Database tables created successfully!")

if __name__ == "__main__":

    # Run this file directly to create tables

    init_db()

