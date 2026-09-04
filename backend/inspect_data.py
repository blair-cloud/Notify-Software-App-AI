import sqlite3

conn = sqlite3.connect('./notify_db.sqlite')
conn.row_factory = sqlite3.Row

print('=== USERS ===')
users = conn.execute("SELECT id, email, role, status, first_name, last_name FROM users").fetchall()
for u in users:
    print(f"  [{u['role']}] {u['first_name']} {u['last_name']} | {u['email']} | {u['status']}")

print()
print('=== PROPERTIES ===')
props = conn.execute("SELECT id, name, type, city, total_units FROM properties").fetchall()
for p in props:
    print(f"  {p['name']} ({p['type']}) - {p['city']} - {p['total_units']} units")

print()
print('=== UNITS ===')
units = conn.execute("SELECT unit_number, floor, bedrooms, monthly_rent, status, property_id FROM units").fetchall()
for u in units:
    print(f"  Unit {u['unit_number']} | Bed:{u['bedrooms']} | {u['monthly_rent']} RWF | {u['status']}")

print()
print('=== LEASES ===')
leases = conn.execute("SELECT id, status, monthly_rent, start_date, end_date FROM leases").fetchall()
for l in leases:
    print(f"  Lease {l['id'][:8]} | {l['status']} | {l['monthly_rent']} | {l['start_date']} - {l['end_date']}")

print()
print('=== INVOICES ===')
invs = conn.execute("SELECT invoice_number, status, amount, due_date FROM invoices").fetchall()
for i in invs:
    print(f"  {i['invoice_number']} | {i['status']} | {i['amount']} | Due: {i['due_date']}")

conn.close()
