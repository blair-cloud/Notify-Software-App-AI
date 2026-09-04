import uuid
from typing import AsyncGenerator
from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.core.database import get_db
from backend.core.security import decode_jwt_token
from backend.core.exceptions import UnauthorizedException, ForbiddenException
from backend.models import User, UserRole, UserStatus, LandlordProfile, TenantProfile


async def get_current_user(
    authorization: str = Header(..., description="Bearer JWT token"),
    db: AsyncSession = Depends(get_db)
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedException("Invalid authorization header format")
    
    token = authorization.replace("Bearer ", "").strip()
    try:
        payload = decode_jwt_token(token)
        user_id_str: str = payload.get("sub")
        if not user_id_str:
            raise UnauthorizedException("Token payload missing subject")
        user_id = uuid.UUID(user_id_str)
    except Exception as e:
        raise UnauthorizedException(f"Invalid or expired JWT token: {str(e)}")

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedException("User not found")
    if user.status != UserStatus.ACTIVE:
        raise ForbiddenException(f"Account is {user.status.value}")

    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.SYSTEM_ADMIN:
        raise ForbiddenException("Requires SYSTEM_ADMIN role")
    return current_user


async def require_landlord(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [UserRole.LANDLORD, UserRole.SYSTEM_ADMIN]:
        raise ForbiddenException("Requires LANDLORD role")
    return current_user


async def require_tenant(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [UserRole.TENANT, UserRole.SYSTEM_ADMIN]:
        raise ForbiddenException("Requires TENANT role")
    return current_user


async def get_current_landlord(
    current_user: User = Depends(require_landlord),
    db: AsyncSession = Depends(get_db)
) -> LandlordProfile:
    stmt = select(LandlordProfile).where(LandlordProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    landlord = result.scalar_one_or_none()

    if not landlord and current_user.role == UserRole.LANDLORD:
        raise ForbiddenException("Landlord profile not found for user")
    return landlord


async def get_current_tenant(
    current_user: User = Depends(require_tenant),
    db: AsyncSession = Depends(get_db)
) -> TenantProfile:
    stmt = select(TenantProfile).where(TenantProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()

    if not tenant and current_user.role == UserRole.TENANT:
        raise ForbiddenException("Tenant profile not found for user")
    return tenant
