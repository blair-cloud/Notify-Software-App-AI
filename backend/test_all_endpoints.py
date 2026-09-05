import requests

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_login(email, password):
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email_or_phone": email, "password": password})
    if resp.status_code == 200:
        data = resp.json()
        print(f"SUCCESS login {email}: Role = {data.get('role')}")
        return data.get("access_token")
    else:
        print(f"FAILED login {email}: {resp.status_code} - {resp.text}")
        return None

def test_authenticated_routes(token, role):
    headers = {"Authorization": f"Bearer {token}"}
    routes = []
    if role == "LANDLORD":
        routes = [
            "/landlords/me",
            "/properties",
            "/units",
            "/tenancies",
            "/leases",
            "/invoices",
            "/payments",
            "/expenses",
            "/maintenance",
            "/notifications",
            "/messages"
        ]
    elif role == "TENANT":
        routes = [
            "/tenants/me",
            "/tenancies",
            "/leases",
            "/invoices",
            "/payments",
            "/maintenance",
            "/notifications",
            "/messages"
        ]
    elif role == "SYSTEM_ADMIN":
        routes = [
            "/admin/users",
            "/admin/landlords",
            "/admin/tenants",
            "/admin/properties"
        ]

    for route in routes:
        r = requests.get(f"{BASE_URL}{route}", headers=headers)
        status_code = r.status_code
        if status_code in (200, 201):
            res_len = len(r.json()) if isinstance(r.json(), list) else "object"
            print(f"  [GET {route}] => {status_code} ({res_len} items)")
        else:
            print(f"  [GET {route}] => {status_code}: {r.text[:120]}")

print("=== TESTING LANDLORD LOGIN & ENDPOINTS ===")
landlord_token = test_login("landlord@notify.test", "Password123!")
if landlord_token:
    test_authenticated_routes(landlord_token, "LANDLORD")

print("\n=== TESTING TENANT LOGIN & ENDPOINTS ===")
tenant_token = test_login("tenant@notify.test", "Password123!")
if tenant_token:
    test_authenticated_routes(tenant_token, "TENANT")

print("\n=== TESTING ADMIN LOGIN & ENDPOINTS ===")
admin_token = test_login("admin@notify.test", "Admin123!")
if admin_token:
    test_authenticated_routes(admin_token, "SYSTEM_ADMIN")
