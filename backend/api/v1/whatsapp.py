"""
WhatsApp API surface: Meta's status webhook, a configuration readiness check,
the message log, and guarded test sends.

No credential ever leaves this module - the config endpoint reports only
whether each secret is present, never its value.
"""
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request, Response, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.database import get_db
from backend.core.dependencies import get_current_landlord, get_current_user
from backend.core.exceptions import ForbiddenException, NotFoundException
from backend.core.logging import logger
from backend.core.scoping import is_admin
from backend.models import (
    LandlordProfile,
    User,
    WhatsAppMessage,
    WhatsAppMessageStatus,
    WhatsAppMessageType,
)
from backend.services.whatsapp_service import WhatsAppService, template_name_for

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


# ----------------------------------------------------------------------
# Meta webhook
# ----------------------------------------------------------------------

@router.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query("", alias="hub.mode"),
    hub_challenge: str = Query("", alias="hub.challenge"),
    hub_verify_token: str = Query("", alias="hub.verify_token"),
):
    """
    Meta calls this once when you save the callback URL. It must echo back
    hub.challenge verbatim, as plain text, only when the token matches.
    """
    expected = settings.WHATSAPP_VERIFY_TOKEN
    if not expected:
        logger.warning("WhatsApp webhook verification attempted but WHATSAPP_VERIFY_TOKEN is not set")
        return Response(content="verify token not configured", status_code=status.HTTP_403_FORBIDDEN)
    if hub_mode == "subscribe" and hub_verify_token == expected:
        return Response(content=hub_challenge, media_type="text/plain")
    return Response(content="verification failed", status_code=status.HTTP_403_FORBIDDEN)


