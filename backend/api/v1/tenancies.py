from fastapi import APIRouter, Depends, status
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.core.dependencies import get_current_landlord
from backend.models import LandlordProfile
from backend.schemas.tenancy import TenancyCreate, TenancyUpdate, TenancyResponse
from backend.services.tenancy_service import TenancyService
import uuid

router = APIRouter(prefix="/tenancies", tags=["Tenancies"])

@router.post("", response_model=TenancyResponse, status_code=status.HTTP_201_CREATED)
async def create_tenancy(
    req: TenancyCreate,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = TenancyService(db)
    return await service.create_tenancy(landlord, req)

@router.get("", response_model=List[TenancyResponse])
async def list_tenancies(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = TenancyService(db)
    return await service.list_landlord_tenancies(landlord)

@router.patch("/{tenancy_id}/end", response_model=TenancyResponse)
async def end_tenancy(
    tenancy_id: str,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = TenancyService(db)
    return await service.end_tenancy(landlord, uuid.UUID(tenancy_id))
