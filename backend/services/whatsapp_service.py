"""
WhatsApp orchestration: build the message, log it, send it, record what
happened.

Everything that sends WhatsApp in Notify goes through `WhatsAppService.send`
so there is exactly one place that writes the `whatsapp_messages` audit row,
one place that decides template-vs-text, and one place the status webhook
updates. The transport itself lives in backend/integrations/whatsapp.py.

Consent: business-initiated messages are gated on the recipient's own
NotificationPreference row (the *_whatsapp toggles) everywhere a reminder is
sent. Invitations are the one exception - the landlord supplies the number
they were given by the person they are inviting, which is the consent for
that single message.
"""
from __future__ import annotations

import hashlib
import hmac
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.logging import logger
from backend.integrations.delivery import DeliveryResult, normalize_phone
from backend.integrations.whatsapp import send_whatsapp_message, send_whatsapp_template
from backend.models import WhatsAppMessage, WhatsAppMessageStatus, WhatsAppMessageType

# Default template names. Each must exist and be APPROVED in the WhatsApp
# Manager before real sends work; override any of them from .env.
DEFAULT_TEMPLATE_NAMES = {
    WhatsAppMessageType.INVITATION: "notify_tenant_invitation",
    WhatsAppMessageType.RENT_DUE: "notify_rent_due",
    WhatsAppMessageType.RENT_OVERDUE: "notify_rent_overdue",
    WhatsAppMessageType.LEASE_EXPIRY: "notify_lease_expiry",
    WhatsAppMessageType.PAYMENT_CONFIRMATION: "notify_payment_confirmation",
}

_TEMPLATE_SETTING = {
    WhatsAppMessageType.INVITATION: "WHATSAPP_TEMPLATE_INVITATION",
    WhatsAppMessageType.RENT_DUE: "WHATSAPP_TEMPLATE_RENT_DUE",
    WhatsAppMessageType.RENT_OVERDUE: "WHATSAPP_TEMPLATE_RENT_OVERDUE",
    WhatsAppMessageType.LEASE_EXPIRY: "WHATSAPP_TEMPLATE_LEASE_EXPIRY",
    WhatsAppMessageType.PAYMENT_CONFIRMATION: "WHATSAPP_TEMPLATE_PAYMENT_CONFIRMATION",
}

# Meta's status strings -> our enum.
_WEBHOOK_STATUS = {
    "sent": WhatsAppMessageStatus.SENT,
    "delivered": WhatsAppMessageStatus.DELIVERED,
    "read": WhatsAppMessageStatus.READ,
    "failed": WhatsAppMessageStatus.FAILED,
}


def template_name_for(message_type: WhatsAppMessageType) -> str:
    configured = getattr(settings, _TEMPLATE_SETTING.get(message_type, ""), None)
    return configured or DEFAULT_TEMPLATE_NAMES.get(message_type, "")


