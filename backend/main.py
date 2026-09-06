import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Add parent directory to sys.path so imports like `from backend.core...` work from any working directory
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect

from backend.core.config import settings
from backend.core.database import engine, Base
from backend.core.logging import logger

from backend.api.v1 import (
    auth, properties, units, invitations, admin, landlords, tenants,
    notifications, tenancies, leases, invoices, payments, receipts, expenses, financials,
    maintenance, complaints, messages, tracker
)


def _sync_missing_columns(conn):
    """create_all() creates missing tables but never alters existing ones, so a
    newly declared column leaves older databases broken until they are recreated."""
    inspector = inspect(conn)
    existing_tables = set(inspector.get_table_names())
    for table in Base.metadata.sorted_tables:
        if table.name not in existing_tables:
            continue
        present = {c["name"] for c in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name in present:
                continue
            if not column.nullable and column.server_default is None:
                logger.warning(
                    f"Cannot auto-add non-nullable column {table.name}.{column.name}; migrate manually."
                )
                continue
            col_type = column.type.compile(conn.dialect)
            conn.exec_driver_sql(f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}')
            logger.info(f"Added missing column {table.name}.{column.name}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Notify FastAPI application...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_sync_missing_columns)
    logger.info("Database schemas created/verified successfully.")
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    return JSONResponse(status_code=400, content={"detail": detail})

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


@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=settings.PORT, reload=settings.DEBUG)
