import sys
import re
from pathlib import Path
from contextlib import asynccontextmanager

# Add parent directory to sys.path so imports like `from backend.core...` work from any working directory
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect

from backend.core.config import settings
from backend.core.database import engine, Base
from backend.core.logging import logger

from backend.api.v1 import (
    auth, properties, units, invitations, admin, landlords, tenants,
    notifications, tenancies, leases, invoices, payments, receipts, expenses, financials,
    maintenance, complaints, messages, tracker, realtime, whatsapp
)



async def _verify_schema() -> None:
    """
    Confirm the database actually has what the ORM expects.

    If any expected tables are missing from PostgreSQL, automatically create them
    using SQLAlchemy metadata.
    """
    from sqlalchemy import inspect as sa_inspect

    async with engine.connect() as conn:
        table_names = await conn.run_sync(lambda c: sa_inspect(c).get_table_names())

    expected = {t.name for t in Base.metadata.sorted_tables}
    missing = sorted(expected - set(table_names))

    if missing:
        logger.info("Database missing %d table(s): %s. Auto-creating missing tables...", len(missing), ", ".join(missing))
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Missing tables auto-created successfully.")

    # Auto-ensure new columns on existing tracker tables exist in PostgreSQL
    async with engine.begin() as conn:
        from sqlalchemy import text
        col_migrations = [
            "ALTER TABLE bank_statements ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(50);",
            "ALTER TABLE bank_statements ADD COLUMN IF NOT EXISTS ai_model VARCHAR(50);",
            "ALTER TABLE bank_statements ADD COLUMN IF NOT EXISTS extraction_status VARCHAR(50) DEFAULT 'COMPLETED';",
            "ALTER TABLE bank_statements ADD COLUMN IF NOT EXISTS raw_ai_response TEXT;",
            "ALTER TABLE bank_statements ADD COLUMN IF NOT EXISTS extraction_errors TEXT;",
            "ALTER TABLE bank_statements ADD COLUMN IF NOT EXISTS processing_duration_ms INTEGER DEFAULT 0;",
            "ALTER TABLE bank_statements ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);",
            "ALTER TABLE bank_statements ADD COLUMN IF NOT EXISTS account_name VARCHAR(150);",
            "ALTER TABLE bank_statements ADD COLUMN IF NOT EXISTS account_number_masked VARCHAR(50);",
            "ALTER TABLE bank_statements ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(14, 2) DEFAULT 0.0;",
            "ALTER TABLE bank_statements ADD COLUMN IF NOT EXISTS closing_balance NUMERIC(14, 2) DEFAULT 0.0;",
            "ALTER TABLE bank_statements ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'RWF';",
            "ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC(14, 2);",
            "ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS extraction_confidence FLOAT DEFAULT 1.0;",
        ]
        for c_stmt in col_migrations:
            try:
                await conn.execute(text(c_stmt))
            except Exception as e:
                logger.debug("Column migration notice: %s", e)

    logger.info("Schema verified: %d tables present.", len(expected))


DEFAULT_SECRET_KEY = "notify_super_secret_jwt_key_change_in_production_32bytes"


def _check_production_secrets() -> None:
    """
    The JWT signing key is what makes a token unforgeable. Shipping the shared
    default would let anyone mint a token for any account, so say so loudly.
    """
    if settings.SECRET_KEY == DEFAULT_SECRET_KEY:
        message = (
            "SECRET_KEY is still the built-in default. It no longer signs sessions "
            "(Supabase Auth does), but it does HMAC invitation tokens. Set it in the "
            "environment."
        )
        if settings.ENVIRONMENT.lower() in ("production", "prod"):
            raise RuntimeError(message)
        logger.warning("SECURITY: %s", message)

    if settings.ENVIRONMENT.lower() in ("production", "prod") and not settings.CORS_ORIGINS:
        logger.warning(
            "SECURITY: CORS_ORIGINS is empty in production, so any origin may call the API. "
            "Set it to your frontend origin(s)."
        )


