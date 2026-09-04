import uuid
from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import Property

class PropertyRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, property_id: uuid.UUID) -> Optional[Property]:
        stmt = select(Property).where(Property.id == property_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def list_by_landlord(self, landlord_id: uuid.UUID) -> Sequence[Property]:
        stmt = select(Property).where(Property.landlord_id == landlord_id)
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def create(self, property_obj: Property) -> Property:
        self.db.add(property_obj)
        await self.db.flush()
        return property_obj

    async def update(self, property_obj: Property) -> Property:
        await self.db.flush()
        return property_obj

    async def delete(self, property_obj: Property) -> None:
        await self.db.delete(property_obj)
        await self.db.flush()
