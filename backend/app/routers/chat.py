from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..limiter import limiter
from ..models import User
from ..schemas import ChatRequest, ChatResponse

router = APIRouter(tags=["chat"])


@router.post("/api/chat", response_model=ChatResponse)
@limiter.limit("10/minute")
async def chat(
    request: Request,
    data: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        from ..agents.base_agent import TripMindAgent

        agent = TripMindAgent(db=db, user_id=current_user.id, trip_id=data.trip_id)
        history = [m.model_dump() for m in (data.chat_history or [])]
        response = await agent.process_message(
            message=data.message,
            chat_history=history,
        )
        return ChatResponse(
            message=response["response"],
            action_taken=response.get("action_taken", "answered_question"),
            trip_data=response.get("trip_data"),
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return ChatResponse(
            message=f"I encountered an error: {e}",
            action_taken="error",
            trip_data=None,
        )