@router.post("/webhook")
async def receive_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Delivery receipts (sent/delivered/read/failed) from Meta.

    Always answers 200 - Meta retries aggressively on any other status, and a
    payload we cannot use is not something a retry will fix.
    """
    raw = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")

    if settings.WHATSAPP_APP_SECRET:
        if not WhatsAppService.verify_signature(raw, signature):
            # Signed webhooks that do not verify are rejected outright: this
            # endpoint is public, and an unverified body is untrusted input.
            logger.warning("Rejected WhatsApp webhook with an invalid signature")
            return Response(status_code=status.HTTP_403_FORBIDDEN, content="invalid signature")
    else:
        logger.warning(
            "WhatsApp webhook accepted without signature verification - set "
            "WHATSAPP_APP_SECRET in backend/.env to verify Meta's callbacks"
        )

    try:
        payload = await request.json()
    except Exception:  # noqa: BLE001
        return {"received": True, "updated": 0}

    result = await WhatsAppService.handle_status_webhook(db, payload)
    return {"received": True, **result}


# ----------------------------------------------------------------------
# Configuration readiness
# ----------------------------------------------------------------------

class WhatsAppConfigStatus(BaseModel):
    provider: str
    ready_to_send: bool
    access_token_set: bool
    phone_number_id_set: bool
    business_account_id_set: bool
    verify_token_set: bool
    app_secret_set: bool
    api_version: str
    templates: Dict[str, str]
    missing: List[str]


@router.get("/config", response_model=WhatsAppConfigStatus)
async def whatsapp_config(landlord: LandlordProfile = Depends(get_current_landlord)):
    """
    What is and isn't configured, so setup can be checked without reading
    .env. Reports presence only - never a token, secret, or id value.
    """
    missing: List[str] = []
    if (settings.WHATSAPP_PROVIDER or "").lower() != "meta":
        missing.append("WHATSAPP_PROVIDER=meta")
    if not settings.whatsapp_access_token:
        missing.append("WHATSAPP_ACCESS_TOKEN")
    if not settings.whatsapp_phone_number_id:
        missing.append("WHATSAPP_PHONE_NUMBER_ID")
    if not settings.WHATSAPP_BUSINESS_ACCOUNT_ID:
        missing.append("WHATSAPP_BUSINESS_ACCOUNT_ID")
    if not settings.WHATSAPP_VERIFY_TOKEN:
        missing.append("WHATSAPP_VERIFY_TOKEN (webhook)")
    if not settings.WHATSAPP_APP_SECRET:
        missing.append("WHATSAPP_APP_SECRET (webhook signature)")

    return WhatsAppConfigStatus(
        provider=settings.WHATSAPP_PROVIDER or "simulated",
        ready_to_send=settings.whatsapp_is_configured,
        access_token_set=bool(settings.whatsapp_access_token),
        phone_number_id_set=bool(settings.whatsapp_phone_number_id),
        business_account_id_set=bool(settings.WHATSAPP_BUSINESS_ACCOUNT_ID),
        verify_token_set=bool(settings.WHATSAPP_VERIFY_TOKEN),
        app_secret_set=bool(settings.WHATSAPP_APP_SECRET),
        api_version=settings.whatsapp_api_version,
        templates={t.value: template_name_for(t) for t in WhatsAppMessageType if t != WhatsAppMessageType.TEST},
        missing=missing,
    )


# ----------------------------------------------------------------------
# Message log
# ----------------------------------------------------------------------

class WhatsAppMessageResponse(BaseModel):
    id: uuid.UUID
    recipient_phone: str
    recipient_name: Optional[str] = None
    message_type: WhatsAppMessageType
    template_name: Optional[str] = None
    body_preview: Optional[str] = None
    status: WhatsAppMessageStatus
    provider: Optional[str] = None
    provider_message_id: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    invitation_id: Optional[uuid.UUID] = None
    lease_id: Optional[uuid.UUID] = None
    invoice_id: Optional[uuid.UUID] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/messages", response_model=List[WhatsAppMessageResponse])
async def list_messages(
    landlord: LandlordProfile = Depends(get_current_landlord),
    limit: int = Query(100, ge=1, le=500),
    message_type: Optional[WhatsAppMessageType] = None,
    db: AsyncSession = Depends(get_db),
):
    """This landlord's WhatsApp delivery history, newest first."""
    stmt = select(WhatsAppMessage).where(WhatsAppMessage.landlord_id == landlord.id)
    if message_type:
        stmt = stmt.where(WhatsAppMessage.message_type == message_type)
    stmt = stmt.order_by(WhatsAppMessage.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    return list(res.scalars().all())


# ----------------------------------------------------------------------
# Guarded test sends
# ----------------------------------------------------------------------

class WhatsAppTestRequest(BaseModel):
    phone: str
    kind: str = "invitation"  # invitation | rent_due | rent_overdue | lease_expiry | payment_confirmation


class WhatsAppTestResponse(BaseModel):
    ok: bool
    simulated: bool
    status: str
    provider: str
    provider_message_id: Optional[str] = None
    error: Optional[str] = None
    normalized_phone: Optional[str] = None
    template_name: Optional[str] = None
    message_preview: str
    log_id: uuid.UUID


@router.post("/test", response_model=WhatsAppTestResponse)
async def send_test_message(
    req: WhatsAppTestRequest,
    landlord: LandlordProfile = Depends(get_current_landlord),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send one test message of each supported kind to a number you choose.

    Uses obviously-fake sample data, never a real tenant's, and is restricted
    to non-production environments (admins excepted) so it cannot be used to
    message real tenants from a live deployment.
    """
    if settings.ENVIRONMENT.lower() == "production" and not is_admin(current_user):
        raise ForbiddenException("Test sends are disabled in production.")

    landlord_name = "Notify Landlord"
    sample_link = f"{settings.FRONTEND_URL.rstrip('/')}/accept-invitation?token=TEST-TOKEN-DO-NOT-USE"
    kind = (req.kind or "invitation").lower()

    if kind == "invitation":
        message_type = WhatsAppMessageType.INVITATION
        params, text = WhatsAppService.build_invitation(
            "Test Tenant", "Sample Property", "A-1", landlord_name, sample_link
        )
    elif kind == "rent_due":
        message_type = WhatsAppMessageType.RENT_DUE
        params, text = WhatsAppService.build_rent_due(
            "Test Tenant", "RWF 150,000", (date.today() + timedelta(days=3)).isoformat(),
            "Sample Property - Unit A-1", "INV-TEST-0001",
        )
    elif kind == "rent_overdue":
        message_type = WhatsAppMessageType.RENT_OVERDUE
        params, text = WhatsAppService.build_rent_overdue(
            "Test Tenant", "RWF 150,000", "5", "Sample Property - Unit A-1", "INV-TEST-0001",
        )
    elif kind == "lease_expiry":
        message_type = WhatsAppMessageType.LEASE_EXPIRY
        params, text = WhatsAppService.build_lease_expiry(
            "Test Tenant", "Sample Property - Unit A-1",
            (date.today() + timedelta(days=7)).isoformat(), "7",
        )
    elif kind == "payment_confirmation":
        message_type = WhatsAppMessageType.PAYMENT_CONFIRMATION
        params, text = WhatsAppService.build_payment_confirmation(
            "Test Tenant", "RWF 150,000", "RCT-TEST-0001", "Sample Property - Unit A-1",
        )
    else:
        raise NotFoundException(
            "Unknown test kind. Use invitation, rent_due, rent_overdue, "
            "lease_expiry, or payment_confirmation."
        )

    result, record = await WhatsAppService.send(
        db,
        phone=req.phone,
        message_type=message_type,
        body_params=params,
        fallback_text=f"[Notify test] {text}",
        recipient_name="Test recipient",
        landlord_id=landlord.id,
        user_id=current_user.id,
        commit=True,
    )

    return WhatsAppTestResponse(
        ok=result.ok,
        simulated=result.simulated,
        status=record.status.value,
        provider=result.provider,
        provider_message_id=result.provider_message_id,
        error=result.error,
        normalized_phone=record.recipient_phone,
        template_name=record.template_name,
        message_preview=text,
        log_id=record.id,
    )
