import sqlite3

conn = sqlite3.connect('./notify_db.sqlite')
conn.row_factory = sqlite3.Row

def cols(table):
    return [r[1] for r in conn.execute(f'PRAGMA table_info([{table}])').fetchall()]

print('properties cols:', cols('properties'))
print('units cols:', cols('units'))
print('leases cols:', cols('leases'))
print('tenancies cols:', cols('tenancies'))
print('invoices cols:', cols('invoices'))
print('payments cols:', cols('payments'))
print('users cols:', cols('users'))
print('maintenance_requests cols:', cols('maintenance_requests'))
conn.close()
