import uuid
from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import Invitation

class InvitationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, invitation_id: uuid.UUID) -> Optional[Invitation]:
        stmt = select(Invitation).where(Invitation.id == invitation_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_token_hash(self, token_hash: str) -> Optional[Invitation]:
        stmt = select(Invitation).where(Invitation.token_hash == token_hash)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def list_by_landlord(self, landlord_id: uuid.UUID) -> Sequence[Invitation]:
        stmt = select(Invitation).where(Invitation.landlord_id == landlord_id)
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def create(self, invitation: Invitation) -> Invitation:
        self.db.add(invitation)
        await self.db.flush()
        return invitation

    async def update(self, invitation: Invitation) -> Invitation:
        await self.db.flush()
        return invitation
