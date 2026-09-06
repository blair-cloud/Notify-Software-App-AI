import uuid
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.core.dependencies import get_current_user, get_current_landlord, get_current_tenant
from backend.models import User, LandlordProfile, TenantProfile, Tenancy, Lease, Property, Unit
from backend.schemas.tenancy import TenancyResponse
from backend.repositories.tenancy_repository import TenancyRepository

router = APIRouter(tags=["Tenants"])


# 1. Landlord's tenant directory (/api/v1/tenants)
@router.get("/tenants")
async def list_landlord_tenants(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    # Fetch all tenancies for this landlord with tenant, user, property, unit, and leases
    stmt = (
        select(Tenancy)
        .options(
            selectinload(Tenancy.tenant).selectinload(TenantProfile.user),
            selectinload(Tenancy.property),
            selectinload(Tenancy.unit),
            selectinload(Tenancy.leases)
        )
        .where(Tenancy.landlord_id == landlord.id)
    )
    res = await db.execute(stmt)
    tenancies = res.scalars().all()

    tenant_list: List[Dict[str, Any]] = []
    seen_tenant_ids = set()

    for t in tenancies:
        tp = t.tenant
        u = tp.user if tp else None
        
        # Get active or most recent lease
        active_lease = None
        if t.leases:
            active_leases = [l for l in t.leases if l.status.value in ('ACTIVE', 'EXPIRING_SOON')]
            active_lease = active_leases[0] if active_leases else t.leases[-1]

        monthly_rent = float(active_lease.monthly_rent) if active_lease else float(t.unit.rent_amount if t.unit else 0)
        currency = active_lease.currency if active_lease else (t.unit.currency if t.unit else "RWF")
        
        tenant_entry = {
            "id": str(tp.id) if tp else str(t.tenant_id),
            "tenant_id": str(tp.id) if tp else str(t.tenant_id),
            # The user id is what messaging/notifications are addressed to.
            "user_id": str(u.id) if u else None,
            "tenancy_id": str(t.id),
            "first_name": u.first_name if u else "Tenant",
            "last_name": u.last_name if u else "",
            "name": f"{u.first_name if u else ''} {u.last_name if u else ''}".strip(),
            "email": u.email if u else "",
            "phone": u.phone if u else "",
            "preferred_language": u.language.value if (u and hasattr(u, "language") and hasattr(u.language, "value")) else "EN",
            "national_id": tp.national_id if tp else None,
            "occupation": tp.occupation if tp else None,
            "property_id": str(t.property_id),
            "property_name": t.property.name if t.property else "",
            "unit_id": str(t.unit_id),
            "unit_number": t.unit.unit_number if t.unit else "",
            "monthly_rent": monthly_rent,
            "currency": currency,
            "status": t.status.value if hasattr(t.status, "value") else str(t.status),
            "lease_status": active_lease.status.value if active_lease else None,
            "lease_end_date": active_lease.end_date.isoformat() if active_lease and active_lease.end_date else None,
            "tenancy_start_date": t.start_date.isoformat() if t.start_date else None,
            "history": []
        }
        tenant_list.append(tenant_entry)

    return tenant_list


# 2. Tenant profile by ID (/api/v1/tenants/{tenant_id})
@router.get("/tenants/{tenant_id}")
async def get_tenant_by_id(
    tenant_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        t_uuid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant UUID format")
        
    stmt = (
        select(TenantProfile)
        .options(selectinload(TenantProfile.user))
        .where(TenantProfile.id == t_uuid)
    )
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Tenant profile not found")
        
    u = profile.user
    return {
        "id": str(profile.id),
        "user_id": str(profile.user_id),
        "first_name": u.first_name if u else "",
        "last_name": u.last_name if u else "",
        "email": u.email if u else "",
        "phone": u.phone if u else "",
        "national_id": profile.national_id,
        "occupation": profile.occupation,
        "emergency_name": profile.emergency_name,
        "emergency_phone": profile.emergency_phone,
        "verification_status": profile.verification_status.value if hasattr(profile.verification_status, "value") else str(profile.verification_status)
    }


# 3. Tenant's own tenancies (/api/v1/tenants/me/tenancies and /api/v1/tenant/tenancy)
@router.get("/tenants/me/tenancies", response_model=List[TenancyResponse])
@router.get("/tenant/tenancy", response_model=List[TenancyResponse])
async def get_my_tenancies(
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    repo = TenancyRepository(db)
    return await repo.list_by_tenant(tenant.id)
