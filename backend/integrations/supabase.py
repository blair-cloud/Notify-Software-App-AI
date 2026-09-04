from typing import Optional
from supabase import create_client, Client
from backend.core.config import settings

def get_supabase_client() -> Optional[Client]:
    if settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY:
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return None
