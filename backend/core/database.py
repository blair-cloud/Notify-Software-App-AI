"""
The application's single database connection: Supabase PostgreSQL.

There is deliberately no SQLite path. A local-file fallback is what previously
let the application look healthy while writing records nobody could find, so an
unset or non-Postgres DATABASE_URL is a startup error rather than a silent
downgrade.

The backend connects as the service role, so PostgREST-level RLS does not
constrain it; per-user authorisation is enforced in the API layer (see
backend/core/scoping.py) and RLS is the second line of defence for anything
that reaches the database by another route.
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from backend.core.config import settings

db_url = (settings.DATABASE_URL or "").strip()

if not db_url:
    raise RuntimeError(
        "DATABASE_URL is not set. Notify now stores everything in Supabase "
        "PostgreSQL. Set it in backend/.env, for example:\n"
        "  DATABASE_URL=postgresql+asyncpg://postgres.<project-ref>:<password>"
        "@aws-0-<region>.pooler.supabase.com:5432/postgres"
    )

if db_url.startswith("sqlite"):
    raise RuntimeError(
        "DATABASE_URL points at SQLite, which is no longer supported. Notify "
        "stores application data and identity in Supabase. Set DATABASE_URL to "
        "your Supabase PostgreSQL connection string."
    )

if not db_url.startswith("postgresql"):
    raise RuntimeError(
        f"DATABASE_URL must be a PostgreSQL URL; got '{db_url.split(':', 1)[0]}:...'."
    )

# asyncpg is the driver; accept the plain postgresql:// form too.
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine_kwargs = {
    "echo": False,
    "future": True,
    # Supabase's pooler closes idle connections; recycle before it does.
    "pool_pre_ping": True,
    "pool_recycle": 900,
}

if ":6543/" in db_url:
    # The transaction pooler does not support prepared statements, which
    # asyncpg uses by default.
    from sqlalchemy.pool import NullPool

    engine_kwargs["poolclass"] = NullPool
    engine_kwargs["connect_args"] = {"statement_cache_size": 0, "prepared_statement_cache_size": 0}
else:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 10

engine = create_async_engine(db_url, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
