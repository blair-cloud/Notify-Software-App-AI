from fastapi import APIRouter, Depends
from typing import List
from datetime import date, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.core.dependencies import get_current_landlord
from backend.models import LandlordProfile, Property, Unit, UnitStatus, Lease, LeaseStatus
from backend.schemas.landlord import LandlordProfileResponse, LandlordDashboardStatsResponse
from backend.schemas.tenancy import TenancyResponse
from backend.repositories.tenancy_repository import TenancyRepository

router = APIRouter(prefix="/landlord", tags=["Landlord"])


@router.get("/profile", response_model=LandlordProfileResponse)
async def get_landlord_profile(landlord: LandlordProfile = Depends(get_current_landlord)):
    return landlord


@router.get("/tenancies", response_model=List[TenancyResponse])
async def get_landlord_tenancies(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    repo = TenancyRepository(db)
    return await repo.list_by_landlord(landlord.id)


@router.get("/stats", response_model=LandlordDashboardStatsResponse)
async def get_landlord_stats(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    # Total properties
    prop_res = await db.execute(select(func.count(Property.id)).where(Property.landlord_id == landlord.id))
    total_properties = prop_res.scalar() or 0

    # Total units & breakdown
    units_res = await db.execute(select(Unit).where(Unit.landlord_id == landlord.id))
    units = units_res.scalars().all()
    total_units = len(units)
    occupied_units = sum(1 for u in units if u.status == UnitStatus.OCCUPIED)
    vacant_units = sum(1 for u in units if u.status == UnitStatus.VACANT)
    maintenance_units = sum(1 for u in units if u.status == UnitStatus.MAINTENANCE)

    occupancy_rate = round((occupied_units / total_units * 100), 1) if total_units > 0 else 0.0

    # Active leases for expected monthly rent and expiring soon count
    today = date.today()
    in_30_days = today + timedelta(days=30)
    leases_res = await db.execute(
        select(Lease).where(
            Lease.landlord_id == landlord.id,
            Lease.status.in_([LeaseStatus.ACTIVE, LeaseStatus.EXPIRING_SOON])
        )
    )
    leases = leases_res.scalars().all()
    expected_monthly_rent = sum(float(l.monthly_rent) for l in leases)
    leases_expiring_soon = sum(
        1 for l in leases if l.status == LeaseStatus.EXPIRING_SOON or (l.end_date and l.end_date <= in_30_days)
    )

    return LandlordDashboardStatsResponse(
        total_properties=total_properties,
        total_units=total_units,
        occupied_units=occupied_units,
        vacant_units=vacant_units,
        maintenance_units=maintenance_units,
        expected_monthly_rent=expected_monthly_rent,
        occupancy_rate=occupancy_rate,
        leases_expiring_soon_count=leases_expiring_soon
    )