class WhatsAppService:
    # ------------------------------------------------------------------
    # Core send
    # ------------------------------------------------------------------

    @staticmethod
    async def send(
        session: AsyncSession,
        *,
        phone: Optional[str],
        message_type: WhatsAppMessageType,
        body_params: List[str],
        fallback_text: str,
        recipient_name: Optional[str] = None,
        landlord_id: Optional[uuid.UUID] = None,
        tenant_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        invitation_id: Optional[uuid.UUID] = None,
        lease_id: Optional[uuid.UUID] = None,
        invoice_id: Optional[uuid.UUID] = None,
        button_url_param: Optional[str] = None,
        use_template: bool = True,
        commit: bool = False,
    ) -> Tuple[DeliveryResult, WhatsAppMessage]:
        """
        Send one WhatsApp message and record it.

        The audit row is written first and always ends in a terminal state, so
        a message that fails mid-send is still visible to the landlord rather
        than disappearing. Never raises for a delivery failure - inspect the
        returned DeliveryResult / row status.
        """
        normalized = normalize_phone(phone)
        template = template_name_for(message_type) if use_template else None
        language = settings.WHATSAPP_TEMPLATE_LANGUAGE or "en"

        record = WhatsAppMessage(
            landlord_id=landlord_id,
            tenant_id=tenant_id,
            user_id=user_id,
            recipient_phone=normalized or (phone or "unknown"),
            recipient_name=recipient_name,
            message_type=message_type,
            template_name=template,
            template_language=language if template else None,
            body_preview=fallback_text[:1000] if fallback_text else None,
            invitation_id=invitation_id,
            lease_id=lease_id,
            invoice_id=invoice_id,
            status=WhatsAppMessageStatus.QUEUED,
            provider=(settings.WHATSAPP_PROVIDER or "simulated").lower() or "simulated",
        )
        session.add(record)
        await session.flush()

        if not normalized:
            record.status = WhatsAppMessageStatus.SKIPPED
            record.error_message = "No valid phone number on file"
            if commit:
                await session.commit()
            return (
                DeliveryResult(channel="WHATSAPP", recipient=phone or "", status="SKIPPED",
                               error="No valid phone number on file"),
                record,
            )

        try:
            if template:
                result = await send_whatsapp_template(
                    normalized,
                    template_name=template,
                    body_params=body_params,
                    language=language,
                    button_url_param=button_url_param,
                    fallback_text=fallback_text,
                )
            else:
                result = await send_whatsapp_message(normalized, fallback_text)
        except Exception as exc:  # noqa: BLE001 - a send must never break the caller
            logger.exception("WhatsApp send raised for %s: %s", normalized, exc)
            record.status = WhatsAppMessageStatus.FAILED
            record.error_message = str(exc)
            record.failed_at = datetime.now(timezone.utc)
            if commit:
                await session.commit()
            return (
                DeliveryResult(channel="WHATSAPP", recipient=normalized, status="FAILED", error=str(exc)),
                record,
            )

        record.attempts = result.attempts
        record.provider = result.provider
        record.provider_message_id = result.provider_message_id
        if result.status == "SKIPPED":
            record.status = WhatsAppMessageStatus.SKIPPED
            record.error_message = result.error
        elif result.ok and result.simulated:
            # Nothing actually left the building - say so instead of
            # recording a delivery that never happened.
            record.status = WhatsAppMessageStatus.SIMULATED
            record.sent_at = datetime.now(timezone.utc)
        elif result.ok:
            record.status = WhatsAppMessageStatus.SENT
            record.sent_at = datetime.now(timezone.utc)
        else:
            record.status = WhatsAppMessageStatus.FAILED
            record.error_message = result.error
            record.failed_at = datetime.now(timezone.utc)

        if commit:
            await session.commit()
        return result, record

    # ------------------------------------------------------------------
    # Message builders - one per business trigger. Each returns the
    # (body_params, fallback_text) pair the template expects, so the
    # template's {{1}}..{{n}} order lives in exactly one place.
    # ------------------------------------------------------------------

    @staticmethod
    def build_invitation(
        tenant_name: str, property_name: str, unit_number: str, landlord_name: str, link: str
    ) -> Tuple[List[str], str]:
        params = [tenant_name or "there", property_name, unit_number, landlord_name, link]
        text = (
            f"Hello {tenant_name or 'there'}, {landlord_name} has invited you on Notify to rent "
            f"Unit {unit_number} at {property_name}. Complete your registration here: {link} "
            f"(the link expires in 7 days)."
        )
        return params, text

    @staticmethod
    def build_rent_due(
        tenant_name: str, amount: str, due_date: str, property_unit: str, invoice_number: str
    ) -> Tuple[List[str], str]:
        params = [tenant_name, amount, due_date, property_unit, invoice_number]
        text = (
            f"Hello {tenant_name}, your rent of {amount} for {property_unit} is due on {due_date} "
            f"(invoice {invoice_number}). Please pay on time to avoid a late payment penalty."
        )
        return params, text

    @staticmethod
    def build_rent_overdue(
        tenant_name: str, amount: str, days_overdue: str, property_unit: str, invoice_number: str
    ) -> Tuple[List[str], str]:
        params = [tenant_name, amount, days_overdue, property_unit, invoice_number]
        text = (
            f"Hello {tenant_name}, your rent of {amount} for {property_unit} (invoice {invoice_number}) "
            f"is now {days_overdue} day(s) overdue. Please settle it or contact your landlord."
        )
        return params, text

    @staticmethod
    def build_lease_expiry(
        tenant_name: str, property_unit: str, expiry_date: str, days_remaining: str
    ) -> Tuple[List[str], str]:
        params = [tenant_name, property_unit, expiry_date, days_remaining]
        when = "expires today" if str(days_remaining) == "0" else f"expires in {days_remaining} day(s)"
        text = (
            f"Hello {tenant_name}, your lease for {property_unit} {when} on {expiry_date}. "
            f"Please contact your landlord about renewal if you plan to stay."
        )
        return params, text

    @staticmethod
    def build_payment_confirmation(
        tenant_name: str, amount: str, receipt_number: str, property_unit: str
    ) -> Tuple[List[str], str]:
        params = [tenant_name, amount, receipt_number, property_unit]
        text = (
            f"Hello {tenant_name}, we received your payment of {amount} for {property_unit}. "
            f"Your receipt number is {receipt_number}. Thank you."
        )
        return params, text

    # ------------------------------------------------------------------
    # Inbound status webhook
    # ------------------------------------------------------------------

    @staticmethod
    def verify_signature(raw_body: bytes, signature_header: Optional[str]) -> bool:
        """
        Check Meta's X-Hub-Signature-256 over the raw request body.

        With no app secret configured we cannot verify, so the caller decides
        whether to accept - never silently treat unverifiable as verified.
        """
        secret = settings.WHATSAPP_APP_SECRET
        if not secret or not signature_header:
            return False
        expected = "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature_header)

    @classmethod
    async def handle_status_webhook(cls, session: AsyncSession, payload: Dict[str, Any]) -> Dict[str, int]:
        """
        Apply Meta's delivery receipts to the rows we logged on the way out.

        Statuses arrive out of order and get replayed, so this only ever moves
        a message forward (sent -> delivered -> read) and never overwrites a
        later state with an earlier one.
        """
        rank = {
            WhatsAppMessageStatus.QUEUED: 0,
            WhatsAppMessageStatus.SIMULATED: 0,
            WhatsAppMessageStatus.SKIPPED: 0,
            WhatsAppMessageStatus.SENT: 1,
            WhatsAppMessageStatus.DELIVERED: 2,
            WhatsAppMessageStatus.READ: 3,
            WhatsAppMessageStatus.FAILED: 3,
        }
        updated = 0
        unmatched = 0

        for entry in payload.get("entry") or []:
            for change in entry.get("changes") or []:
                value = change.get("value") or {}
                for status in value.get("statuses") or []:
                    wamid = status.get("id")
                    new_status = _WEBHOOK_STATUS.get(str(status.get("status", "")).lower())
                    if not wamid or not new_status:
                        continue

                    res = await session.execute(
                        select(WhatsAppMessage).where(WhatsAppMessage.provider_message_id == wamid)
                    )
                    record = res.scalar_one_or_none()
                    if not record:
                        unmatched += 1
                        continue

                    if rank.get(new_status, 0) < rank.get(record.status, 0):
                        continue  # a late-arriving earlier status; ignore

                    now = datetime.now(timezone.utc)
                    record.status = new_status
                    if new_status == WhatsAppMessageStatus.SENT and not record.sent_at:
                        record.sent_at = now
                    elif new_status == WhatsAppMessageStatus.DELIVERED:
                        record.delivered_at = now
                    elif new_status == WhatsAppMessageStatus.READ:
                        record.read_at = now
                    elif new_status == WhatsAppMessageStatus.FAILED:
                        record.failed_at = now
                        errors = status.get("errors") or []
                        if errors:
                            record.error_code = str(errors[0].get("code") or "")[:50]
                            record.error_message = (
                                errors[0].get("error_data", {}).get("details")
                                or errors[0].get("title")
                                or errors[0].get("message")
                            )
                    updated += 1

        if updated:
            await session.commit()
        return {"updated": updated, "unmatched": unmatched}
