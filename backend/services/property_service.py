import uuid
from typing import Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.exceptions import NotFoundException, ForbiddenException
from backend.core.permissions import verify_landlord_ownership
from backend.models import Property, LandlordProfile
from backend.repositories.property_repository import PropertyRepository
from backend.schemas.property import PropertyCreate, PropertyUpdate

class PropertyService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.property_repo = PropertyRepository(db)

    async def create_property(self, landlord: LandlordProfile, req: PropertyCreate) -> Property:
        prop = Property(
            landlord_id=landlord.id,
            name=req.name,
            property_type=req.property_type,
            description=req.description,
            address=req.address,
            district=req.district,
            sector=req.sector,
            cell=req.cell,
            village=req.village,
            latitude=req.latitude,
            longitude=req.longitude
        )
        return await self.property_repo.create(prop)

    async def list_landlord_properties(self, landlord: LandlordProfile) -> Sequence[Property]:
        return await self.property_repo.list_by_landlord(landlord.id)

    async def get_property_by_id(self, landlord: LandlordProfile, property_id: uuid.UUID) -> Property:
        prop = await self.property_repo.get_by_id(property_id)
        if not prop:
            raise NotFoundException("Property not found")
        verify_landlord_ownership(landlord, prop.landlord_id, "Property")
        return prop

    async def update_property(self, landlord: LandlordProfile, property_id: uuid.UUID, req: PropertyUpdate) -> Property:
        prop = await self.get_property_by_id(landlord, property_id)
        for field, value in req.model_dump(exclude_unset=True).items():
            setattr(prop, field, value)
        return await self.property_repo.update(prop)