def _log_runtime_configuration() -> None:
    """
    Say plainly where data is going and whether email can actually be sent.

    Both have caused real confusion: accounts were being written to a local
    SQLite file while the Supabase dashboard was being checked for them, and
    confirmation emails were only ever logged because no SMTP server was set.
    """
    logger.info("Database backend : %s", settings.database_backend)
    logger.info("Database location: %s", settings.database_location)
    logger.info("Identity        : Supabase Auth (%s)", settings.SUPABASE_URL or "SUPABASE_URL not set")

    # Account email (confirmation, password reset) is Supabase Auth's job and is
    # configured in its dashboard. This setting only covers the application's own
    # mail: rent reminders, lease notices, receipts.
    if settings.email_is_configured:
        logger.info(
            "App email       : SMTP via %s:%s as %s",
            settings.SMTP_HOST, settings.SMTP_PORT, settings.smtp_username,
        )
    else:
        logger.warning(
            "App email       : SIMULATED. Reminders and notices are logged, not sent. "
            "Set SMTP_USER / SMTP_PASSWORD in backend/.env, then check with "
            "'python -m backend.scripts.test_email you@example.com'. "
            "(Confirmation and password-reset email is sent by Supabase Auth, "
            "configured in its dashboard - see SUPABASE_SETUP.md.)"
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Notify FastAPI application...")
    _check_production_secrets()
    _log_runtime_configuration()
    # The schema is owned by supabase_v2_migration.sql, applied in the Supabase
    # SQL editor. The application no longer creates or alters tables at startup:
    # doing that against a shared Postgres database races other instances and
    # hides drift. Instead, check that what the ORM expects is actually there.
    await _verify_schema()
    yield
    logger.info("Shutting down Notify FastAPI application...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Notify Commercial Real Estate Management Backend API for Kigali, Rwanda",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# A wildcard origin and credentialed requests are mutually exclusive per the
# CORS spec - browsers reject the combination outright. Auth here travels in an
# Authorization header rather than a cookie, so the permissive development
# default needs no credentials. Setting CORS_ORIGINS (comma separated) in
# production narrows it to those origins and re-enables credentials.
_configured_origins = [
    o.strip().rstrip("/")
    for o in (settings.CORS_ORIGINS or "").split(",")
    if o.strip()
]
_known_frontend_origins = [
    o.strip().rstrip("/")
    for o in (settings.KNOWN_FRONTEND_ORIGINS or "").split(",")
    if o.strip()
]
# Always allow the hosted Firebase SPAs, even when CORS_ORIGINS is a narrow list.
_cors_allow_origins = list(dict.fromkeys(_configured_origins + _known_frontend_origins))
_use_wildcard = not _configured_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _use_wildcard else _cors_allow_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$" if not _use_wildcard else None,
    allow_credentials=not _use_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _cors_headers_for(request: Request) -> dict:
    """
    Mirror the middleware allow-list onto exception responses. Unhandled
    exceptions can otherwise leave the browser with a bare 500 and no
    Access-Control-Allow-Origin, which it reports as a CORS failure.
    """
    origin = (request.headers.get("origin") or "").rstrip("/")
    if _use_wildcard:
        return {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*",
        }
    if origin and (origin in _cors_allow_origins or re.match(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$", origin)):
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*",
            "Vary": "Origin",
        }
    return {}


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """
    Catch-all so that unexpected 500s still carry CORS headers.
    Without this, unhandled exceptions bypass the CORS middleware and
    the browser reports a misleading CORS error instead of the real one.
    """
    from fastapi import HTTPException as _HTTPEx
    if isinstance(exc, _HTTPEx):
        raise exc
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=_cors_headers_for(request),
    )

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """
    Malformed input (most often a path/query id that is not a UUID) is a client
    error, not a server crash. Handling it here also keeps the CORS headers on
    the response - an unhandled exception is turned into a 500 outside the CORS
    middleware, which the browser then reports as a confusing CORS failure.
    """
    detail = "Malformed identifier in request." if "UUID" in str(exc) else f"Invalid request: {exc}"
    logger.warning(f"400 on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=400,
        content={"detail": detail},
        headers=_cors_headers_for(request),
    )
# Mount API Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(properties.router, prefix="/api/v1")
app.include_router(units.router, prefix="/api/v1")
app.include_router(invitations.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(landlords.router, prefix="/api/v1")
app.include_router(tenants.router, prefix="/api/v1")
app.include_router(tenancies.router, prefix="/api/v1")
app.include_router(leases.router, prefix="/api/v1")
app.include_router(invoices.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(receipts.router, prefix="/api/v1")
app.include_router(expenses.router, prefix="/api/v1")
app.include_router(financials.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(maintenance.router, prefix="/api/v1")
app.include_router(complaints.router, prefix="/api/v1")
app.include_router(messages.router, prefix="/api/v1")
app.include_router(tracker.router, prefix="/api/v1")
app.include_router(realtime.router, prefix="/api/v1")
app.include_router(whatsapp.router, prefix="/api/v1")


@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT
    }


# ----------------------------------------------------------------------
# Single-page app hosting.
#
# The frontend uses real URLs (/landlord/properties, /tenant/lease, ...), so a
# refresh or a pasted link asks this server for a path it has no route for.
# When a built frontend is present we serve its assets and fall back to
# index.html for any non-API path, letting the client router take over.
# In development the Vite dev server does this itself and this block is inert.
# ----------------------------------------------------------------------
FRONTEND_DIST = root_dir / "frontend" / "dist"

if FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Never swallow API or docs traffic - those must keep 404ing honestly.
        if full_path.startswith(("api/", "docs", "redoc", "openapi.json")):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})

        # Serve a real file when the path points at one (favicon, robots.txt...).
        candidate = (FRONTEND_DIST / full_path).resolve()
        if full_path and candidate.is_file() and str(candidate).startswith(str(FRONTEND_DIST.resolve())):
            return FileResponse(str(candidate))

        return FileResponse(str(FRONTEND_DIST / "index.html"))
else:
    logger.info(
        "No built frontend at %s - SPA fallback disabled (the Vite dev server handles it).",
        FRONTEND_DIST,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=settings.PORT, reload=settings.DEBUG)
