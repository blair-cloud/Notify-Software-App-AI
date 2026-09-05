import uuid
from typing import Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.exceptions import NotFoundException, ForbiddenException
from backend.core.permissions import verify_landlord_ownership
from backend.models import Unit, LandlordProfile
from backend.repositories.unit_repository import UnitRepository
from backend.repositories.property_repository import PropertyRepository
from backend.schemas.unit import UnitCreate, UnitUpdate

class UnitService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.unit_repo = UnitRepository(db)
        self.property_repo = PropertyRepository(db)

    async def create_unit(self, landlord: LandlordProfile, req: UnitCreate) -> Unit:
        prop = await self.property_repo.get_by_id(req.property_id)
        if not prop or prop.landlord_id != landlord.id:
            raise ForbiddenException("Property not found or does not belong to landlord")

        unit = Unit(
            property_id=req.property_id,
            landlord_id=landlord.id,
            unit_number=req.unit_number,
            floor=req.floor,
            unit_type=req.unit_type,
            monthly_rent=req.monthly_rent,
            currency=req.currency,
            rooms=req.rooms,
            bathrooms=req.bathrooms,
            square_meters=req.square_meters,
            description=req.description
        )
        return await self.unit_repo.create(unit)

    async def list_landlord_units(self, landlord: LandlordProfile) -> Sequence[Unit]:
        return await self.unit_repo.list_by_landlord(landlord.id)

    async def get_unit_by_id(self, landlord: LandlordProfile, unit_id: uuid.UUID) -> Unit:
        unit = await self.unit_repo.get_by_id(unit_id)
        if not unit:
            raise NotFoundException("Unit not found")
        verify_landlord_ownership(landlord, unit.landlord_id, "Unit")
        return unit

    async def update_unit(self, landlord: LandlordProfile, unit_id: uuid.UUID, req: UnitUpdate) -> Unit:
        unit = await self.get_unit_by_id(landlord, unit_id)
        for field, value in req.model_dump(exclude_unset=True).items():
            setattr(unit, field, value)
        return await self.unit_repo.update(unit)

    async def delete_unit(self, landlord: LandlordProfile, unit_id: uuid.UUID) -> None:
        unit = await self.get_unit_by_id(landlord, unit_id)
        await self.unit_repo.delete(unit)
