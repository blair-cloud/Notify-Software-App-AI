import uuid
import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone, date, timedelta
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, or_, and_

from backend.models import (
    Notification,
    NotificationPreference,
    NotificationDeliveryLog,
    ReminderHistory,
    NotificationTemplate,
    NotificationChannel,
    NotificationStatus,
    NotificationPriority,
    NotificationCategory,
    NotificationType,
    User,
    Lease,
    LandlordProfile,
    TenantProfile,
    Property,
    Unit,
    LeaseStatus,
)
from backend.integrations.email import send_email, render_lease_expiry_email_html

logger = logging.getLogger("notification_service")

# Reusable System Default Templates
DEFAULT_TEMPLATES = [
    {
        "code": "LEASE_EXPIRY_30D",
        "category": "LEASE_EXPIRY",
        "title_template": "Lease Expiring in 30 Days: {{property_name}} - {{unit_number}}",
        "body_template": "Tenant {{tenant_name}} in unit {{unit_number}} at {{property_name}} has a lease expiring on {{expiry_date}} (30 days remaining). Recommended Action: {{recommended_action}}",
        "action_label": "Review Lease & Renew",
        "action_url_template": "/dashboard/leases?id={{lease_id}}",
        "default_priority": "MEDIUM",
    },
    {
        "code": "LEASE_EXPIRY_14D",
        "category": "LEASE_EXPIRY",
        "title_template": "Lease Expiring in 14 Days: {{tenant_name}}",
        "body_template": "Lease for unit {{unit_number}} ({{property_name}}) expires in 14 days on {{expiry_date}}. Recommended Action: {{recommended_action}}",
        "action_label": "Contact Tenant",
        "action_url_template": "/dashboard/leases?id={{lease_id}}",
        "default_priority": "MEDIUM",
    },
    {
        "code": "LEASE_EXPIRY_7D",
        "category": "LEASE_EXPIRY",
        "title_template": "Urgent: Lease Expiring in 7 Days ({{unit_number}})",
        "body_template": "Lease for {{tenant_name}} at {{property_name}}, Unit {{unit_number}} expires in 7 days on {{expiry_date}}. Recommended Action: {{recommended_action}}",
        "action_label": "Prepare Renewal or Move-out",
        "action_url_template": "/dashboard/leases?id={{lease_id}}",
        "default_priority": "HIGH",
    },
    {
        "code": "LEASE_EXPIRY_3D",
        "category": "LEASE_EXPIRY",
        "title_template": "Critical: Lease Expiring in 3 Days - {{tenant_name}}",
        "body_template": "Tenant {{tenant_name}} in Unit {{unit_number}} at {{property_name}} has only 3 days left until lease expiration on {{expiry_date}}. Recommended Action: {{recommended_action}}",
        "action_label": "Immediate Action Required",
        "action_url_template": "/dashboard/leases?id={{lease_id}}",
        "default_priority": "CRITICAL",
    },
    {
        "code": "LEASE_EXPIRY_2D",
        "category": "LEASE_EXPIRY",
        "title_template": "Critical: Lease Expiring in 2 Days - {{tenant_name}}",
        "body_template": "Lease for Unit {{unit_number}} ({{property_name}}) will expire in 2 days on {{expiry_date}}. Recommended Action: {{recommended_action}}",
        "action_label": "Resolve Renewal Status",
        "action_url_template": "/dashboard/leases?id={{lease_id}}",
        "default_priority": "CRITICAL",
    },
    {
        "code": "LEASE_EXPIRY_1D",
        "category": "LEASE_EXPIRY",
        "title_template": "Final Day Notice: Lease Expires Tomorrow - {{tenant_name}}",
        "body_template": "Lease for {{tenant_name}} in Unit {{unit_number}} at {{property_name}} expires tomorrow on {{expiry_date}}. Recommended Action: {{recommended_action}}",
        "action_label": "Finalize Lease / Key Handover",
        "action_url_template": "/dashboard/leases?id={{lease_id}}",
        "default_priority": "CRITICAL",
    },
    {
        "code": "LEASE_EXPIRY_TODAY",
        "category": "LEASE_EXPIRY",
        "title_template": "Lease Expiring Today: {{tenant_name}} (Unit {{unit_number}})",
        "body_template": "The lease for {{tenant_name}} at {{property_name}}, Unit {{unit_number}} expires TODAY ({{expiry_date}}). Recommended Action: {{recommended_action}}",
        "action_label": "Execute Renewal / Handover",
        "action_url_template": "/dashboard/leases?id={{lease_id}}",
        "default_priority": "CRITICAL",
    },
    {
        "code": "LEASE_EXPIRED",
        "category": "LEASE_EXPIRY",
        "title_template": "Lease Expired: Unit {{unit_number}} ({{tenant_name}})",
        "body_template": "The lease for Unit {{unit_number}} at {{property_name}} expired on {{expiry_date}}. Status has been updated to EXPIRED. Recommended Action: {{recommended_action}}",
        "action_label": "Inspect Unit / Re-lease",
        "action_url_template": "/dashboard/leases?id={{lease_id}}",
        "default_priority": "HIGH",
    },
    {
        "code": "PAYMENT_RECEIVED",
        "category": "PAYMENT",
        "title_template": "Payment Confirmed: {{tenant_name}}",
        "body_template": "Payment of {{amount}} RWF for Invoice {{invoice_number}} was successfully confirmed. Receipt {{receipt_number}} has been issued.",
        "action_label": "View Receipt",
        "action_url_template": "/dashboard/payments",
        "default_priority": "LOW",
    },
    {
        "code": "INVOICE_OVERDUE",
        "category": "PAYMENT",
        "title_template": "Overdue Rent Invoice: {{tenant_name}} ({{unit_number}})",
        "body_template": "Invoice {{invoice_number}} for {{amount}} RWF is overdue since {{due_date}}. Recommended Action: Send payment reminder.",
        "action_label": "Send Reminder",
        "action_url_template": "/dashboard/invoices",
        "default_priority": "HIGH",
    },
]


