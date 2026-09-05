import sqlite3

conn = sqlite3.connect('backend/notify_db.sqlite')
cursor = conn.cursor()

print("--- USERS TABLE COLUMNS ---")
cols = cursor.execute("PRAGMA table_info(users)").fetchall()
for c in cols:
    print(c)

print("\n--- SAMPLE USERS ---")
users = cursor.execute("SELECT * FROM users LIMIT 10").fetchall()
for u in users:
    print(u)
