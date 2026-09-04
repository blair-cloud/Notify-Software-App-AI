import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from backend.models.complaint import Complaint, ComplaintComment
from backend.models.tenancy import Tenancy
from backend.models.property import Property
from backend.models.unit import Unit
from backend.models.tenant import TenantProfile
from backend.models.landlord import LandlordProfile
from backend.models.user import User
from backend.models.role import (
    ComplaintCategory,
    ComplaintPriority,
    ComplaintStatus,
    NotificationType,
)
from backend.schemas.complaint import (
    ComplaintCreate,
    ComplaintUpdate,
    ComplaintResolveRequest,
    ComplaintStatsResponse,
)
from backend.services.notification_service import NotificationService
from backend.core.logging import logger


class ComplaintService:
    @staticmethod
    async def generate_complaint_number(session: AsyncSession) -> str:
        current_year = datetime.now(timezone.utc).year
        stmt = select(func.count(Complaint.id))
        res = await session.execute(stmt)
        count = res.scalar() or 0
        return f"CMP-{current_year}-{count + 1:06d}"

    @classmethod
    async def create_complaint(
        cls,
        session: AsyncSession,
        user_id: uuid.UUID,
        tenant_id: uuid.UUID,
        data: ComplaintCreate,
    ) -> Complaint:
        # Find active tenancy for this tenant
        tenancy_stmt = select(Tenancy).where(
            Tenancy.tenant_id == tenant_id,
            Tenancy.status == "ACTIVE"
        )
        if data.tenancy_id:
            tenancy_stmt = tenancy_stmt.where(Tenancy.id == data.tenancy_id)
        
        tenancy_res = await session.execute(tenancy_stmt)
        tenancy = tenancy_res.scalar_one_or_none()

        if not tenancy:
            all_tenancy_stmt = select(Tenancy).where(Tenancy.tenant_id == tenant_id)
            all_tenancy_res = await session.execute(all_tenancy_stmt)
            tenancy = all_tenancy_res.scalar_one_or_none()

        if not tenancy:
            raise ValueError("No valid tenancy found for this tenant. Cannot submit complaint.")

        complaint_number = await cls.generate_complaint_number(session)

        complaint = Complaint(
            complaint_number=complaint_number,
            tenant_id=tenant_id,
            landlord_id=tenancy.landlord_id,
            property_id=tenancy.property_id,
            unit_id=tenancy.unit_id,
            tenancy_id=tenancy.id,
            subject=data.subject,
            description=data.description,
            category=data.category,
            priority=data.priority,
            status=ComplaintStatus.SUBMITTED,
            attachment_path=data.attachment_path,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        session.add(complaint)
        await session.flush()

        # Notify Landlord
        try:
            landlord_res = await session.execute(select(LandlordProfile).where(LandlordProfile.id == tenancy.landlord_id))
            landlord = landlord_res.scalar_one_or_none()
            if landlord:
                await NotificationService.create_notification(
                    session=session,
                    user_id=landlord.user_id,
                    type=NotificationType.COMPLAINT_CREATED.value,
                    title="New Tenant Complaint",
                    message=f"New {data.priority.value.lower()} priority complaint '{data.subject}' submitted ({complaint_number}).",
                    entity_type="COMPLAINT",
                    entity_id=complaint.id,
                )
        except Exception as e:
            logger.warning(f"Error creating notification on complaint create: {e}")

        await session.commit()
        await session.refresh(complaint)
        return complaint

    @classmethod
    async def acknowledge_complaint(
        cls, session: AsyncSession, complaint_id: uuid.UUID, landlord_id: uuid.UUID
    ) -> Complaint:
        comp = await cls._get_and_validate(session, complaint_id, landlord_id=landlord_id)
        now = datetime.now(timezone.utc)
        comp.status = ComplaintStatus.ACKNOWLEDGED
        comp.acknowledged_at = now
        comp.updated_at = now

        await cls._notify_tenant(
            session=session,
            comp=comp,
            type=NotificationType.COMPLAINT_UPDATED.value,
            title="Complaint Acknowledged",
            message=f"Landlord acknowledged your complaint {comp.complaint_number} ('{comp.subject}').",
        )

        await session.commit()
        await session.refresh(comp)
        return comp

    @classmethod
    async def mark_under_review(
        cls, session: AsyncSession, complaint_id: uuid.UUID, landlord_id: uuid.UUID, response_notes: Optional[str] = None
    ) -> Complaint:
        comp = await cls._get_and_validate(session, complaint_id, landlord_id=landlord_id)
        now = datetime.now(timezone.utc)
        comp.status = ComplaintStatus.UNDER_REVIEW
        if response_notes:
            comp.landlord_response = response_notes
        comp.updated_at = now

        await cls._notify_tenant(
            session=session,
            comp=comp,
            type=NotificationType.COMPLAINT_UPDATED.value,
            title="Complaint Under Review",
            message=f"Your complaint {comp.complaint_number} is now under review.",
        )

        await session.commit()
        await session.refresh(comp)
        return comp

    @classmethod
    async def resolve_complaint(
        cls, session: AsyncSession, complaint_id: uuid.UUID, landlord_id: uuid.UUID, data: ComplaintResolveRequest
    ) -> Complaint:
        comp = await cls._get_and_validate(session, complaint_id, landlord_id=landlord_id)
        now = datetime.now(timezone.utc)
        comp.status = ComplaintStatus.RESOLVED
        comp.resolved_at = now
        comp.landlord_response = data.resolution_notes
        comp.updated_at = now

        await cls._notify_tenant(
            session=session,
            comp=comp,
            type=NotificationType.COMPLAINT_RESOLVED.value,
            title="Complaint Resolved",
            message=f"Landlord resolved complaint {comp.complaint_number}: {data.resolution_notes}",
        )

        await session.commit()
        await session.refresh(comp)
        return comp

    @classmethod
    async def close_complaint(
        cls, session: AsyncSession, complaint_id: uuid.UUID, user_id: uuid.UUID
    ) -> Complaint:
        stmt = select(Complaint).where(Complaint.id == complaint_id)
        res = await session.execute(stmt)
        comp = res.scalar_one_or_none()
        if not comp:
            raise ValueError("Complaint not found.")

        now = datetime.now(timezone.utc)
        comp.status = ComplaintStatus.CLOSED
        comp.closed_at = now
        comp.updated_at = now
        await session.commit()
        await session.refresh(comp)
        return comp

    @classmethod
    async def add_comment(
        cls,
        session: AsyncSession,
        complaint_id: uuid.UUID,
        user: User,
        message: str,
    ) -> ComplaintComment:
        stmt = select(Complaint).where(Complaint.id == complaint_id)
        res = await session.execute(stmt)
        comp = res.scalar_one_or_none()
        if not comp:
            raise ValueError("Complaint not found.")

        author_name = f"{user.first_name} {user.last_name}".strip() or user.email
        author_role = user.role.value

        comment = ComplaintComment(
            complaint_id=complaint_id,
            user_id=user.id,
            author_name=author_name,
            author_role=author_role,
            message=message,
            created_at=datetime.now(timezone.utc),
        )
        session.add(comment)
        await session.flush()

        # Send notification to opposite party
        if user.role.value == "TENANT":
            await cls._notify_landlord(
                session=session,
                comp=comp,
                type="COMPLAINT_COMMENT",
                title=f"New Message on {comp.complaint_number}",
                message=f"Tenant: {message[:100]}",
            )
        elif user.role.value == "LANDLORD":
            await cls._notify_tenant(
                session=session,
                comp=comp,
                type="COMPLAINT_COMMENT",
                title=f"New Message on {comp.complaint_number}",
                message=f"Landlord: {message[:100]}",
            )

        await session.commit()
        await session.refresh(comment)
        return comment

    @classmethod
    async def get_augmented_complaint(
        cls, session: AsyncSession, complaint_id: uuid.UUID
    ) -> Optional[Dict[str, Any]]:
        stmt = select(Complaint).where(Complaint.id == complaint_id)
        res = await session.execute(stmt)
        comp = res.scalar_one_or_none()
        if not comp:
            return None
        return await cls._augment_complaint_dict(session, comp)

    @classmethod
    async def get_complaints_for_tenant(
        cls, session: AsyncSession, tenant_id: uuid.UUID
    ) -> List[Dict[str, Any]]:
        stmt = select(Complaint).where(Complaint.tenant_id == tenant_id).order_by(desc(Complaint.created_at))
        res = await session.execute(stmt)
        comps = res.scalars().all()
        return [await cls._augment_complaint_dict(session, c) for c in comps]

    @classmethod
    async def get_complaints_for_landlord(
        cls, session: AsyncSession, landlord_id: uuid.UUID
    ) -> List[Dict[str, Any]]:
        stmt = select(Complaint).where(Complaint.landlord_id == landlord_id).order_by(desc(Complaint.created_at))
        res = await session.execute(stmt)
        comps = res.scalars().all()
        return [await cls._augment_complaint_dict(session, c) for c in comps]

    @classmethod
    async def get_all_complaints(cls, session: AsyncSession) -> List[Dict[str, Any]]:
        stmt = select(Complaint).order_by(desc(Complaint.created_at))
        res = await session.execute(stmt)
        comps = res.scalars().all()
        return [await cls._augment_complaint_dict(session, c) for c in comps]

    @classmethod
    async def get_stats_for_landlord(
        cls, session: AsyncSession, landlord_id: uuid.UUID
    ) -> ComplaintStatsResponse:
        stmt = select(Complaint).where(Complaint.landlord_id == landlord_id)
        res = await session.execute(stmt)
        comps = res.scalars().all()
        return cls._compute_stats(comps)

    @classmethod
    async def get_stats_all(cls, session: AsyncSession) -> ComplaintStatsResponse:
        stmt = select(Complaint)
        res = await session.execute(stmt)
        comps = res.scalars().all()
        return cls._compute_stats(comps)

    @staticmethod
    def _compute_stats(comps: List[Complaint]) -> ComplaintStatsResponse:
        total = len(comps)
        open_c = sum(1 for c in comps if c.status in [ComplaintStatus.SUBMITTED, ComplaintStatus.ACKNOWLEDGED])
        review_c = sum(1 for c in comps if c.status == ComplaintStatus.UNDER_REVIEW)
        resolved_c = sum(1 for c in comps if c.status == ComplaintStatus.RESOLVED)
        closed_c = sum(1 for c in comps if c.status == ComplaintStatus.CLOSED)

        cat_counts: Dict[str, int] = {}
        for c in comps:
            cat_name = c.category.value if hasattr(c.category, "value") else str(c.category)
            cat_counts[cat_name] = cat_counts.get(cat_name, 0) + 1

        cat_dist = {}
        for cat, cnt in cat_counts.items():
            cat_dist[cat] = round((cnt / total) * 100, 1) if total > 0 else 0

        return ComplaintStatsResponse(
            total_complaints=total,
            open_complaints=open_c,
            under_review=review_c,
            resolved=resolved_c,
            closed=closed_c,
            category_distribution=cat_dist,
        )

    # Helpers
    @classmethod
    async def _get_and_validate(
        cls, session: AsyncSession, complaint_id: uuid.UUID, landlord_id: Optional[uuid.UUID] = None
    ) -> Complaint:
        stmt = select(Complaint).where(Complaint.id == complaint_id)
        res = await session.execute(stmt)
        comp = res.scalar_one_or_none()
        if not comp:
            raise ValueError("Complaint not found.")
        if landlord_id and comp.landlord_id != landlord_id:
            raise ValueError("Unauthorized: Complaint does not belong to your property portfolio.")
        return comp

    @classmethod
    async def _augment_complaint_dict(cls, session: AsyncSession, comp: Complaint) -> Dict[str, Any]:
        prop_res = await session.execute(select(Property.name).where(Property.id == comp.property_id))
        prop_name = prop_res.scalar_one_or_none() or "Notify Property"

        unit_res = await session.execute(select(Unit.unit_number).where(Unit.id == comp.unit_id))
        unit_num = unit_res.scalar_one_or_none() or "Unit"

        tenant_res = await session.execute(
            select(User.first_name, User.last_name, User.email)
            .join(TenantProfile, TenantProfile.user_id == User.id)
            .where(TenantProfile.id == comp.tenant_id)
        )
        tenant_row = tenant_res.one_or_none()
        tenant_name = f"{tenant_row[0]} {tenant_row[1]}".strip() if tenant_row else "Tenant"

        # Comments
        com_res = await session.execute(
            select(ComplaintComment)
            .where(ComplaintComment.complaint_id == comp.id)
            .order_by(ComplaintComment.created_at.asc())
        )
        comments = list(com_res.scalars().all())

        return {
            "id": comp.id,
            "complaint_number": comp.complaint_number,
            "tenant_id": comp.tenant_id,
            "landlord_id": comp.landlord_id,
            "property_id": comp.property_id,
            "unit_id": comp.unit_id,
            "tenancy_id": comp.tenancy_id,
            "subject": comp.subject,
            "description": comp.description,
            "category": comp.category,
            "priority": comp.priority,
            "status": comp.status,
            "landlord_response": comp.landlord_response,
            "attachment_path": comp.attachment_path,
            "acknowledged_at": comp.acknowledged_at,
            "resolved_at": comp.resolved_at,
            "closed_at": comp.closed_at,
            "created_at": comp.created_at,
            "updated_at": comp.updated_at,
            "tenant_name": tenant_name,
            "property_name": prop_name,
            "unit_number": unit_num,
            "comments": comments,
        }

    @classmethod
    async def _notify_tenant(cls, session: AsyncSession, comp: Complaint, type: str, title: str, message: str):
        try:
            tenant_res = await session.execute(select(TenantProfile).where(TenantProfile.id == comp.tenant_id))
            tenant = tenant_res.scalar_one_or_none()
            if tenant:
                await NotificationService.create_notification(
                    session=session,
                    user_id=tenant.user_id,
                    type=type,
                    title=title,
                    message=message,
                    entity_type="COMPLAINT",
                    entity_id=comp.id,
                )
        except Exception as e:
            logger.warning(f"Error notifying tenant: {e}")

    @classmethod
    async def _notify_landlord(cls, session: AsyncSession, comp: Complaint, type: str, title: str, message: str):
        try:
            landlord_res = await session.execute(select(LandlordProfile).where(LandlordProfile.id == comp.landlord_id))
            landlord = landlord_res.scalar_one_or_none()
            if landlord:
                await NotificationService.create_notification(
                    session=session,
                    user_id=landlord.user_id,
                    type=type,
                    title=title,
                    message=message,
                    entity_type="COMPLAINT",
                    entity_id=comp.id,
                )
        except Exception as e:
            logger.warning(f"Error notifying landlord: {e}")
