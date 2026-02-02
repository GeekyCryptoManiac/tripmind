"""
Test script to verify the complete backend system works.
Tests: User creation, agent interaction, trip retrieval.
"""

import requests
import json

BASE_URL = "http://localhost:8000/api"

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def test_health_check():
    """Test 1: Health check"""
    print_section("TEST 1: Health Check")
    
    response = requests.get("http://localhost:8000/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    print("✅ Health check passed!")


def test_create_user():
    """Test 2: Create user"""
    print_section("TEST 2: Create User")
    
    user_data = {
        "email": f"test_{hash('test')}@example.com",  # Unique email
        "full_name": "Test User"
    }
    
    response = requests.post(f"{BASE_URL}/users", json=user_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 201
    user = response.json()
    print(f"✅ User created with ID: {user['id']}")
    
    return user["id"]


def test_chat_plan_trip(user_id):
    """Test 3: Chat with agent to plan a trip"""
    print_section("TEST 3: Chat - Plan Trip")
    
    message = "Plan a 5-day trip to Tokyo in March 2024 for $2000. I love food and technology."
    
    chat_data = {
        "message": message,
        "user_id": user_id
    }
    
    print(f"Sending message: '{message}'")
    print("Waiting for agent response...\n")
    
    response = requests.post(f"{BASE_URL}/chat", json=chat_data)
    print(f"Status: {response.status_code}")
    
    result = response.json()
    print(f"\n🤖 Agent Response:")
    print(f"{result['message']}\n")
    print(f"Action taken: {result['action_taken']}")
    
    assert response.status_code == 200
    assert result['action_taken'] in ['created_trip', 'answered_question']
    print("✅ Agent responded successfully!")


def test_chat_show_trips(user_id):
    """Test 4: Ask agent to show trips"""
    print_section("TEST 4: Chat - Show My Trips")
    
    message = "Show me my trips"
    
    chat_data = {
        "message": message,
        "user_id": user_id
    }
    
    print(f"Sending message: '{message}'")
    print("Waiting for agent response...\n")
    
    response = requests.post(f"{BASE_URL}/chat", json=chat_data)
    result = response.json()
    
    print(f"🤖 Agent Response:")
    print(f"{result['message']}\n")
    
    assert response.status_code == 200
    print("✅ Agent listed trips successfully!")


def test_get_trips_api(user_id):
    """Test 5: Get trips via direct API"""
    print_section("TEST 5: Get Trips (Direct API)")
    
    response = requests.get(f"{BASE_URL}/users/{user_id}/trips")
    print(f"Status: {response.status_code}")
    
    result = response.json()
    print(f"Response: {json.dumps(result, indent=2)}")
    
    assert response.status_code == 200
    print(f"✅ Found {result['total']} trip(s)")


def test_general_question(user_id):
    """Test 6: Ask general travel question"""
    print_section("TEST 6: Chat - General Question")
    
    message = "What's the best time to visit Japan?"
    
    chat_data = {
        "message": message,
        "user_id": user_id
    }
    
    print(f"Sending message: '{message}'")
    print("Waiting for agent response...\n")
    
    response = requests.post(f"{BASE_URL}/chat", json=chat_data)
    result = response.json()
    
    print(f"🤖 Agent Response:")
    print(f"{result['message']}\n")
    
    assert response.status_code == 200
    print("✅ Agent answered question!")


def run_all_tests():
    """Run all tests in sequence"""
    print("\n" + "🎯" * 30)
    print("  TRIPMIND BACKEND TEST SUITE")
    print("🎯" * 30)
    
    try:
        # Test 1: Health check
        test_health_check()
        
        # Test 2: Create user
        user_id = test_create_user()
        
        # Test 3: Plan a trip
        test_chat_plan_trip(user_id)
        
        # Test 4: Show trips
        test_chat_show_trips(user_id)
        
        # Test 5: Get trips via API
        test_get_trips_api(user_id)
        
        # Test 6: General question
        test_general_question(user_id)
        
        # Success!
        print("\n" + "=" * 60)
        print("  ✅ ALL TESTS PASSED!")
        print("=" * 60)
        print("\n🎉 Your TripMind backend is working perfectly!")
        print("\nYou can now:")
        print("  1. Test more queries in the terminal")
        print("  2. Use the Swagger UI at http://localhost:8000/docs")
        print("  3. Build the frontend to connect to this API")
        
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
    except requests.exceptions.ConnectionError:
        print("\n❌ Could not connect to server.")
        print("Make sure the server is running: python -m app.main")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")


if __name__ == "__main__":
    run_all_tests()
