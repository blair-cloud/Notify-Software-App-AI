from fastapi import APIRouter, Depends, status
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.core.dependencies import get_current_landlord, get_current_user
from backend.core.scoping import is_admin
from backend.models import LandlordProfile, User
from backend.schemas.property import PropertyCreate, PropertyUpdate, PropertyResponse
from backend.services.property_service import PropertyService

router = APIRouter(prefix="/properties", tags=["Properties"])

@router.post("", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
async def create_property(
    req: PropertyCreate,
    current_user: User = Depends(get_current_user),
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = PropertyService(db)
    target_landlord = landlord
    if is_admin(current_user) and req.landlord_id:
        target_landlord = await db.get(LandlordProfile, req.landlord_id)
        if not target_landlord:
            from backend.core.exceptions import NotFoundException
            raise NotFoundException("Specified landlord not found")
    elif not target_landlord:
        from backend.core.exceptions import ForbiddenException
        raise ForbiddenException("Landlord profile required to create property")
    return await service.create_property(target_landlord, req)

@router.get("", response_model=List[PropertyResponse])
async def list_properties(
    landlord: LandlordProfile = Depends(get_current_landlord),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    A landlord's own properties. A system admin has no landlord profile, so
    they get the whole platform - which is what the admin dashboard needs.
    """
    service = PropertyService(db)
    if landlord is None and is_admin(current_user):
        return await service.list_all_properties()
    return await service.list_landlord_properties(landlord)

@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property(
    property_id: str,
    current_user: User = Depends(get_current_user),
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    import uuid
    service = PropertyService(db)
    effective_landlord = None if is_admin(current_user) else landlord
    return await service.get_property_by_id(effective_landlord, uuid.UUID(property_id))

@router.patch("/{property_id}", response_model=PropertyResponse)
async def update_property(
    property_id: str,
    req: PropertyUpdate,
    current_user: User = Depends(get_current_user),
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    import uuid
    service = PropertyService(db)
    effective_landlord = None if is_admin(current_user) else landlord
    return await service.update_property(effective_landlord, uuid.UUID(property_id), req)

@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_property(
    property_id: str,
    current_user: User = Depends(get_current_user),
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    import uuid
    service = PropertyService(db)
    effective_landlord = None if is_admin(current_user) else landlord
    await service.delete_property(effective_landlord, uuid.UUID(property_id))
    return None
