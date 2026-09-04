from fastapi import APIRouter, Depends, status
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.core.dependencies import get_current_landlord
from backend.models import LandlordProfile
from backend.schemas.unit import UnitCreate, UnitUpdate, UnitResponse
from backend.services.unit_service import UnitService

router = APIRouter(prefix="/units", tags=["Units"])

@router.post("", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
async def create_unit(
    req: UnitCreate,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = UnitService(db)
    return await service.create_unit(landlord, req)

@router.get("", response_model=List[UnitResponse])
async def list_units(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = UnitService(db)
    return await service.list_landlord_units(landlord)

@router.get("/{unit_id}", response_model=UnitResponse)
async def get_unit(
    unit_id: str,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    import uuid
    service = UnitService(db)
    return await service.get_unit_by_id(landlord, uuid.UUID(unit_id))

@router.patch("/{unit_id}", response_model=UnitResponse)
async def update_unit(
    unit_id: str,
    req: UnitUpdate,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    import uuid
    service = UnitService(db)
    return await service.update_unit(landlord, uuid.UUID(unit_id), req)
