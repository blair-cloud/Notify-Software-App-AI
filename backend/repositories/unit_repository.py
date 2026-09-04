import uuid
from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import Unit

class UnitRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, unit_id: uuid.UUID) -> Optional[Unit]:
        stmt = select(Unit).where(Unit.id == unit_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def list_by_landlord(self, landlord_id: uuid.UUID) -> Sequence[Unit]:
        stmt = select(Unit).where(Unit.landlord_id == landlord_id)
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def list_by_property(self, property_id: uuid.UUID) -> Sequence[Unit]:
        stmt = select(Unit).where(Unit.property_id == property_id)
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def create(self, unit_obj: Unit) -> Unit:
        self.db.add(unit_obj)
        await self.db.flush()
        return unit_obj

    async def update(self, unit_obj: Unit) -> Unit:
        await self.db.flush()
        return unit_obj
