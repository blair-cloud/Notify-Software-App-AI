"""
Send one real email through the configured SMTP server.

    python -m backend.scripts.test_email you@example.com

Use it after putting the Brevo SMTP key into backend/.env. It reports what is
configured, then actually sends, so a misconfiguration shows up here rather
than as a rent reminder nobody received.

This checks the *application's* mail path (reminders, notices, receipts).
Confirmation and password-reset emails are sent by Supabase Auth and are
configured separately in the Supabase dashboard - see SUPABASE_SETUP.md.
"""
from __future__ import annotations

import asyncio
import smtplib
import sys

from backend.core.config import settings
from backend.integrations.email import send_email_message


def _mask(secret: str | None) -> str:
    if not secret:
        return "(not set)"
    if secret.startswith("<") and secret.endswith(">"):
        return f"{secret}  <-- still a placeholder"
    return f"{'*' * max(0, len(secret) - 4)}{secret[-4:]}  ({len(secret)} chars)"


def _report() -> None:
    print("SMTP configuration")
    print(f"  host          : {settings.SMTP_HOST or '(not set)'}")
    print(f"  port          : {settings.SMTP_PORT}")
    print(f"  STARTTLS      : {settings.SMTP_USE_TLS}")
    print(f"  username      : {settings.smtp_username or '(not set)'}")
    print(f"  password      : {_mask(settings.SMTP_PASSWORD)}")
    print(f"  from          : {settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>")
    print(f"  will really send: {settings.email_is_configured}")
    print()


def _diagnose(exc: Exception) -> str:
    """Turn the usual SMTP failures into something actionable."""
    text = str(exc)
    if isinstance(exc, smtplib.SMTPAuthenticationError):
        return (
            "Authentication failed. Brevo wants the SMTP *key* from "
            "SMTP & API -> SMTP, not your account password, and the login is "
            "usually something like 9xxxxx001@smtp-brevo.com."
        )
    if isinstance(exc, smtplib.SMTPSenderRefused) or "sender" in text.lower():
        return (
            f"The sender {settings.EMAIL_FROM} was refused. Verify that address "
            "or its domain under Brevo -> Senders, Domains & Dedicated IPs."
        )
    if isinstance(exc, smtplib.SMTPRecipientsRefused):
        return "The recipient address was refused - check it for typos."
    if isinstance(exc, (smtplib.SMTPConnectError, OSError, TimeoutError)):
        return (
            f"Could not reach {settings.SMTP_HOST}:{settings.SMTP_PORT}. Check the "
            "host and port, and that outbound SMTP is not blocked here. Brevo also "
            "accepts port 2525 if 587 is blocked."
        )
    return text


async def main(recipient: str) -> int:
    _report()

    if not settings.email_is_configured:
        print("Nothing was sent: SMTP is not fully configured, so the application")
        print("is in simulated mode. Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD in")
        print("backend/.env, then run this again.")
        return 1

    print(f"Sending a test message to {recipient} ...")
    try:
        result = await send_email_message(
            recipient,
            "Notify SMTP test",
            "This is a test message from Notify.\n\n"
            "If you are reading it, the application can send email.",
            html_content=(
                "<h2>Notify SMTP test</h2>"
                "<p>If you are reading this, the application can send email.</p>"
            ),
            metadata={"purpose": "SMTP_TEST"},
        )
    except Exception as exc:  # noqa: BLE001
        print(f"\nFAILED: {_diagnose(exc)}")
        return 1

    if result.ok and not result.simulated:
        print(f"\nSent. Provider: {result.provider}, attempts: {result.attempts}.")
        print("Check the inbox (and the spam folder).")
        return 0

    if result.simulated:
        print("\nThe message was only simulated - SMTP is not actually configured.")
        return 1

    print(f"\nFAILED after {result.attempts} attempt(s): {result.error}")
    print(f"\n{_diagnose(Exception(result.error or ''))}")
    return 1


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        print("Give a recipient address, for example:")
        print("  python -m backend.scripts.test_email you@example.com")
        raise SystemExit(2)
    raise SystemExit(asyncio.run(main(sys.argv[1])))
