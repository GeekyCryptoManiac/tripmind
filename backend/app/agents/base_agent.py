"""
TripMind Base Agent
"""

from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools import StructuredTool
from langchain.schema import HumanMessage, AIMessage
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List

from .tools import (
    plan_and_save_trip,
    get_user_trips,
    get_trip_details,
    update_trip,
    answer_travel_question,
    generate_itinerary
)
from ..config import settings


class TripMindAgent:
    """Core AI agent for trip planning."""
    
    def __init__(self, db: Session, user_id: int, trip_id: Optional[int] = None):
        """
        Initialize the agent.
        
        Args:
            db: Database session
            user_id: The current user's ID
            trip_id: Optional — if provided, fetches this trip and injects
                     its details into the system prompt for trip-specific chat
        """
        self.db = db
        self.user_id = user_id
        self.trip_id = trip_id
        
        self.trip_context = None
        if trip_id is not None:
            self.trip_context = self._fetch_trip_context(trip_id)
        
        self.llm = ChatOpenAI(
            model="gpt-4-0125-preview",
            temperature=0.7,
            api_key=settings.OPENAI_API_KEY
        )
        print("[Agent] LLM initialized successfully")
        
        self.tools = self._create_tools()
        self.agent_executor = self._create_agent()
    
    def _fetch_trip_context(self, trip_id: int) -> Optional[Dict[str, Any]]:
        """
        Fetch a trip from the database and format it as a context dict.
        Returns None if trip not found or doesn't belong to this user.
        """
        from ..models import Trip
        
        trip = self.db.query(Trip).filter(
            Trip.id == trip_id,
            Trip.user_id == self.user_id
        ).first()
        
        if not trip:
            print(f"[Agent] Warning: Trip {trip_id} not found for user {self.user_id}")
            return None
        
        print(f"[Agent] Loaded trip context: {trip.destination} (ID: {trip.id})")
        
        return {
            "id": trip.id,
            "destination": trip.destination,
            "start_date": trip.start_date,
            "end_date": trip.end_date,
            "duration_days": trip.duration_days,
            "budget": trip.budget,
            "travelers_count": trip.travelers_count,
            "status": trip.status,
            "preferences": trip.trip_metadata.get("preferences", []) if trip.trip_metadata else [],
            "notes": trip.trip_metadata.get("notes", "") if trip.trip_metadata else "",
        }
    
    def _create_tools(self) -> list:
        """Create LangChain tools."""
        
        # Tool 1: Plan and save trip
        def plan_trip_wrapper(
            destination: str,
            start_date: str = None,
            end_date: str = None,
            duration_days: int = None,
            budget: float = None,
            travelers_count: int = 1,
            preferences: list = None
        ) -> dict:
            """Plan and save a new trip"""
            return plan_and_save_trip(
                destination=destination,
                user_id=self.user_id,
                db=self.db,
                start_date=start_date,
                end_date=end_date,
                duration_days=duration_days,
                budget=budget,
                travelers_count=travelers_count,
                preferences=preferences
            )
        
        plan_tool = StructuredTool.from_function(
            func=plan_trip_wrapper,
            name="plan_trip",
            description=(
                "Plan and save a new trip. Use when user wants to plan a trip. "
                "Extracts details from message and saves to database automatically."
            )
        )
        
        # Tool 2: Get user trips
        def get_trips_wrapper() -> list:
            return get_user_trips(self.user_id, self.db)
        
        get_trips_tool = StructuredTool.from_function(
            func=get_trips_wrapper,
            name="get_user_trips",
            description="Get all trips for current user."
        )
        
        # Tool 3: Get trip details
        def get_trip_wrapper(trip_id: int) -> dict:
            return get_trip_details(trip_id, self.db)
        
        trip_details_tool = StructuredTool.from_function(
            func=get_trip_wrapper,
            name="get_trip_details",
            description="Get details of a specific trip by ID."
        )
        
        # Tool 4: Update trip
        def update_trip_wrapper(
            trip_id: int,
            destination: str = None,
            start_date: str = None,
            end_date: str = None,
            duration_days: int = None,
            budget: float = None,
            travelers_count: int = None,
            status: str = None
        ) -> dict:
            return update_trip(
                trip_id, self.db, destination, start_date,
                end_date, duration_days, budget, travelers_count, status
            )
        
        update_tool = StructuredTool.from_function(
            func=update_trip_wrapper,
            name="update_trip",
            description="Update an existing trip."
        )
        
        # Tool 5: Answer questions
        question_tool = StructuredTool.from_function(
            func=answer_travel_question,
            name="answer_question",
            description="Answer general travel questions."
        )

        # Tool 6: Generate itinerary
        def generate_itinerary_wrapper(
            trip_id: int,
            preferences: list = None
        ) -> dict:
            return generate_itinerary(trip_id, self.db, preferences)
        
        itinerary_tool = StructuredTool.from_function(
            func=generate_itinerary_wrapper,
            name="generate_itinerary",
            description=(
                "Generate a day-by-day itinerary for a trip. Creates structured "
                "activities, and optionally mock flights/hotels if needed."
            )
        )
        
        return [plan_tool, get_trips_tool, trip_details_tool, update_tool, question_tool, itinerary_tool]
    
    def _build_system_prompt(self) -> str:
        """
        Build the system prompt. If trip_context is loaded, append a
        CURRENT TRIP section so the agent answers in context of that trip
        without needing to call get_trip_details first.
        """
        base_prompt = """You are TripMind, an AI travel planning assistant.

YOUR TOOLS:
- plan_trip: Plan and save a new trip (ONE tool call does everything!)
- get_user_trips: Show user their trips
- get_trip_details: Get specific trip info
- update_trip: Modify existing trip
- generate_itinerary: Generate day-by-day itinerary
- answer_question: Answer travel questions

─── DESTINATION VALIDATION ───
Before calling plan_trip, verify the destination is a real, travelable place on Earth.

DO NOT call plan_trip if the destination is:
- Not a real place (e.g. "the Moon", "Mars", "Hogwarts", "Narnia", "Wakanda")
- A vague description instead of a place (e.g. "somewhere warm", "a beach", "paradise")
- A single character or clearly a typo with no recognisable destination

If the destination is invalid, respond naturally explaining why you can't plan that trip.
Example: "The Moon isn't somewhere I can plan a trip to just yet! Did you mean somewhere
on Earth? I'd love to help you plan a trip to a real destination."

─── BUDGET & CURRENCY ───
The system stores all budgets in USD.

If the user states a budget in another currency (e.g. "100 SGD", "500 EUR", "£200"):
1. Acknowledge the currency they used
2. Ask them to confirm the USD equivalent, OR convert it yourself using approximate rates
   and confirm: "100 SGD is roughly $74 USD — shall I use that?"
3. Only call plan_trip or update_trip once the USD amount is confirmed

Never silently store a non-USD amount as if it were USD.

Common approximate rates for reference:
- 1 SGD ≈ 0.74 USD
- 1 EUR ≈ 1.08 USD
- 1 GBP ≈ 1.27 USD
- 1 AUD ≈ 0.65 USD
- 1 JPY ≈ 0.0067 USD

─── DATE VALIDATION ───
Before saving dates, check:
- Dates must be in the future. If the user gives a past date, flag it:
  "June 2020 has already passed — did you mean June 2026?"
- End date must be after start date. If not, ask for clarification.
- Vague dates like "next summer" or "Christmas" should be clarified before saving:
  "When you say next summer, do you mean around June-August 2026?"
- Extremely long trips (over 90 days) should be confirmed:
  "Just confirming — you'd like to plan a trip for X days?"

─── CONVERSATION INTENT ───
Not every message is a trip planning request. Before calling any tool, identify intent:

GREETING or SMALL TALK → respond conversationally, do not call any tool
  Examples: "hi", "hello", "how are you", "thanks", "ok", "sounds good"

QUESTION about a destination → use answer_question, do not call plan_trip
  Examples: "what's the weather like in Tokyo?", "is Bali safe to visit?"

TRIP PLANNING request → call plan_trip
  Examples: "I want to go to Japan", "plan a trip to Bali in June"

UPDATE request → call update_trip with the known trip_id
  Examples: "change the budget to $2000", "update my dates to December"

─── CONVERSATION MEMORY ───
You have access to the full conversation history. Always read it before responding.
- Resolve pronouns ("it", "that", "this trip") from prior messages
- Treat short follow-up messages as continuations, not new requests
- Never create a duplicate trip for a destination already discussed in this conversation

─── WHEN USER ASKS TO GENERATE ITINERARY ───
- For trips 1-5 days: Generate detailed itinerary
- For trips 6+ days: Warn the user that generation may be partial, then proceed
  Example: "Your trip is X days long. I'll generate the first 5 days — you can ask
  me to continue or edit the rest manually."

Keep responses friendly and concise!"""

        if self.trip_context:
            trip = self.trip_context
            trip_section = f"""

─── CURRENT TRIP CONTEXT ───
You are currently in a chat about a SPECIFIC trip. Answer questions relative to this trip.

Trip ID: {trip['id']}
Destination: {trip['destination']}
Status: {trip['status']}
Start Date: {trip['start_date'] or 'Not set'}
End Date: {trip['end_date'] or 'Not set'}
Duration: {trip['duration_days'] or 'Not set'} days
Budget: ${trip['budget'] or 'Not set'}
Travelers: {trip['travelers_count']}
Preferences: {', '.join(trip['preferences']) if trip['preferences'] else 'None specified'}
Notes: {trip['notes'] or 'None'}

When the user asks about "the trip", "my trip", "this trip", etc., they mean THIS trip.
You can help with planning details, suggest activities, answer questions about the destination,
or update this trip if asked. Use the update_trip tool with trip_id={trip['id']} if updates are needed."""
            
            return base_prompt + trip_section
        
        return base_prompt
    
    def _create_agent(self) -> AgentExecutor:
        """Create agent with system prompt."""
        
        system_prompt = self._build_system_prompt()
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="chat_history", optional=True),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        agent = create_openai_functions_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=prompt
        )
        
        return AgentExecutor(
            agent=agent,
            tools=self.tools,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=5
        )
    
    def _build_lc_history(self, chat_history: List[Dict[str, str]]) -> list:
        """
        Convert raw chat history dicts into LangChain message objects.

        Accepts items as either dicts (from JSON) or Pydantic model instances
        (from ChatHistoryMessage schema) — handles both safely.

        Args:
            chat_history: List of {"role": "user"|"assistant", "content": "..."}

        Returns:
            List of HumanMessage / AIMessage objects ready for the prompt.
        """
        lc_messages = []

        for msg in chat_history:
            role    = msg.get("role")    if isinstance(msg, dict) else msg.role
            content = msg.get("content") if isinstance(msg, dict) else msg.content

            if not role or not content:
                continue

            if role == "user":
                lc_messages.append(HumanMessage(content=content))
            elif role == "assistant":
                lc_messages.append(AIMessage(content=content))
            # Any other role (e.g. "system") is intentionally ignored —
            # system context is injected via the system prompt, not history.

        print(f"[Agent] Built {len(lc_messages)} history messages for context")
        return lc_messages

    async def process_message(
        self,
        message: str,
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Process user message with optional conversation history.

        Args:
            message: The current user message
            chat_history: Prior messages as list of dicts with 'role' and 'content'.
                          Oldest messages first. Comes from ChatRequest.chat_history.
        """
        lc_history = self._build_lc_history(chat_history) if chat_history else []

        try:
            print(f"\n[Agent] Processing: {message}")
            if lc_history:
                print(f"[Agent] With {len(lc_history)} history messages")

            result = await self.agent_executor.ainvoke({
                "input": message,
                "chat_history": lc_history,
            })
            
            # Extract trip_data from intermediate steps if a trip was created
            trip_data = None
            intermediate_steps = result.get("intermediate_steps", [])
            
            for step in intermediate_steps:
                action = step[0]
                observation = step[1]
                
                if hasattr(action, 'tool') and action.tool == "plan_trip":
                    if isinstance(observation, dict) and observation.get('trip_id'):
                        trip_id = observation['trip_id']
                        from ..models import Trip
                        trip = self.db.query(Trip).filter(Trip.id == trip_id).first()
                        if trip:
                            trip_data = {
                                "id": trip.id,
                                "user_id": trip.user_id,
                                "destination": trip.destination,
                                "start_date": trip.start_date.isoformat() if trip.start_date else None,
                                "end_date": trip.end_date.isoformat() if trip.end_date else None,
                                "budget": trip.budget,
                                "status": trip.status,
                                "trip_metadata": trip.trip_metadata,
                                "created_at": trip.created_at.isoformat(),
                                "updated_at": trip.updated_at.isoformat() if trip.updated_at else None,
                            }
            
            return {
                "response": str(result.get("output", "I couldn't process that.")),
                "action_taken": self._infer_action(str(result.get("output", ""))),
                "trip_data": trip_data
            }
            
        except Exception as e:
            print(f"[Agent] Error: {e}")
            import traceback
            traceback.print_exc()
            
            return {
                "response": "I encountered an issue. Could you try rephrasing?",
                "action_taken": "error",
                "trip_data": None
            }
    
    def _infer_action(self, output: str) -> str:
        """Infer action from output."""
        output_lower = output.lower()
        
        if any(word in output_lower for word in ["saved", "created", "planned"]):
            return "created_trip"
        elif "trips" in output_lower:
            return "retrieved_trips"
        else:
            return "answered_question"