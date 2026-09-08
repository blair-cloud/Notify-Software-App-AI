"""
The small amount of cryptography this backend still owns.

Authentication no longer lives here. Supabase Auth hashes passwords, issues and
refreshes sessions, and signs access tokens; this process only *verifies* those
tokens, which is done in backend/core/supabase_auth.py.

What remains is the HMAC used to store invitation tokens: an invitation link is
handed out once, and only its hash is kept, so a leaked table cannot be used to
claim someone else's unit.
"""
import hashlib
import hmac
import secrets

from backend.core.config import settings


def hash_token(raw_token: str) -> str:
    """Keyed hash of a single-use token (invitations)."""
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        raw_token.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def tokens_match(raw_token: str, stored_hash: str) -> bool:
    """Constant-time comparison of a presented token against its stored hash."""
    return hmac.compare_digest(hash_token(raw_token), stored_hash)


def generate_url_token(num_bytes: int = 32) -> str:
    """A high-entropy token safe to place in a link."""
    return secrets.token_urlsafe(num_bytes)
