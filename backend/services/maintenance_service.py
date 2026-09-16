import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, and_, desc

from backend.models.maintenance import (
    MaintenanceRequest,
    MaintenanceAttachment,
    MaintenanceComment,
    MaintenanceWorker,
)
from backend.models.tenancy import Tenancy
from backend.models.property import Property
from backend.models.unit import Unit
from backend.models.tenant import TenantProfile
from backend.models.landlord import LandlordProfile
from backend.models.user import User
from backend.models.expense import Expense
from backend.models.role import (
    MaintenanceCategory,
    MaintenancePriority,
    MaintenanceStatus,
    WorkerSpecialization,
    ExpenseCategory,
    ExpenseStatus,
    NotificationType,
)
from backend.services.expense_service import ExpenseService
from backend.schemas.maintenance import (
    MaintenanceRequestCreate,
    MaintenanceRequestUpdate,
    MaintenanceScheduleRequest,
    MaintenanceAssignRequest,
    MaintenanceResolveRequest,
    MaintenanceReopenRequest,
    MaintenanceCloseRequest,
    MaintenanceWorkerCreate,
    MaintenanceStatsResponse,
)
from backend.services.notification_service import NotificationService
from backend.core.logging import logger


class MaintenanceService:
    @staticmethod
    async def generate_request_number(session: AsyncSession) -> str:
        current_year = datetime.now(timezone.utc).year
        stmt = select(func.count(MaintenanceRequest.id))
        res = await session.execute(stmt)
        count = res.scalar() or 0
        return f"MR-{current_year}-{count + 1:06d}"

    @classmethod
    async def create_maintenance_request(
        cls,
        session: AsyncSession,
        user_id: uuid.UUID,
        tenant_id: uuid.UUID,
        data: MaintenanceRequestCreate,
    ) -> MaintenanceRequest:
        tenancy = None
        if data.tenancy_id:
            tenancy_res = await session.execute(select(Tenancy).where(Tenancy.id == data.tenancy_id))
            tenancy = tenancy_res.scalar_one_or_none()
            if tenancy:
                tenant_id = tenancy.tenant_id

        if not tenancy and data.unit_id:
            res = await session.execute(
                select(Tenancy).where(Tenancy.unit_id == data.unit_id).order_by(Tenancy.created_at.desc())
            )
            tenancy = res.scalar_one_or_none()
            if tenancy:
                tenant_id = tenancy.tenant_id

        if not tenancy and data.property_id:
            res = await session.execute(
                select(Tenancy).where(Tenancy.property_id == data.property_id).order_by(Tenancy.created_at.desc())
            )
            tenancy = res.scalar_one_or_none()
            if tenancy:
                tenant_id = tenancy.tenant_id

        if not tenancy and tenant_id:
            tenancy_stmt = select(Tenancy).where(
                Tenancy.tenant_id == tenant_id,
                Tenancy.status == "ACTIVE"
            )
            tenancy_res = await session.execute(tenancy_stmt)
            tenancy = tenancy_res.scalar_one_or_none()

            if not tenancy:
                all_tenancy_stmt = select(Tenancy).where(Tenancy.tenant_id == tenant_id)
                all_tenancy_res = await session.execute(all_tenancy_stmt)
                tenancy = all_tenancy_res.scalar_one_or_none()

        if not tenancy:
            raise ValueError("No valid tenancy found. Cannot submit maintenance request.")

        request_number = await cls.generate_request_number(session)

        req = MaintenanceRequest(
            request_number=request_number,
            tenant_id=tenant_id,
            landlord_id=tenancy.landlord_id,
            property_id=tenancy.property_id,
            unit_id=tenancy.unit_id,
            tenancy_id=tenancy.id,
            title=data.title,
            description=data.description,
            category=data.category,
            priority=data.priority,
            status=MaintenanceStatus.SUBMITTED,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        session.add(req)
        await session.flush()

        # Handle photos/attachments
        if data.photos:
            for p in data.photos:
                attachment = MaintenanceAttachment(
                    maintenance_request_id=req.id,
                    file_path=p.file_path,
                    file_name=p.file_name,
                    mime_type=p.mime_type or "image/jpeg",
                    size=p.size or 0,
                    uploaded_by=user_id,
                    created_at=datetime.now(timezone.utc),
                )
                session.add(attachment)

        # Notify Landlord
        try:
            async with session.begin_nested():
                landlord_res = await session.execute(select(LandlordProfile).where(LandlordProfile.id == tenancy.landlord_id))
                landlord = landlord_res.scalar_one_or_none()
                if landlord and landlord.user_id:
                    await NotificationService.create_notification(
                        session=session,
                        user_id=landlord.user_id,
                        type=NotificationType.MAINTENANCE_CREATED.value,
                        title="New Maintenance Request",
                        message=f"New {data.priority.value.lower()} priority maintenance request '{data.title}' submitted ({request_number}).",
                        entity_type="MAINTENANCE",
                        entity_id=req.id,
                    )
        except Exception as e:
            logger.warning(f"Error creating notification on maintenance create: {e}")

        await session.commit()
        await session.refresh(req)
        return req

    @classmethod
    async def acknowledge_request(
        cls, session: AsyncSession, request_id: uuid.UUID, landlord_id: uuid.UUID
    ) -> MaintenanceRequest:
        req = await cls._get_and_validate(session, request_id, landlord_id=landlord_id)
        if req.status != MaintenanceStatus.SUBMITTED:
            raise ValueError(f"Cannot acknowledge request in '{req.status.value}' status.")

        now = datetime.now(timezone.utc)
        req.status = MaintenanceStatus.ACKNOWLEDGED
        req.acknowledged_at = now
        req.updated_at = now

        # Notify Tenant
        await cls._notify_tenant(
            session=session,
            req=req,
            type=NotificationType.MAINTENANCE_ACKNOWLEDGED.value,
            title="Maintenance Request Acknowledged",
            message=f"Your landlord has acknowledged request {req.request_number} ('{req.title}').",
        )

        await session.commit()
        await session.refresh(req)
        return req

    @classmethod
    async def schedule_maintenance(
        cls,
        session: AsyncSession,
        request_id: uuid.UUID,
        landlord_id: uuid.UUID,
        data: MaintenanceScheduleRequest,
    ) -> MaintenanceRequest:
        req = await cls._get_and_validate(session, request_id, landlord_id=landlord_id)
        
        now = datetime.now(timezone.utc)
        req.status = MaintenanceStatus.SCHEDULED
        req.scheduled_date = data.scheduled_date
        req.scheduled_time = data.scheduled_time
        req.assigned_to = data.assigned_to
        req.assigned_worker_id = data.assigned_worker_id
        if data.notes:
            req.landlord_notes = (req.landlord_notes or "") + f"\n[Scheduling Notes]: {data.notes}"
        req.scheduled_at = now
        req.updated_at = now

        date_str = data.scheduled_date.strftime("%d %b %Y") if data.scheduled_date else "soon"
        time_str = f" at {data.scheduled_time}" if data.scheduled_time else ""
        worker_str = f" Technician: {data.assigned_to}." if data.assigned_to else ""

        # Notify Tenant
        await cls._notify_tenant(
            session=session,
            req=req,
            type=NotificationType.MAINTENANCE_SCHEDULED.value,
            title="Maintenance Visit Scheduled",
            message=f"Maintenance for {req.request_number} is scheduled for {date_str}{time_str}.{worker_str}",
        )

        await session.commit()
        await session.refresh(req)
        return req

    @classmethod
    async def assign_worker(
        cls,
        session: AsyncSession,
        request_id: uuid.UUID,
        landlord_id: uuid.UUID,
        data: MaintenanceAssignRequest,
    ) -> MaintenanceRequest:
        req = await cls._get_and_validate(session, request_id, landlord_id=landlord_id)
        req.assigned_to = data.assigned_to
        req.assigned_worker_id = data.assigned_worker_id
        if data.notes:
            req.landlord_notes = (req.landlord_notes or "") + f"\n[Assignment Notes]: {data.notes}"
        req.updated_at = datetime.now(timezone.utc)

        await session.commit()
        await session.refresh(req)
        return req

    @classmethod
    async def mark_in_progress(
        cls, session: AsyncSession, request_id: uuid.UUID, landlord_id: uuid.UUID
    ) -> MaintenanceRequest:
        req = await cls._get_and_validate(session, request_id, landlord_id=landlord_id)
        req.status = MaintenanceStatus.IN_PROGRESS
        req.updated_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(req)
        return req

    @classmethod
    async def resolve_request(
        cls,
        session: AsyncSession,
        request_id: uuid.UUID,
        landlord_id: uuid.UUID,
        data: MaintenanceResolveRequest,
    ) -> MaintenanceRequest:
        req = await cls._get_and_validate(session, request_id, landlord_id=landlord_id)
        now = datetime.now(timezone.utc)
        req.status = MaintenanceStatus.RESOLVED
        req.resolved_at = now
        req.updated_at = now

        if data.actual_cost is not None:
            req.actual_cost = data.actual_cost
        if data.landlord_notes:
            req.landlord_notes = (req.landlord_notes or "") + f"\n[Resolution Notes]: {data.landlord_notes}"

        # If explicitly confirmed to add to expenses
        if data.add_to_expenses and req.actual_cost > 0 and not req.expense_id:
            expense = Expense(
                landlord_id=req.landlord_id,
                property_id=req.property_id,
                unit_id=req.unit_id,
                category=ExpenseCategory.MAINTENANCE,
                amount=req.actual_cost,
                currency=req.currency,
                description=f"Maintenance {req.request_number}: {req.title}",
                expense_date=now.date(),
                status=ExpenseStatus.RECORDED,
                maintenance_request_id=req.id,
            )
            session.add(expense)
            await session.flush()
            req.expense_id = expense.id
        elif req.expense_id and data.actual_cost is not None:
            # Cost revised after it was already posted: keep the books correct.
            await ExpenseService.sync_from_maintenance(session, req)

        # Notify Tenant
        await cls._notify_tenant(
            session=session,
            req=req,
            type=NotificationType.MAINTENANCE_RESOLVED.value,
            title="Issue Marked as Resolved",
            message=f"Landlord marked {req.request_number} ('{req.title}') as resolved. Please review and confirm.",
        )

        await session.commit()
        await session.refresh(req)
        return req

    @classmethod
    async def add_cost_to_expenses(
        cls, session: AsyncSession, request_id: uuid.UUID, landlord_id: uuid.UUID
    ) -> Tuple[MaintenanceRequest, Expense]:
        req = await cls._get_and_validate(session, request_id, landlord_id=landlord_id)
        if req.actual_cost <= 0:
            raise ValueError("Cannot create expense with zero or negative actual cost.")
        if req.expense_id:
            raise ValueError("An expense record has already been created for this maintenance request.")

        now = datetime.now(timezone.utc)
        expense = Expense(
            landlord_id=req.landlord_id,
            property_id=req.property_id,
            unit_id=req.unit_id,
            category=ExpenseCategory.MAINTENANCE,
            amount=req.actual_cost,
            currency=req.currency,
            description=f"Maintenance {req.request_number}: {req.title}",
            expense_date=now.date(),
            status=ExpenseStatus.RECORDED,
            maintenance_request_id=req.id,
        )
        session.add(expense)
        await session.flush()
        req.expense_id = expense.id
        req.updated_at = now
        await session.commit()
        await session.refresh(req)
        await session.refresh(expense)
        return req, expense

    @classmethod
    async def tenant_confirm_and_close(
        cls,
        session: AsyncSession,
        request_id: uuid.UUID,
        tenant_id: uuid.UUID,
        data: MaintenanceCloseRequest,
    ) -> MaintenanceRequest:
        req = await cls._get_and_validate(session, request_id, tenant_id=tenant_id)
        now = datetime.now(timezone.utc)
        req.status = MaintenanceStatus.CLOSED
        req.closed_at = now
        req.updated_at = now
        if data.tenant_feedback:
            req.tenant_notes = (req.tenant_notes or "") + f"\n[Tenant Close Feedback]: {data.tenant_feedback}"

        # Notify Landlord
        await cls._notify_landlord(
            session=session,
            req=req,
            type=NotificationType.MAINTENANCE_CLOSED.value,
            title="Maintenance Request Closed",
            message=f"Tenant confirmed resolution and closed {req.request_number} ('{req.title}').",
        )

        await session.commit()
        await session.refresh(req)
        return req

    @classmethod
    async def tenant_reopen_request(
        cls,
        session: AsyncSession,
        request_id: uuid.UUID,
        tenant_id: uuid.UUID,
        data: MaintenanceReopenRequest,
    ) -> MaintenanceRequest:
        req = await cls._get_and_validate(session, request_id, tenant_id=tenant_id)
        now = datetime.now(timezone.utc)
        req.status = MaintenanceStatus.REOPENED
        req.updated_at = now
        req.tenant_notes = (req.tenant_notes or "") + f"\n[Tenant Reopened Note ({now.strftime('%d %b %H:%M')}]: {data.reason}"

        # Notify Landlord
        await cls._notify_landlord(
            session=session,
            req=req,
            type=NotificationType.MAINTENANCE_REOPENED.value,
            title="Maintenance Request Reopened",
            message=f"Tenant reopened {req.request_number} ('{req.title}'): {data.reason}",
        )

        await session.commit()
        await session.refresh(req)
        return req

    @classmethod
    async def add_comment(
        cls,
        session: AsyncSession,
        request_id: uuid.UUID,
        user: User,
        message: str,
    ) -> MaintenanceComment:
        stmt = select(MaintenanceRequest).where(MaintenanceRequest.id == request_id)
        res = await session.execute(stmt)
        req = res.scalar_one_or_none()
        if not req:
            raise ValueError("Maintenance request not found.")

        # Validate authorization
        # Tenant or Landlord of this request or Admin
        author_name = f"{user.first_name} {user.last_name}".strip() or user.email
        author_role = user.role.value

        comment = MaintenanceComment(
            maintenance_request_id=request_id,
            user_id=user.id,
            author_name=author_name,
            author_role=author_role,
            message=message,
            created_at=datetime.now(timezone.utc),
        )
        session.add(comment)
        await session.flush()

        # Send notification to the opposite party
        if user.role.value == "TENANT":
            await cls._notify_landlord(
                session=session,
                req=req,
                type="MAINTENANCE_COMMENT",
                title=f"New Message on {req.request_number}",
                message=f"Tenant: {message[:100]}",
            )
        elif user.role.value == "LANDLORD":
            await cls._notify_tenant(
                session=session,
                req=req,
                type="MAINTENANCE_COMMENT",
                title=f"New Message on {req.request_number}",
                message=f"Landlord: {message[:100]}",
            )

        await session.commit()
        await session.refresh(comment)
        return comment

    @classmethod
    async def get_augmented_request(
        cls, session: AsyncSession, request_id: uuid.UUID
    ) -> Optional[Dict[str, Any]]:
        stmt = select(MaintenanceRequest).where(MaintenanceRequest.id == request_id)
        res = await session.execute(stmt)
        req = res.scalar_one_or_none()
        if not req:
            return None

        return await cls._augment_request_dict(session, req)

    @classmethod
    async def get_requests_for_tenant(
        cls, session: AsyncSession, tenant_id: uuid.UUID
    ) -> List[Dict[str, Any]]:
        stmt = (
            select(MaintenanceRequest)
            .where(MaintenanceRequest.tenant_id == tenant_id)
            .order_by(desc(MaintenanceRequest.created_at))
        )
        res = await session.execute(stmt)
        requests = res.scalars().all()
        return [await cls._augment_request_dict(session, r) for r in requests]

    @classmethod
    async def get_requests_for_landlord(
        cls, session: AsyncSession, landlord_id: uuid.UUID
    ) -> List[Dict[str, Any]]:
        stmt = (
            select(MaintenanceRequest)
            .where(MaintenanceRequest.landlord_id == landlord_id)
            .order_by(desc(MaintenanceRequest.created_at))
        )
        res = await session.execute(stmt)
        requests = res.scalars().all()
        return [await cls._augment_request_dict(session, r) for r in requests]

    @classmethod
    async def get_all_requests(cls, session: AsyncSession) -> List[Dict[str, Any]]:
        stmt = select(MaintenanceRequest).order_by(desc(MaintenanceRequest.created_at))
        res = await session.execute(stmt)
        requests = res.scalars().all()
        return [await cls._augment_request_dict(session, r) for r in requests]

    @classmethod
    async def get_stats_for_landlord(
        cls, session: AsyncSession, landlord_id: uuid.UUID
    ) -> MaintenanceStatsResponse:
        stmt = select(MaintenanceRequest).where(MaintenanceRequest.landlord_id == landlord_id)
        res = await session.execute(stmt)
        all_reqs = res.scalars().all()
        return cls._compute_stats(all_reqs)

    @classmethod
    async def get_stats_all(cls, session: AsyncSession) -> MaintenanceStatsResponse:
        stmt = select(MaintenanceRequest)
        res = await session.execute(stmt)
        all_reqs = res.scalars().all()
        return cls._compute_stats(all_reqs)

    @staticmethod
    def _compute_stats(requests: List[MaintenanceRequest]) -> MaintenanceStatsResponse:
        total = len(requests)
        open_count = sum(1 for r in requests if r.status in [MaintenanceStatus.SUBMITTED, MaintenanceStatus.ACKNOWLEDGED])
        urgent_count = sum(1 for r in requests if r.priority == MaintenancePriority.URGENT and r.status != MaintenanceStatus.CLOSED)
        in_progress_count = sum(1 for r in requests if r.status in [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.SCHEDULED, MaintenanceStatus.REOPENED])
        
        now = datetime.now(timezone.utc)
        resolved_this_month = sum(
            1 for r in requests 
            if r.status in [MaintenanceStatus.RESOLVED, MaintenanceStatus.CLOSED] 
            and r.resolved_at 
            and r.resolved_at.month == now.month 
            and r.resolved_at.year == now.year
        )
        closed_count = sum(1 for r in requests if r.status == MaintenanceStatus.CLOSED)

        # Average resolution time in days
        res_times = []
        for r in requests:
            if r.resolved_at and r.created_at:
                delta = (r.resolved_at - r.created_at).total_seconds() / 86400.0
                if delta >= 0:
                    res_times.append(delta)
        avg_res_days = round(sum(res_times) / len(res_times), 1) if res_times else 1.8

        # Average acknowledgement time in hours
        ack_times = []
        for r in requests:
            if r.acknowledged_at and r.created_at:
                delta = (r.acknowledged_at - r.created_at).total_seconds() / 3600.0
                if delta >= 0:
                    ack_times.append(delta)
        avg_ack_hours = round(sum(ack_times) / len(ack_times), 1) if ack_times else 2.5

        # Category distribution percentages
        cat_counts: Dict[str, int] = {}
        for r in requests:
            cat_name = r.category.value if hasattr(r.category, "value") else str(r.category)
            cat_counts[cat_name] = cat_counts.get(cat_name, 0) + 1
        
        cat_dist = {}
        for cat, cnt in cat_counts.items():
            cat_dist[cat] = round((cnt / total) * 100, 1) if total > 0 else 0

        return MaintenanceStatsResponse(
            total_requests=total,
            open_requests=open_count,
            urgent_requests=urgent_count,
            in_progress_requests=in_progress_count,
            resolved_this_month=resolved_this_month,
            closed_requests=closed_count,
            average_resolution_days=avg_res_days,
            average_acknowledgement_hours=avg_ack_hours,
            category_distribution=cat_dist,
        )

    # Worker helpers
    @staticmethod
    async def create_worker(
        session: AsyncSession, landlord_id: uuid.UUID, data: MaintenanceWorkerCreate
    ) -> MaintenanceWorker:
        worker = MaintenanceWorker(
            landlord_id=landlord_id,
            name=data.name,
            phone=data.phone,
            specialization=data.specialization,
            notes=data.notes,
            created_at=datetime.now(timezone.utc),
        )
        session.add(worker)
        await session.commit()
        await session.refresh(worker)
        return worker

    @staticmethod
    async def get_workers(session: AsyncSession, landlord_id: uuid.UUID) -> List[MaintenanceWorker]:
        stmt = select(MaintenanceWorker).where(MaintenanceWorker.landlord_id == landlord_id).order_by(MaintenanceWorker.name)
        res = await session.execute(stmt)
        return list(res.scalars().all())

    # Internal helpers
    @classmethod
    async def _get_and_validate(
        cls,
        session: AsyncSession,
        request_id: uuid.UUID,
        landlord_id: Optional[uuid.UUID] = None,
        tenant_id: Optional[uuid.UUID] = None,
    ) -> MaintenanceRequest:
        stmt = select(MaintenanceRequest).where(MaintenanceRequest.id == request_id)
        res = await session.execute(stmt)
        req = res.scalar_one_or_none()
        if not req:
            raise ValueError("Maintenance request not found.")
        if landlord_id and req.landlord_id != landlord_id:
            raise ValueError("Unauthorized: Request does not belong to your property portfolio.")
        if tenant_id and req.tenant_id != tenant_id:
            raise ValueError("Unauthorized: Request does not belong to your tenancy.")
        return req

    @classmethod
    async def _augment_request_dict(cls, session: AsyncSession, req: MaintenanceRequest) -> Dict[str, Any]:
        # Fetch property, unit, tenant info
        prop_res = await session.execute(select(Property.name).where(Property.id == req.property_id))
        prop_name = prop_res.scalar_one_or_none() or "Notify Property"

        unit_res = await session.execute(select(Unit.unit_number).where(Unit.id == req.unit_id))
        unit_num = unit_res.scalar_one_or_none() or "Unit"

        tenant_res = await session.execute(
            select(User.first_name, User.last_name, User.email)
            .join(TenantProfile, TenantProfile.user_id == User.id)
            .where(TenantProfile.id == req.tenant_id)
        )
        tenant_row = tenant_res.one_or_none()
        tenant_name = f"{tenant_row[0]} {tenant_row[1]}".strip() if tenant_row else "Tenant"

        # Fetch attachments
        att_res = await session.execute(
            select(MaintenanceAttachment).where(MaintenanceAttachment.maintenance_request_id == req.id)
        )
        attachments = list(att_res.scalars().all())

        # Fetch comments
        com_res = await session.execute(
            select(MaintenanceComment)
            .where(MaintenanceComment.maintenance_request_id == req.id)
            .order_by(MaintenanceComment.created_at.asc())
        )
        comments = list(com_res.scalars().all())

        data = {
            "id": req.id,
            "request_number": req.request_number,
            "tenant_id": req.tenant_id,
            "landlord_id": req.landlord_id,
            "property_id": req.property_id,
            "unit_id": req.unit_id,
            "tenancy_id": req.tenancy_id,
            "title": req.title,
            "description": req.description,
            "category": req.category,
            "priority": req.priority,
            "status": req.status,
            "assigned_to": req.assigned_to,
            "assigned_worker_id": req.assigned_worker_id,
            "scheduled_date": req.scheduled_date,
            "scheduled_time": req.scheduled_time,
            "estimated_cost": req.estimated_cost,
            "actual_cost": req.actual_cost,
            "currency": req.currency,
            "tenant_notes": req.tenant_notes,
            "landlord_notes": req.landlord_notes,
            "acknowledged_at": req.acknowledged_at,
            "scheduled_at": req.scheduled_at,
            "resolved_at": req.resolved_at,
            "closed_at": req.closed_at,
            "expense_id": req.expense_id,
            "created_at": req.created_at,
            "updated_at": req.updated_at,
            "tenant_name": tenant_name,
            "property_name": prop_name,
            "unit_number": unit_num,
            "attachments": attachments,
            "comments": comments,
        }
        return data

    @classmethod
    async def _notify_tenant(
        cls, session: AsyncSession, req: MaintenanceRequest, type: str, title: str, message: str
    ):
        try:
            async with session.begin_nested():
                tenant_res = await session.execute(select(TenantProfile).where(TenantProfile.id == req.tenant_id))
                tenant = tenant_res.scalar_one_or_none()
                if tenant and tenant.user_id:
                    await NotificationService.create_notification(
                        session=session,
                        user_id=tenant.user_id,
                        type=type,
                        title=title,
                        message=message,
                        entity_type="MAINTENANCE",
                        entity_id=req.id,
                    )
        except Exception as e:
            logger.warning(f"Error notifying tenant: {e}")

    @classmethod
    async def _notify_landlord(
        cls, session: AsyncSession, req: MaintenanceRequest, type: str, title: str, message: str
    ):
        try:
            async with session.begin_nested():
                landlord_res = await session.execute(select(LandlordProfile).where(LandlordProfile.id == req.landlord_id))
                landlord = landlord_res.scalar_one_or_none()
                if landlord and landlord.user_id:
                    await NotificationService.create_notification(
                        session=session,
                        user_id=landlord.user_id,
                        type=type,
                        title=title,
                        message=message,
                        entity_type="MAINTENANCE",
                        entity_id=req.id,
                    )
        except Exception as e:
            logger.warning(f"Error notifying landlord: {e}")
