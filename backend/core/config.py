import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    APP_NAME: str = "Notify"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000

    # Still used to HMAC invitation tokens (not for authentication).
    SECRET_KEY: str = "notify_super_secret_jwt_key_change_in_production_32bytes"

    # Supabase Auth issues and refreshes access tokens; this backend only
    # verifies them. Nothing here mints a session.
    #
    # Verification uses the project's published JWKS by default, so no secret is
    # needed. SUPABASE_JWT_SECRET is only for projects still on legacy symmetric
    # (HS256) signing keys.
    SUPABASE_JWT_SECRET: Optional[str] = None

    # Where the browser app lives. Used to build the links inside the
    # verification and password-reset emails, so they must match the SPA routes.
    FRONTEND_URL: str = "http://localhost:3000"

    # Browsers reject a credentialed request to a wildcard origin, so when an
    # explicit origin list is configured we also allow credentials. Leaving this
    # empty keeps the permissive development default.
    CORS_ORIGINS: str = ""

    # Single-use email links.
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 48
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 60

    # When true, an account must confirm its email address before it can sign
    # in. Off by default so existing accounts (and the invitation flow) keep
    # working; the sign-in response always reports `email_verified` either way.
    REQUIRE_EMAIL_VERIFICATION: bool = False

    # Brute-force throttling for the credential endpoints. In-process only:
    # behind multiple workers each process keeps its own counters.
    AUTH_RATE_LIMIT_ATTEMPTS: int = 8
    AUTH_RATE_LIMIT_WINDOW_SECONDS: int = 300

    # Supabase PostgreSQL. There is no local-file fallback: the application
    # refuses to start without a Postgres URL rather than quietly writing to a
    # database nobody is looking at.
    DATABASE_URL: str = ""
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None

    STORAGE_DOCUMENTS_BUCKET: str = "notify-documents"
    STORAGE_AVATARS_BUCKET: str = "notify-avatars"
    STORAGE_PROPERTY_IMAGES_BUCKET: str = "notify-property-images"

    # ------------------------------------------------------------------
    # Outbound communication channels.
    # Every channel falls back to SIMULATED delivery when its provider is not
    # configured: the message is logged and reported back with
    # `simulated: true` so nothing ever claims a real send that did not happen.
    # ------------------------------------------------------------------
    DELIVERY_MAX_ATTEMPTS: int = 3
    DELIVERY_RETRY_BASE_DELAY: float = 0.5
    DELIVERY_TIMEOUT_SECONDS: float = 15.0
    DEFAULT_COUNTRY_CODE: str = "+250"  # Rwanda

    # SMS - "africastalking" | "twilio" | "brevo" | "" (simulated)
    SMS_PROVIDER: str = ""
    SMS_SENDER_ID: str = "NOTIFY"
    AFRICASTALKING_USERNAME: Optional[str] = None
    AFRICASTALKING_API_KEY: Optional[str] = None
    AFRICASTALKING_BASE_URL: str = "https://api.africastalking.com/version1/messaging"
    # Brevo's Transactional SMS API - reuses the same account/API key as
    # Brevo email, no phone number purchase required (SMS_SENDER_ID above is
    # used as the alphanumeric sender name).
    BREVO_API_KEY: Optional[str] = None

    # Twilio powers both SMS and WhatsApp when selected
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_SMS_FROM: Optional[str] = None

    # WhatsApp - "twilio" | "meta" | "" (simulated)
    WHATSAPP_PROVIDER: str = ""
    TWILIO_WHATSAPP_FROM: Optional[str] = None
    META_WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    META_WHATSAPP_TOKEN: Optional[str] = None
    META_WHATSAPP_API_VERSION: str = "v21.0"

    # Email - "smtp" | "" (auto-detected from the SMTP settings below)
    EMAIL_PROVIDER: str = ""
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    # `SMTP_USER` is the spelling used in the shipped .env; accept both so a
    # filled-in username is not silently ignored.
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_USE_TLS: bool = True
    EMAIL_FROM: str = "no-reply@notify.rw"
    EMAIL_FROM_NAME: str = "Notify Kigali"

    # Machine translation for custom reminder text - "libretranslate" | "" (off)
    TRANSLATION_PROVIDER: str = ""
    LIBRETRANSLATE_URL: str = "https://libretranslate.com/translate"
    LIBRETRANSLATE_API_KEY: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE) if ENV_FILE.exists() else None,
        extra="ignore"
    )

    # ------------------------------------------------------------------
    # Derived helpers
    # ------------------------------------------------------------------

    @property
    def smtp_username(self) -> Optional[str]:
        """Whichever spelling the environment used."""
        return self.SMTP_USERNAME or self.SMTP_USER

    @property
    def email_is_configured(self) -> bool:
        """
        True when a real mail server can actually be reached.

        Email delivery used to require EMAIL_PROVIDER=smtp *in addition to* the
        SMTP settings, so a fully filled-in SMTP block still sent nothing and
        silently fell back to simulation. Now a usable SMTP configuration is
        enough, and an explicit EMAIL_PROVIDER still wins.
        """
        if (self.EMAIL_PROVIDER or "").lower() == "smtp":
            return True
        if (self.EMAIL_PROVIDER or "").lower() in ("simulated", "none", "off"):
            return False
        secret = (self.SMTP_PASSWORD or "").strip()
        # Anything still wrapped in angle brackets is a placeholder from
        # .env.example, as are the usual stand-ins. Treating one as configured
        # would make the app claim it sent mail that never left the building.
        placeholders = {"", "your_smtp_password", "changeme", "password", "your_brevo_smtp_key"}
        looks_unset = (
            secret.lower() in placeholders
            or (secret.startswith("<") and secret.endswith(">"))
        )
        return bool(self.SMTP_HOST and self.smtp_username and not looks_unset)

    @property
    def database_backend(self) -> str:
        url = self.DATABASE_URL or ""
        if "supabase" in url:
            return "PostgreSQL (Supabase)"
        if url.startswith("postgresql"):
            return "PostgreSQL"
        if not url:
            return "NOT CONFIGURED"
        return "unsupported"

    @property
    def database_location(self) -> str:
        """A human-readable description with no password in it."""
        url = self.DATABASE_URL or ""
        if "@" in url:
            return url.rsplit("@", 1)[-1]
        return url or "(DATABASE_URL is empty)"


settings = Settings()
