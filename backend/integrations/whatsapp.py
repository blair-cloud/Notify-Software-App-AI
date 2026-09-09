"""
WhatsApp delivery via Meta's WhatsApp Business Cloud API (or Twilio's
WhatsApp channel).

Same contract as the SMS integration: one DeliveryResult per send, retries for
transient provider failures, simulated delivery when nothing is configured -
so a development environment never silently pretends a real send happened.

Two shapes of message exist, and the difference matters to Meta:

  * template  - the only thing allowed to *start* a conversation. The template
                must already be approved in the WhatsApp Manager, and its
                body placeholders ({{1}}, {{2}}, ...) are filled positionally.
  * text      - free-form, and only deliverable inside the 24-hour customer
                service window opened by the recipient's own last message.
                Meta rejects it otherwise, which is why every business-
                initiated Notify message goes out as a template when one is
                configured.
"""
from typing import Any, Dict, List, Optional

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

# Meta error codes worth another attempt; everything else is a permanent
# rejection (bad token, unapproved template, un-opted-in recipient...).
TRANSIENT_META_CODES = {130429, 131048, 131056, 133016, 368}


def _classify_http(status_code: int, body: str) -> Exception:
    if status_code in (408, 429) or status_code >= 500:
        return TransientDeliveryError(f"Provider returned {status_code}: {body[:300]}")
    return PermanentDeliveryError(f"Provider rejected the message ({status_code}): {body[:300]}")


def _classify_meta(status_code: int, payload: Dict[str, Any], raw: str) -> Exception:
    """Meta answers 4xx with a structured error - use its code, not just HTTP."""
    error = (payload or {}).get("error") or {}
    code = error.get("code")
    detail = error.get("error_user_msg") or error.get("message") or raw[:300]
    label = f"[{code}] {detail}" if code else detail
    if code in TRANSIENT_META_CODES or status_code in (408, 429) or status_code >= 500:
        return TransientDeliveryError(label)
    return PermanentDeliveryError(label)


async def _post_to_meta(payload: Dict[str, Any]) -> Dict[str, Any]:
    """One authenticated POST to the Cloud API's /messages endpoint."""
    token = settings.whatsapp_access_token
    phone_number_id = settings.whatsapp_phone_number_id
    if not token or not phone_number_id:
        raise PermanentDeliveryError(
            "Meta WhatsApp is not configured - set WHATSAPP_ACCESS_TOKEN and "
            "WHATSAPP_PHONE_NUMBER_ID in backend/.env"
        )

    url = f"https://graph.facebook.com/{settings.whatsapp_api_version}/{phone_number_id}/messages"
    try:
        async with httpx.AsyncClient(timeout=settings.DELIVERY_TIMEOUT_SECONDS) as client:
            response = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
    except httpx.TimeoutException as exc:
        raise TransientDeliveryError(f"Timed out contacting Meta: {exc}")
    except httpx.HTTPError as exc:
        raise TransientDeliveryError(f"Network error contacting Meta: {exc}")

    if response.status_code >= 400:
        try:
            body = response.json()
        except ValueError:
            body = {}
        raise _classify_meta(response.status_code, body, response.text)

    data = response.json()
    messages = data.get("messages") or []
    return {
        "message_id": messages[0].get("id") if messages else None,
        "provider_status": messages[0].get("message_status") if messages else None,
    }


async def _send_meta_text(phone: str, message: str) -> Dict[str, Any]:
    return await _post_to_meta({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone.lstrip("+"),
        "type": "text",
        "text": {"preview_url": True, "body": message},
    })


async def _send_meta_template(
    phone: str,
    template_name: str,
    language: str,
    body_params: List[str],
    button_url_param: Optional[str] = None,
) -> Dict[str, Any]:
    components: List[Dict[str, Any]] = []
    if body_params:
        components.append({
            "type": "body",
            "parameters": [{"type": "text", "text": str(p)} for p in body_params],
        })
    if button_url_param:
        # A dynamic URL button takes the *variable part* of the link only -
        # the template itself already holds the prefix.
        components.append({
            "type": "button",
            "sub_type": "url",
            "index": "0",
            "parameters": [{"type": "text", "text": button_url_param}],
        })

    payload: Dict[str, Any] = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone.lstrip("+"),
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language},
        },
    }
    if components:
        payload["template"]["components"] = components
    return await _post_to_meta(payload)


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


async def _simulate(phone: str, message: str, template: Optional[str] = None) -> Dict[str, Any]:
    label = f"template={template} " if template else ""
    logger.info(f"[WHATSAPP SIMULATED] to={phone} {label}chars={len(message)} | {message[:160]}")
    return {"simulated": True, "message_id": None}


def _prepare(phone: Optional[str], message: str, channel_label: str = "WHATSAPP"):
    """Shared recipient/body validation. Returns (normalized, body) or a skip."""
    normalized = normalize_phone(phone)
    if not normalized:
        return None, None, skipped(channel_label, phone or "", "No valid phone number on file")
    if not message or not message.strip():
        return None, None, skipped(channel_label, normalized, "Message body is empty")
    body = message.strip()
    if len(body) > MAX_WHATSAPP_LENGTH:
        body = body[: MAX_WHATSAPP_LENGTH - 1] + "…"
    return normalized, body, None


async def send_whatsapp_message(phone: Optional[str], message: str) -> DeliveryResult:
    """Free-form text. Only reaches a tenant inside an open 24h window."""
    normalized, body, skip = _prepare(phone, message)
    if skip:
        return skip

    provider = (settings.WHATSAPP_PROVIDER or "").lower()
    if provider == "twilio":
        return await send_with_retry("WHATSAPP", normalized, provider, lambda: _send_twilio(normalized, body))
    if provider == "meta":
        return await send_with_retry("WHATSAPP", normalized, provider, lambda: _send_meta_text(normalized, body))

    return await send_with_retry(
        "WHATSAPP", normalized, "simulated", lambda: _simulate(normalized, body), max_attempts=1
    )


async def send_whatsapp_template(
    phone: Optional[str],
    template_name: str,
    body_params: List[str],
    language: Optional[str] = None,
    button_url_param: Optional[str] = None,
    fallback_text: Optional[str] = None,
) -> DeliveryResult:
    """
    Send an approved template - the correct shape for anything Notify starts
    (invitations, reminders). `fallback_text` is what gets simulated/logged
    when no provider is configured, and what Twilio sends (it has no template
    concept of its own here), so the message reads the same either way.
    """
    text = fallback_text or f"{template_name}: {', '.join(str(p) for p in body_params)}"
    normalized, body, skip = _prepare(phone, text)
    if skip:
        return skip

    lang = language or settings.WHATSAPP_TEMPLATE_LANGUAGE or "en"
    provider = (settings.WHATSAPP_PROVIDER or "").lower()

    if provider == "meta":
        result = await send_with_retry(
            "WHATSAPP",
            normalized,
            provider,
            lambda: _send_meta_template(normalized, template_name, lang, body_params, button_url_param),
        )
        result.metadata = {**(result.metadata or {}), "template_name": template_name, "template_language": lang}
        return result

    if provider == "twilio":
        return await send_with_retry("WHATSAPP", normalized, provider, lambda: _send_twilio(normalized, body))

    return await send_with_retry(
        "WHATSAPP",
        normalized,
        "simulated",
        lambda: _simulate(normalized, body, template=template_name),
        max_attempts=1,
    )
