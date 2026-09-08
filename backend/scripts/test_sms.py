"""
Send one real SMS through the configured provider.

    python -m backend.scripts.test_sms +250788123456

Use it after putting real Twilio credentials into backend/.env. It reports
what is configured, then actually sends, so a misconfiguration shows up here
rather than as an invitation or rent reminder nobody received.
"""
from __future__ import annotations

import asyncio
import sys

from backend.core.config import settings
from backend.integrations.sms import send_sms_message


def _mask(secret: str | None) -> str:
    if not secret:
        return "(not set)"
    if secret.strip().lower() in ("your_twilio_sid", "your_twilio_token", "your_twilio_from"):
        return f"{secret}  <-- still a placeholder"
    return f"{'*' * max(0, len(secret) - 4)}{secret[-4:]}  ({len(secret)} chars)"


def _report() -> None:
    provider = (settings.SMS_PROVIDER or "").lower()
    print("SMS configuration")
    print(f"  provider      : {settings.SMS_PROVIDER or '(not set - stays simulated)'}")
    if provider == "brevo":
        print(f"  api key       : {_mask(settings.BREVO_API_KEY)}")
        print(f"  sender name   : {settings.SMS_SENDER_ID or 'NOTIFY'}")
    elif provider == "twilio":
        print(f"  account sid   : {_mask(settings.TWILIO_ACCOUNT_SID)}")
        print(f"  auth token    : {_mask(settings.TWILIO_AUTH_TOKEN)}")
        print(f"  from number   : {settings.TWILIO_SMS_FROM or '(not set)'}")
    else:
        print(f"  api key       : {_mask(settings.BREVO_API_KEY)}  (Brevo, if SMS_PROVIDER=brevo)")
        print(f"  account sid   : {_mask(settings.TWILIO_ACCOUNT_SID)}  (Twilio, if SMS_PROVIDER=twilio)")
    print()


def _diagnose(error: str) -> str:
    text = error.lower()
    provider = (settings.SMS_PROVIDER or "").lower()

    if provider == "brevo":
        if "unrecognised ip" in text or "unrecognized ip" in text or "authorised_ips" in text:
            return (
                "Brevo blocked this because the request came from an IP address not "
                "on the account's allowlist. Authorise it at "
                "https://app.brevo.com/security/authorised_ips (Brevo emails an "
                "'authorise this IP' link too, the first time this happens) - do this "
                "once per machine/server that will actually send SMS."
            )
        if "unauthorized" in text or "401" in text:
            return (
                "Authentication failed. Copy BREVO_API_KEY again from Brevo -> "
                "SMTP & API -> API Keys (it's the same key email uses, so re-verify "
                "it hasn't been regenerated/revoked)."
            )
        if "not enough credit" in text or "insufficient" in text or "402" in text:
            return (
                "The Brevo account has no SMS credit. Email credit and SMS credit are "
                "separate - buy SMS credit under Brevo -> Transactional -> SMS -> "
                "Settings, or the account's plan, before this will send."
            )
        if "sender" in text:
            return (
                f"The sender name ({settings.SMS_SENDER_ID or 'NOTIFY'}) was rejected - "
                "some countries require SMS sender names to be pre-approved. Check "
                "Brevo -> Transactional -> SMS -> Senders."
            )
        if "recipient" in text or "phone" in text:
            return "The recipient number was rejected - check it for typos."
        return error

    if provider == "twilio":
        if "authenticate" in text or "20003" in text:
            return (
                "Authentication failed. Copy ACCOUNT_SID and AUTH_TOKEN again from the "
                "Twilio Console dashboard (twilio.com/console) - the auth token can be "
                "regenerated there if you're not sure you have the right one."
            )
        if "not a valid phone number" in text or "21211" in text:
            return "The recipient number was rejected - check it for typos."
        if "unverified" in text or "21608" in text:
            return (
                "Trial accounts can only send to phone numbers you've verified in the "
                "Twilio Console (Phone Numbers -> Verified Caller IDs), or upgrade the "
                "account to send to any number."
            )
        if "from" in text and ("not a valid" in text or "21212" in text or "21606" in text):
            return (
                f"TWILIO_SMS_FROM ({settings.TWILIO_SMS_FROM}) is not a number you own in "
                "Twilio. Check it under Phone Numbers -> Manage -> Active Numbers, and use "
                "it exactly as shown there (E.164 format, e.g. +15551234567)."
            )
        if "insufficient" in text or "21606" in text:
            return "The Twilio account balance is too low to send. Add funds in the Console."
        return error

    return error


async def main(recipient: str) -> int:
    _report()

    provider = (settings.SMS_PROVIDER or "").lower()
    if provider not in ("brevo", "twilio", "africastalking"):
        print("Nothing was sent: SMS_PROVIDER is not set in backend/.env, so the")
        print("application is in simulated mode regardless of any credentials present.")
        print("Set SMS_PROVIDER to 'brevo', 'twilio', or 'africastalking', then run this again.")
        return 1

    print(f"Sending a test SMS to {recipient} via {provider} ...")
    result = await send_sms_message(recipient, f"Notify SMS test: if you got this, {provider} SMS is working.")

    if result.ok and not result.simulated:
        print(f"\nSent. Provider: {result.provider}, attempts: {result.attempts}, id: {result.provider_message_id}.")
        return 0

    if result.simulated:
        print(f"\nThe message was only simulated - {provider} credentials are not fully configured.")
        return 1

    print(f"\nFAILED after {result.attempts} attempt(s): {result.error}")
    print(f"\n{_diagnose(result.error or '')}")
    return 1


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        print("Give a recipient number, for example:")
        print("  python -m backend.scripts.test_sms +250788123456")
        raise SystemExit(2)
    raise SystemExit(asyncio.run(main(sys.argv[1])))
