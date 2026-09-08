"""
End-to-end verification of the Supabase migration.

Run this after applying supabase_v2_migration.sql and seeding:

    python -m backend.seed.supabase_seed --apply
    python -m backend.seed.verify_supabase

It exercises the real project over HTTP - Supabase Auth for identity and
PostgREST for data - so it proves the deployed configuration works, not just
that the code compiles. It needs no database password.

What it checks
  1. the schema is present and `profiles` is keyed to auth.users
  2. a user can be created and can sign in through Supabase Auth
  3. the profile row appears automatically (the on_auth_user_created trigger)
  4. the role is the one the database says, not one the client asked for
  5. a landlord sees only their own rows under RLS
  6. a tenant sees only their own rows under RLS
  7. `anon` sees nothing at all
  8. a user cannot promote themselves
  9. sign-out invalidates the session
"""
from __future__ import annotations

import asyncio
import sys
import uuid
from typing import Any, Dict, List, Optional

import httpx

from backend.core.config import settings

FAIL: List[str] = []
PASSWORD = "NotifyTest123!"


def check(label: str, ok: bool, detail: Any = "") -> None:
    print(f"   {'OK  ' if ok else 'FAIL'} {label}" + (f" - {detail}" if detail and not ok else ""))
    if not ok:
        FAIL.append(label)


def base() -> str:
    return settings.SUPABASE_URL.rstrip("/")


def svc_headers() -> Dict[str, str]:
    k = settings.SUPABASE_SERVICE_ROLE_KEY
    return {"apikey": k, "Authorization": f"Bearer {k}", "Content-Type": "application/json"}


