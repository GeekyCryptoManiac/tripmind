import requests
import json

BASE_URL = "http://localhost:8000/api"

# Try to create user (might already exist)
user_data = {
    "email": f"debug_{hash('test')}@example.com",  # Unique email
    "full_name": "Debug User"
}

print("Creating user...")
response = requests.post(f"{BASE_URL}/users", json=user_data)
print(f"User creation status: {response.status_code}")

if response.status_code == 201:
    user_id = response.json()["id"]
    print(f"✅ User created with ID: {user_id}\n")
elif response.status_code == 400:
    print("User already exists, using existing user ID: 1\n")
    user_id = 1
else:
    print(f"Error: {response.json()}")
    exit(1)

# Send chat message
print("=" * 60)
print("Sending chat message...")
print("=" * 60)

chat_data = {
    "message": "Plan a trip to Paris for 5 days",
    "user_id": user_id
}

response = requests.post(f"{BASE_URL}/chat", json=chat_data)

print(f"\nStatus Code: {response.status_code}")
print(f"\nRaw Response:\n{response.text}\n")

if response.status_code == 200:
    data = response.json()
    print("=" * 60)
    print("🤖 AGENT RESPONSE:")
    print("=" * 60)
    print(f"{data['message']}")
    print(f"\nAction taken: {data['action_taken']}")
    print("=" * 60)
    
    if "error" in data['message'].lower():
        print("\n❌ Agent returned an error!")
    else:
        print("\n✅ Agent responded successfully!")
else:
    print(f"\n❌ Request failed with status {response.status_code}")
