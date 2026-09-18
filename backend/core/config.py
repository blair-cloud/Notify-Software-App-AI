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

    @property
    def frontend_origin(self) -> str:
        raw = (self.FRONTEND_URL or "").strip().rstrip("/")
        is_prod = (
            self.ENVIRONMENT.lower() in ("production", "prod")
            or bool(os.environ.get("RENDER"))
            or bool(os.environ.get("VERCEL"))
            or bool(os.environ.get("FLY_ALLOC_ID"))
        )
        if is_prod and ("localhost" in raw or not raw):
            return "https://notifyappo.web.app"
        return raw or "https://notifyappo.web.app"


    # Browsers reject a credentialed request to a wildcard origin, so when an
    # explicit origin list is configured we also allow credentials. Leaving this
    # empty keeps the permissive development default.
    # Production Firebase hosts are always allowed in addition to CORS_ORIGINS.
    CORS_ORIGINS: str = ""

    # Known browser origins for the hosted SPA (Firebase). Always merged into
    # the CORS allow-list so a redeploy to a new hosting URL does not silently
    # break the API from the browser.
    KNOWN_FRONTEND_ORIGINS: str = (
        "https://notifyappo.web.app,"
        "https://notifyappo.firebaseapp.com,"
        "https://notify-c2d43.web.app,"
        "https://notify-c2d43.firebaseapp.com,"
        "http://localhost:3000,"
        "http://localhost:5173,"
        "http://127.0.0.1:3000,"
        "http://127.0.0.1:5173,"
        "http://localhost:4173,"
        "http://127.0.0.1:4173"
    )

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

    # System Administrator Credentials
    ADMIN_EMAIL: str = "blaircloudy@gmail.com"
    ADMIN_PASSWORD: str = "college@UN2025"

    STORAGE_DOCUMENTS_BUCKET: str = "notify-documents"
    STORAGE_AVATARS_BUCKET: str = "notify-avatars"
    STORAGE_PROPERTY_IMAGES_BUCKET: str = "notify-property-images"

    # Google Gemini Document Understanding API for AI Statement Interpretation
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"

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

    # WhatsApp - "meta" (official Cloud API) | "twilio" | "" (simulated)
    WHATSAPP_PROVIDER: str = ""
    TWILIO_WHATSAPP_FROM: Optional[str] = None

    # Meta WhatsApp Business Cloud API. These are the names Meta's own docs
    # use; the META_* spellings below are kept as fallbacks so an older .env
    # keeps working.
    WHATSAPP_ACCESS_TOKEN: Optional[str] = None
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    WHATSAPP_BUSINESS_ACCOUNT_ID: Optional[str] = None
    WHATSAPP_API_VERSION: Optional[str] = None
    # Shared secret echoed back to Meta when it verifies the webhook URL, and
    # the app secret used to check each callback's X-Hub-Signature-256.
    WHATSAPP_VERIFY_TOKEN: Optional[str] = None
    WHATSAPP_APP_SECRET: Optional[str] = None
    # Approved template names. Business-initiated messages must use a
    # template Meta has approved; these map each trigger to one.
    WHATSAPP_TEMPLATE_INVITATION: Optional[str] = None
    WHATSAPP_TEMPLATE_RENT_DUE: Optional[str] = None
    WHATSAPP_TEMPLATE_RENT_OVERDUE: Optional[str] = None
    WHATSAPP_TEMPLATE_LEASE_EXPIRY: Optional[str] = None
    WHATSAPP_TEMPLATE_PAYMENT_CONFIRMATION: Optional[str] = None
    WHATSAPP_TEMPLATE_LANGUAGE: str = "en"

    # Legacy spellings, still read so an existing .env is not silently ignored.
    META_WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    META_WHATSAPP_TOKEN: Optional[str] = None
    META_WHATSAPP_API_VERSION: str = "v21.0"

    @property
    def whatsapp_access_token(self) -> Optional[str]:
        return self.WHATSAPP_ACCESS_TOKEN or self.META_WHATSAPP_TOKEN

    @property
    def whatsapp_phone_number_id(self) -> Optional[str]:
        return self.WHATSAPP_PHONE_NUMBER_ID or self.META_WHATSAPP_PHONE_NUMBER_ID

    @property
    def whatsapp_api_version(self) -> str:
        return self.WHATSAPP_API_VERSION or self.META_WHATSAPP_API_VERSION or "v21.0"

    @property
    def whatsapp_is_configured(self) -> bool:
        """
        True only when real messages can actually leave. Everything upstream
        checks this instead of guessing, so an unconfigured environment stays
        in simulated mode rather than half-sending.
        """
        return (
            (self.WHATSAPP_PROVIDER or "").lower() == "meta"
            and bool(self.whatsapp_access_token)
            and bool(self.whatsapp_phone_number_id)
        )

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

    # Google Gemini AI Document Understanding for Bank Statements
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"

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
