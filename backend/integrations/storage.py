import uuid
from typing import Optional
from backend.core.config import settings
from backend.integrations.supabase import get_supabase_client

class StorageService:
    def __init__(self):
        self.supabase = get_supabase_client()

    async def generate_signed_url(self, bucket: str, path: str, expires_in: int = 3600) -> Optional[str]:
        if not self.supabase:
            return f"https://storage.notify.co.rw/{bucket}/{path}"
        try:
            res = self.supabase.storage.from_(bucket).create_signed_url(path, expires_in)
            return res.get("signedURL")
        except Exception:
            return f"https://storage.notify.co.rw/{bucket}/{path}"
