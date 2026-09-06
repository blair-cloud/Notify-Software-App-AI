"""
WhatsApp delivery via Twilio's WhatsApp channel or the Meta Cloud API.

Same contract as the SMS integration: one DeliveryResult per send, retries for
transient provider failures, simulated delivery when nothing is configured.
"""
from typing import Any, Dict, Optional

import httpx

from backend.core.config import settings
from backend.core.logging import logger
from backend.integrations.delivery import (
    DeliveryResult,
    PermanentDeliveryError,
    TransientDeliveryError,
    normalize_phone,
    send_with_retry,
    skipped,
)

MAX_WHATSAPP_LENGTH = 4000


def _classify_http(status_code: int, body: str) -> Exception:
    if status_code in (408, 429) or status_code >= 500:
        return TransientDeliveryError(f"Provider returned {status_code}: {body[:200]}")
    return PermanentDeliveryError(f"Provider rejected the message ({status_code}): {body[:200]}")


async def _send_twilio(phone: str, message: str) -> Dict[str, Any]:
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_WHATSAPP_FROM:
        raise PermanentDeliveryError("Twilio WhatsApp credentials are not configured")

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
    sender = settings.TWILIO_WHATSAPP_FROM
    if not sender.startswith("whatsapp:"):
        sender = f"whatsapp:{sender}"

    try:
        async with httpx.AsyncClient(timeout=settings.DELIVERY_TIMEOUT_SECONDS) as client:
            response = await client.post(
                url,
                data={"To": f"whatsapp:{phone}", "From": sender, "Body": message},
                auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            )
    except httpx.TimeoutException as exc:
        raise TransientDeliveryError(f"Timed out contacting Twilio: {exc}")
    except httpx.HTTPError as exc:
        raise TransientDeliveryError(f"Network error contacting Twilio: {exc}")

    if response.status_code >= 400:
        raise _classify_http(response.status_code, response.text)

    data = response.json()
    return {"message_id": data.get("sid"), "provider_status": data.get("status")}


async def _send_meta(phone: str, message: str) -> Dict[str, Any]:
    if not settings.META_WHATSAPP_PHONE_NUMBER_ID or not settings.META_WHATSAPP_TOKEN:
        raise PermanentDeliveryError("Meta WhatsApp credentials are not configured")

    url = (
        f"https://graph.facebook.com/{settings.META_WHATSAPP_API_VERSION}/"
        f"{settings.META_WHATSAPP_PHONE_NUMBER_ID}/messages"
    )
    try:
        async with httpx.AsyncClient(timeout=settings.DELIVERY_TIMEOUT_SECONDS) as client:
            response = await client.post(
                url,
                json={
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": phone.lstrip("+"),
                    "type": "text",
                    "text": {"preview_url": False, "body": message},
                },
                headers={"Authorization": f"Bearer {settings.META_WHATSAPP_TOKEN}"},
            )
    except httpx.TimeoutException as exc:
        raise TransientDeliveryError(f"Timed out contacting Meta: {exc}")
    except httpx.HTTPError as exc:
        raise TransientDeliveryError(f"Network error contacting Meta: {exc}")

    if response.status_code >= 400:
        raise _classify_http(response.status_code, response.text)

    data = response.json()
    messages = data.get("messages") or []
    return {"message_id": messages[0].get("id") if messages else None}


async def _simulate(phone: str, message: str) -> Dict[str, Any]:
    logger.info(f"[WHATSAPP SIMULATED] to={phone} chars={len(message)} | {message[:160]}")
    return {"simulated": True, "message_id": None}


async def send_whatsapp_message(phone: Optional[str], message: str) -> DeliveryResult:
    normalized = normalize_phone(phone)
    if not normalized:
        return skipped("WHATSAPP", phone or "", "No valid phone number on file")
    if not message or not message.strip():
        return skipped("WHATSAPP", normalized, "Message body is empty")

    body = message.strip()
    if len(body) > MAX_WHATSAPP_LENGTH:
        body = body[: MAX_WHATSAPP_LENGTH - 1] + "…"

    provider = (settings.WHATSAPP_PROVIDER or "").lower()
    if provider == "twilio":
        return await send_with_retry("WHATSAPP", normalized, provider, lambda: _send_twilio(normalized, body))
    if provider == "meta":
        return await send_with_retry("WHATSAPP", normalized, provider, lambda: _send_meta(normalized, body))

    return await send_with_retry(
        "WHATSAPP", normalized, "simulated", lambda: _simulate(normalized, body), max_attempts=1
    )
