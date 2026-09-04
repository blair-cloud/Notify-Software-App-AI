from fastapi import APIRouter, Depends, status
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.core.dependencies import get_current_landlord
from backend.models import LandlordProfile
from backend.schemas.lease import LeaseCreate, LeaseUpdate, LeaseResponse
from backend.services.lease_service import LeaseService
import uuid

router = APIRouter(prefix="/leases", tags=["Leases"])

@router.post("", response_model=LeaseResponse, status_code=status.HTTP_201_CREATED)
async def create_lease(
    req: LeaseCreate,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = LeaseService(db)
    return await service.create_lease(landlord, req)

@router.get("", response_model=List[LeaseResponse])
async def list_leases(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = LeaseService(db)
    return await service.list_landlord_leases(landlord)

@router.get("/{lease_id}", response_model=LeaseResponse)
async def get_lease(
    lease_id: str,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = LeaseService(db)
    return await service.get_lease_by_id(landlord, uuid.UUID(lease_id))

@router.patch("/{lease_id}", response_model=LeaseResponse)
async def update_lease(
    lease_id: str,
    req: LeaseUpdate,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = LeaseService(db)
    return await service.update_lease(landlord, uuid.UUID(lease_id), req)
