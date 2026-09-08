import uuid
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.core.dependencies import get_current_user, get_current_landlord, get_current_tenant
from backend.core.exceptions import ForbiddenException
from backend.models import User, UserRole, LandlordProfile, TenantProfile, Tenancy, Lease, Property, Unit
from backend.schemas.tenancy import TenancyResponse
from backend.repositories.tenancy_repository import TenancyRepository

router = APIRouter(tags=["Tenants"])


def _tenant_display_fields(tp: Optional[TenantProfile]) -> Dict[str, Any]:
    """
    Name/email/phone for a tenant row.

    A pending tenant (invited but not yet signed up) has no `user` yet, so
    these fall back to whatever the landlord typed into the invitation form.
    Once the invitation is accepted, `tp.user` is populated and takes over -
    the pending_* fields are only ever a stand-in for that window.
    """
    u = tp.user if tp else None
    if u:
        return {
            "first_name": u.first_name,
            "last_name": u.last_name,
            "name": f"{u.first_name} {u.last_name}".strip(),
            "email": u.email,
            "phone": u.phone,
            "preferred_language": u.language.value if hasattr(u.language, "value") else "EN",
        }
    if tp:
        first = tp.pending_first_name or "Pending"
        last = tp.pending_last_name or "Tenant"
        return {
            "first_name": first,
            "last_name": last if tp.pending_last_name else "",
            "name": f"{first} {last}".strip() if tp.pending_last_name else first,
            "email": tp.pending_email or "",
            "phone": tp.pending_phone or "",
            "preferred_language": "EN",
        }
    return {"first_name": "Tenant", "last_name": "", "name": "Tenant", "email": "", "phone": "", "preferred_language": "EN"}


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
        .order_by(Tenancy.created_at.desc())
    )
    res = await db.execute(stmt)
    tenancies = res.scalars().all()

    tenant_list: List[Dict[str, Any]] = []

    for t in tenancies:
        tp = t.tenant
        u = tp.user if tp else None

        # Get active or most recent lease
        active_lease = None
        if t.leases:
            active_leases = [l for l in t.leases if l.status.value in ('ACTIVE', 'EXPIRING_SOON')]
            active_lease = active_leases[0] if active_leases else t.leases[-1]

        monthly_rent = float(active_lease.monthly_rent) if active_lease else float(t.unit.monthly_rent if t.unit else 0)
        currency = active_lease.currency if active_lease else (t.unit.currency if t.unit else "RWF")

        tenant_entry = {
            "id": str(tp.id) if tp else str(t.tenant_id),
            "tenant_id": str(tp.id) if tp else str(t.tenant_id),
            # The user id is what messaging/notifications are addressed to.
            # None for a pending tenant - there is no account to message yet.
            "user_id": str(u.id) if u else None,
            "tenancy_id": str(t.id),
            **_tenant_display_fields(tp),
            "national_id": tp.national_id if tp else None,
            "occupation": tp.occupation if tp else None,
            "property_id": str(t.property_id),
            "property_name": t.property.name if t.property else "",
            "unit_id": str(t.unit_id),
            "unit_number": t.unit.unit_number if t.unit else "",
            "monthly_rent": monthly_rent,
            "currency": currency,
            # INVITED here means exactly what the landlord needs to know: this
            # tenant has not signed up yet, and everything else on the row
            # (unit, pending lease if one was created) already reflects that.
            "status": t.status.value if hasattr(t.status, "value") else str(t.status),
            "is_pending": u is None,
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

    # A tenant may read their own profile; a landlord may read one only for a
    # tenant they actually have a tenancy with (pending or not); nobody else.
    if current_user.role != UserRole.SYSTEM_ADMIN:
        is_self = profile.user_id is not None and profile.user_id == current_user.id
        is_own_landlord = False
        if not is_self:
            lp = (
                await db.execute(select(LandlordProfile).where(LandlordProfile.user_id == current_user.id))
            ).scalar_one_or_none()
            if lp:
                owns = (
                    await db.execute(
                        select(Tenancy.id).where(Tenancy.tenant_id == profile.id, Tenancy.landlord_id == lp.id)
                    )
                ).first()
                is_own_landlord = owns is not None
        if not is_self and not is_own_landlord:
            raise ForbiddenException("You do not have access to this tenant record.")

    fields = _tenant_display_fields(profile)
    return {
        "id": str(profile.id),
        "user_id": str(profile.user_id) if profile.user_id else None,
        "is_pending": profile.user_id is None,
        "first_name": fields["first_name"],
        "last_name": fields["last_name"],
        "email": fields["email"],
        "phone": fields["phone"],
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
