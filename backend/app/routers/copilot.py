from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
from app.database import get_db
from app.ai import copilot_service

router = APIRouter(prefix="/api/copilot", tags=["copilot"])

MAX_MESSAGE_LEN = 2000


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., max_length=MAX_MESSAGE_LEN)
    history: Optional[List[ChatMessage]] = None


class ExplainRequest(BaseModel):
    subject_type: str  # "kpi" | "opportunity"
    subject_id: Optional[str] = None


@router.post("/chat")
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    if len(req.message.strip()) == 0:
        raise HTTPException(400, "Message cannot be empty")
    history = [h.dict() for h in req.history] if req.history else []
    return copilot_service.chat(db, req.message, history)


@router.post("/explain")
def explain(req: ExplainRequest, db: Session = Depends(get_db)):
    return copilot_service.explain(db, req.subject_type, req.subject_id)