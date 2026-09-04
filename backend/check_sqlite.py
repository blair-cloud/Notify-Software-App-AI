import sqlite3, os

# Check SQLite
for path in ['./notify_db.sqlite', '../notify_db.sqlite']:
    if os.path.exists(path):
        print(f'Found SQLite: {path}')
        conn = sqlite3.connect(path)
        tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
        print(f'Tables ({len(tables)}):')
        for t in tables:
            cnt = conn.execute(f"SELECT COUNT(*) FROM [{t[0]}]").fetchone()[0]
            print(f"  - {t[0]} ({cnt} rows)")
        conn.close()
        break
else:
    print('No SQLite file found')