def interpolate_template(template_str: str, variables: Dict[str, Any]) -> str:
    result = template_str
    for key, val in variables.items():
        placeholder = f"{{{{{key}}}}}"
        result = result.replace(placeholder, str(val) if val is not None else "")
    return result


def get_recommended_action_for_milestone(days_remaining: int) -> str:
    if days_remaining == 30:
        return "Initiate renewal discussion with tenant and send renewal proposal terms."
    elif days_remaining == 14:
        return "Follow up on renewal proposal. If not renewing, schedule prospective tenant viewings."
    elif days_remaining == 7:
        return "Confirm signing of lease extension or prepare move-out inspection checklist."
    elif days_remaining == 3:
        return "Urgent: Finalize renewed contract or schedule final meter reading and key handover."
    elif days_remaining == 2:
        return "Prepare deposit reconciliation statement and move-out condition report."
    elif days_remaining == 1:
        return "Confirm tomorrow's walk-through inspection and key return time."
    elif days_remaining == 0:
        return "Execute signed renewal lease or finalize unit vacancy and security deposit refund."
    elif days_remaining < 0:
        return "Unit is in holdover or expired status. Update tenancy agreement or reclaim unit."
    return "Contact the tenant regarding lease status."


class NotificationService:
    @classmethod
    async def get_or_create_preferences(cls, session: AsyncSession, user_id: uuid.UUID) -> NotificationPreference:
        stmt = select(NotificationPreference).where(NotificationPreference.user_id == user_id)
        res = await session.execute(stmt)
        pref = res.scalar_one_or_none()
        if not pref:
            pref = NotificationPreference(
                user_id=user_id,
                lease_expiry_in_app=True,
                lease_expiry_email=True,
                lease_expiry_sms=False,
                lease_expiry_whatsapp=False,
                payment_in_app=True,
                payment_email=True,
                payment_sms=True,
                payment_whatsapp=False,
                maintenance_in_app=True,
                maintenance_email=True,
                maintenance_sms=False,
                maintenance_whatsapp=False,
                complaints_in_app=True,
                complaints_email=True,
                complaints_sms=False,
                complaints_whatsapp=False,
                system_in_app=True,
                system_email=False,
                system_sms=False,
                system_whatsapp=False,
            )
            session.add(pref)
            await session.commit()
            await session.refresh(pref)
        return pref

    @classmethod
    async def update_preferences(
        cls, session: AsyncSession, user_id: uuid.UUID, update_data: Dict[str, Any]
    ) -> NotificationPreference:
        pref = await cls.get_or_create_preferences(session, user_id)
        for key, value in update_data.items():
            if value is not None and hasattr(pref, key):
                setattr(pref, key, value)
        await session.commit()
        await session.refresh(pref)
        return pref

    @classmethod
    async def create_notification(
        cls,
        session: AsyncSession,
        user_id: uuid.UUID,
        type: str,
        title: str,
        message: str,
        category: str = "SYSTEM",
        priority: str = "MEDIUM",
        channel: NotificationChannel = NotificationChannel.IN_APP,
        entity_type: Optional[str] = None,
        entity_id: Optional[uuid.UUID] = None,
        action_url: Optional[str] = None,
        action_label: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        language: str = "en",
    ) -> Notification:
        metadata_json = json.dumps(metadata) if metadata else None

        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            category=category,
            priority=priority,
            channel=channel,
            status=NotificationStatus.SENT,
            entity_type=entity_type,
            entity_id=entity_id,
            reference_type=entity_type,
            reference_id=entity_id,
            action_url=action_url,
            action_label=action_label,
            metadata_json=metadata_json,
            language=language,
            is_read=False,
            sent_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
        )
        session.add(notification)
        await session.commit()
        await session.refresh(notification)

        # Log delivery
        try:
            user_res = await session.execute(select(User).where(User.id == user_id))
            user = user_res.scalar_one_or_none()
            if user:
                log = NotificationDeliveryLog(
                    notification_id=notification.id,
                    user_id=user.id,
                    channel=channel.value if hasattr(channel, 'value') else str(channel),
                    recipient=user.email or user.phone or str(user.id),
                    subject=title,
                    status="SENT",
                    metadata_info=metadata_json,
                )
                session.add(log)
                await session.commit()
        except Exception as e:
            logger.warning(f"Could not record delivery log: {e}")

        return notification

    @classmethod
    async def get_user_notifications(
        cls,
        session: AsyncSession,
        user_id: uuid.UUID,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        unread_only: bool = False,
        search: Optional[str] = None,
    ) -> List[Notification]:
        stmt = select(Notification).where(Notification.user_id == user_id)

        if unread_only:
            stmt = stmt.where(Notification.is_read == False)
        if category and category != "ALL":
            stmt = stmt.where(Notification.category == category)
        if priority and priority != "ALL":
            stmt = stmt.where(Notification.priority == priority)
        if search:
            search_pattern = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    Notification.title.ilike(search_pattern),
                    Notification.message.ilike(search_pattern),
                )
            )

        stmt = stmt.order_by(Notification.created_at.desc())
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @classmethod
    async def get_unread_count(cls, session: AsyncSession, user_id: uuid.UUID) -> int:
        stmt = select(Notification).where(Notification.user_id == user_id, Notification.is_read == False)
        res = await session.execute(stmt)
        return len(res.scalars().all())

    @classmethod
    async def mark_as_read(cls, session: AsyncSession, notification_id: uuid.UUID) -> Optional[Notification]:
        stmt = select(Notification).where(Notification.id == notification_id)
        res = await session.execute(stmt)
        notification = res.scalar_one_or_none()
        if notification:
            notification.is_read = True
            notification.status = NotificationStatus.READ
            notification.read_at = datetime.now(timezone.utc)
            await session.commit()
            await session.refresh(notification)
        return notification

    @classmethod
    async def mark_all_as_read(cls, session: AsyncSession, user_id: uuid.UUID) -> int:
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .values(is_read=True, status=NotificationStatus.READ, read_at=datetime.now(timezone.utc))
        )
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount

    @classmethod
    async def delete_notification(cls, session: AsyncSession, notification_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        stmt = delete(Notification).where(Notification.id == notification_id, Notification.user_id == user_id)
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0

    @classmethod
    async def get_delivery_logs(cls, session: AsyncSession, user_id: Optional[uuid.UUID] = None) -> List[NotificationDeliveryLog]:
        stmt = select(NotificationDeliveryLog)
        if user_id:
            stmt = stmt.where(NotificationDeliveryLog.user_id == user_id)
        stmt = stmt.order_by(NotificationDeliveryLog.created_at.desc()).limit(100)
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @classmethod
    async def get_templates(cls, session: AsyncSession) -> List[Dict[str, Any]]:
        # Return default templates or database templates
        return DEFAULT_TEMPLATES

    @classmethod
    async def process_automated_reminders(
        cls, session: AsyncSession, target_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Core Automated Notification Engine:
        1. Checks all leases.
        2. Computes days remaining until expiration.
        3. Updates lease status dynamically:
           - > 30 days: ACTIVE
           - 0 <= days <= 30: EXPIRING_SOON
           - < 0 days: EXPIRED
        4. Matches against key milestone schedules: 30d, 14d, 7d, 3d, 2d, 1d, 0d (today).
        5. Prevents duplicate notifications for the same lease milestone on target date.
        6. Delivers in-app notification and email (if enabled by user preferences).
        7. Logs all delivery actions.
        """
        today = target_date or date.today()
        checked_leases = 0
        reminders_created = 0
        reminders_skipped_duplicate = 0
        emails_sent = 0
        emails_skipped = 0
        expired_leases_updated = 0
        details = []

        # Target milestones map: days_remaining -> (milestone_code, priority, notif_type)
        milestone_map = {
            30: ("30D", "MEDIUM", "LEASE_EXPIRY_30D"),
            14: ("14D", "MEDIUM", "LEASE_EXPIRY_14D"),
            7:  ("7D",  "HIGH",   "LEASE_EXPIRY_7D"),
            3:  ("3D",  "CRITICAL", "LEASE_EXPIRY_3D"),
            2:  ("2D",  "CRITICAL", "LEASE_EXPIRY_2D"),
            1:  ("1D",  "CRITICAL", "LEASE_EXPIRY_1D"),
            0:  ("TODAY", "CRITICAL", "LEASE_EXPIRY_TODAY"),
        }

        # Fetch leases with relations
        leases_stmt = select(Lease)
        leases_res = await session.execute(leases_stmt)
        all_leases = list(leases_res.scalars().all())

        for lease in all_leases:
            # Skip terminated or draft leases
            if lease.status in [LeaseStatus.TERMINATED, LeaseStatus.DRAFT]:
                continue

            checked_leases += 1
            days_remaining = (lease.end_date - today).days

            # 1. Update lease dynamic status
            prev_status = lease.status
            if days_remaining < 0:
                lease.status = LeaseStatus.EXPIRED
                if prev_status != LeaseStatus.EXPIRED:
                    expired_leases_updated += 1
            elif days_remaining <= 30:
                lease.status = LeaseStatus.EXPIRING_SOON
            else:
                lease.status = LeaseStatus.ACTIVE

            # 2. Check if a reminder should be triggered today
            if days_remaining in milestone_map:
                milestone_code, priority, notif_type = milestone_map[days_remaining]

                # Check duplicate history
                dup_stmt = select(ReminderHistory).where(
                    ReminderHistory.lease_id == lease.id,
                    ReminderHistory.milestone == milestone_code,
                    ReminderHistory.target_date == today,
                )
                dup_res = await session.execute(dup_stmt)
                if dup_res.scalar_one_or_none():
                    reminders_skipped_duplicate += 1
                    details.append({
                        "lease_id": str(lease.id),
                        "milestone": milestone_code,
                        "status": "SKIPPED_DUPLICATE",
                        "days_remaining": days_remaining,
                    })
                    continue

                # Fetch landlord user
                landlord_profile_res = await session.execute(
                    select(LandlordProfile).where(LandlordProfile.id == lease.landlord_id)
                )
                landlord_profile = landlord_profile_res.scalar_one_or_none()
                if not landlord_profile:
                    continue

                landlord_user_res = await session.execute(
                    select(User).where(User.id == landlord_profile.user_id)
                )
                landlord_user = landlord_user_res.scalar_one_or_none()
                if not landlord_user:
                    continue

                # Fetch tenant user & profile
                tenant_profile_res = await session.execute(
                    select(TenantProfile).where(TenantProfile.id == lease.tenant_id)
                )
                tenant_profile = tenant_profile_res.scalar_one_or_none()
                tenant_user = None
                tenant_name = "Valued Tenant"
                if tenant_profile:
                    tenant_user_res = await session.execute(
                        select(User).where(User.id == tenant_profile.user_id)
                    )
                    tenant_user = tenant_user_res.scalar_one_or_none()
                    if tenant_user:
                        tenant_name = f"{tenant_user.first_name} {tenant_user.last_name}".strip()

                # Fetch Property & Unit
                prop_res = await session.execute(select(Property).where(Property.id == lease.property_id))
                prop = prop_res.scalar_one_or_none()
                prop_name = prop.name if prop else "Commercial Complex"

                unit_res = await session.execute(select(Unit).where(Unit.id == lease.unit_id))
                unit = unit_res.scalar_one_or_none()
                unit_num = unit.unit_number if unit else "Unit"

                # Build template variables
                manager_name = f"{landlord_user.first_name} {landlord_user.last_name}".strip() or "Property Manager"
                recommended_action = get_recommended_action_for_milestone(days_remaining)
                expiry_date_str = lease.end_date.strftime("%B %d, %Y")

                template_vars = {
                    "tenant_name": tenant_name,
                    "property_name": prop_name,
                    "unit_number": unit_num,
                    "expiry_date": expiry_date_str,
                    "days_remaining": days_remaining,
                    "manager_name": manager_name,
                    "recommended_action": recommended_action,
                    "lease_id": str(lease.id),
                }

                # Find template
                matching_tpl = next((t for t in DEFAULT_TEMPLATES if t["code"] == notif_type), DEFAULT_TEMPLATES[0])
                title = interpolate_template(matching_tpl["title_template"], template_vars)
                body = interpolate_template(matching_tpl["body_template"], template_vars)
                action_label = matching_tpl.get("action_label", "View Lease")
                action_url = interpolate_template(matching_tpl.get("action_url_template", "/dashboard/leases"), template_vars)

                # Get Landlord Preferences
                prefs = await cls.get_or_create_preferences(session, landlord_user.id)

                # 1. Create in-app notification if enabled
                in_app_notif = None
                if prefs.lease_expiry_in_app:
                    in_app_notif = Notification(
                        user_id=landlord_user.id,
                        type=notif_type,
                        title=title,
                        message=body,
                        category="LEASE_EXPIRY",
                        priority=priority,
                        channel=NotificationChannel.IN_APP,
                        status=NotificationStatus.SENT,
                        entity_type="LEASE",
                        entity_id=lease.id,
                        reference_type="LEASE",
                        reference_id=lease.id,
                        action_url=action_url,
                        action_label=action_label,
                        metadata_json=json.dumps({
                            "tenant_name": tenant_name,
                            "property_name": prop_name,
                            "unit_number": unit_num,
                            "expiry_date": expiry_date_str,
                            "days_remaining": days_remaining,
                            "recommended_action": recommended_action,
                            "milestone": milestone_code,
                        }),
                        is_read=False,
                        sent_at=datetime.now(timezone.utc),
                        created_at=datetime.now(timezone.utc),
                    )
                    session.add(in_app_notif)
                    await session.flush()
                    reminders_created += 1

                # 2. Send email notification if enabled
                if prefs.lease_expiry_email and landlord_user.email:
                    html_content = render_lease_expiry_email_html(
                        manager_name=manager_name,
                        tenant_name=tenant_name,
                        property_name=prop_name,
                        unit_number=unit_num,
                        expiry_date_str=expiry_date_str,
                        days_remaining=days_remaining,
                        milestone=milestone_code,
                        recommended_action=recommended_action,
                        action_url=action_url,
                    )
                    email_success = await send_email(
                        to_email=landlord_user.email,
                        subject=f"[Notify Kigali] {title}",
                        body=body,
                        html_content=html_content,
                        metadata=template_vars,
                    )

                    email_log = NotificationDeliveryLog(
                        notification_id=in_app_notif.id if in_app_notif else None,
                        user_id=landlord_user.id,
                        channel="EMAIL",
                        recipient=landlord_user.email,
                        subject=f"[Notify Kigali] {title}",
                        status="SENT" if email_success else "FAILED",
                        metadata_info=json.dumps(template_vars),
                    )
                    session.add(email_log)
                    emails_sent += 1
                else:
                    emails_skipped += 1

                # 3. Record Reminder History for deduplication
                reminder_history = ReminderHistory(
                    lease_id=lease.id,
                    milestone=milestone_code,
                    target_date=today,
                    notification_id=in_app_notif.id if in_app_notif else None,
                )
                session.add(reminder_history)

                details.append({
                    "lease_id": str(lease.id),
                    "tenant_name": tenant_name,
                    "unit": unit_num,
                    "milestone": milestone_code,
                    "days_remaining": days_remaining,
                    "in_app_sent": bool(prefs.lease_expiry_in_app),
                    "email_sent": bool(prefs.lease_expiry_email),
                    "status": "PROCESSED",
                })

        await session.commit()

        return {
            "checked_leases": checked_leases,
            "reminders_created": reminders_created,
            "reminders_skipped_duplicate": reminders_skipped_duplicate,
            "emails_sent": emails_sent,
            "emails_skipped": emails_skipped,
            "expired_leases_updated": expired_leases_updated,
            "details": details,
        }
