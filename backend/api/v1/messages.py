import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.core.dependencies import get_current_user, get_current_landlord
from backend.integrations.translation import LANGUAGE_LABELS, SUPPORTED_LANGUAGES, list_templates
from backend.models import LandlordProfile, User
from backend.schemas.message import (
    BulkMessageRequest,
    ConversationSummary,
    MessageCreate,
    MessagePreviewRequest,
    MessageResponse,
    TranslateRequest,
)
from backend.services.communication_service import CommunicationService
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


# ----------------------------------------------------------------------
# Landlord broadcast / reminder routes. These are declared before the
# dynamic conversation routes below and reuse the same Message, Notification
# and NotificationDeliveryLog tables the 1:1 chat already writes to.
# ----------------------------------------------------------------------

@router.get("/templates")
async def get_message_templates(
    current_user: User = Depends(get_current_user),
):
    """Reminder templates with their English, French and Kinyarwanda wording."""
    return {
        "languages": [{"code": code, "label": LANGUAGE_LABELS[code]} for code in SUPPORTED_LANGUAGES],
        "templates": list_templates(),
    }


@router.post("/preview")
async def preview_message(
    req: MessagePreviewRequest,
    current_user: User = Depends(get_current_user),
):
    """Render a template in all three languages for the landlord to review/edit."""
    overrides = {lang: msg.model_dump(exclude_none=True) for lang, msg in (req.overrides or {}).items()}
    return {"messages": CommunicationService.compose_preview(req.template_code, req.variables, overrides)}


@router.post("/translate")
async def translate_message(
    req: TranslateRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Machine-translate custom text. Languages the translator cannot handle come
    back as null in `translations` and are listed in `untranslated_languages`,
    so the landlord knows exactly which wording they still need to write.
    """
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Nothing to translate.")
    return await CommunicationService.translate_message(req.text, req.source_language, req.target_languages)


@router.post("/bulk", status_code=status.HTTP_200_OK)
async def send_bulk_message(
    req: BulkMessageRequest,
    current_user: User = Depends(get_current_user),
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    """
    Send one reviewed message to one or many of the landlord's own tenants,
    across any combination of in-app, SMS, WhatsApp and email. The response
    reports the outcome of every channel for every recipient.
    """
    if not req.recipient_ids:
        raise HTTPException(status_code=400, detail="Select at least one recipient.")

    messages = {lang: msg.model_dump(exclude_none=True) for lang, msg in (req.messages or {}).items()}
    return await CommunicationService.send_bulk(
        db,
        sender=current_user,
        landlord=landlord,
        recipient_ids=req.recipient_ids,
        channels=req.channels,
        template_code=req.template_code,
        messages=messages,
        variables=req.variables,
        category=req.category,
        priority=req.priority,
        entity_type=req.entity_type,
        entity_id=req.entity_id,
        force_language=req.force_language,
    )


@router.get("/delivery-history")
async def get_delivery_history(
    limit: int = Query(200, ge=1, le=500),
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    """Past delivery outcomes (sent / failed / skipped) for this landlord's tenants."""
    return await CommunicationService.get_delivery_history(db, landlord, limit)


@router.get("", response_model=List[MessageResponse])
async def get_messages(
    partner_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p_uuid = None
    if partner_id:
        try:
            p_uuid = uuid.UUID(partner_id)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"'{partner_id}' is not a valid conversation id.")
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
    try:
        p_uuid = uuid.UUID(partner_id)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"'{partner_id}' is not a valid conversation id.")
    return await MessageService.mark_as_read(db, current_user.id, p_uuid)
