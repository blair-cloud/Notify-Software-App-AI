import sys
from pathlib import Path

# Add root directory to sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import asyncio
import uuid
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from backend.core.database import engine, Base, AsyncSessionLocal
from backend.core.security import hash_password
from backend.models import (
    User, LandlordProfile, TenantProfile, UserRole, UserStatus, UserLanguage, BusinessType,
    Property, Unit, Tenancy, Lease, Invoice, Payment, Receipt, Expense,
    MaintenanceRequest, Complaint, Message, Notification,
    PropertyType, PropertyStatus, UnitStatus, TenancyStatus, LeaseStatus,
    InvoiceType, InvoiceStatus, PaymentMethod, PaymentChannel, PaymentStatus,
    ExpenseCategory, ExpenseStatus, MaintenanceCategory, MaintenancePriority, MaintenanceStatus,
    ComplaintCategory, ComplaintPriority, ComplaintStatus, NotificationChannel, NotificationPriority, NotificationCategory, NotificationStatus, NotificationType
)


async def seed_database():
    print("Starting database schema creation and data seeding...")
    
    # 1. Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created/verified successfully.")

    async with AsyncSessionLocal() as db:
        # Check if test admin already exists
        stmt = select(User).where(User.email == "admin@notify.test")
        res = await db.execute(stmt)
        existing_admin = res.scalar_one_or_none()

        if existing_admin:
            print("Seed data already exists in database. Updating password hashes for test accounts...")
            # Ensure test account passwords match Password123! / Admin123!
            for email, pwd in [
                ("admin@notify.test", "Admin123!"),
                ("landlord@notify.test", "Password123!"),
                ("landlord2@notify.test", "Password123!"),
                ("tenant@notify.test", "Password123!"),
                ("tenant2@notify.test", "Password123!"),
                ("tenant3@notify.test", "Password123!"),
            ]:
                usr_stmt = select(User).where(User.email == email)
                usr_res = await db.execute(usr_stmt)
                u = usr_res.scalar_one_or_none()
                if u:
                    u.password_hash = hash_password(pwd)
            await db.commit()
            print("Existing test account password hashes refreshed successfully.")
            return

        print("Inserting initial mock test accounts & dataset...")

        # -------------------------------------------------------------
        # 2. SEED USERS & PROFILES
        # -------------------------------------------------------------
        # Admin User
        admin_user = User(
            id=uuid.uuid4(),
            email="admin@notify.test",
            phone="+250788000001",
            password_hash=hash_password("Admin123!"),
            first_name="System",
            last_name="Administrator",
            role=UserRole.SYSTEM_ADMIN,
            language=UserLanguage.EN,
            status=UserStatus.ACTIVE
        )
        db.add(admin_user)

        # Landlord 1: Jean-Paul Habimana
        landlord1_user = User(
            id=uuid.uuid4(),
            email="landlord@notify.test",
            phone="+250788111222",
            password_hash=hash_password("Password123!"),
            first_name="Jean-Paul",
            last_name="Habimana",
            role=UserRole.LANDLORD,
            language=UserLanguage.EN,
            status=UserStatus.ACTIVE
        )
        db.add(landlord1_user)

        landlord1_profile = LandlordProfile(
            id=uuid.uuid4(),
            user_id=landlord1_user.id,
            business_type=BusinessType.COMPANY,
            business_name="Kigali Commercial Real Estate Ltd",
            tax_identifier="102938475",
            address="KN 4 Ave, Commercial District",
            district="Nyarugenge",
            city="Kigali"
        )
        db.add(landlord1_profile)

        # Landlord 2: Claire Uwase
        landlord2_user = User(
            id=uuid.uuid4(),
            email="landlord2@notify.test",
            phone="+250788333444",
            password_hash=hash_password("Password123!"),
            first_name="Claire",
            last_name="Uwase",
            role=UserRole.LANDLORD,
            language=UserLanguage.FR,
            status=UserStatus.ACTIVE
        )
        db.add(landlord2_user)

        landlord2_profile = LandlordProfile(
            id=uuid.uuid4(),
            user_id=landlord2_user.id,
            business_type=BusinessType.INDIVIDUAL,
            business_name="Uwase Prime Holdings",
            tax_identifier="987654321",
            address="KG 11 Ave, Business Zone",
            district="Gasabo",
            city="Kigali"
        )
        db.add(landlord2_profile)

        # Tenant 1: Emmanuel Ndayishimiye (TechAfrica Solutions)
        tenant1_user = User(
            id=uuid.uuid4(),
            email="tenant@notify.test",
            phone="+250788555666",
            password_hash=hash_password("Password123!"),
            first_name="Emmanuel",
            last_name="Ndayishimiye",
            role=UserRole.TENANT,
            language=UserLanguage.EN,
            status=UserStatus.ACTIVE
        )
        db.add(tenant1_user)

        tenant1_profile = TenantProfile(
            id=uuid.uuid4(),
            user_id=tenant1_user.id,
            national_id="1199880011223344",
            occupation="IT Director - TechAfrica Ltd",
            emergency_name="Sarah Ndayishimiye",
            emergency_phone="+250788555777"
        )
        db.add(tenant1_profile)

        # Tenant 2: Marie-Rose Mutesi (Kigali Fashion Hub)
        tenant2_user = User(
            id=uuid.uuid4(),
            email="tenant2@notify.test",
            phone="+250788777888",
            password_hash=hash_password("Password123!"),
            first_name="Marie-Rose",
            last_name="Mutesi",
            role=UserRole.TENANT,
            language=UserLanguage.FR,
            status=UserStatus.ACTIVE
        )
        db.add(tenant2_user)

        tenant2_profile = TenantProfile(
            id=uuid.uuid4(),
            user_id=tenant2_user.id,
            national_id="1199770022334455",
            occupation="Founder - Kigali Fashion Hub",
            emergency_name="Patrick Mutesi",
            emergency_phone="+250788777999"
        )
        db.add(tenant2_profile)

        # Tenant 3: David Mugisha (East Africa Logistics)
        tenant3_user = User(
            id=uuid.uuid4(),
            email="tenant3@notify.test",
            phone="+250788999000",
            password_hash=hash_password("Password123!"),
            first_name="David",
            last_name="Mugisha",
            role=UserRole.TENANT,
            language=UserLanguage.EN,
            status=UserStatus.ACTIVE
        )
        db.add(tenant3_user)

        tenant3_profile = TenantProfile(
            id=uuid.uuid4(),
            user_id=tenant3_user.id,
            national_id="1199660033445566",
            occupation="Operations Manager - EA Logistics",
            emergency_name="Alice Mugisha",
            emergency_phone="+250788999111"
        )
        db.add(tenant3_profile)

        await db.flush()

        # -------------------------------------------------------------
        # 3. SEED PROPERTIES & UNITS
        # -------------------------------------------------------------
        # Property 1: Kigali Heights Commercial Center
        prop1 = Property(
            id=uuid.uuid4(),
            landlord_id=landlord1_profile.id,
            name="Kigali Commercial Center",
            property_type=PropertyType.COMMERCIAL,
            description="Modern 5-story commercial complex in Kigali CBD with high foot traffic, backup generators, and fiber connectivity.",
            address="KN 4 Ave, CBD",
            district="Nyarugenge",
            sector="Nyarugenge",
            status=PropertyStatus.ACTIVE
        )
        db.add(prop1)

        # Property 2: Remera Tech Park
        prop2 = Property(
            id=uuid.uuid4(),
            landlord_id=landlord2_profile.id,
            name="Remera Business Park",
            property_type=PropertyType.COMMERCIAL,
            description="Premier tech and corporate office hub located near Remera round-about.",
            address="KG 11 Ave, Remera",
            district="Gasabo",
            sector="Remera",
            status=PropertyStatus.ACTIVE
        )
        db.add(prop2)

        await db.flush()

        # Units for Property 1
        unit1 = Unit(
            id=uuid.uuid4(),
            property_id=prop1.id,
            landlord_id=landlord1_profile.id,
            unit_number="Suite 101",
            floor=1,
            unit_type="Corporate Office Space",
            monthly_rent=1500000.0,
            currency="RWF",
            status=UnitStatus.OCCUPIED,
            description="120 sqm open-plan office space with private boardroom and kitchenette."
        )
        db.add(unit1)

        unit2 = Unit(
            id=uuid.uuid4(),
            property_id=prop1.id,
            landlord_id=landlord1_profile.id,
            unit_number="Boutique 102",
            floor=1,
            unit_type="Ground Retail Store",
            monthly_rent=1200000.0,
            currency="RWF",
            status=UnitStatus.OCCUPIED,
            description="80 sqm premium glass-front retail boutique on main boulevard."
        )
        db.add(unit2)

        unit3 = Unit(
            id=uuid.uuid4(),
            property_id=prop1.id,
            landlord_id=landlord1_profile.id,
            unit_number="Suite 201",
            floor=2,
            unit_type="Executive Suite",
            monthly_rent=2200000.0,
            currency="RWF",
            status=UnitStatus.VACANT,
            description="180 sqm corner penthouse office with panoramic city views."
        )
        db.add(unit3)

        # Unit for Property 2
        unit4 = Unit(
            id=uuid.uuid4(),
            property_id=prop2.id,
            landlord_id=landlord2_profile.id,
            unit_number="Office A-01",
            floor=1,
            unit_type="Tech Office Suite",
            monthly_rent=850000.0,
            currency="RWF",
            status=UnitStatus.OCCUPIED,
            description="75 sqm air-conditioned tech suite with high-speed internet infrastructure."
        )
        db.add(unit4)

        await db.flush()

        # -------------------------------------------------------------
        # 4. SEED TENANCIES & LEASES
        # -------------------------------------------------------------
        # Tenancy 1: Emmanuel in Unit 101
        tenancy1 = Tenancy(
            id=uuid.uuid4(),
            tenant_id=tenant1_profile.id,
            landlord_id=landlord1_profile.id,
            property_id=prop1.id,
            unit_id=unit1.id,
            status=TenancyStatus.ACTIVE,
            start_date=date(2025, 1, 1),
            end_date=date(2027, 1, 1)
        )
        db.add(tenancy1)

        lease1 = Lease(
            id=uuid.uuid4(),
            tenancy_id=tenancy1.id,
            landlord_id=landlord1_profile.id,
            tenant_id=tenant1_profile.id,
            property_id=prop1.id,
            unit_id=unit1.id,
            start_date=date(2025, 1, 1),
            end_date=date(2027, 1, 1),
            monthly_rent=1500000.0,
            security_deposit=3000000.0,
            payment_due_day=5,
            late_fee=50000.0,
            currency="RWF",
            status=LeaseStatus.ACTIVE,
            notes="2-year commercial lease agreement with annual inflation adjustment clause."
        )
        db.add(lease1)

        # Tenancy 2: Marie-Rose in Unit 102
        tenancy2 = Tenancy(
            id=uuid.uuid4(),
            tenant_id=tenant2_profile.id,
            landlord_id=landlord1_profile.id,
            property_id=prop1.id,
            unit_id=unit2.id,
            status=TenancyStatus.ACTIVE,
            start_date=date(2025, 3, 1),
            end_date=date(2026, 3, 1)
        )
        db.add(tenancy2)

        lease2 = Lease(
            id=uuid.uuid4(),
            tenancy_id=tenancy2.id,
            landlord_id=landlord1_profile.id,
            tenant_id=tenant2_profile.id,
            property_id=prop1.id,
            unit_id=unit2.id,
            start_date=date(2025, 3, 1),
            end_date=date(2026, 3, 1),
            monthly_rent=1200000.0,
            security_deposit=2400000.0,
            payment_due_day=1,
            late_fee=40000.0,
            currency="RWF",
            status=LeaseStatus.ACTIVE,
            notes="Standard 12-month commercial retail lease."
        )
        db.add(lease2)

        # Tenancy 3: David in Unit A-01
        tenancy3 = Tenancy(
            id=uuid.uuid4(),
            tenant_id=tenant3_profile.id,
            landlord_id=landlord2_profile.id,
            property_id=prop2.id,
            unit_id=unit4.id,
            status=TenancyStatus.ACTIVE,
            start_date=date(2025, 6, 1),
            end_date=date(2026, 6, 1)
        )
        db.add(tenancy3)

        lease3 = Lease(
            id=uuid.uuid4(),
            tenancy_id=tenancy3.id,
            landlord_id=landlord2_profile.id,
            tenant_id=tenant3_profile.id,
            property_id=prop2.id,
            unit_id=unit4.id,
            start_date=date(2025, 6, 1),
            end_date=date(2026, 6, 1),
            monthly_rent=850000.0,
            security_deposit=1700000.0,
            payment_due_day=5,
            late_fee=25000.0,
            currency="RWF",
            status=LeaseStatus.ACTIVE,
            notes="Commercial lease agreement with options for extension."
        )
        db.add(lease3)

        await db.flush()

        # -------------------------------------------------------------
        # 5. SEED INVOICES & PAYMENTS & RECEIPTS
        # -------------------------------------------------------------
        # Invoice 1: Paid rent for Suite 101 (September 2026)
        inv1 = Invoice(
            id=uuid.uuid4(),
            invoice_number="INV-2026-0901",
            landlord_id=landlord1_profile.id,
            tenant_id=tenant1_profile.id,
            property_id=prop1.id,
            unit_id=unit1.id,
            tenancy_id=tenancy1.id,
            lease_id=lease1.id,
            invoice_type=InvoiceType.RENT,
            billing_period_start=date(2026, 9, 1),
            billing_period_end=date(2026, 9, 30),
            issue_date=date(2026, 9, 1),
            due_date=date(2026, 9, 5),
            subtotal=1500000.0,
            discount=0.0,
            late_fee=0.0,
            total_amount=1500000.0,
            amount_paid=1500000.0,
            balance_due=0.0,
            currency="RWF",
            status=InvoiceStatus.PAID
        )
        db.add(inv1)

        pay1 = Payment(
            id=uuid.uuid4(),
            payment_reference="PAY-MTN-998822",
            transaction_reference="MTN-MOMO-20260902-8812",
            invoice_id=inv1.id,
            tenancy_id=tenancy1.id,
            lease_id=lease1.id,
            landlord_id=landlord1_profile.id,
            tenant_id=tenant1_profile.id,
            property_id=prop1.id,
            unit_id=unit1.id,
            amount=1500000.0,
            currency="RWF",
            payment_method=PaymentMethod.MOBILE_MONEY,
            payment_channel=PaymentChannel.ONLINE,
            status=PaymentStatus.COMPLETED,
            paid_at=datetime(2026, 9, 2, 10, 15, tzinfo=timezone.utc),
            notes="Paid via MTN MoMo Pay"
        )
        db.add(pay1)

        rec1 = Receipt(
            id=uuid.uuid4(),
            receipt_number="REC-2026-0901",
            payment_id=pay1.id,
            invoice_id=inv1.id,
            landlord_id=landlord1_profile.id,
            tenant_id=tenant1_profile.id,
            property_id=prop1.id,
            unit_id=unit1.id,
            amount=1500000.0,
            currency="RWF",
            issued_at=datetime(2026, 9, 2, 10, 16, tzinfo=timezone.utc)
        )
        db.add(rec1)

        # Invoice 2: Paid rent for Boutique 102 (September 2026)
        inv2 = Invoice(
            id=uuid.uuid4(),
            invoice_number="INV-2026-0902",
            landlord_id=landlord1_profile.id,
            tenant_id=tenant2_profile.id,
            property_id=prop1.id,
            unit_id=unit2.id,
            tenancy_id=tenancy2.id,
            lease_id=lease2.id,
            invoice_type=InvoiceType.RENT,
            billing_period_start=date(2026, 9, 1),
            billing_period_end=date(2026, 9, 30),
            issue_date=date(2026, 9, 1),
            due_date=date(2026, 9, 1),
            subtotal=1200000.0,
            discount=0.0,
            late_fee=0.0,
            total_amount=1200000.0,
            amount_paid=1200000.0,
            balance_due=0.0,
            currency="RWF",
            status=InvoiceStatus.PAID
        )
        db.add(inv2)

        pay2 = Payment(
            id=uuid.uuid4(),
            payment_reference="PAY-BK-771122",
            transaction_reference="BK-FT-20260901-4412",
            invoice_id=inv2.id,
            tenancy_id=tenancy2.id,
            lease_id=lease2.id,
            landlord_id=landlord1_profile.id,
            tenant_id=tenant2_profile.id,
            property_id=prop1.id,
            unit_id=unit2.id,
            amount=1200000.0,
            currency="RWF",
            payment_method=PaymentMethod.BANK,
            payment_channel=PaymentChannel.ONLINE,
            status=PaymentStatus.COMPLETED,
            paid_at=datetime(2026, 9, 1, 14, 30, tzinfo=timezone.utc),
            notes="Paid via Bank of Kigali Direct Transfer"
        )
        db.add(pay2)

        rec2 = Receipt(
            id=uuid.uuid4(),
            receipt_number="REC-2026-0902",
            payment_id=pay2.id,
            invoice_id=inv2.id,
            landlord_id=landlord1_profile.id,
            tenant_id=tenant2_profile.id,
            property_id=prop1.id,
            unit_id=unit2.id,
            amount=1200000.0,
            currency="RWF",
            issued_at=datetime(2026, 9, 1, 14, 31, tzinfo=timezone.utc)
        )
        db.add(rec2)

        # Invoice 3: Issued rent for Office A-01 (Due Sept 5, 2026)
        inv3 = Invoice(
            id=uuid.uuid4(),
            invoice_number="INV-2026-0903",
            landlord_id=landlord2_profile.id,
            tenant_id=tenant3_profile.id,
            property_id=prop2.id,
            unit_id=unit4.id,
            tenancy_id=tenancy3.id,
            lease_id=lease3.id,
            invoice_type=InvoiceType.RENT,
            billing_period_start=date(2026, 9, 1),
            billing_period_end=date(2026, 9, 30),
            issue_date=date(2026, 9, 1),
            due_date=date(2026, 9, 5),
            subtotal=850000.0,
            discount=0.0,
            late_fee=0.0,
            total_amount=850000.0,
            amount_paid=0.0,
            balance_due=850000.0,
            currency="RWF",
            status=InvoiceStatus.ISSUED
        )
        db.add(inv3)

        await db.flush()

        # -------------------------------------------------------------
        # 6. SEED EXPENSES
        # -------------------------------------------------------------
        exp1 = Expense(
            id=uuid.uuid4(),
            landlord_id=landlord1_profile.id,
            property_id=prop1.id,
            description="Backup Generator Diesel Fuel Purchase - 200 Liters for Kigali Commercial Center",
            amount=280000.0,
            currency="RWF",
            category=ExpenseCategory.UTILITIES,
            expense_date=date(2026, 8, 25),
            vendor="SP Petroleum Kigali",
            reference="SP-REC-9088",
            status=ExpenseStatus.RECORDED
        )
        db.add(exp1)

        exp2 = Expense(
            id=uuid.uuid4(),
            landlord_id=landlord1_profile.id,
            property_id=prop1.id,
            description="24/7 Commercial Security Guarding Services for Kigali Heights building",
            amount=450000.0,
            currency="RWF",
            category=ExpenseCategory.SECURITY,
            expense_date=date(2026, 8, 30),
            vendor="ISCO Security Rwanda",
            reference="ISCO-INV-4412",
            status=ExpenseStatus.RECORDED
        )
        db.add(exp2)

        # -------------------------------------------------------------
        # 7. SEED MAINTENANCE REQUESTS & COMPLAINTS
        # -------------------------------------------------------------
        maint1 = MaintenanceRequest(
            id=uuid.uuid4(),
            request_number="MR-2026-001",
            tenant_id=tenant1_profile.id,
            landlord_id=landlord1_profile.id,
            property_id=prop1.id,
            unit_id=unit1.id,
            tenancy_id=tenancy1.id,
            title="Water pressure drop in Suite 101 restroom",
            description="The water pressure in executive restroom sink has dropped significantly over the past 2 days.",
            category=MaintenanceCategory.PLUMBING,
            priority=MaintenancePriority.MEDIUM,
            status=MaintenanceStatus.IN_PROGRESS,
            assigned_to="Kigali Plumbing Solutions",
            estimated_cost=35000.0
        )
        db.add(maint1)

        maint2 = MaintenanceRequest(
            id=uuid.uuid4(),
            request_number="MR-2026-002",
            tenant_id=tenant2_profile.id,
            landlord_id=landlord1_profile.id,
            property_id=prop1.id,
            unit_id=unit2.id,
            tenancy_id=tenancy2.id,
            title="HVAC Air Conditioning Filter Cleaning",
            description="Routine air conditioning unit filter cleaning and coil servicing for ground retail boutique.",
            category=MaintenanceCategory.HEATING_COOLING,
            priority=MaintenancePriority.LOW,
            status=MaintenanceStatus.RESOLVED,
            assigned_to="CoolAir Tech Rwanda",
            estimated_cost=25000.0,
            actual_cost=25000.0
        )
        db.add(maint2)

        cmp1 = Complaint(
            id=uuid.uuid4(),
            complaint_number="CMP-2026-001",
            tenant_id=tenant1_profile.id,
            landlord_id=landlord1_profile.id,
            property_id=prop1.id,
            unit_id=unit1.id,
            tenancy_id=tenancy1.id,
            subject="Unauthorized parking blocking loading dock 2",
            description="An unregistered delivery vehicle was parked in reserved loading bay 2 for over 3 hours during morning offloading.",
            category=ComplaintCategory.PROPERTY_CONDITION,
            priority=ComplaintPriority.MEDIUM,
            status=ComplaintStatus.UNDER_REVIEW
        )
        db.add(cmp1)

        # -------------------------------------------------------------
        # 8. SEED MESSAGES & NOTIFICATIONS
        # -------------------------------------------------------------
        msg1 = Message(
            id=uuid.uuid4(),
            sender_id=tenant1_user.id,
            recipient_id=landlord1_user.id,
            sender_role=UserRole.TENANT,
            property_id=prop1.id,
            message_type="GENERAL",
            content="Hello Jean-Paul, I have completed the rent payment for Suite 101 via MTN MoMo. Please confirm receipt. Thank you!",
            is_read=True
        )
        db.add(msg1)

        msg2 = Message(
            id=uuid.uuid4(),
            sender_id=landlord1_user.id,
            recipient_id=tenant1_user.id,
            sender_role=UserRole.LANDLORD,
            property_id=prop1.id,
            message_type="GENERAL",
            content="Hello Emmanuel, thank you for your prompt payment! The receipt REC-2026-0901 has been automatically generated in your portal.",
            is_read=False
        )
        db.add(msg2)

        notif1 = Notification(
            id=uuid.uuid4(),
            user_id=tenant1_user.id,
            type=NotificationType.PAYMENT_RECEIVED.value,
            title="Payment Received & Receipt Generated",
            message="Your rent payment of 1,500,000 RWF for Suite 101 has been verified. Receipt REC-2026-0901 is available for download.",
            channel=NotificationChannel.IN_APP,
            status=NotificationStatus.SENT,
            priority="MEDIUM",
            category="PAYMENT"
        )
        db.add(notif1)

        await db.commit()
        print("Database seeding completed successfully with all mock accounts, properties, leases, invoices, and transactions!")


if __name__ == "__main__":
    asyncio.run(seed_database())
