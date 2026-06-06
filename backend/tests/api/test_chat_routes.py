"""API tests for /api/chat — mocks TripMindAgent to avoid real LLM calls."""
from unittest.mock import AsyncMock, patch


def test_chat_returns_200_with_mocked_agent(client, auth_headers):
    mock_response = {
        "response":     "Here is your trip plan!",
        "action_taken": "plan_and_save_trip",
        "trip_data":    None,
    }
    # TripMindAgent is imported inside the function body, so patch at the source module
    with patch(
        "app.agents.base_agent.TripMindAgent",
        autospec=True,
    ) as MockAgent:
        instance = MockAgent.return_value
        instance.process_message = AsyncMock(return_value=mock_response)

        resp = client.post(
            "/api/chat",
            json={"message": "Plan a trip to Tokyo"},
            headers=auth_headers,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["message"] == "Here is your trip plan!"
    assert data["action_taken"] == "plan_and_save_trip"


def test_chat_unauthenticated_returns_401(client):
    resp = client.post("/api/chat", json={"message": "Plan a trip"})
    assert resp.status_code == 401


def test_chat_empty_message_returns_422(client, auth_headers):
    resp = client.post("/api/chat", json={"message": ""}, headers=auth_headers)
    assert resp.status_code == 422
