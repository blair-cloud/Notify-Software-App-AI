import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, or_, and_, desc, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.encoders import jsonable_encoder

from backend.models import (
    Message, User, TenantProfile, LandlordProfile, Property, Unit, Tenancy,
    MaintenanceRequest, MaintenanceAttachment, MaintenanceComment, Notification,
    UserRole, MaintenanceStatus, MaintenanceCategory, MaintenancePriority,
    NotificationChannel, NotificationStatus
)
from backend.core.exceptions import NotFoundException
from backend.schemas.message import MessageCreate, MessageResponse, ConversationSummary
from backend.core.logging import logger
from backend.core.realtime import realtime


class MessageService:

    @staticmethod
    async def send_message(session: AsyncSession, sender: User, data: MessageCreate) -> MessageResponse:
        logger.info(f"Processing send_message from {sender.id} ({sender.role}), type: {data.message_type}")

        recipient_id = data.recipient_id
        property_id = data.property_id
        unit_id = data.unit_id
        tenancy_id = data.tenancy_id
        maintenance_req_id = data.maintenance_request_id

        # If sender is tenant, auto-resolve tenancy and landlord if not provided
        if sender.role == UserRole.TENANT:
            tp_stmt = select(TenantProfile).where(TenantProfile.user_id == sender.id)
            tp_res = await session.execute(tp_stmt)
            tenant_profile = tp_res.scalars().first()

            if tenant_profile:
                tenancy_stmt = select(Tenancy).where(
                    Tenancy.tenant_id == tenant_profile.id,
                    Tenancy.status == "ACTIVE"
                ).order_by(desc(Tenancy.created_at))
                tenancy_res = await session.execute(tenancy_stmt)
                active_tenancy = tenancy_res.scalars().first()

                if active_tenancy:
                    property_id = property_id or active_tenancy.property_id
                    unit_id = unit_id or active_tenancy.unit_id
                    tenancy_id = tenancy_id or active_tenancy.id

                    # Resolve landlord user_id
                    lp_stmt = select(LandlordProfile).where(LandlordProfile.id == active_tenancy.landlord_id)
                    lp_res = await session.execute(lp_stmt)
                    landlord_profile = lp_res.scalars().first()
                    if landlord_profile:
                        recipient_id = recipient_id or landlord_profile.user_id

        if not recipient_id:
            # Fallback to finding any admin or target
            admin_stmt = select(User).where(User.role == UserRole.SYSTEM_ADMIN).limit(1)
            admin_res = await session.execute(admin_stmt)
            admin_user = admin_res.scalars().first()
            recipient_id = admin_user.id if admin_user else sender.id

        # The recipient must be a real user. A caller passing, say, a landlord
        # *profile* id instead of the landlord's *user* id used to be accepted
        # silently: the row was written, addressed to nobody, and the message
        # simply never appeared in any inbox.
        recipient_exists = (
            await session.execute(select(User.id).where(User.id == recipient_id))
        ).scalar_one_or_none()
        if not recipient_exists:
            raise NotFoundException("The person you are messaging could not be found.")

        # Handle Maintenance creation if message_type is MAINTENANCE
        if data.message_type.upper() == "MAINTENANCE" and not maintenance_req_id:
            # Generate request number
            req_count_stmt = select(func.count(MaintenanceRequest.id))
            req_count_res = await session.execute(req_count_stmt)
            count = req_count_res.scalar() or 0
            req_num = f"MR-2026-{str(count + 1).zfill(6)}"

            # Resolve tenant_profile & landlord_profile ids
            tp_id = None
            lp_id = None
            if sender.role == UserRole.TENANT:
                t_stmt = select(TenantProfile).where(TenantProfile.user_id == sender.id)
                t_res = await session.execute(t_stmt)
                tp = t_res.scalars().first()
                if tp:
                    tp_id = tp.id

            if recipient_id:
                l_stmt = select(LandlordProfile).where(LandlordProfile.user_id == recipient_id)
                l_res = await session.execute(l_stmt)
                lp = l_res.scalars().first()
                if lp:
                    lp_id = lp.id

            if not lp_id and property_id:
                p_stmt = select(Property).where(Property.id == property_id)
                p_res = await session.execute(p_stmt)
                prop = p_res.scalars().first()
                if prop:
                    lp_id = prop.landlord_id

            if tp_id and lp_id and property_id and unit_id and tenancy_id:
                new_req = MaintenanceRequest(
                    request_number=req_num,
                    tenant_id=tp_id,
                    landlord_id=lp_id,
                    property_id=property_id,
                    unit_id=unit_id,
                    tenancy_id=tenancy_id,
                    title=data.maintenance_title or data.content[:60],
                    description=data.content,
                    category=data.maintenance_category or MaintenanceCategory.PLUMBING,
                    priority=data.maintenance_priority or MaintenancePriority.MEDIUM,
                    status=MaintenanceStatus.SUBMITTED,
                )
                session.add(new_req)
                await session.flush()
                maintenance_req_id = new_req.id

                # Attach file if present
                if data.attachment_url:
                    att = MaintenanceAttachment(
                        maintenance_request_id=new_req.id,
                        file_path=data.attachment_url,
                        file_name=data.attachment_name or "attachment.jpg",
                        size=data.attachment_size or 1048576,
                        uploaded_by=sender.id,
                    )
                    session.add(att)

                # Add initial comment
                init_comment = MaintenanceComment(
                    maintenance_request_id=new_req.id,
                    user_id=sender.id,
                    author_name=f"{sender.first_name} {sender.last_name}".strip(),
                    author_role=sender.role.value if hasattr(sender.role, 'value') else str(sender.role),
                    message=data.content,
                )
                session.add(init_comment)

                # Notify Landlord about new maintenance request
                notif = Notification(
                    user_id=recipient_id,
                    type="MAINTENANCE_CREATED",
                    title=f"New Maintenance Request: {new_req.title}",
                    message=f"Tenant {sender.first_name} {sender.last_name} submitted maintenance ticket {req_num}: {data.content[:100]}",
                    channel=NotificationChannel.IN_APP,
                    priority="HIGH",
                    category="MAINTENANCE",
                    status=NotificationStatus.SENT,
                    is_read=False,
                    entity_type="MAINTENANCE",
                    entity_id=new_req.id,
                )
                session.add(notif)

        elif maintenance_req_id:
            # Add comment to existing maintenance ticket
            m_comm = MaintenanceComment(
                maintenance_request_id=maintenance_req_id,
                user_id=sender.id,
                author_name=f"{sender.first_name} {sender.last_name}".strip(),
                author_role=sender.role.value if hasattr(sender.role, 'value') else str(sender.role),
                message=data.content,
            )
            session.add(m_comm)

        # Create Message record
        msg = Message(
            sender_id=sender.id,
            recipient_id=recipient_id,
            sender_role=sender.role,
            property_id=property_id,
            unit_id=unit_id,
            tenancy_id=tenancy_id,
            message_type=data.message_type.upper(),
            content=data.content,
            attachment_url=data.attachment_url,
            attachment_name=data.attachment_name,
            attachment_size=data.attachment_size,
            maintenance_request_id=maintenance_req_id,
            is_read=False,
        )
        session.add(msg)
        # Flush before referencing msg.id - it is only assigned on flush, and
        # entity_id is a UUID column, so a stringified id fails to bind.
        await session.flush()

        # Send General Notification if not maintenance
        if data.message_type.upper() != "MAINTENANCE":
            notif = Notification(
                user_id=recipient_id,
                type="NEW_MESSAGE",
                title=f"Message from {sender.first_name} {sender.last_name}",
                message=data.content[:120],
                channel=NotificationChannel.IN_APP,
                priority="MEDIUM",
                category="SYSTEM",
                status=NotificationStatus.SENT,
                is_read=False,
                entity_type="MESSAGE",
                entity_id=msg.id,
            )
            session.add(notif)

        await session.commit()
        await session.refresh(msg)

        response = await MessageService._augment_message(session, msg)

        # Push to both parties so open chats update live, without polling.
        await MessageService._publish_realtime(response)

        return response

    @staticmethod
    async def _publish_realtime(response: MessageResponse) -> None:
        try:
            await realtime.publish_to_users(
                [response.sender_id, response.recipient_id],
                {
                    "type": "message.created",
                    "message": jsonable_encoder(response),
                },
            )
        except Exception as exc:
            # Live delivery is best-effort; the message is already persisted.
            logger.warning(f"Realtime publish failed for message {response.id}: {exc}")

    @staticmethod
    async def get_messages(session: AsyncSession, user_id: uuid.UUID, partner_id: Optional[uuid.UUID] = None) -> List[MessageResponse]:
        query = select(Message)
        if partner_id:
            query = query.where(
                or_(
                    and_(Message.sender_id == user_id, Message.recipient_id == partner_id),
                    and_(Message.sender_id == partner_id, Message.recipient_id == user_id),
                )
            )
        else:
            query = query.where(
                or_(Message.sender_id == user_id, Message.recipient_id == user_id)
            )
        query = query.order_by(Message.created_at.asc())

        res = await session.execute(query)
        messages = res.scalars().all()

        return [await MessageService._augment_message(session, m) for m in messages]

    @staticmethod
    async def get_conversations(session: AsyncSession, current_user: User) -> List[ConversationSummary]:
        # Find all messages involving current_user
        query = select(Message).where(
            or_(Message.sender_id == current_user.id, Message.recipient_id == current_user.id)
        ).order_by(Message.created_at.desc())

        res = await session.execute(query)
        all_msgs = res.scalars().all()

        conversations_dict = {}
        for m in all_msgs:
            partner_id = m.recipient_id if m.sender_id == current_user.id else m.sender_id
            if partner_id not in conversations_dict:
                conversations_dict[partner_id] = []
            conversations_dict[partner_id].append(m)

        summaries = []
        for partner_id, msgs in conversations_dict.items():
            last_msg = msgs[0]
            unread = sum(1 for m in msgs if m.recipient_id == current_user.id and not m.is_read)

            # Resolve partner details
            u_stmt = select(User).where(User.id == partner_id)
            u_res = await session.execute(u_stmt)
            partner_user = u_res.scalars().first()
            partner_name = f"{partner_user.first_name} {partner_user.last_name}".strip() if partner_user else "Contact"
            partner_role = partner_user.role.value if partner_user and hasattr(partner_user.role, 'value') else "LANDLORD"

            # Check maintenance info
            has_maint = any(m.message_type == "MAINTENANCE" for m in msgs)
            maint_req_id = next((m.maintenance_request_id for m in msgs if m.maintenance_request_id), None)
            maint_title = None
            maint_status = None

            if maint_req_id:
                mr_stmt = select(MaintenanceRequest).where(MaintenanceRequest.id == maint_req_id)
                mr_res = await session.execute(mr_stmt)
                mr = mr_res.scalars().first()
                if mr:
                    maint_title = mr.title
                    maint_status = mr.status.value if hasattr(mr.status, 'value') else str(mr.status)

            # Property & unit names
            prop_name = None
            unit_num = None
            if last_msg.property_id:
                p_stmt = select(Property.name).where(Property.id == last_msg.property_id)
                p_res = await session.execute(p_stmt)
                prop_name = p_res.scalar()
            if last_msg.unit_id:
                un_stmt = select(Unit.unit_number).where(Unit.id == last_msg.unit_id)
                un_res = await session.execute(un_stmt)
                unit_num = un_res.scalar()

            summaries.append(ConversationSummary(
                id=f"conv-{partner_id}",
                partner_id=partner_id,
                partner_name=partner_name,
                partner_role=partner_role,
                property_id=last_msg.property_id,
                property_name=prop_name,
                unit_id=last_msg.unit_id,
                unit_number=unit_num,
                last_message=last_msg.content,
                last_message_at=last_msg.created_at,
                unread_count=unread,
                message_type=last_msg.message_type,
                has_maintenance=has_maint,
                maintenance_request_id=maint_req_id,
                maintenance_title=maint_title,
                maintenance_status=maint_status,
            ))

        return summaries

    @staticmethod
    async def mark_as_read(session: AsyncSession, current_user_id: uuid.UUID, partner_id: uuid.UUID):
        stmt = update(Message).where(
            Message.recipient_id == current_user_id,
            Message.sender_id == partner_id,
            Message.is_read == False
        ).values(is_read=True, read_at=datetime.now(timezone.utc))
        await session.execute(stmt)
        await session.commit()
        return {"status": "ok"}

    @staticmethod
    async def _augment_message(session: AsyncSession, msg: Message) -> MessageResponse:
        # Sender name
        s_stmt = select(User).where(User.id == msg.sender_id)
        s_res = await session.execute(s_stmt)
        s_user = s_res.scalars().first()
        sender_name = f"{s_user.first_name} {s_user.last_name}".strip() if s_user else "User"

        # Recipient name
        r_stmt = select(User).where(User.id == msg.recipient_id)
        r_res = await session.execute(r_stmt)
        r_user = r_res.scalars().first()
        recipient_name = f"{r_user.first_name} {r_user.last_name}".strip() if r_user else "User"

        # Property and Unit
        prop_name = None
        unit_num = None
        if msg.property_id:
            p_stmt = select(Property.name).where(Property.id == msg.property_id)
            p_res = await session.execute(p_stmt)
            prop_name = p_res.scalar()

        if msg.unit_id:
            u_stmt = select(Unit.unit_number).where(Unit.id == msg.unit_id)
            u_res = await session.execute(u_stmt)
            unit_num = u_res.scalar()

        # Maintenance details
        m_category = None
        m_priority = None
        m_status = None
        m_title = None
        if msg.maintenance_request_id:
            mr_stmt = select(MaintenanceRequest).where(MaintenanceRequest.id == msg.maintenance_request_id)
            mr_res = await session.execute(mr_stmt)
            mr = mr_res.scalars().first()
            if mr:
                m_title = mr.title
                m_category = mr.category.value if hasattr(mr.category, 'value') else str(mr.category)
                m_priority = mr.priority.value if hasattr(mr.priority, 'value') else str(mr.priority)
                m_status = mr.status.value if hasattr(mr.status, 'value') else str(mr.status)

        return MessageResponse(
            id=msg.id,
            sender_id=msg.sender_id,
            recipient_id=msg.recipient_id,
            sender_role=msg.sender_role,
            sender_name=sender_name,
            recipient_name=recipient_name,
            property_id=msg.property_id,
            property_name=prop_name,
            unit_id=msg.unit_id,
            unit_number=unit_num,
            tenancy_id=msg.tenancy_id,
            message_type=msg.message_type,
            content=msg.content,
            attachment_url=msg.attachment_url,
            attachment_name=msg.attachment_name,
            attachment_size=msg.attachment_size,
            maintenance_request_id=msg.maintenance_request_id,
            maintenance_category=m_category,
            maintenance_priority=m_priority,
            maintenance_status=m_status,
            maintenance_title=m_title,
            is_read=msg.is_read,
            read_at=msg.read_at,
            created_at=msg.created_at,
        )
