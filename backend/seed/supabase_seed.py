"""
Create the Notify test accounts and demo data in Supabase.

Runs against the project's HTTP APIs rather than a direct Postgres connection:

  * accounts   -> Supabase Auth admin API (GoTrue), which hashes the passwords
                  and owns the identities;
  * data rows  -> PostgREST with the service-role key.

That means it needs only SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, not the
database password. Apply supabase_v2_migration.sql first - this script fills a
schema, it does not create one.

Usage
    python -m backend.seed.supabase_seed            # show what it would do
    python -m backend.seed.supabase_seed --apply    # create accounts and data
    python -m backend.seed.supabase_seed --reset --apply
                                                    # delete the test accounts first
"""
from __future__ import annotations

import asyncio
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

from backend.core.config import settings

PASSWORD = "NotifyTest123!"

ACCOUNTS = [
    {
        "email": "admin@notify.test",
        "role": "SYSTEM_ADMIN",
        "first_name": "Notify",
        "last_name": "Administrator",
        "phone": "+250780000001",
    },
    {
        "email": "landlord@notify.test",
        "role": "LANDLORD",
        "first_name": "Jean-Paul",
        "last_name": "Mugabo",
        "phone": "+250788123456",
        "business_name": "Kigali Commercial Properties Ltd",
    },
    {
        "email": "tenant@notify.test",
        "role": "TENANT",
        "first_name": "Aline",
        "last_name": "Uwase",
        "phone": "+250788654321",
        "occupation": "Retail Boutique Owner",
    },
    {
        "email": "landlord2@notify.test",
        "role": "LANDLORD",
        "first_name": "Claire",
        "last_name": "Ingabire",
        "phone": "+250788222333",
        "business_name": "Rival Plaza Ltd",
    },
]


def _base() -> str:
    if not settings.SUPABASE_URL:
        raise SystemExit("SUPABASE_URL is not set in backend/.env")
    return settings.SUPABASE_URL.rstrip("/")


def _key() -> str:
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise SystemExit("SUPABASE_SERVICE_ROLE_KEY is not set in backend/.env")
    return settings.SUPABASE_SERVICE_ROLE_KEY


def _headers() -> Dict[str, str]:
    key = _key()
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


