import uuid
from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import User, LandlordProfile, TenantProfile

class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        stmt = select(User).where(User.id == user_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_phone(self, phone: str) -> Optional[User]:
        stmt = select(User).where(User.phone == phone)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def create_user(self, user: User) -> User:
        self.db.add(user)
        await self.db.flush()
        return user

    async def create_landlord_profile(self, profile: LandlordProfile) -> LandlordProfile:
        self.db.add(profile)
        await self.db.flush()
        return profile

    async def create_tenant_profile(self, profile: TenantProfile) -> TenantProfile:
        self.db.add(profile)
        await self.db.flush()
        return profile

    async def get_tenant_profile_by_user_id(self, user_id: uuid.UUID) -> Optional[TenantProfile]:
        stmt = select(TenantProfile).where(TenantProfile.user_id == user_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_tenant_profile_by_id(self, tenant_profile_id: uuid.UUID) -> Optional[TenantProfile]:
        stmt = select(TenantProfile).where(TenantProfile.id == tenant_profile_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_landlord_profile_by_user_id(self, user_id: uuid.UUID) -> Optional[LandlordProfile]:
        stmt = select(LandlordProfile).where(LandlordProfile.user_id == user_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def list_all_users(self, skip: int = 0, limit: int = 50) -> Sequence[User]:
        stmt = select(User).offset(skip).limit(limit)
        res = await self.db.execute(stmt)
        return res.scalars().all()
