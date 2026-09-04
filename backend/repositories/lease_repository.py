import uuid
from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import Lease

class LeaseRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, lease_id: uuid.UUID) -> Optional[Lease]:
        stmt = select(Lease).where(Lease.id == lease_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def list_by_landlord(self, landlord_id: uuid.UUID) -> Sequence[Lease]:
        stmt = select(Lease).where(Lease.landlord_id == landlord_id)
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def list_by_tenant(self, tenant_id: uuid.UUID) -> Sequence[Lease]:
        stmt = select(Lease).where(Lease.tenant_id == tenant_id)
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def create(self, lease: Lease) -> Lease:
        self.db.add(lease)
        await self.db.flush()
        return lease
