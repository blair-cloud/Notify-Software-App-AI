"""
Verification of Supabase Auth access tokens.

Supabase Auth (GoTrue) issues the access token; this backend only *verifies*
it. There is no password handling, no session table and no token minting here
any more - those all belong to Supabase.

Two verification paths, in order of preference:

1. JWKS (asymmetric, ES256/RS256). The project publishes its public keys at
   `/auth/v1/.well-known/jwks.json`, so tokens are verified locally with no
   shared secret and nothing sensitive in the environment. This is what the
   configured project uses.
2. A shared HS256 secret (`SUPABASE_JWT_SECRET`), for projects still on legacy
   symmetric signing keys.

If neither is usable the token is checked by asking GoTrue directly. That is a
network round trip per request, so it is a fallback rather than the norm, and
successful lookups are cached briefly.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Dict, Optional

import httpx
import jwt
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientConnectionError, PyJWKClientError

from backend.core.config import settings

logger = logging.getLogger("supabase_auth")


class SupabaseTokenError(Exception):
    """The token is missing, malformed, expired or not ours."""


class SupabaseTokenExpired(SupabaseTokenError):
    """Valid signature, but past its expiry - the client should refresh."""


_jwk_client: Optional[PyJWKClient] = None
# token -> (payload, expiry timestamp) for the GoTrue fallback only.
_remote_cache: Dict[str, tuple[Dict[str, Any], float]] = {}
_REMOTE_CACHE_SECONDS = 30


def _jwks_url() -> str:
    return f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"


def get_jwk_client() -> Optional[PyJWKClient]:
    """Cached JWKS client. Keys are fetched once and refreshed by PyJWT."""
    global _jwk_client
    if _jwk_client is None and settings.SUPABASE_URL:
        try:
            _jwk_client = PyJWKClient(_jwks_url(), cache_keys=True, lifespan=3600)
        except Exception as exc:  # noqa: BLE001 - fall through to other paths
            logger.warning("Could not initialise the Supabase JWKS client: %s", exc)
            return None
    return _jwk_client


# Server clocks are never exactly in step - this machine measured 76 seconds
# behind Supabase while this was being written. Leeway covers that for the
# checks that matter.
CLOCK_SKEW_LEEWAY_SECONDS = 120


def _decode_options() -> Dict[str, Any]:
    return {
        # Supabase sets aud="authenticated" on user tokens.
        "verify_aud": True,
        "require": ["exp", "sub"],
        # `iat` is informational: it says when the token was minted, not when it
        # becomes usable. Enforcing it means a client whose clock is a minute
        # behind the auth server sees valid sessions rejected as "not yet
        # valid", which reads as a random sign-out. `exp` (and `nbf` if present)
        # are the actual security boundary and are still checked, with leeway.
        "verify_iat": False,
    }


class _JwksUnavailable(SupabaseTokenError):
    """The key set could not be fetched - try another verification path."""


def _verify_with_jwks(token: str) -> Dict[str, Any]:
    client = get_jwk_client()
    if client is None:
        raise _JwksUnavailable("JWKS is not available")

    try:
        signing_key = client.get_signing_key_from_jwt(token)
    except PyJWKClientConnectionError as exc:
        # Supabase unreachable - not the token's fault.
        raise _JwksUnavailable(str(exc)) from exc
    except PyJWKClientError as exc:
        # No key matches this token's `kid`. A forged or foreign token, so
        # reject it here rather than letting the error escape as a 500. This is
        # what a self-signed HS256 token (no kid at all) looks like.
        raise SupabaseTokenError(f"Token was not signed by this Supabase project: {exc}") from exc
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256", "RS256"],
        audience="authenticated",
        leeway=CLOCK_SKEW_LEEWAY_SECONDS,
        options=_decode_options(),
    )


def _verify_with_secret(token: str) -> Dict[str, Any]:
    if not settings.SUPABASE_JWT_SECRET:
        raise SupabaseTokenError("No JWT secret configured")
    return jwt.decode(
        token,
        settings.SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        audience="authenticated",
        leeway=CLOCK_SKEW_LEEWAY_SECONDS,
        options=_decode_options(),
    )


async def _verify_with_gotrue(token: str) -> Dict[str, Any]:
    """Ask Supabase whether this token is good. Last resort."""
    cached = _remote_cache.get(token)
    now = time.monotonic()
    if cached and cached[1] > now:
        return cached[0]

    url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
    headers = {"Authorization": f"Bearer {token}", "apikey": settings.SUPABASE_ANON_KEY or ""}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=headers)
    except Exception as exc:  # noqa: BLE001
        raise SupabaseTokenError(f"Could not reach Supabase to verify the session: {exc}")

    if resp.status_code == 401:
        raise SupabaseTokenError("Supabase rejected this session")
    if resp.status_code != 200:
        raise SupabaseTokenError(f"Supabase returned {resp.status_code} while verifying the session")

    user = resp.json()
    payload = {
        "sub": user.get("id"),
        "email": user.get("email"),
        "phone": user.get("phone"),
        "app_metadata": user.get("app_metadata") or {},
        "user_metadata": user.get("user_metadata") or {},
    }
    _remote_cache[token] = (payload, now + _REMOTE_CACHE_SECONDS)
    return payload


async def verify_supabase_token(token: str) -> Dict[str, Any]:
    """
    Return the verified claims of a Supabase access token.

    Raises SupabaseTokenExpired when the signature is good but the token has
    aged out, so the caller can tell the client to refresh rather than sending
    it back to the sign-in page.
    """
    if not token or not token.strip():
        raise SupabaseTokenError("No access token supplied")
    token = token.strip()

    try:
        return _verify_with_jwks(token)
    except jwt.ExpiredSignatureError:
        raise SupabaseTokenExpired("The session has expired")
    except _JwksUnavailable:
        pass  # cannot reach the key set; try the remaining strategies
    except jwt.InvalidTokenError as exc:
        # A genuinely bad token - do not keep trying other paths with it.
        raise SupabaseTokenError(str(exc)) from exc

    try:
        return _verify_with_secret(token)
    except jwt.ExpiredSignatureError:
        raise SupabaseTokenExpired("The session has expired")
    except jwt.InvalidTokenError as exc:
        raise SupabaseTokenError(str(exc)) from exc
    except SupabaseTokenError:
        pass  # no secret configured

    return await _verify_with_gotrue(token)
