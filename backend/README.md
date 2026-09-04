# Notify — Commercial Real Estate Backend Architecture

Backend architecture for **Notify**, built with FastAPI, SQLAlchemy 2 (asyncpg), Pydantic v2, PostgreSQL, and Supabase.

---

## 🏗️ Architecture Overview

```text
notify/
├── backend/
│   ├── main.py                    # FastAPI entry point & lifespan
│   ├── core/                      # Configuration, database, security & permissions
│   ├── models/                    # SQLAlchemy 2 async models (User, Landlord, Tenant, Unit, Tenancy...)
│   ├── schemas/                   # Pydantic v2 request/response schemas
│   ├── api/v1/                    # API v1 route handlers
│   ├── services/                  # Business logic & atomic invitation transactions
│   ├── repositories/             # Data access layer
│   ├── integrations/             # Supabase storage, Email & SMS integrations
│   └── utils/                     # Phone validators, pagination & security helpers
├── requirements.txt
└── .env.example
```

---

## 🔒 Isolation Rules & Defense in Depth

1. **Landlord Isolation**:
   Landlords may ONLY access resources where `landlord_id = current_user.landlord_id`.
2. **Tenant Isolation**:
   Tenants may ONLY access resources linked to their active tenancy.
3. **Defense in Depth**:
   - **Frontend**: Navigation & access control guards.
   - **FastAPI Backend**: JWT Authentication (`get_current_user`), Role verification (`require_landlord`, `require_tenant`), and ownership verification (`verify_landlord_ownership`).
   - **PostgreSQL / Supabase**: Foreign keys, unique constraints, and optional Row-Level Security (RLS).

---

## 🚀 Running the FastAPI Server

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Start Development Server
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation will be available at:
- **Swagger Docs**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
