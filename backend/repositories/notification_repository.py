import uuid
from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import Notification

class NotificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_user(self, user_id: uuid.UUID) -> Sequence[Notification]:
        stmt = select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc())
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def create(self, notification: Notification) -> Notification:
        self.db.add(notification)
        await self.db.flush()
        return notification
