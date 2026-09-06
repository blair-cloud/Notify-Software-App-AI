import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

DEFAULT_SQLITE_URL = f"sqlite+aiosqlite:///{str(BASE_DIR / 'notify_db.sqlite').replace('\\', '/')}"


class Settings(BaseSettings):
    APP_NAME: str = "Notify"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000

    SECRET_KEY: str = "notify_super_secret_jwt_key_change_in_production_32bytes"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    DATABASE_URL: str = DEFAULT_SQLITE_URL
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

    # SMS - "africastalking" | "twilio" | "" (simulated)
    SMS_PROVIDER: str = ""
    SMS_SENDER_ID: str = "NOTIFY"
    AFRICASTALKING_USERNAME: Optional[str] = None
    AFRICASTALKING_API_KEY: Optional[str] = None
    AFRICASTALKING_BASE_URL: str = "https://api.africastalking.com/version1/messaging"

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

    # Email - "smtp" | "" (simulated)
    EMAIL_PROVIDER: str = ""
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
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


settings = Settings()
