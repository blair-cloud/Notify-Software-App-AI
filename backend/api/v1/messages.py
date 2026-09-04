import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.core.dependencies import get_current_user
from backend.models import User
from backend.schemas.message import MessageCreate, MessageResponse, ConversationSummary
from backend.services.message_service import MessageService

router = APIRouter(prefix="/messages", tags=["Messages"])


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await MessageService.send_message(db, current_user, data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[MessageResponse])
async def get_messages(
    partner_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p_uuid = uuid.UUID(partner_id) if partner_id else None
    return await MessageService.get_messages(db, current_user.id, p_uuid)


@router.get("/conversations", response_model=List[ConversationSummary])
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await MessageService.get_conversations(db, current_user)


@router.post("/read/{partner_id}")
async def mark_messages_read(
    partner_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p_uuid = uuid.UUID(partner_id)
    return await MessageService.mark_as_read(db, current_user.id, p_uuid)
