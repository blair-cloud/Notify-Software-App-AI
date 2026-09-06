"""
One place that actually delivers a landlord's message to tenants.

It builds on what already exists rather than adding a parallel system:
  * IN_APP writes a `Message` row (so it shows up in the existing chat thread)
    and a `Notification` row (so it shows up in the bell menu).
  * SMS / WhatsApp / Email go out through the channel integrations.
  * Every attempt on every channel is recorded in `NotificationDeliveryLog`,
    which is what the existing /notifications/logs endpoint already reads.

Ownership is enforced up front: a landlord can only address tenants who have a
tenancy with them.
"""
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.core.exceptions import ForbiddenException, NotFoundException
from backend.core.logging import logger
from backend.integrations.delivery import DeliveryResult, skipped
from backend.integrations.email import send_email_message
from backend.integrations.sms import send_sms_message
from backend.integrations.translation import (
    SUPPORTED_LANGUAGES,
    build_template_messages,
    normalize_language,
    render_placeholders,
    translate_text,
)
from backend.integrations.whatsapp import send_whatsapp_message
from backend.models import (
    LandlordProfile,
    Message,
    Notification,
    NotificationChannel,
    NotificationDeliveryLog,
    NotificationStatus,
    Property,
    Tenancy,
    TenantProfile,
    Unit,
    User,
    UserRole,
)

VALID_CHANNELS = ["IN_APP", "SMS", "WHATSAPP", "EMAIL"]


class RecipientContext:
    """Everything needed to address one tenant, resolved once up front."""

    def __init__(self, tenant: TenantProfile, user: User, tenancy: Optional[Tenancy]):
        self.tenant = tenant
        self.user = user
        self.tenancy = tenancy

    @property
    def tenant_id(self) -> uuid.UUID:
        return self.tenant.id

    @property
    def user_id(self) -> uuid.UUID:
        return self.user.id

    @property
    def name(self) -> str:
        return f"{self.user.first_name} {self.user.last_name}".strip() or "Tenant"

    @property
    def language(self) -> str:
        raw = self.user.language.value if hasattr(self.user.language, "value") else self.user.language
        return normalize_language(raw)

    @property
    def variables(self) -> Dict[str, Any]:
        prop = self.tenancy.property if self.tenancy else None
        unit = self.tenancy.unit if self.tenancy else None
        return {
            "tenant_name": self.user.first_name or self.name,
            "tenant_full_name": self.name,
            "property_name": prop.name if prop else "your property",
            "unit_number": unit.unit_number if unit else "",
        }


