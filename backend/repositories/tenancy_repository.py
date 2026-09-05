import uuid
from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import Tenancy, TenancyStatus, TenantProfile

class TenancyRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, tenancy_id: uuid.UUID) -> Optional[Tenancy]:
        stmt = (
            select(Tenancy)
            .options(
                selectinload(Tenancy.tenant).selectinload(TenantProfile.user),
                selectinload(Tenancy.property),
                selectinload(Tenancy.unit)
            )
            .where(Tenancy.id == tenancy_id)
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def list_by_landlord(self, landlord_id: uuid.UUID) -> Sequence[Tenancy]:
        stmt = (
            select(Tenancy)
            .options(
                selectinload(Tenancy.tenant).selectinload(TenantProfile.user),
                selectinload(Tenancy.property),
                selectinload(Tenancy.unit)
            )
            .where(Tenancy.landlord_id == landlord_id)
        )
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def list_by_tenant(self, tenant_id: uuid.UUID) -> Sequence[Tenancy]:
        stmt = (
            select(Tenancy)
            .options(
                selectinload(Tenancy.tenant).selectinload(TenantProfile.user),
                selectinload(Tenancy.property),
                selectinload(Tenancy.unit)
            )
            .where(Tenancy.tenant_id == tenant_id)
        )
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def get_active_by_tenant(self, tenant_id: uuid.UUID) -> Optional[Tenancy]:
        stmt = (
            select(Tenancy)
            .options(
                selectinload(Tenancy.tenant).selectinload(TenantProfile.user),
                selectinload(Tenancy.property),
                selectinload(Tenancy.unit)
            )
            .where(
                Tenancy.tenant_id == tenant_id,
                Tenancy.status == TenancyStatus.ACTIVE
            )
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def create(self, tenancy: Tenancy) -> Tenancy:
        self.db.add(tenancy)
        await self.db.flush()
        return tenancy
