from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.core.dependencies import get_current_landlord
from backend.models import LandlordProfile
from backend.schemas.landlord import LandlordProfileResponse
from backend.schemas.tenancy import TenancyResponse
from backend.repositories.tenancy_repository import TenancyRepository

router = APIRouter(prefix="/landlord", tags=["Landlord"])

@router.get("/profile", response_model=LandlordProfileResponse)
async def get_landlord_profile(landlord: LandlordProfile = Depends(get_current_landlord)):
    return landlord

@router.get("/tenancies", response_model=List[TenancyResponse])
async def get_landlord_tenancies(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    repo = TenancyRepository(db)
    return await repo.list_by_landlord(landlord.id)
