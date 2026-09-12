from fastapi import APIRouter, Depends, Request, status
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.core.dependencies import get_current_landlord
from backend.models import LandlordProfile, Property, Unit
from backend.schemas.invitation import (
    InvitationCreate,
    InvitationCreateResponse,
    InvitationResponse,
    InvitationAccept,
    DeliveryChannelResult,
)
from backend.schemas.tenancy import TenancyResponse
from backend.services.invitation_service import InvitationService
from backend.repositories.invitation_repository import InvitationRepository
import uuid

router = APIRouter(prefix="/invitations", tags=["Invitations"])


def _landlord_display_name(landlord: LandlordProfile) -> str:
    """Business name if there is one, else the landlord's own name."""
    if getattr(landlord, "business_name", None):
        return landlord.business_name
    user = getattr(landlord, "user", None)
    if user:
        full = f"{user.first_name or ''} {user.last_name or ''}".strip()
        if full:
            return full
    return "Your landlord"

@router.post("", status_code=status.HTTP_201_CREATED, response_model=InvitationCreateResponse)
async def create_invitation(
    req: InvitationCreate,
    request: Request,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    from urllib.parse import urlparse
    origin = request.headers.get("origin") or request.headers.get("referer")
    frontend_base = None
    if origin:
        p = urlparse(origin)
        frontend_base = f"{p.scheme}://{p.netloc}".rstrip("/")
    service = InvitationService(db)
    invitation, raw_token, shell = await service.create_invitation(landlord, req)

    prop = (await db.execute(select(Property).where(Property.id == req.property_id))).scalar_one_or_none()
    unit = (await db.execute(select(Unit).where(Unit.id == req.unit_id))).scalar_one_or_none()

    # Commit first: the tenant record and invitation must exist before we tell
    # anyone about them, and a slow or failed send must never roll that back.
    await db.commit()
    await db.refresh(invitation)

    email_result = DeliveryChannelResult(attempted=False, ok=False)
    sms_result = DeliveryChannelResult(attempted=False, ok=False)
    whatsapp_result = DeliveryChannelResult(attempted=False, ok=False)
    try:
        email_result, sms_result, whatsapp_result = await service.send_invitation_notifications(
            invitation,
            raw_token,
            property_name=prop.name if prop else "your property",
            unit_number=unit.unit_number if unit else "",
            landlord_name=_landlord_display_name(landlord),
            frontend_base_url=frontend_base,
        )
        # The WhatsApp send writes its own delivery record; persist it (and any
        # other channel bookkeeping) now that the sends are done.
        await db.commit()
    except Exception:
        # Invitation is already saved - never fail the create API because a
        # notification channel crashed. Landlord can resend from the UI.
        import logging
        logging.getLogger("invitations").exception(
            "Invitation %s created but notification dispatch failed", invitation.id
        )
        try:
            await db.rollback()
        except Exception:
            pass

    return InvitationCreateResponse(
        invitation=InvitationResponse.model_validate(invitation),
        raw_token=raw_token,
        invite_link=f"/accept-invitation?token={raw_token}",
        tenant_id=shell.id,
        email=email_result,
        sms=sms_result,
        whatsapp=whatsapp_result,
    )

@router.post("/{invitation_id}/resend", response_model=InvitationCreateResponse)
async def resend_invitation(
    invitation_id: str,
    request: Request,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    from urllib.parse import urlparse
    origin = request.headers.get("origin") or request.headers.get("referer")
    frontend_base = None
    if origin:
        p = urlparse(origin)
        frontend_base = f"{p.scheme}://{p.netloc}".rstrip("/")
    """
    Re-send an invitation whose delivery failed (or that the tenant lost).

    A fresh token is issued - the old one stops working - and all three
    channels are attempted again, each reported independently.
    """
    service = InvitationService(db)
    invitation, raw_token = await service.reissue_invitation(landlord, uuid.UUID(invitation_id))

    prop = (await db.execute(select(Property).where(Property.id == invitation.property_id))).scalar_one_or_none()
    unit = (await db.execute(select(Unit).where(Unit.id == invitation.unit_id))).scalar_one_or_none()

    await db.commit()
    await db.refresh(invitation)

    email_result = DeliveryChannelResult(attempted=False, ok=False)
    sms_result = DeliveryChannelResult(attempted=False, ok=False)
    whatsapp_result = DeliveryChannelResult(attempted=False, ok=False)
    try:
        email_result, sms_result, whatsapp_result = await service.send_invitation_notifications(
            invitation,
            raw_token,
            property_name=prop.name if prop else "your property",
            unit_number=unit.unit_number if unit else "",
            landlord_name=_landlord_display_name(landlord),
            frontend_base_url=frontend_base,
        )
        await db.commit()
    except Exception:
        import logging
        logging.getLogger("invitations").exception(
            "Invitation %s reissued but notification dispatch failed", invitation.id
        )
        try:
            await db.rollback()
        except Exception:
            pass

    return InvitationCreateResponse(
        invitation=InvitationResponse.model_validate(invitation),
        raw_token=raw_token,
        invite_link=f"/accept-invitation?token={raw_token}",
        tenant_id=invitation.tenant_profile_id,
        email=email_result,
        sms=sms_result,
        whatsapp=whatsapp_result,
    )


@router.get("", response_model=List[InvitationResponse])
async def list_invitations(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    repo = InvitationRepository(db)
    return await repo.list_by_landlord(landlord.id)

@router.get("/token/{token}")
async def get_invitation_details(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    service = InvitationService(db)
    return await service.get_invitation_by_token(token)

@router.patch("/{invitation_id}/cancel", response_model=InvitationResponse)
async def cancel_invitation(
    invitation_id: str,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = InvitationService(db)
    return await service.cancel_invitation(landlord, uuid.UUID(invitation_id))

@router.post("/accept", response_model=TenancyResponse)
async def accept_invitation(
    req: InvitationAccept,
    db: AsyncSession = Depends(get_db),
):
    """
    Accept a tenant invitation using the token from the invite link.

    No authentication required - the signed token proves identity.
    The service resolves the tenant account from the invitation record itself.
    """
    service = InvitationService(db)
    return await service.accept_invitation_transaction(req.token, None)
