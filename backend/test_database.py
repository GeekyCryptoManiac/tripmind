"""
Test script to verify database models work correctly.
"""
from app.database import SessionLocal, engine
from app.models import User, Trip, Base

# Create tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    print("=== Testing Database Models ===\n")
    
    # 1. Create test user
    print("1️⃣ Creating test user...")
    test_user = User(
        email="fadhel@example.com",
        full_name="Fadhel Test User"
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    print(f"✅ Created user: {test_user.full_name} (ID: {test_user.id})")
    
    # 2. Create test trip
    print("\n2️⃣ Creating test trip...")
    test_trip = Trip(
        user_id=test_user.id,
        destination="Tokyo",
        start_date="March 2024",
        duration_days=5,
        budget=2000.0,
        travelers_count=1,
        status="planning",
        trip_metadata={  # Changed from metadata
            "preferences": ["food", "culture", "technology"],
            "notes": "First time visiting Japan"
        }
    )
    db.add(test_trip)
    db.commit()
    db.refresh(test_trip)
    print(f"✅ Created trip: {test_trip.destination} (ID: {test_trip.id})")
    print(f"   Budget: ${test_trip.budget}")
    print(f"   Duration: {test_trip.duration_days} days")
    print(f"   Preferences: {test_trip.trip_metadata['preferences']}")
    
    # 3. Test relationships
    print("\n3️⃣ Testing relationships...")
    user = db.query(User).filter(User.email == "fadhel@example.com").first()
    print(f"✅ Found user: {user.full_name}")
    print(f"   Number of trips: {len(user.trips)}")
    
    for trip in user.trips:
        print(f"   - Trip to {trip.destination}: {trip.status}")
    
    # 4. Query all trips
    print("\n4️⃣ Querying all trips...")
    all_trips = db.query(Trip).all()
    print(f"✅ Total trips in database: {len(all_trips)}")
    
    print("\n" + "="*50)
    print("✅ ALL TESTS PASSED!")
    print("="*50)
    print("\nYour database is working perfectly! 🎉")

except Exception as e:
    print(f"\n❌ Error: {e}")
    db.rollback()

finally:
    db.close()
