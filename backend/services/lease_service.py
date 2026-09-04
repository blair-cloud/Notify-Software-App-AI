import uuid
from typing import Sequence, Optional
from datetime import date, datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.exceptions import NotFoundException, ForbiddenException, ConflictException
from backend.core.permissions import verify_landlord_ownership
from backend.models import Lease, Tenancy, LandlordProfile, LeaseStatus, TenancyStatus
from backend.repositories.lease_repository import LeaseRepository
from backend.repositories.tenancy_repository import TenancyRepository
from backend.repositories.property_repository import PropertyRepository
from backend.repositories.unit_repository import UnitRepository
from backend.schemas.lease import LeaseCreate, LeaseUpdate

class LeaseService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.lease_repo = LeaseRepository(db)
        self.tenancy_repo = TenancyRepository(db)
        self.property_repo = PropertyRepository(db)
        self.unit_repo = UnitRepository(db)

    def calculate_lease_status(self, start_date: date, end_date: date, current_status: LeaseStatus) -> LeaseStatus:
        if current_status in [LeaseStatus.DRAFT, LeaseStatus.TERMINATED, LeaseStatus.PENDING]:
            return current_status
        
        today = date.today()
        if end_date < today:
            return LeaseStatus.EXPIRED
        elif (end_date - today).days <= 30:
            return LeaseStatus.EXPIRING_SOON
        else:
            return LeaseStatus.ACTIVE

    async def create_lease(self, landlord: LandlordProfile, req: LeaseCreate) -> Lease:
        tenancy = await self.tenancy_repo.get_by_id(req.tenancy_id)
        if not tenancy:
            raise NotFoundException("Tenancy not found")
        
        if tenancy.landlord_id != landlord.id:
            raise ForbiddenException("Tenancy does not belong to this landlord")

        status = self.calculate_lease_status(req.start_date, req.end_date, LeaseStatus.ACTIVE)

        lease = Lease(
            tenancy_id=req.tenancy_id,
            landlord_id=landlord.id,
            tenant_id=tenancy.tenant_id,
            property_id=tenancy.property_id,
            unit_id=tenancy.unit_id,
            start_date=req.start_date,
            end_date=req.end_date,
            monthly_rent=req.monthly_rent,
            security_deposit=req.security_deposit,
            payment_due_day=req.payment_due_day,
            late_fee=req.late_fee,
            currency=req.currency,
            notes=req.notes,
            status=status
        )
        return await self.lease_repo.create(lease)

    async def list_landlord_leases(self, landlord: LandlordProfile) -> Sequence[Lease]:
        leases = await self.lease_repo.list_by_landlord(landlord.id)
        # Refresh dynamic status
        for lease in leases:
            new_status = self.calculate_lease_status(lease.start_date, lease.end_date, lease.status)
            if new_status != lease.status:
                lease.status = new_status
        return leases

    async def get_lease_by_id(self, landlord: LandlordProfile, lease_id: uuid.UUID) -> Lease:
        lease = await self.lease_repo.get_by_id(lease_id)
        if not lease:
            raise NotFoundException("Lease not found")
        verify_landlord_ownership(landlord, lease.landlord_id, "Lease")
        lease.status = self.calculate_lease_status(lease.start_date, lease.end_date, lease.status)
        return lease

    async def update_lease(self, landlord: LandlordProfile, lease_id: uuid.UUID, req: LeaseUpdate) -> Lease:
        lease = await self.get_lease_by_id(landlord, lease_id)
        for field, value in req.model_dump(exclude_unset=True).items():
            setattr(lease, field, value)
        lease.status = self.calculate_lease_status(lease.start_date, lease.end_date, lease.status)
        return lease
