from fastapi import APIRouter, Depends, status
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.core.dependencies import get_current_landlord
from backend.models import LandlordProfile
from backend.schemas.property import PropertyCreate, PropertyUpdate, PropertyResponse
from backend.services.property_service import PropertyService

router = APIRouter(prefix="/properties", tags=["Properties"])

@router.post("", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
async def create_property(
    req: PropertyCreate,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = PropertyService(db)
    return await service.create_property(landlord, req)

@router.get("", response_model=List[PropertyResponse])
async def list_properties(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = PropertyService(db)
    return await service.list_landlord_properties(landlord)

@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property(
    property_id: str,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    import uuid
    service = PropertyService(db)
    return await service.get_property_by_id(landlord, uuid.UUID(property_id))

@router.patch("/{property_id}", response_model=PropertyResponse)
async def update_property(
    property_id: str,
    req: PropertyUpdate,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    import uuid
    service = PropertyService(db)
    return await service.update_property(landlord, uuid.UUID(property_id), req)
