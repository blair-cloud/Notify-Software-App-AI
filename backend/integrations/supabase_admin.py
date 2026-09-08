"""
Server-side Supabase Auth administration.

Uses the service-role key, so this module must only ever be imported by backend
code. The key bypasses Row Level Security and can mint sessions for any account;
it must never be sent to a browser.

Everything here talks to GoTrue's admin API rather than to the database, because
`auth.users` is Supabase's table - writing to it directly would skip the
password hashing, identity records and confirmation bookkeeping that GoTrue owns.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import httpx

from backend.core.config import settings

logger = logging.getLogger("supabase_admin")


class SupabaseAdminError(Exception):
    """The Supabase admin API refused or could not be reached."""


def _require_config() -> tuple[str, str]:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise SupabaseAdminError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to manage accounts."
        )
    return settings.SUPABASE_URL.rstrip("/"), settings.SUPABASE_SERVICE_ROLE_KEY


def _headers(key: str) -> Dict[str, str]:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


async def _request(method: str, path: str, payload: Optional[Dict[str, Any]] = None) -> Any:
    base, key = _require_config()
    url = f"{base}{path}"
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.request(method, url, headers=_headers(key), json=payload)
    except Exception as exc:  # noqa: BLE001
        raise SupabaseAdminError(f"Could not reach Supabase: {exc}") from exc

    if resp.status_code >= 400:
        detail = resp.text
        try:
            body = resp.json()
            detail = body.get("msg") or body.get("message") or body.get("error_description") or detail
        except Exception:  # noqa: BLE001
            pass
        raise SupabaseAdminError(f"Supabase returned {resp.status_code}: {detail}")

    if not resp.content:
        return None
    return resp.json()


async def create_auth_user(
    email: str,
    password: str,
    *,
    role: str = "TENANT",
    phone: Optional[str] = None,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    email_confirm: bool = True,
) -> Dict[str, Any]:
    """
    Create a Supabase Auth user.

    The role goes into `app_metadata`, which only the service role can write.
    The database trigger reads it from there - never from `user_metadata`, which
    the client controls - so a role cannot be self-assigned at sign-up.
    """
    payload: Dict[str, Any] = {
        "email": email,
        "password": password,
        "email_confirm": email_confirm,
        "app_metadata": {"role": role},
        "user_metadata": {
            k: v
            for k, v in {
                "first_name": first_name,
                "last_name": last_name,
                "phone": phone,
            }.items()
            if v
        },
    }
    return await _request("POST", "/auth/v1/admin/users", payload)


async def set_user_role(auth_user_id: str, role: str) -> Dict[str, Any]:
    """Update the role held in app_metadata (the profile row is separate)."""
    return await _request(
        "PUT", f"/auth/v1/admin/users/{auth_user_id}", {"app_metadata": {"role": role}}
    )


async def delete_auth_user(auth_user_id: str) -> None:
    await _request("DELETE", f"/auth/v1/admin/users/{auth_user_id}")


async def list_auth_users(per_page: int = 200) -> list[Dict[str, Any]]:
    data = await _request("GET", f"/auth/v1/admin/users?per_page={per_page}")
    return (data or {}).get("users", [])


async def find_auth_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    target = (email or "").strip().lower()
    for user in await list_auth_users():
        if (user.get("email") or "").lower() == target:
            return user
    return None


async def send_password_reset(email: str, redirect_to: Optional[str] = None) -> None:
    """Ask Supabase to email a reset link. Used by admin tooling; the browser
    normally calls Supabase directly for this."""
    base, key = _require_config()
    url = f"{base}/auth/v1/recover"
    body: Dict[str, Any] = {"email": email}
    if redirect_to:
        body["redirect_to"] = redirect_to
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(url, headers=_headers(key), json=body)
    except Exception as exc:  # noqa: BLE001
        raise SupabaseAdminError(f"Could not reach Supabase: {exc}") from exc
    if resp.status_code >= 400:
        raise SupabaseAdminError(f"Supabase returned {resp.status_code}: {resp.text}")
