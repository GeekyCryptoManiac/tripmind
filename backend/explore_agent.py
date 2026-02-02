"""
Explore TripMind Agent Capabilities
Interactive testing of all agent features
"""

import requests
import json

BASE_URL = "http://localhost:8000/api"

# Use existing user or create new one
USER_ID = 1  # Change this if needed

def print_header(title):
    """Print formatted header"""
    print("\n" + "="*70)
    print(f"  🧪 {title}")
    print("="*70)


def send_message(message):
    """Send message to agent and display response"""
    print(f"\n💬 You: {message}")
    
    response = requests.post(
        f"{BASE_URL}/chat",
        json={"message": message, "user_id": USER_ID}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n🤖 TripMind: {data['message']}")
        print(f"\n📊 Action: {data['action_taken']}")
        return data
    else:
        print(f"❌ Error: {response.status_code}")
        return None


def view_database():
    """View current trips in database"""
    print_header("DATABASE CONTENTS")
    response = requests.get(f"{BASE_URL}/users/{USER_ID}/trips")
    
    if response.status_code == 200:
        data = response.json()
        trips = data['trips']
        
        if not trips:
            print("📭 No trips found")
            return
        
        print(f"\n📚 Total trips: {data['total']}\n")
        
        for i, trip in enumerate(trips, 1):
            print(f"{i}. {trip['destination']}")
            print(f"   ID: {trip['id']}")
            print(f"   Duration: {trip['duration_days']} days" if trip['duration_days'] else "   Duration: Not specified")
            print(f"   Budget: ${trip['budget']}" if trip['budget'] else "   Budget: Not specified")
            print(f"   Dates: {trip['start_date']} to {trip['end_date']}" if trip['start_date'] else "   Dates: Not specified")
            print(f"   Travelers: {trip['travelers_count']}")
            print(f"   Status: {trip['status']}")
            print(f"   Preferences: {trip.get('preferences', [])}")
            print(f"   Created: {trip['created_at'][:10]}")
            print()


# ============= TEST SCENARIOS =============

def test_basic_trip_planning():
    """Test 1: Basic trip planning"""
    print_header("TEST 1: Basic Trip Planning")
    
    send_message("Plan a 7-day trip to Tokyo")
    send_message("Plan a weekend trip to Barcelona for $1500")
    send_message("I want to visit London for 10 days in April with a budget of $3000")


def test_detailed_trip_planning():
    """Test 2: Detailed trip with preferences"""
    print_header("TEST 2: Detailed Trip Planning with Preferences")
    
    send_message(
        "Plan a 2-week trip to Bali. Budget is $2500. "
        "I love beaches, surfing, yoga, and local food."
    )
    
    send_message(
        "Plan a trip to New York for 5 days in December. "
        "Budget $4000. Traveling with 2 friends. "
        "We want to see Broadway shows, museums, and try famous pizza."
    )


def test_retrieve_trips():
    """Test 3: Retrieve trips"""
    print_header("TEST 3: Retrieve User's Trips")
    
    send_message("Show me my trips")
    send_message("What trips do I have planned?")
    send_message("List all my travel plans")


def test_general_questions():
    """Test 4: General travel questions"""
    print_header("TEST 4: General Travel Questions")
    
    send_message("What's the best time to visit Japan?")
    send_message("Do I need a visa to visit Italy from Singapore?")
    send_message("What are some must-see places in Paris?")


def test_conversational_flow():
    """Test 5: Multi-turn conversation"""
    print_header("TEST 5: Conversational Flow")
    
    send_message("I'm thinking about a vacation")
    send_message("Maybe somewhere in Europe")
    send_message("How about Greece for 10 days?")


def test_edge_cases():
    """Test 6: Edge cases"""
    print_header("TEST 6: Edge Cases")
    
    send_message("Plan a trip")  # Missing destination
    send_message("Tell me about Paris")  # Ambiguous - planning or question?
    send_message("I want to travel somewhere nice")  # Vague request


# ============= MAIN MENU =============

def main_menu():
    """Interactive menu"""
    while True:
        print("\n" + "="*70)
        print("  🧭 TRIPMIND AGENT EXPLORER")
        print("="*70)
        print("\n📋 Test Scenarios:")
        print("  1. Basic Trip Planning")
        print("  2. Detailed Trip Planning (with preferences)")
        print("  3. Retrieve Trips")
        print("  4. General Travel Questions")
        print("  5. Conversational Flow")
        print("  6. Edge Cases")
        print("\n🔧 Utilities:")
        print("  7. View Database Contents")
        print("  8. Custom Message (free text)")
        print("  9. Run All Tests")
        print("  0. Exit")
        
        choice = input("\n👉 Enter choice (0-9): ").strip()
        
        if choice == "1":
            test_basic_trip_planning()
        elif choice == "2":
            test_detailed_trip_planning()
        elif choice == "3":
            test_retrieve_trips()
        elif choice == "4":
            test_general_questions()
        elif choice == "5":
            test_conversational_flow()
        elif choice == "6":
            test_edge_cases()
        elif choice == "7":
            view_database()
        elif choice == "8":
            custom_msg = input("\n💬 Enter your message: ")
            if custom_msg.strip():
                send_message(custom_msg)
        elif choice == "9":
            test_basic_trip_planning()
            test_detailed_trip_planning()
            test_retrieve_trips()
            test_general_questions()
            view_database()
        elif choice == "0":
            print("\n👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice")
        
        input("\n⏸️  Press Enter to continue...")


if __name__ == "__main__":
    print("\n🚀 Starting TripMind Agent Explorer...")
    print(f"📡 Connected to: {BASE_URL}")
    print(f"👤 User ID: {USER_ID}")
    
    # Quick health check
    try:
        response = requests.get(f"{BASE_URL}/../health", timeout=2)
        if response.status_code == 200:
            print("✅ Server is online")
        else:
            print("⚠️  Server responded but may have issues")
    except:
        print("❌ Cannot connect to server. Is it running?")
        print("   Run: python -m app.main")
        exit(1)
    
    main_menu()