class Rest:
    """Thin PostgREST helper."""

    def __init__(self, client: httpx.AsyncClient):
        self.c = client

    async def insert(self, table: str, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not rows:
            return []
        headers = {**_headers(), "Prefer": "return=representation"}
        r = await self.c.post(f"{_base()}/rest/v1/{table}", headers=headers, json=rows)
        if r.status_code >= 400:
            raise RuntimeError(f"insert into {table} failed: {r.status_code} {r.text[:300]}")
        return r.json()

    async def select(self, table: str, query: str = "select=*") -> List[Dict[str, Any]]:
        r = await self.c.get(f"{_base()}/rest/v1/{table}?{query}", headers=_headers())
        if r.status_code >= 400:
            raise RuntimeError(f"select from {table} failed: {r.status_code} {r.text[:300]}")
        return r.json()

    async def delete(self, table: str, query: str) -> None:
        r = await self.c.delete(f"{_base()}/rest/v1/{table}?{query}", headers=_headers())
        if r.status_code >= 400 and r.status_code != 404:
            raise RuntimeError(f"delete from {table} failed: {r.status_code} {r.text[:300]}")

    async def update(self, table: str, query: str, patch: Dict[str, Any]) -> None:
        headers = {**_headers(), "Prefer": "return=minimal"}
        r = await self.c.patch(
            f"{_base()}/rest/v1/{table}?{query}", headers=headers, json=patch
        )
        if r.status_code >= 400:
            raise RuntimeError(f"update {table} failed: {r.status_code} {r.text[:300]}")


async def _auth_users(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    r = await client.get(f"{_base()}/auth/v1/admin/users?per_page=200", headers=_headers())
    r.raise_for_status()
    return r.json().get("users", [])


async def _create_auth_user(client: httpx.AsyncClient, acc: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "email": acc["email"],
        "password": PASSWORD,
        "email_confirm": True,
        # Only the service role can write app_metadata, which is why the role
        # lives there and not in user_metadata.
        "app_metadata": {"role": acc["role"]},
        "user_metadata": {
            "first_name": acc["first_name"],
            "last_name": acc["last_name"],
            "phone": acc["phone"],
        },
    }
    r = await client.post(f"{_base()}/auth/v1/admin/users", headers=_headers(), json=payload)
    if r.status_code >= 400:
        raise RuntimeError(f"could not create {acc['email']}: {r.status_code} {r.text[:300]}")
    return r.json()


async def _delete_auth_user(client: httpx.AsyncClient, user_id: str) -> None:
    await client.delete(f"{_base()}/auth/v1/admin/users/{user_id}", headers=_headers())


async def seed(apply: bool, reset: bool) -> int:
    emails = {a["email"] for a in ACCOUNTS}

    async with httpx.AsyncClient(timeout=40) as client:
        rest = Rest(client)

        existing = {u["email"].lower(): u for u in await _auth_users(client) if u.get("email")}
        print(f"Supabase project : {_base()}")
        print(f"Existing auth users: {len(existing)}\n")

        if not apply:
            for a in ACCOUNTS:
                state = "exists" if a["email"] in existing else "would create"
                print(f"  {state:12} {a['email']:26} {a['role']}")
            print("\nDry run. Re-run with --apply to create these accounts and demo data.")
            return 0

        if reset:
            # Child rows first: deleting an auth user cascades to its profile,
            # but properties and everything hanging off them survive, which
            # leaves a half-seeded database that the next run refuses to touch.
            print("Clearing demo data...")
            for table in (
                "expenses", "invoices", "leases", "tenancies",
                "units", "properties", "invitations",
            ):
                await rest.delete(table, "id=not.is.null")
            print("  demo tables cleared")


            print("Removing existing test accounts...")
            for email in emails:
                if email in existing:
                    await _delete_auth_user(client, existing[email]["id"])
                    print(f"  deleted {email}")
            # Deleting the auth user cascades to profiles and everything under it.
            existing = {u["email"].lower(): u for u in await _auth_users(client) if u.get("email")}
            print()

        # ---------------- accounts ----------------
        ids: Dict[str, str] = {}
        for acc in ACCOUNTS:
            if acc["email"] in existing:
                ids[acc["email"]] = existing[acc["email"]]["id"]
                print(f"  kept    {acc['email']:26} {acc['role']}")
                continue
            created = await _create_auth_user(client, acc)
            ids[acc["email"]] = created["id"]
            print(f"  created {acc['email']:26} {acc['role']}")

        # The trigger creates each profile and syncs the role from app_metadata.
        # This fills in the details the trigger cannot know.
        await asyncio.sleep(1.2)
        for acc in ACCOUNTS:
            uid = ids[acc["email"]]
            await rest.update(
                "profiles",
                f"id=eq.{uid}",
                {
                    "role": acc["role"],
                    "first_name": acc["first_name"],
                    "last_name": acc["last_name"],
                    "phone": acc["phone"],
                    "email": acc["email"],
                    "status": "ACTIVE",
                    "email_verified": True,
                },
            )

        profiles = await rest.select("profiles", "select=id,email,role")
        by_email = {p["email"]: p for p in profiles}
        missing = [e for e in emails if e not in by_email]
        if missing:
            raise RuntimeError(
                "profiles rows are missing for: "
                + ", ".join(missing)
                + ". Has supabase_v2_migration.sql been applied (it installs the "
                  "on_auth_user_created trigger)?"
            )
        print(f"\n  {len(profiles)} profile row(s) present")

        # ---------------- landlord / tenant profiles ----------------
        lp = await rest.select("landlord_profiles", "select=id,user_id")
        tp = await rest.select("tenant_profiles", "select=id,user_id")
        have_lp = {r["user_id"] for r in lp}
        have_tp = {r["user_id"] for r in tp}

        new_lp = [
            {
                "id": str(uuid.uuid4()),
                "user_id": ids[a["email"]],
                "business_type": "COMPANY",
                "business_name": a.get("business_name"),
                "city": "Kigali",
                "district": "Nyarugenge",
                "verification_status": "VERIFIED",
            }
            for a in ACCOUNTS
            if a["role"] == "LANDLORD" and ids[a["email"]] not in have_lp
        ]
        new_tp = [
            {
                "id": str(uuid.uuid4()),
                "user_id": ids[a["email"]],
                "occupation": a.get("occupation"),
                "verification_status": "VERIFIED",
            }
            for a in ACCOUNTS
            if a["role"] == "TENANT" and ids[a["email"]] not in have_tp
        ]
        await rest.insert("landlord_profiles", new_lp)
        await rest.insert("tenant_profiles", new_tp)
        print(f"  landlord profiles +{len(new_lp)}, tenant profiles +{len(new_tp)}")

        lp = await rest.select("landlord_profiles", "select=id,user_id")
        tp = await rest.select("tenant_profiles", "select=id,user_id")
        landlord_id = next(r["id"] for r in lp if r["user_id"] == ids["landlord@notify.test"])
        landlord2_id = next(r["id"] for r in lp if r["user_id"] == ids["landlord2@notify.test"])
        tenant_id = next(r["id"] for r in tp if r["user_id"] == ids["tenant@notify.test"])

        # ---------------- demo data ----------------
        if await rest.select("properties", "select=id&limit=1"):
            print("\n  properties already present - leaving existing data alone")
            _summary(ids)
            return 0

        prop_id, prop2_id = str(uuid.uuid4()), str(uuid.uuid4())
        await rest.insert("properties", [
            {
                "id": prop_id, "landlord_id": landlord_id,
                "name": "Notify Heights Commercial Mall", "property_type": "COMMERCIAL",
                "address": "KN 4 Ave, Commercial District", "district": "Nyarugenge",
                "sector": "Nyarugenge", "status": "ACTIVE",
            },
            {
                "id": prop2_id, "landlord_id": landlord2_id,
                "name": "Rival Plaza", "property_type": "COMMERCIAL",
                "address": "KN 3 St", "district": "Gasabo", "sector": "Remera",
                "status": "ACTIVE",
            },
        ])

        unit_id, unit2_id = str(uuid.uuid4()), str(uuid.uuid4())
        await rest.insert("units", [
            {
                "id": unit_id, "property_id": prop_id, "landlord_id": landlord_id,
                "unit_number": "B-204", "floor": 2, "monthly_rent": 450000,
                "currency": "RWF", "status": "OCCUPIED",
            },
            {
                "id": unit2_id, "property_id": prop_id, "landlord_id": landlord_id,
                "unit_number": "B-205", "floor": 2, "monthly_rent": 380000,
                "currency": "RWF", "status": "VACANT",
            },
        ])

        tenancy_id = str(uuid.uuid4())
        start = date.today().replace(day=1)
        end = start + timedelta(days=364)
        await rest.insert("tenancies", [{
            "id": tenancy_id, "tenant_id": tenant_id, "landlord_id": landlord_id,
            "property_id": prop_id, "unit_id": unit_id, "status": "ACTIVE",
            "start_date": start.isoformat(),
        }])

        lease_id = str(uuid.uuid4())
        await rest.insert("leases", [{
            "id": lease_id, "tenancy_id": tenancy_id, "landlord_id": landlord_id,
            "tenant_id": tenant_id, "property_id": prop_id, "unit_id": unit_id,
            "start_date": start.isoformat(), "end_date": end.isoformat(),
            "monthly_rent": 450000, "currency": "RWF", "status": "ACTIVE",
            "payment_due_day": 5,
        }])

        invoice_id = str(uuid.uuid4())
        await rest.insert("invoices", [{
            "id": invoice_id, "invoice_number": "INV-2026-000001",
            "landlord_id": landlord_id, "tenant_id": tenant_id,
            "property_id": prop_id, "unit_id": unit_id,
            "tenancy_id": tenancy_id, "lease_id": lease_id,
            "invoice_type": "RENT", "status": "ISSUED",
            "billing_period_start": start.isoformat(),
            "billing_period_end": (start + timedelta(days=29)).isoformat(),
            "issue_date": start.isoformat(),
            "due_date": (start + timedelta(days=5)).isoformat(),
            "subtotal": 450000, "discount": 0, "late_fee": 0,
            "total_amount": 450000, "amount_paid": 0, "balance_due": 450000,
            "currency": "RWF",
        }])

        await rest.insert("expenses", [{
            "id": str(uuid.uuid4()), "landlord_id": landlord_id, "property_id": prop_id,
            "category": "UTILITIES", "description": "WASAC water bill",
            "amount": 45000, "currency": "RWF",
            "expense_date": date.today().isoformat(), "status": "RECORDED",
        }])

        print("  demo data: 2 properties, 2 units, 1 tenancy, 1 lease, 1 invoice, 1 expense")
        _summary(ids)
    return 0


def _summary(ids: Dict[str, str]) -> None:
    print("\n" + "=" * 66)
    print("TEST ACCOUNTS (Supabase Auth)")
    print("=" * 66)
    for a in ACCOUNTS:
        print(f"  {a['email']:26} {a['role']:14} password: {PASSWORD}")
    print("=" * 66)


if __name__ == "__main__":
    sys.exit(
        asyncio.run(seed(apply="--apply" in sys.argv, reset="--reset" in sys.argv))
    )
