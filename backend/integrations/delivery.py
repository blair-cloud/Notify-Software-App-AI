"""
Shared plumbing for every outbound channel (SMS, WhatsApp, Email).

Each channel integration returns a `DeliveryResult` so callers always get the
same shape: did it go out, through which provider, what failed, and how many
attempts it took. Retries live here so the behaviour is identical everywhere.
"""
import asyncio
import re
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Dict, Optional

from backend.core.config import settings
from backend.core.logging import logger


class TransientDeliveryError(Exception):
    """Worth retrying: timeouts, 5xx, rate limits, connection resets."""


class PermanentDeliveryError(Exception):
    """Not worth retrying: bad recipient, rejected content, bad credentials."""


@dataclass
class DeliveryResult:
    channel: str
    recipient: str
    status: str = "SENT"  # SENT | FAILED | SKIPPED
    provider: str = "simulated"
    simulated: bool = False
    attempts: int = 0
    error: Optional[str] = None
    provider_message_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return self.status == "SENT"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "channel": self.channel,
            "recipient": self.recipient,
            "status": self.status,
            "provider": self.provider,
            "simulated": self.simulated,
            "attempts": self.attempts,
            "error": self.error,
            "provider_message_id": self.provider_message_id,
        }


def skipped(channel: str, recipient: str, reason: str) -> DeliveryResult:
    return DeliveryResult(channel=channel, recipient=recipient or "", status="SKIPPED", error=reason)


def normalize_phone(phone: Optional[str]) -> Optional[str]:
    """
    Normalise a Rwandan-style number to E.164. Returns None when the input
    cannot be a phone number, so callers can skip instead of failing a send.
    """
    if not phone:
        return None
    cleaned = re.sub(r"[^\d+]", "", phone.strip())
    if not cleaned:
        return None

    if cleaned.startswith("+"):
        digits = cleaned[1:]
        return f"+{digits}" if digits.isdigit() and 8 <= len(digits) <= 15 else None

    if cleaned.startswith("00"):
        digits = cleaned[2:]
        return f"+{digits}" if digits.isdigit() and 8 <= len(digits) <= 15 else None

    # Local format: drop a leading trunk 0 before applying the country code.
    digits = cleaned.lstrip("0")
    if not digits.isdigit() or not (8 <= len(digits) <= 12):
        return None
    return f"{settings.DEFAULT_COUNTRY_CODE}{digits}"


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def is_valid_email(email: Optional[str]) -> bool:
    return bool(email and EMAIL_RE.match(email.strip()))


async def send_with_retry(
    channel: str,
    recipient: str,
    provider: str,
    attempt_fn: Callable[[], Awaitable[Dict[str, Any]]],
    max_attempts: Optional[int] = None,
) -> DeliveryResult:
    """
    Run `attempt_fn` until it succeeds or the retry budget runs out.

    `attempt_fn` should raise TransientDeliveryError to be retried and
    PermanentDeliveryError to fail immediately; anything it returns is folded
    into the result metadata.
    """
    limit = max_attempts or settings.DELIVERY_MAX_ATTEMPTS
    result = DeliveryResult(channel=channel, recipient=recipient, provider=provider)

    for attempt in range(1, limit + 1):
        result.attempts = attempt
        try:
            payload = await attempt_fn() or {}
            result.status = "SENT"
            result.error = None
            result.provider_message_id = payload.get("message_id")
            result.simulated = bool(payload.get("simulated"))
            result.metadata = payload
            return result
        except PermanentDeliveryError as exc:
            result.status = "FAILED"
            result.error = str(exc)
            logger.warning(f"[{channel}] permanent failure for {recipient}: {exc}")
            return result
        except Exception as exc:  # transient, or an unexpected provider error
            result.status = "FAILED"
            result.error = str(exc) or exc.__class__.__name__
            if attempt >= limit:
                logger.warning(f"[{channel}] giving up on {recipient} after {attempt} attempts: {exc}")
                return result
            delay = settings.DELIVERY_RETRY_BASE_DELAY * (2 ** (attempt - 1))
            logger.info(f"[{channel}] attempt {attempt}/{limit} failed for {recipient} ({exc}); retrying in {delay}s")
            await asyncio.sleep(delay)

    return result
