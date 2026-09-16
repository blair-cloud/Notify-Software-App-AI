import uuid
from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.orm import selectinload, joinedload, defer
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import Lease, LeaseDocument, Tenancy, TenantProfile, LandlordProfile

class LeaseRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, lease_id: uuid.UUID) -> Optional[Lease]:
        stmt = (
            select(Lease)
            .options(
                joinedload(Lease.property),
                joinedload(Lease.unit),
                joinedload(Lease.tenant).joinedload(TenantProfile.user),
                joinedload(Lease.landlord).joinedload(LandlordProfile.user),
                selectinload(Lease.documents),
                selectinload(Lease.tenancy),
            )
            .where(Lease.id == lease_id)
        )
        res = await self.db.execute(stmt)
        return res.unique().scalar_one_or_none()

    async def list_by_landlord(self, landlord_id: uuid.UUID) -> Sequence[Lease]:
        stmt = (
            select(Lease)
            .options(
                joinedload(Lease.property),
                joinedload(Lease.unit),
                joinedload(Lease.tenant).joinedload(TenantProfile.user),
                joinedload(Lease.landlord).joinedload(LandlordProfile.user),
                selectinload(Lease.documents).defer(LeaseDocument.file_data),
            )
            .where(
                (Lease.landlord_id == landlord_id)
                | (Lease.tenancy.has(Tenancy.landlord_id == landlord_id))
            )
            .order_by(Lease.created_at.desc())
        )
        res = await self.db.execute(stmt)
        return res.unique().scalars().all()

    async def list_by_tenant(self, tenant_id: uuid.UUID) -> Sequence[Lease]:
        stmt = (
            select(Lease)
            .options(
                joinedload(Lease.property),
                joinedload(Lease.unit),
                joinedload(Lease.tenant).joinedload(TenantProfile.user),
                joinedload(Lease.landlord).joinedload(LandlordProfile.user),
                selectinload(Lease.documents).defer(LeaseDocument.file_data),
            )
            .where(
                (Lease.tenant_id == tenant_id)
                | (Lease.tenancy.has(Tenancy.tenant_id == tenant_id))
            )
            .order_by(Lease.created_at.desc())
        )
        res = await self.db.execute(stmt)
        return res.unique().scalars().all()

    async def list_all(self) -> Sequence[Lease]:
        stmt = (
            select(Lease)
            .options(
                joinedload(Lease.property),
                joinedload(Lease.unit),
                joinedload(Lease.tenant).joinedload(TenantProfile.user),
                joinedload(Lease.landlord).joinedload(LandlordProfile.user),
                selectinload(Lease.documents).defer(LeaseDocument.file_data),
            )
            .order_by(Lease.created_at.desc())
        )
        res = await self.db.execute(stmt)
        return res.unique().scalars().all()

    async def create(self, lease: Lease) -> Lease:
        self.db.add(lease)
        await self.db.flush()
        return lease

    async def add_document(self, document: LeaseDocument) -> LeaseDocument:
        self.db.add(document)
        await self.db.flush()
        return document
