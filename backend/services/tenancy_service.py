import uuid
from typing import Sequence, Optional
from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.exceptions import NotFoundException, ForbiddenException, ConflictException
from backend.core.permissions import verify_landlord_ownership
from backend.models import Tenancy, Unit, Property, LandlordProfile, TenantProfile, TenancyStatus, UnitStatus, Lease, LeaseStatus
from backend.repositories.tenancy_repository import TenancyRepository
from backend.repositories.unit_repository import UnitRepository
from backend.repositories.property_repository import PropertyRepository
from backend.repositories.user_repository import UserRepository
from backend.schemas.tenancy import TenancyCreate, TenancyUpdate

class TenancyService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.tenancy_repo = TenancyRepository(db)
        self.unit_repo = UnitRepository(db)
        self.property_repo = PropertyRepository(db)
        self.user_repo = UserRepository(db)

    async def create_tenancy(self, landlord: LandlordProfile | None, req: TenancyCreate) -> Tenancy:
        # 1. Verify property ownership
        prop = await self.property_repo.get_by_id(req.property_id)
        if not prop:
            raise NotFoundException("Property not found")
        if landlord is not None and prop.landlord_id != landlord.id:
            raise ForbiddenException("Property does not exist or does not belong to landlord")

        target_landlord_id = landlord.id if landlord else prop.landlord_id

        # 2. Verify unit belongs to property & landlord
        unit = await self.unit_repo.get_by_id(req.unit_id)
        if not unit or unit.property_id != req.property_id or unit.landlord_id != target_landlord_id:
            raise ForbiddenException("Unit does not belong to this property or landlord")

        # 3. Check for double occupancy
        stmt = select(Tenancy).where(
            Tenancy.unit_id == req.unit_id,
            Tenancy.status == TenancyStatus.ACTIVE
        )
        existing_res = await self.db.execute(stmt)
        existing_tenancy = existing_res.scalar_one_or_none()
        if existing_tenancy or unit.status == UnitStatus.OCCUPIED:
            raise ConflictException("This unit is already occupied by another tenant.")

        # 4. Verify tenant exists
        tenant_profile = await self.user_repo.get_tenant_profile_by_id(req.tenant_id)
        if not tenant_profile:
            raise NotFoundException("Tenant profile not found")

        # 5. Reuse a tenancy already sitting on this exact tenant+unit pairing
        reuse_stmt = select(Tenancy).where(
            Tenancy.tenant_id == tenant_profile.id,
            Tenancy.unit_id == req.unit_id,
            Tenancy.status.in_([TenancyStatus.INVITED, TenancyStatus.PENDING]),
        )
        tenancy = (await self.db.execute(reuse_stmt)).scalars().first()

        if tenancy:
            tenancy.status = TenancyStatus.ACTIVE
            tenancy.start_date = req.start_date
            tenancy.end_date = req.end_date
        else:
            tenancy = Tenancy(
                tenant_id=tenant_profile.id,
                landlord_id=target_landlord_id,
                property_id=req.property_id,
                unit_id=req.unit_id,
                status=TenancyStatus.ACTIVE,
                start_date=req.start_date,
                end_date=req.end_date
            )
            tenancy = await self.tenancy_repo.create(tenancy)

        # 6. Update unit status
        unit.status = UnitStatus.OCCUPIED
        await self.unit_repo.update(unit)

        return await self.tenancy_repo.get_by_id(tenancy.id)

    async def list_all_tenancies(self) -> Sequence[Tenancy]:
        return await self.tenancy_repo.list_all()

    async def list_landlord_tenancies(self, landlord: LandlordProfile) -> Sequence[Tenancy]:
        return await self.tenancy_repo.list_by_landlord(landlord.id)

    async def end_tenancy(self, landlord: LandlordProfile, tenancy_id: uuid.UUID) -> Tenancy:
        tenancy = await self.tenancy_repo.get_by_id(tenancy_id)
        if not tenancy or tenancy.landlord_id != landlord.id:
            raise ForbiddenException("Tenancy not found or does not belong to landlord")

        tenancy.status = TenancyStatus.ENDED
        tenancy.end_date = date.today()

        # Mark unit vacant
        unit = await self.unit_repo.get_by_id(tenancy.unit_id)
        if unit:
            unit.status = UnitStatus.VACANT
            await self.unit_repo.update(unit)

        return tenancy
