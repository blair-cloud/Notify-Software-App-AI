import uuid
from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import AuditLog

class AuditRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, audit_log: AuditLog) -> AuditLog:
        self.db.add(audit_log)
        await self.db.flush()
        return audit_log

    async def list_all(self, limit: int = 100) -> Sequence[AuditLog]:
        stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
        res = await self.db.execute(stmt)
        return res.scalars().all()