class CommunicationService:

    # ------------------------------------------------------------------
    # Recipient resolution + ownership
    # ------------------------------------------------------------------

    @staticmethod
    async def _load_landlord_recipients(
        session: AsyncSession, landlord: LandlordProfile
    ) -> Dict[str, RecipientContext]:
        """Every tenant this landlord may contact, keyed by tenant id AND user id."""
        stmt = (
            select(Tenancy)
            .options(
                selectinload(Tenancy.tenant).selectinload(TenantProfile.user),
                selectinload(Tenancy.property),
                selectinload(Tenancy.unit),
            )
            .where(Tenancy.landlord_id == landlord.id)
        )
        res = await session.execute(stmt)
        tenancies = res.scalars().all()

        contexts: Dict[str, RecipientContext] = {}
        for tenancy in tenancies:
            tenant = tenancy.tenant
            user = tenant.user if tenant else None
            if not tenant or not user:
                continue
            existing = contexts.get(str(tenant.id))
            # Prefer an active tenancy for the property/unit placeholders.
            if existing and str(getattr(existing.tenancy, "status", "")) == "TenancyStatus.ACTIVE":
                continue
            ctx = RecipientContext(tenant, user, tenancy)
            contexts[str(tenant.id)] = ctx
            contexts[str(user.id)] = ctx
        return contexts

    @staticmethod
    def _resolve_requested(
        contexts: Dict[str, RecipientContext], requested_ids: Sequence[str]
    ) -> List[RecipientContext]:
        resolved: List[RecipientContext] = []
        seen: set = set()
        unknown: List[str] = []

        for raw in requested_ids:
            key = str(raw).strip()
            ctx = contexts.get(key)
            if not ctx:
                unknown.append(key)
                continue
            if ctx.tenant_id in seen:
                continue
            seen.add(ctx.tenant_id)
            resolved.append(ctx)

        if unknown:
            # Not found vs. not yours are deliberately the same answer: a landlord
            # must not be able to probe for tenant ids outside their portfolio.
            raise ForbiddenException(
                f"{len(unknown)} recipient(s) are not tenants of this landlord and cannot be contacted."
            )
        if not resolved:
            raise NotFoundException("No valid recipients were selected.")
        return resolved

    # ------------------------------------------------------------------
    # Composition
    # ------------------------------------------------------------------

    @staticmethod
    def compose_preview(
        template_code: str,
        variables: Dict[str, Any],
        overrides: Optional[Dict[str, Dict[str, str]]] = None,
    ) -> Dict[str, Dict[str, str]]:
        """Render a template in EN/FR/RW, letting the landlord's edits win."""
        messages = build_template_messages(template_code, variables or {})
        for lang, edited in (overrides or {}).items():
            key = normalize_language(lang)
            if key not in messages or not isinstance(edited, dict):
                continue
            if edited.get("title"):
                messages[key]["title"] = edited["title"]
            if edited.get("body"):
                messages[key]["body"] = edited["body"]
        return messages

    @staticmethod
    async def translate_message(
        text: str, source_language: str, targets: Optional[Sequence[str]] = None
    ) -> Dict[str, Any]:
        source = normalize_language(source_language)
        wanted = [normalize_language(t) for t in (targets or SUPPORTED_LANGUAGES)]
        translations: Dict[str, Optional[str]] = {}
        untranslated: List[str] = []

        for lang in wanted:
            if lang == source:
                translations[lang] = text
                continue
            result = await translate_text(text, lang, source)
            translations[lang] = result
            if result is None:
                untranslated.append(lang)

        return {
            "source_language": source,
            "translations": translations,
            "untranslated_languages": untranslated,
            "notice": (
                "Automatic translation is unavailable for these languages - please write or edit them before sending."
                if untranslated
                else None
            ),
        }

    # ------------------------------------------------------------------
    # Delivery
    # ------------------------------------------------------------------

    @staticmethod
    async def _deliver_channel(
        session: AsyncSession,
        sender: User,
        ctx: RecipientContext,
        channel: str,
        title: str,
        body: str,
        language: str,
        category: str,
        priority: str,
        entity_type: Optional[str],
        entity_id: Optional[str],
    ) -> DeliveryResult:
        if channel == "IN_APP":
            return await CommunicationService._deliver_in_app(
                session, sender, ctx, title, body, language, category, priority, entity_type, entity_id
            )
        if channel == "SMS":
            return await send_sms_message(ctx.user.phone, body)
        if channel == "WHATSAPP":
            return await send_whatsapp_message(ctx.user.phone, body)
        if channel == "EMAIL":
            return await send_email_message(
                ctx.user.email,
                subject=title or "Message from your property manager",
                body=body,
                metadata={"tenant": ctx.name, "language": language},
            )
        return skipped(channel, "", f"Unsupported channel '{channel}'")

    @staticmethod
    async def _deliver_in_app(
        session: AsyncSession,
        sender: User,
        ctx: RecipientContext,
        title: str,
        body: str,
        language: str,
        category: str,
        priority: str,
        entity_type: Optional[str],
        entity_id: Optional[str],
    ) -> DeliveryResult:
        """
        In-app delivery reuses the existing chat + notification tables so the
        tenant sees the message in the conversation they already use.
        """
        try:
            message = Message(
                sender_id=sender.id,
                recipient_id=ctx.user_id,
                sender_role=sender.role,
                property_id=ctx.tenancy.property_id if ctx.tenancy else None,
                unit_id=ctx.tenancy.unit_id if ctx.tenancy else None,
                tenancy_id=ctx.tenancy.id if ctx.tenancy else None,
                message_type="GENERAL",
                content=body,
                is_read=False,
            )
            session.add(message)
            await session.flush()

            notification = Notification(
                user_id=ctx.user_id,
                type=entity_type or "LANDLORD_MESSAGE",
                title=title or "Message from your property manager",
                message=body,
                language=language.lower(),
                category=category,
                priority=priority,
                channel=NotificationChannel.IN_APP,
                status=NotificationStatus.SENT,
                entity_type="MESSAGE",
                entity_id=message.id,
                reference_type="MESSAGE",
                reference_id=message.id,
                action_url="/tenant/messages",
                action_label="Open message",
                is_read=False,
                sent_at=datetime.now(timezone.utc),
            )
            session.add(notification)
            await session.flush()

            return DeliveryResult(
                channel="IN_APP",
                recipient=ctx.name,
                status="SENT",
                provider="notify",
                attempts=1,
                metadata={"message_id": str(message.id), "notification_id": str(notification.id)},
            )
        except Exception as exc:
            logger.warning(f"In-app delivery failed for {ctx.user_id}: {exc}")
            return DeliveryResult(
                channel="IN_APP", recipient=ctx.name, status="FAILED", provider="notify", attempts=1, error=str(exc)
            )

    @staticmethod
    async def get_delivery_history(
        session: AsyncSession, landlord: LandlordProfile, limit: int = 200
    ) -> List[Dict[str, Any]]:
        """
        Delivery outcomes for this landlord's tenants, newest first, so a
        landlord can check after the fact what actually went out and what failed.
        """
        contexts = await CommunicationService._load_landlord_recipients(session, landlord)
        user_ids = {ctx.user_id for ctx in contexts.values()}
        if not user_ids:
            return []

        stmt = (
            select(NotificationDeliveryLog)
            .where(NotificationDeliveryLog.user_id.in_(user_ids))
            .order_by(NotificationDeliveryLog.created_at.desc())
            .limit(min(max(limit, 1), 500))
        )
        res = await session.execute(stmt)
        logs = res.scalars().all()

        by_user = {ctx.user_id: ctx for ctx in contexts.values()}
        history: List[Dict[str, Any]] = []
        for log in logs:
            try:
                meta = json.loads(log.metadata_info) if log.metadata_info else {}
            except (ValueError, TypeError):
                meta = {}
            ctx = by_user.get(log.user_id)
            history.append(
                {
                    "id": str(log.id),
                    "tenant_name": ctx.name if ctx else "Tenant",
                    "tenant_id": str(ctx.tenant_id) if ctx else None,
                    "channel": log.channel,
                    "recipient": log.recipient,
                    "subject": log.subject,
                    "status": log.status,
                    "error_message": log.error_message,
                    "batch_id": meta.get("batch_id"),
                    "language": meta.get("language"),
                    "provider": meta.get("provider"),
                    "simulated": meta.get("simulated", False),
                    "attempts": meta.get("attempts"),
                    "created_at": log.created_at,
                }
            )
        return history

    @staticmethod
    async def send_bulk(
        session: AsyncSession,
        sender: User,
        landlord: LandlordProfile,
        recipient_ids: Sequence[str],
        channels: Sequence[str],
        template_code: str = "CUSTOM",
        messages: Optional[Dict[str, Dict[str, str]]] = None,
        variables: Optional[Dict[str, Any]] = None,
        category: str = "SYSTEM",
        priority: str = "MEDIUM",
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        force_language: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send one reviewed message to many tenants across many channels.

        `messages` holds the landlord-approved wording per language
        ({"EN": {"title": ..., "body": ...}, ...}); each tenant receives the
        version for their own preferred language unless `force_language` is set.
        """
        selected_channels = [c.strip().upper() for c in channels if c and c.strip()]
        invalid = [c for c in selected_channels if c not in VALID_CHANNELS]
        if invalid:
            raise ForbiddenException(f"Unsupported channel(s): {', '.join(invalid)}")
        if not selected_channels:
            raise NotFoundException("Select at least one delivery channel.")

        contexts = await CommunicationService._load_landlord_recipients(session, landlord)
        recipients = CommunicationService._resolve_requested(contexts, recipient_ids)

        batch_id = str(uuid.uuid4())
        results: List[Dict[str, Any]] = []
        totals = {"sent": 0, "failed": 0, "skipped": 0}

        for ctx in recipients:
            language = normalize_language(force_language) if force_language else ctx.language
            per_language = (messages or {}).get(language) or (messages or {}).get("EN") or {}

            merged_vars = {**(variables or {}), **ctx.variables}
            title = render_placeholders(per_language.get("title", ""), merged_vars)
            body = render_placeholders(per_language.get("body", ""), merged_vars)

            if not body:
                fallback = CommunicationService.compose_preview(template_code, merged_vars)[language]
                title = title or fallback["title"]
                body = fallback["body"]

            channel_results: List[Dict[str, Any]] = []
            for channel in selected_channels:
                result = await CommunicationService._deliver_channel(
                    session, sender, ctx, channel, title, body, language,
                    category, priority, entity_type, entity_id,
                )
                totals[result.status.lower()] = totals.get(result.status.lower(), 0) + 1

                session.add(
                    NotificationDeliveryLog(
                        user_id=ctx.user_id,
                        channel=channel,
                        recipient=result.recipient or ctx.name,
                        subject=title[:255] if title else None,
                        status=result.status,
                        error_message=result.error,
                        metadata_info=json.dumps(
                            {
                                "batch_id": batch_id,
                                "template": template_code,
                                "language": language,
                                "provider": result.provider,
                                "simulated": result.simulated,
                                "attempts": result.attempts,
                                "sent_by": str(sender.id),
                            }
                        ),
                    )
                )
                channel_results.append(result.to_dict())

            results.append(
                {
                    "tenant_id": str(ctx.tenant_id),
                    "user_id": str(ctx.user_id),
                    "name": ctx.name,
                    "language": language,
                    "phone": ctx.user.phone,
                    "email": ctx.user.email,
                    "title": title,
                    "body": body,
                    "channels": channel_results,
                    "delivered": any(c["status"] == "SENT" for c in channel_results),
                }
            )

        await session.commit()

        delivered_recipients = sum(1 for r in results if r["delivered"])
        return {
            "batch_id": batch_id,
            "template_code": template_code,
            "channels": selected_channels,
            "total_recipients": len(results),
            "recipients_delivered": delivered_recipients,
            "recipients_failed": len(results) - delivered_recipients,
            "channel_sent": totals.get("sent", 0),
            "channel_failed": totals.get("failed", 0),
            "channel_skipped": totals.get("skipped", 0),
            "results": results,
        }
