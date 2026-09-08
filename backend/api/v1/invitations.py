from fastapi import APIRouter, Depends, status
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.core.dependencies import get_current_landlord, get_current_user
from backend.models import LandlordProfile, User, Property, Unit
from backend.schemas.invitation import (
    InvitationCreate,
    InvitationCreateResponse,
    InvitationResponse,
    InvitationAccept,
)
from backend.schemas.tenancy import TenancyResponse
from backend.services.invitation_service import InvitationService
from backend.repositories.invitation_repository import InvitationRepository
import uuid

router = APIRouter(prefix="/invitations", tags=["Invitations"])

@router.post("", status_code=status.HTTP_201_CREATED, response_model=InvitationCreateResponse)
async def create_invitation(
    req: InvitationCreate,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = InvitationService(db)
    invitation, raw_token, shell = await service.create_invitation(landlord, req)

    prop = (await db.execute(select(Property).where(Property.id == req.property_id))).scalar_one_or_none()
    unit = (await db.execute(select(Unit).where(Unit.id == req.unit_id))).scalar_one_or_none()

    # Commit first: the tenant record and invitation must exist before we tell
    # anyone about them, and a slow or failed send must never roll that back.
    await db.commit()
    await db.refresh(invitation)

    email_result, sms_result = await service.send_invitation_notifications(
        invitation,
        raw_token,
        property_name=prop.name if prop else "your property",
        unit_number=unit.unit_number if unit else "",
    )

    return InvitationCreateResponse(
        invitation=InvitationResponse.model_validate(invitation),
        raw_token=raw_token,
        invite_link=f"/accept-invitation?token={raw_token}",
        tenant_id=shell.id,
        email=email_result,
        sms=sms_result,
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
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = InvitationService(db)
    return await service.accept_invitation_transaction(req.token, user)