def user_headers(token: str) -> Dict[str, str]:
    return {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def anon_headers() -> Dict[str, str]:
    k = settings.SUPABASE_ANON_KEY
    return {"apikey": k, "Authorization": f"Bearer {k}"}


async def sign_in(c: httpx.AsyncClient, email: str, password: str) -> Optional[Dict[str, Any]]:
    r = await c.post(
        f"{base()}/auth/v1/token?grant_type=password",
        headers={"apikey": settings.SUPABASE_ANON_KEY, "Content-Type": "application/json"},
        json={"email": email, "password": password},
    )
    return r.json() if r.status_code == 200 else None


async def report_auth_config(c: httpx.AsyncClient) -> None:
    """
    Report how sign-up email is configured.

    Supabase's built-in mailer allows only a couple of messages an hour and is
    documented as test-only, so a project relying on it starts failing sign-ups
    with `over_email_send_rate_limit` during ordinary development.
    """
    r = await c.get(f"{base()}/auth/v1/settings", headers={"apikey": settings.SUPABASE_ANON_KEY})
    if r.status_code != 200:
        print(f"   (could not read auth settings: {r.status_code})")
        return

    if r.json().get("mailer_autoconfirm"):
        print("   Email confirmation : OFF (mailer_autoconfirm = true)")
        print("     Sign-up returns a session immediately and sends no email, so the")
        print("     hourly mail limit cannot be hit. Fine while developing; turn it")
        print("     back on before real users sign up.")
    else:
        print("   Email confirmation : ON")
        print("     Every sign-up sends a confirmation email. On Supabase's built-in")
        print("     mailer only about 2 an hour succeed; the rest fail with")
        print("     429 over_email_send_rate_limit (no account is created).")
        print("     Fix: Dashboard -> Authentication -> Emails -> SMTP Settings,")
        print("          or switch off 'Confirm email' while developing.")


async def main() -> int:
    async with httpx.AsyncClient(timeout=40) as c:
        print(f"\nProject: {base()}\n")

        print("AUTH CONFIGURATION")
        await report_auth_config(c)

        # ---------------------------------------------------------- 1. schema
        print("SCHEMA")
        r = await c.get(f"{base()}/rest/v1/profiles?select=id&limit=1", headers=svc_headers())
        check("public.profiles exists", r.status_code == 200, f"{r.status_code} {r.text[:160]}")
        if r.status_code != 200:
            print("\nApply supabase_v2_migration.sql first, then re-run.")
            return 1

        for t in ("properties", "units", "leases", "invoices", "payments", "messages"):
            rr = await c.get(f"{base()}/rest/v1/{t}?select=id&limit=1", headers=svc_headers())
            check(f"public.{t} exists", rr.status_code == 200, rr.status_code)

        # ------------------------------------------------- 2. auth round trip
        print("\nSUPABASE AUTH")
        email = f"verify-{uuid.uuid4().hex[:8]}@notify.test"
        r = await c.post(
            f"{base()}/auth/v1/admin/users",
            headers=svc_headers(),
            json={
                "email": email,
                "password": PASSWORD,
                "email_confirm": True,
                # A client cannot write app_metadata; only the service role can.
                "app_metadata": {"role": "LANDLORD"},
                "user_metadata": {"first_name": "Verify", "last_name": "Probe",
                                  "phone": "+250788000999"},
            },
        )
        check("user created through Supabase Auth", r.status_code < 400, r.text[:200])
        if r.status_code >= 400:
            return 1
        probe_id = r.json()["id"]

        try:
            session = await sign_in(c, email, PASSWORD)
            check("user can sign in", session is not None)
            token = (session or {}).get("access_token", "")
            check("access + refresh tokens issued",
                  bool(token and (session or {}).get("refresh_token")))

            # ------------------------------------------- 3/4. profile and role
            print("\nPROFILE AND ROLE")
            await asyncio.sleep(0.8)  # let the trigger land
            r = await c.get(
                f"{base()}/rest/v1/profiles?id=eq.{probe_id}&select=id,email,role,status",
                headers=svc_headers(),
            )
            rows = r.json() if r.status_code == 200 else []
            check("profile row created automatically by the trigger", len(rows) == 1,
                  f"{r.status_code} {r.text[:160]}")
            if rows:
                check("role came from app_metadata, not the client",
                      rows[0]["role"] == "LANDLORD", rows[0].get("role"))

            # the user reading their own profile through RLS
            r = await c.get(
                f"{base()}/rest/v1/profiles?select=id,role", headers=user_headers(token)
            )
            mine = r.json() if r.status_code == 200 else []
            check("a signed-in user sees exactly one profile - their own",
                  isinstance(mine, list) and len(mine) == 1 and mine[0]["id"] == probe_id,
                  f"{r.status_code} {str(mine)[:160]}")

            # --------------------------------------------- 8. no self-promotion
            print("\nPRIVILEGE ESCALATION")
            r = await c.patch(
                f"{base()}/rest/v1/profiles?id=eq.{probe_id}",
                headers={**user_headers(token), "Prefer": "return=representation"},
                json={"role": "SYSTEM_ADMIN"},
            )
            escalated = r.status_code < 400 and r.json() and r.json()[0].get("role") == "SYSTEM_ADMIN"
            check("a user cannot make themselves an administrator", not escalated,
                  f"{r.status_code} {r.text[:160]}")

            # ------------------------------------------------------- 7. anon
            print("\nANONYMOUS ACCESS")
            for t in ("profiles", "properties", "invoices", "payments"):
                rr = await c.get(f"{base()}/rest/v1/{t}?select=*&limit=5", headers=anon_headers())
                rows = rr.json() if rr.status_code == 200 else []
                blocked = rr.status_code in (401, 403) or (isinstance(rows, list) and len(rows) == 0)
                check(f"anon reads nothing from {t}", blocked, f"{rr.status_code} {str(rows)[:120]}")

            # ------------------------------------------- 5/6. tenant vs landlord
            print("\nROW LEVEL SECURITY BETWEEN ACCOUNTS")
            landlord = await sign_in(c, "landlord@notify.test", PASSWORD)
            tenant = await sign_in(c, "tenant@notify.test", PASSWORD)
            if not landlord or not tenant:
                check("seeded landlord and tenant can sign in", False,
                      "run: python -m backend.seed.supabase_seed --apply")
            else:
                lt, tt = landlord["access_token"], tenant["access_token"]

                r = await c.get(f"{base()}/rest/v1/properties?select=id,name",
                                headers=user_headers(lt))
                lprops = r.json() if r.status_code == 200 else []
                check("landlord sees their own properties", len(lprops) >= 1,
                      f"{r.status_code} {str(lprops)[:160]}")

                r = await c.get(f"{base()}/rest/v1/properties?select=id,name",
                                headers=user_headers(tt))
                tprops = r.json() if r.status_code == 200 else []
                check("tenant sees no properties", isinstance(tprops, list) and len(tprops) == 0,
                      f"{r.status_code} {str(tprops)[:160]}")

                r = await c.get(f"{base()}/rest/v1/leases?select=id", headers=user_headers(tt))
                tleases = r.json() if r.status_code == 200 else []
                check("tenant sees their own lease", len(tleases) >= 1,
                      f"{r.status_code} {str(tleases)[:160]}")

                # a second landlord must not see the first one's rows
                other = await sign_in(c, "landlord2@notify.test", PASSWORD)
                if other:
                    r = await c.get(f"{base()}/rest/v1/leases?select=id",
                                    headers=user_headers(other["access_token"]))
                    olease = r.json() if r.status_code == 200 else []
                    check("a second landlord sees none of the first landlord's leases",
                          isinstance(olease, list) and len(olease) == 0,
                          f"{r.status_code} {str(olease)[:160]}")

                # the probe landlord owns nothing, so must see nothing
                r = await c.get(f"{base()}/rest/v1/invoices?select=id", headers=user_headers(token))
                pinv = r.json() if r.status_code == 200 else []
                check("a landlord with no data sees no invoices",
                      isinstance(pinv, list) and len(pinv) == 0, f"{r.status_code} {str(pinv)[:120]}")

            # --------------------------------------------------- 9. sign out
            print("\nSESSION END")
            r = await c.post(
                f"{base()}/auth/v1/logout",
                headers={"apikey": settings.SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"},
            )
            check("sign-out accepted", r.status_code in (200, 204), r.status_code)

            r = await c.get(f"{base()}/auth/v1/user",
                            headers={"apikey": settings.SUPABASE_ANON_KEY,
                                     "Authorization": f"Bearer {token}"})
            # GoTrue answers 403 for a revoked session and 401 for a malformed
            # one; either means the token is no longer usable.
            check("the token no longer identifies a user after sign-out",
                  r.status_code in (401, 403), r.status_code)

        finally:
            await c.delete(f"{base()}/auth/v1/admin/users/{probe_id}", headers=svc_headers())
            print(f"\n   (cleaned up {email})")

    print("\n" + ("ALL SUPABASE VERIFICATION CHECKS PASSED" if not FAIL
                  else f"{len(FAIL)} FAILURES:\n  - " + "\n  - ".join(FAIL)))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
