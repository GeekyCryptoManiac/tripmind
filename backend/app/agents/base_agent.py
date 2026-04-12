"""
TripMind Base Agent
====================
LangChain agent orchestrating all AI-driven trip planning.

Stateless per request — full chat_history is passed in on every call.
All state lives in the DB or in the chat_history list from the frontend.

Tool execution note:
  All tool wrappers use func= (synchronous). LangChain's AgentExecutor
  runs sync tools in a thread pool via asyncio's run_in_executor.
  generate_itinerary handles its own thread-safe DB session internally.
"""

from typing import Any, Dict, List, Optional

from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import AIMessage, HumanMessage
from langchain.tools import StructuredTool
from langchain_openai import ChatOpenAI
from sqlalchemy.orm import Session

from ..config import settings
from .tools import (
    answer_travel_question,
    generate_itinerary,
    get_trip_details,
    get_user_trips,
    plan_and_save_trip,
    update_trip,
)


class TripMindAgent:
    """Core AI agent for trip planning."""

    def __init__(self, db: Session, user_id: int, trip_id: Optional[int] = None):
        self.db      = db
        self.user_id = user_id
        self.trip_id = trip_id

        # Eagerly load trip context for trip-specific chat
        self.trip_context: Optional[Dict[str, Any]] = None
        if trip_id is not None:
            self.trip_context = get_trip_details(trip_id, user_id, db)

        self.llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.7,
            api_key=settings.OPENAI_API_KEY,
        )

        self.tools          = self._create_tools()
        self.agent_executor = self._create_agent()

    # ── Tool wrappers ─────────────────────────────────────────
    # Each wrapper captures self (db, user_id) via closure so the
    # agent only needs to pass domain arguments.
    # All use func= (synchronous) — LangChain handles thread dispatch.

    def _create_tools(self) -> list:

        def _plan_trip(
            destination: str,
            start_date: Optional[str] = None,
            end_date: Optional[str] = None,
            duration_days: Optional[int] = None,
            budget: Optional[float] = None,
            travelers_count: int = 1,
            preferences: Optional[list] = None,
            country_code: Optional[str] = None,
        ) -> dict:
            return plan_and_save_trip(
                destination=destination,
                user_id=self.user_id,
                db=self.db,
                start_date=start_date,
                end_date=end_date,
                duration_days=duration_days,
                budget=budget,
                travelers_count=travelers_count,
                preferences=preferences,
                country_code=country_code,
            )

        def _get_trips() -> dict:
            return get_user_trips(self.user_id, self.db)

        def _get_trip(trip_id: int) -> dict:
            return get_trip_details(trip_id, self.user_id, self.db)

        def _update_trip(
            trip_id: int,
            destination: Optional[str] = None,
            start_date: Optional[str] = None,
            end_date: Optional[str] = None,
            duration_days: Optional[int] = None,
            budget: Optional[float] = None,
            travelers_count: Optional[int] = None,
            status: Optional[str] = None,
            notes: Optional[str] = None,
        ) -> dict:
            return update_trip(
                trip_id=trip_id,
                user_id=self.user_id,
                db=self.db,
                destination=destination,
                start_date=start_date,
                end_date=end_date,
                duration_days=duration_days,
                budget=budget,
                travelers_count=travelers_count,
                status=status,
                notes=notes,
            )

        def _generate_itinerary(
            trip_id: int,
            preferences: Optional[list] = None,
        ) -> dict:
            # Note: generate_itinerary creates its own thread-safe DB session
            # internally and ignores self.db to avoid cross-thread SQLAlchemy issues.
            return generate_itinerary(
                trip_id=trip_id,
                user_id=self.user_id,
                db=self.db,
                preferences=preferences,
            )

        def _answer_question(
            question: str,
            destination: Optional[str] = None,
        ) -> str:
            return answer_travel_question(question, destination)

        return [
            StructuredTool.from_function(
                func=_plan_trip,
                name="plan_trip",
                description=(
                    "Plan and save a new trip. Use when the user wants to plan a trip to a destination. "
                    "Extracts destination, dates, budget, and traveler count from the message. "
                    "Always include the ISO 3166-1 alpha-3 country_code (e.g. JPN, FRA, IDN)."
                ),
            ),
            StructuredTool.from_function(
                func=_get_trips,
                name="get_user_trips",
                description="Get all trips for the current user. Use when they ask to see their trips.",
            ),
            StructuredTool.from_function(
                func=_get_trip,
                name="get_trip_info",
                description="Get full details of a specific trip including the itinerary.",
            ),
            StructuredTool.from_function(
                func=_update_trip,
                name="update_trip",
                description=(
                    "Update an existing trip's details — dates, budget, travelers, status, notes. "
                    "Use when the user wants to change something about a trip they already have."
                ),
            ),
            StructuredTool.from_function(
                func=_generate_itinerary,
                name="generate_itinerary",
                description=(
                    "Generate a day-by-day itinerary for an existing trip. "
                    "Use when the user asks to generate, create, or plan the itinerary. "
                    "Saves each activity to the database automatically. "
                    "Always pass the trip_id of the current trip."
                ),
            ),
            StructuredTool.from_function(
                func=_answer_question,
                name="general_travel_advice",
                description=(
                    "Answer general travel questions from your own knowledge — "
                    "visa info, packing tips, cultural advice, restaurant recommendations, etc. "
                    "Do NOT use this to create or modify trips."
                ),
            ),
        ]

    # ── System prompt ─────────────────────────────────────────

    def _build_system_prompt(self) -> str:
        base = """You are TripMind, a friendly and knowledgeable AI travel planning assistant.

YOUR TOOLS:
- plan_trip: Create and save a new trip
- get_user_trips: Show the user their saved trips
- get_trip_info: Get details of a specific trip
- update_trip: Modify an existing trip
- generate_itinerary: Generate a day-by-day activity plan for a trip
- general_travel_advice: Answer travel questions from your own knowledge

CORE RULES:
1. Only plan trips to real destinations. Reject fictional places (the Moon, Hogwarts, etc.)
2. Budget is always in SGD unless the user explicitly states otherwise. Confirm if ambiguous.
3. Do not call plan_trip again if a trip already exists — use update_trip instead.
4. When calling plan_trip, always include country_code (ISO 3166-1 alpha-3, e.g. JPN, FRA, IDN).
5. Keep responses concise and friendly. Confirm what was saved after any write operation.
6. For simple greetings or questions, answer directly — do not call a tool unnecessarily.

DATE RULES:
- Relative dates like "next month" or "Christmas" → ask the user for exact dates
- Past dates → ask the user to confirm
- "dec" or "december" without a year → ask which year

CONVERSATION INTENT:
- "hi", "hello", "what can you do?" → respond conversationally, no tool call
- "where are my trips?" → call get_user_trips
- "plan a trip to Tokyo" → call plan_trip
- "generate the itinerary" → call generate_itinerary with the current trip_id"""

        if self.trip_context and "error" not in self.trip_context:
            t         = self.trip_context
            dest      = t.get("destination", "Unknown")
            dates     = f"{t.get('start_date')} to {t.get('end_date')}" if t.get("start_date") else "dates not set"
            budget    = f"SGD {t.get('budget'):,.0f}" if t.get("budget") else "not set"
            days      = t.get("duration_days", "?")
            pax       = t.get("travelers_count", 1)
            act_count = sum(len(d["activities"]) for d in t.get("itinerary", []))

            base += f"""

CURRENT TRIP CONTEXT:
You are currently chatting in the context of this specific trip:
  Trip ID:     {t.get("id")}
  Destination: {dest}
  Dates:       {dates}
  Duration:    {days} days
  Travelers:   {pax}
  Budget:      {budget}
  Activities:  {act_count} planned so far

When the user says "this trip", "the trip", "my trip", or similar — they mean this trip (ID: {t.get("id")}).
Use update_trip or generate_itinerary with trip_id={t.get("id")} for any modifications."""

        return base

    def _create_agent(self) -> AgentExecutor:
        prompt = ChatPromptTemplate.from_messages([
            ("system", self._build_system_prompt()),
            MessagesPlaceholder(variable_name="chat_history", optional=True),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        agent = create_openai_functions_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=prompt,
        )

        return AgentExecutor(
            agent=agent,
            tools=self.tools,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=5,
            return_intermediate_steps=False,
        )

    # ── Message processing ────────────────────────────────────

    async def process_message(
        self,
        message: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Process one user message and return a response dict.

        chat_history: list of {"role": "user"|"assistant", "content": "..."} dicts.
        """
        lc_history = []
        for msg in (chat_history or []):
            if msg.get("role") == "user":
                lc_history.append(HumanMessage(content=msg["content"]))
            elif msg.get("role") == "assistant":
                lc_history.append(AIMessage(content=msg["content"]))

        try:
            result = await self.agent_executor.ainvoke({
                "input":        message,
                "chat_history": lc_history,
            })

            output = str(result.get("output", "I couldn't process that request."))

            # Fetch fresh trip data after agent runs so the frontend
            # always gets up-to-date activities/expenses etc.
            trip_data = None
            if self.trip_id:
                try:
                    from ..services.trip_service import TripService
                    svc       = TripService(self.db)
                    trip_data = svc.get_trip_or_404(self.trip_id, self.user_id)
                except Exception:
                    pass

            return {
                "response":     output,
                "action_taken": self._infer_action(output),
                "trip_data":    trip_data,
            }

        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"[TripMindAgent] process_message error: {type(e).__name__}: {e}")
            return {
                "response":     f"I encountered an issue: {type(e).__name__}: {e}",
                "action_taken": "error",
                "trip_data":    None,
            }

    def _infer_action(self, output: str) -> str:
        lower = output.lower()
        if any(w in lower for w in ["saved", "created", "planned", "trip to"]):
            return "created_trip"
        if any(w in lower for w in ["updated", "changed", "modified"]):
            return "updated_trip"
        if any(w in lower for w in ["itinerary", "day 1", "activities", "generated"]):
            return "generated_itinerary"
        if "trips" in lower:
            return "retrieved_trips"
        return "answered_question"