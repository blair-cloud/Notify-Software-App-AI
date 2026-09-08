"""
Helpers that turn "who is calling" into "what they are allowed to see".

The financial routers previously took a landlord/tenant id straight from the
URL with no authentication, so changing the id in the address bar returned
another landlord's invoices, payments, receipts and revenue. These helpers give
every one of those routes the same shape: resolve the caller's own profile ids,
and refuse any id that is not theirs.
"""
import uuid
from typing import Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.exceptions import ForbiddenException
from backend.models import LandlordProfile, TenantProfile, User, UserRole

NOT_YOURS = "You do not have access to this record."


async def caller_profile_ids(
    db: AsyncSession, user: User
) -> Tuple[Optional[uuid.UUID], Optional[uuid.UUID]]:
    """Return (landlord_profile_id, tenant_profile_id) for the signed-in user."""
    landlord_id = None
    tenant_id = None

    if user.role in (UserRole.LANDLORD, UserRole.SYSTEM_ADMIN):
        row = await db.execute(select(LandlordProfile.id).where(LandlordProfile.user_id == user.id))
        landlord_id = row.scalar_one_or_none()

    if user.role in (UserRole.TENANT, UserRole.SYSTEM_ADMIN):
        row = await db.execute(select(TenantProfile.id).where(TenantProfile.user_id == user.id))
        tenant_id = row.scalar_one_or_none()

    return landlord_id, tenant_id


def is_admin(user: User) -> bool:
    return user.role == UserRole.SYSTEM_ADMIN


async def assert_landlord_id(db: AsyncSession, user: User, landlord_id: uuid.UUID) -> uuid.UUID:
    """Allow a landlord id only when it is the caller's own (admins may pass any)."""
    if is_admin(user):
        return landlord_id
    own_landlord, _ = await caller_profile_ids(db, user)
    if own_landlord is None or own_landlord != landlord_id:
        raise ForbiddenException(NOT_YOURS)
    return landlord_id


async def assert_tenant_id(db: AsyncSession, user: User, tenant_id: uuid.UUID) -> uuid.UUID:
    if is_admin(user):
        return tenant_id
    _, own_tenant = await caller_profile_ids(db, user)
    if own_tenant is None or own_tenant != tenant_id:
        raise ForbiddenException(NOT_YOURS)
    return tenant_id


async def assert_owns_record(db: AsyncSession, user: User, record) -> None:
    """
    Guard a single row that carries `landlord_id` / `tenant_id` (invoices,
    payments, receipts all do). The caller must be one of the two parties.
    """
    if is_admin(user):
        return
    landlord_id, tenant_id = await caller_profile_ids(db, user)
    record_landlord = getattr(record, "landlord_id", None)
    record_tenant = getattr(record, "tenant_id", None)

    if landlord_id is not None and record_landlord == landlord_id:
        return
    if tenant_id is not None and record_tenant == tenant_id:
        return
    raise ForbiddenException(NOT_YOURS)
