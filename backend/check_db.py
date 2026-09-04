import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(".")))
sys.path.insert(0, ".")
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from core.config import settings

async def main():
    url = settings.DATABASE_URL
    print("DB:", url[:70])
    engine = create_async_engine(url, echo=False)
    async with engine.connect() as conn:
        r = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"))
        rows = r.fetchall()
        print(f"Tables ({len(rows)}):")
        for row in rows:
            print(f"  - {row[0]}")
    await engine.dispose()

asyncio.run(main())
