"""
Request authorisation.

The caller presents a Supabase Auth access token. This module verifies it,
resolves the matching row in `profiles`, and hands the rest of the application a
`User` exactly as before - so every existing `Depends(get_current_user)`,
`get_current_landlord` and `get_current_tenant` call site keeps working.

Two rules matter here:

* The role comes from the database, never from the token or the request body.
  A client can put anything in user_metadata; `profiles.role` is writable only
  by the service role (enforced by a trigger), so that is the source of truth.
* No password, session or token is created here. Supabase Auth owns all of it.
"""
import uuid
from typing import Optional

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.core.exceptions import ForbiddenException, UnauthorizedException
from backend.core.supabase_auth import (
    SupabaseTokenError,
    SupabaseTokenExpired,
    verify_supabase_token,
)
from backend.models import LandlordProfile, TenantProfile, User, UserRole, UserStatus

SESSION_EXPIRED_MESSAGE = "Your session has expired. Please sign in again."
NOT_SIGNED_IN_MESSAGE = "You need to be signed in to do that."
NO_PROFILE_MESSAGE = (
    "Your account exists but has no Notify profile yet. Please sign out and sign in again, "
    "or contact support if this persists."
)


async def get_current_user(
    authorization: Optional[str] = Header(None, description="Supabase access token"),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedException(NOT_SIGNED_IN_MESSAGE)

    token = authorization[len("Bearer "):].strip()
    if not token:
        raise UnauthorizedException(NOT_SIGNED_IN_MESSAGE)

    try:
        claims = await verify_supabase_token(token)
    except SupabaseTokenExpired:
        raise UnauthorizedException(SESSION_EXPIRED_MESSAGE)
    except SupabaseTokenError:
        # The specific reason is not echoed back: it only tells an attacker how
        # their forgery failed.
        raise UnauthorizedException("Your session is not valid. Please sign in again.")

    subject = claims.get("sub")
    if not subject:
        raise UnauthorizedException("Your session is not valid. Please sign in again.")
    try:
        user_id = uuid.UUID(str(subject))
    except (ValueError, AttributeError, TypeError):
        raise UnauthorizedException("Your session is not valid. Please sign in again.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        # The Supabase user is real but the profile row is missing - normally
        # created by the on_auth_user_created trigger.
        raise UnauthorizedException(NO_PROFILE_MESSAGE)
    if user.status == UserStatus.SUSPENDED:
        raise ForbiddenException(
            "This account has been suspended. Please contact Notify support for help."
        )
    if user.status != UserStatus.ACTIVE:
        raise ForbiddenException(f"This account is {user.status.value.lower()}.")

    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.SYSTEM_ADMIN:
        raise ForbiddenException("This area is restricted to system administrators.")
    return current_user


async def require_landlord(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.LANDLORD, UserRole.SYSTEM_ADMIN):
        raise ForbiddenException("This area is only available to landlord accounts.")
    return current_user


async def require_tenant(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.TENANT, UserRole.SYSTEM_ADMIN):
        raise ForbiddenException("This area is only available to tenant accounts.")
    return current_user


async def get_current_landlord(
    current_user: User = Depends(require_landlord),
    db: AsyncSession = Depends(get_db),
) -> LandlordProfile:
    result = await db.execute(
        select(LandlordProfile).where(LandlordProfile.user_id == current_user.id)
    )
    landlord = result.scalar_one_or_none()

    if not landlord and current_user.role == UserRole.LANDLORD:
        raise ForbiddenException("Landlord profile not found for user")
    return landlord


async def get_current_tenant(
    current_user: User = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
) -> TenantProfile:
    result = await db.execute(
        select(TenantProfile).where(TenantProfile.user_id == current_user.id)
    )
    tenant = result.scalar_one_or_none()

    if not tenant and current_user.role == UserRole.TENANT:
        raise ForbiddenException("Tenant profile not found for user")
    return tenant
