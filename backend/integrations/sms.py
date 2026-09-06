"""
SMS delivery.

Supports Africa's Talking and Twilio. With no provider configured the send is
simulated (logged, reported back with simulated=True) so development and demo
environments behave predictably without silently pretending a real send.
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

# Providers reject oversized payloads outright; splitting is the caller's job.
MAX_SMS_LENGTH = 1600


def _classify_http(status_code: int, body: str) -> Exception:
    if status_code in (408, 429) or status_code >= 500:
        return TransientDeliveryError(f"Provider returned {status_code}: {body[:200]}")
    return PermanentDeliveryError(f"Provider rejected the message ({status_code}): {body[:200]}")


async def _send_africastalking(phone: str, message: str) -> Dict[str, Any]:
    if not settings.AFRICASTALKING_API_KEY or not settings.AFRICASTALKING_USERNAME:
        raise PermanentDeliveryError("Africa's Talking credentials are not configured")

    payload = {
        "username": settings.AFRICASTALKING_USERNAME,
        "to": phone,
        "message": message,
    }
    if settings.SMS_SENDER_ID:
        payload["from"] = settings.SMS_SENDER_ID

    try:
        async with httpx.AsyncClient(timeout=settings.DELIVERY_TIMEOUT_SECONDS) as client:
            response = await client.post(
                settings.AFRICASTALKING_BASE_URL,
                data=payload,
                headers={
                    "apiKey": settings.AFRICASTALKING_API_KEY,
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
    except httpx.TimeoutException as exc:
        raise TransientDeliveryError(f"Timed out contacting Africa's Talking: {exc}")
    except httpx.HTTPError as exc:
        raise TransientDeliveryError(f"Network error contacting Africa's Talking: {exc}")

    if response.status_code >= 400:
        raise _classify_http(response.status_code, response.text)

    data = response.json()
    recipients = (data.get("SMSMessageData") or {}).get("Recipients") or []
    if not recipients:
        raise PermanentDeliveryError(
            (data.get("SMSMessageData") or {}).get("Message") or "Provider accepted no recipients"
        )

    first = recipients[0]
    status = str(first.get("status", "")).lower()
    if status not in ("success", "sent", "queued"):
        # 4xx-style per-recipient codes are permanent; anything else may recover.
        code = first.get("statusCode")
        error = f"{first.get('status')} (code {code})"
        if code in (405, 406, 407, 500, 501, 502):
            raise TransientDeliveryError(error)
        raise PermanentDeliveryError(error)

    return {"message_id": first.get("messageId"), "cost": first.get("cost")}


async def _send_twilio_sms(phone: str, message: str) -> Dict[str, Any]:
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_SMS_FROM:
        raise PermanentDeliveryError("Twilio SMS credentials are not configured")

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
    try:
        async with httpx.AsyncClient(timeout=settings.DELIVERY_TIMEOUT_SECONDS) as client:
            response = await client.post(
                url,
                data={"To": phone, "From": settings.TWILIO_SMS_FROM, "Body": message},
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


async def _simulate(phone: str, message: str) -> Dict[str, Any]:
    logger.info(f"[SMS SIMULATED] to={phone} chars={len(message)} | {message[:160]}")
    return {"simulated": True, "message_id": None}


async def send_sms_message(phone: Optional[str], message: str) -> DeliveryResult:
    """Deliver one SMS, retrying transient provider failures."""
    normalized = normalize_phone(phone)
    if not normalized:
        return skipped("SMS", phone or "", "No valid phone number on file")
    if not message or not message.strip():
        return skipped("SMS", normalized, "Message body is empty")

    body = message.strip()
    if len(body) > MAX_SMS_LENGTH:
        body = body[: MAX_SMS_LENGTH - 1] + "…"

    provider = (settings.SMS_PROVIDER or "").lower()
    if provider == "africastalking":
        return await send_with_retry("SMS", normalized, provider, lambda: _send_africastalking(normalized, body))
    if provider == "twilio":
        return await send_with_retry("SMS", normalized, provider, lambda: _send_twilio_sms(normalized, body))

    return await send_with_retry("SMS", normalized, "simulated", lambda: _simulate(normalized, body), max_attempts=1)


async def send_sms(phone: str, message: str) -> bool:
    """Backwards-compatible boolean wrapper used by existing callers."""
    result = await send_sms_message(phone, message)
    return result.ok
