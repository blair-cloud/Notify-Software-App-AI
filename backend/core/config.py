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

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE) if ENV_FILE.exists() else None,
        extra="ignore"
    )


settings = Settings()
