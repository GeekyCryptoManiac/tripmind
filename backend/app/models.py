"""
Database Models

password_hash is nullable so existing guest rows are not broken.
A one-time ALTER TABLE is required if the table already exists:
    ALTER TABLE users ADD COLUMN password_hash VARCHAR;
On Railway: run this via the Railway shell or psql plugin console.
For a fresh DB (e.g. staging), SQLAlchemy create_all handles it automatically.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, unique=True, index=True, nullable=False)
    full_name     = Column(String, nullable=False)
    # nullable so existing guest rows (no password) are not broken
    password_hash = Column(String, nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    trips = relationship("Trip", back_populates="user", cascade="all, delete-orphan")


class Trip(Base):
    __tablename__ = "trips"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    destination     = Column(String, nullable=False)
    start_date      = Column(String, nullable=True)
    end_date        = Column(String, nullable=True)
    duration_days   = Column(Integer, nullable=True)
    budget          = Column(Float, nullable=True)
    travelers_count = Column(Integer, default=1)
    status          = Column(String, default="planning")
    trip_metadata   = Column(JSON, default=dict)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="trips")


def init_db():
    from .database import engine
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")


if __name__ == "__main__":
    init_db()