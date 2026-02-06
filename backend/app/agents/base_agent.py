"""
TripMind Base Agent
"""

from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools import StructuredTool
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

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
        
        # If trip_id provided, fetch the trip now so we can bake it into the prompt
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
            Trip.user_id == self.user_id  # Security: only allow user's own trips
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
        
        # Tool 1: Plan and save trip (combined!)
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

WHEN USER ASKS TO GENERATE ITINERARY:
- For trips 1-5 days: Generate detailed itinerary
- For trips 6+ days: Warn user that generation may be partial due to length
  Example response: "Your trip is X days long. I'll generate as much as possible, 
  but you may need to add remaining days manually or ask me to generate specific days later."
- Then call generate_itinerary regardless

Keep responses friendly and concise!"""

        # If we have trip context, append it so the agent is already aware
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
    
    async def process_message(self, message: str) -> Dict[str, Any]:
        """Process user message."""
        try:
            print(f"\n[Agent] Processing: {message}")
            result = await self.agent_executor.ainvoke({"input": message})
            
            # Get the trip_id from intermediate steps if trip was created
            trip_data = None
            intermediate_steps = result.get("intermediate_steps", [])
            
            for step in intermediate_steps:
                action = step[0]
                observation = step[1]
                
                # Check if plan_trip was called and got a trip_id
                if hasattr(action, 'tool') and action.tool == "plan_trip":
                    if isinstance(observation, dict) and observation.get('trip_id'):
                        trip_id = observation['trip_id']
                        # Fetch the full trip from database
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