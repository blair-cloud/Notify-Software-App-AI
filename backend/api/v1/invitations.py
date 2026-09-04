from fastapi import APIRouter, Depends, status
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.core.dependencies import get_current_landlord, get_current_user
from backend.models import LandlordProfile, User
from backend.schemas.invitation import InvitationCreate, InvitationResponse, InvitationAccept
from backend.schemas.tenancy import TenancyResponse
from backend.services.invitation_service import InvitationService
from backend.repositories.invitation_repository import InvitationRepository
import uuid

router = APIRouter(prefix="/invitations", tags=["Invitations"])

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_invitation(
    req: InvitationCreate,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    service = InvitationService(db)
    invitation, raw_token = await service.create_invitation(landlord, req)
    return {
        "invitation": InvitationResponse.model_validate(invitation),
        "raw_token": raw_token,
        "invite_link": f"/accept-invitation?token={raw_token}"
    }

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
