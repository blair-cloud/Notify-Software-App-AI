import asyncio
import logging
import uuid
from datetime import date, datetime, timezone, timedelta
from sqlalchemy import select, text

from backend.core.database import AsyncSessionLocal, engine, Base
from backend.core.security import hash_password

from backend.models.user import User
from backend.models.landlord import LandlordProfile
from backend.models.tenant import TenantProfile
from backend.models.property import Property
from backend.models.unit import Unit
from backend.models.tenancy import Tenancy
from backend.models.maintenance import (
    MaintenanceRequest,
    MaintenanceAttachment,
    MaintenanceComment,
    MaintenanceWorker,
)
from backend.models.complaint import Complaint, ComplaintComment
from backend.models.notification import Notification
from backend.models.role import (
    UserRole,
    UserStatus,
    UserLanguage,
    BusinessType,
    VerificationStatus,
    PropertyType,
    PropertyStatus,
    UnitStatus,
    TenancyStatus,
    MaintenanceCategory,
    MaintenancePriority,
    MaintenanceStatus,
    WorkerSpecialization,
    ComplaintCategory,
    ComplaintPriority,
    ComplaintStatus,
    NotificationChannel,
    NotificationStatus,
    NotificationType,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("development_seed")


async def seed_development_data():
    logger.info("Initializing database schema if not present...")
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE notifications ADD COLUMN entity_type VARCHAR(100)"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE notifications ADD COLUMN entity_id CHAR(32)"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT 0"))
        except Exception:
            pass
        await conn.run_sync(Base.metadata.create_all)


    async with AsyncSessionLocal() as session:
        # 1. System Admin Account
        admin_email = "admin@notify.test"
        admin_res = await session.execute(select(User).where(User.email == admin_email))
        admin_user = admin_res.scalar_one_or_none()

        if not admin_user:
            logger.info(f"Creating System Admin: {admin_email}")
            admin_user = User(
                email=admin_email,
                phone="+250780000001",
                password_hash=hash_password("NotifyAdmin@2026!"),
                first_name="Notify",
                last_name="Administrator",
                role=UserRole.SYSTEM_ADMIN,
                status=UserStatus.ACTIVE,
                email_verified=True,
                phone_verified=True,
                language=UserLanguage.EN,
            )
            session.add(admin_user)
        else:
            admin_user.password_hash = hash_password("NotifyAdmin@2026!")
            admin_user.status = UserStatus.ACTIVE

        # 2. Landlord Account
        landlord_email = "landlord@notify.test"
        landlord_res = await session.execute(select(User).where(User.email == landlord_email))
        landlord_user = landlord_res.scalar_one_or_none()

        if not landlord_user:
            logger.info(f"Creating Landlord: {landlord_email}")
            landlord_user = User(
                email=landlord_email,
                phone="+250780000002",
                password_hash=hash_password("NotifyLandlord@2026!"),
                first_name="Test",
                last_name="Landlord",
                role=UserRole.LANDLORD,
                status=UserStatus.ACTIVE,
                email_verified=True,
                phone_verified=True,
                language=UserLanguage.EN,
            )
            session.add(landlord_user)
            await session.flush()

            landlord_profile = LandlordProfile(
                user_id=landlord_user.id,
                business_type=BusinessType.COMPANY,
                business_name="Notify Dev Properties Ltd",
                address="KN 5 Ave",
                district="Nyarugenge",
                city="Kigali",
                country="Rwanda",
                verification_status=VerificationStatus.VERIFIED,
            )
            session.add(landlord_profile)
            await session.flush()
        else:
            landlord_user.password_hash = hash_password("NotifyLandlord@2026!")
            landlord_user.status = UserStatus.ACTIVE
            await session.flush()
            lp_res = await session.execute(select(LandlordProfile).where(LandlordProfile.user_id == landlord_user.id))
            landlord_profile = lp_res.scalar_one_or_none()

        # 3. Tenant Account
        tenant_email = "tenant@notify.test"
        tenant_res = await session.execute(select(User).where(User.email == tenant_email))
        tenant_user = tenant_res.scalar_one_or_none()

        if not tenant_user:
            logger.info(f"Creating Tenant: {tenant_email}")
            tenant_user = User(
                email=tenant_email,
                phone="+250780000003",
                password_hash=hash_password("NotifyTenant@2026!"),
                first_name="Test",
                last_name="Tenant",
                role=UserRole.TENANT,
                status=UserStatus.ACTIVE,
                email_verified=True,
                phone_verified=True,
                language=UserLanguage.EN,
            )
            session.add(tenant_user)
            await session.flush()

            tenant_profile = TenantProfile(
                user_id=tenant_user.id,
                national_id="1199580012345678",
                occupation="Software Engineer",
                emergency_name="Jane Tenant",
                emergency_phone="+250780000009",
                verification_status=VerificationStatus.VERIFIED,
            )
            session.add(tenant_profile)
            await session.flush()
        else:
            tenant_user.password_hash = hash_password("NotifyTenant@2026!")
            tenant_user.status = UserStatus.ACTIVE
            await session.flush()
            tp_res = await session.execute(select(TenantProfile).where(TenantProfile.user_id == tenant_user.id))
            tenant_profile = tp_res.scalar_one_or_none()

        # 4. Property for Landlord
        test_property = None
        if landlord_profile:
            prop_res = await session.execute(
                select(Property).where(
                    Property.landlord_id == landlord_profile.id,
                    Property.name == "Notify Dev Center",
                )
            )
            test_property = prop_res.scalar_one_or_none()

            if not test_property:
                logger.info("Creating Test Property: Notify Dev Center")
                test_property = Property(
                    landlord_id=landlord_profile.id,
                    name="Notify Dev Center",
                    property_type=PropertyType.COMMERCIAL,
                    description="Modern commercial complex in downtown Kigali",
                    address="KN 5 Ave, Plot 12",
                    district="Nyarugenge",
                    sector="Nyarugenge",
                    status=PropertyStatus.ACTIVE,
                )
                session.add(test_property)
                await session.flush()

            # 5. Unit 101 for Test Property
            unit_res = await session.execute(
                select(Unit).where(
                    Unit.property_id == test_property.id,
                    Unit.unit_number == "101",
                )
            )
            test_unit = unit_res.scalar_one_or_none()

            if not test_unit:
                logger.info("Creating Unit 101...")
                test_unit = Unit(
                    property_id=test_property.id,
                    landlord_id=landlord_profile.id,
                    unit_number="101",
                    floor=1,
                    unit_type="Retail Shop",
                    monthly_rent=250000.0,
                    currency="RWF",
                    status=UnitStatus.OCCUPIED,
                    description="Ground floor retail unit with street view",
                )
                session.add(test_unit)
                await session.flush()
            else:
                test_unit.status = UnitStatus.OCCUPIED

            # 6. Tenancy linking Tenant to Unit 101
            test_tenancy = None
            if tenant_profile and test_unit:
                tenancy_res = await session.execute(
                    select(Tenancy).where(
                        Tenancy.unit_id == test_unit.id,
                        Tenancy.tenant_id == tenant_profile.id,
                    )
                )
                test_tenancy = tenancy_res.scalar_one_or_none()

                if not test_tenancy:
                    logger.info("Creating Tenancy linking Tenant to Unit 101...")
                    test_tenancy = Tenancy(
                        tenant_id=tenant_profile.id,
                        landlord_id=landlord_profile.id,
                        property_id=test_property.id,
                        unit_id=test_unit.id,
                        status=TenancyStatus.ACTIVE,
                        start_date=date(2026, 1, 1),
                    )
                    session.add(test_tenancy)
                    await session.flush()

            # 7. Seed Phase 4 Maintenance Workers
            worker1_res = await session.execute(select(MaintenanceWorker).where(MaintenanceWorker.phone == "+250788112233"))
            if not worker1_res.scalar_one_or_none():
                w1 = MaintenanceWorker(
                    landlord_id=landlord_profile.id,
                    name="Jean-Claude Ndayisaba",
                    phone="+250788112233",
                    specialization=WorkerSpecialization.PLUMBER,
                    notes="Certified plumbing technician, available Mon-Sat",
                )
                w2 = MaintenanceWorker(
                    landlord_id=landlord_profile.id,
                    name="Emmanuel Habimana",
                    phone="+250788445566",
                    specialization=WorkerSpecialization.ELECTRICIAN,
                    notes="Master certified high voltage & lighting technician",
                )
                w3 = MaintenanceWorker(
                    landlord_id=landlord_profile.id,
                    name="Patrick Mugisha",
                    phone="+250788778899",
                    specialization=WorkerSpecialization.GENERAL,
                    notes="General contractor, structural fixes and lock replacements",
                )
                session.add_all([w1, w2, w3])
                await session.flush()

            # 8. Seed Phase 4 Maintenance Requests
            if test_tenancy:
                mr1_res = await session.execute(select(MaintenanceRequest).where(MaintenanceRequest.request_number == "MR-2026-000001"))
                if not mr1_res.scalar_one_or_none():
                    now = datetime.now(timezone.utc)
                    # MR 1: In progress with technician scheduled
                    mr1 = MaintenanceRequest(
                        request_number="MR-2026-000001",
                        tenant_id=tenant_profile.id,
                        landlord_id=landlord_profile.id,
                        property_id=test_property.id,
                        unit_id=test_unit.id,
                        tenancy_id=test_tenancy.id,
                        title="Water leak under main washbasin counter",
                        description="Water is dripping steadily from the flex hose connector under the basin. Bucket is filling up every 4 hours.",
                        category=MaintenanceCategory.PLUMBING,
                        priority=MaintenancePriority.HIGH,
                        status=MaintenanceStatus.IN_PROGRESS,
                        assigned_to="Jean-Claude Ndayisaba",
                        scheduled_date=now + timedelta(days=1),
                        scheduled_time="10:00 AM",
                        estimated_cost=25000.0,
                        acknowledged_at=now - timedelta(days=1),
                        scheduled_at=now - timedelta(hours=18),
                        created_at=now - timedelta(days=1, hours=2),
                        updated_at=now - timedelta(hours=18),
                    )
                    session.add(mr1)
                    await session.flush()

                    # Comments on MR 1
                    c1 = MaintenanceComment(
                        maintenance_request_id=mr1.id,
                        user_id=tenant_user.id,
                        author_name="Test Tenant",
                        author_role="TENANT",
                        message="Please send technician in the morning if possible, our store opens at 9:00 AM.",
                        created_at=now - timedelta(days=1),
                    )
                    c2 = MaintenanceComment(
                        maintenance_request_id=mr1.id,
                        user_id=landlord_user.id,
                        author_name="Notify Dev Properties Ltd",
                        author_role="LANDLORD",
                        message="Acknowledged. Jean-Claude will arrive tomorrow at 10:00 AM sharp with replacement seals.",
                        created_at=now - timedelta(hours=18),
                    )
                    session.add_all([c1, c2])

                    # MR 2: Resolved - Ready for Tenant Confirmation
                    mr2 = MaintenanceRequest(
                        request_number="MR-2026-000002",
                        tenant_id=tenant_profile.id,
                        landlord_id=landlord_profile.id,
                        property_id=test_property.id,
                        unit_id=test_unit.id,
                        tenancy_id=test_tenancy.id,
                        title="Entrance security lock cylinder sticking",
                        description="Key gets stuck when turning to deadbolt position. Needs lubrication or cylinder replacement.",
                        category=MaintenanceCategory.SECURITY,
                        priority=MaintenancePriority.MEDIUM,
                        status=MaintenanceStatus.RESOLVED,
                        assigned_to="Patrick Mugisha",
                        scheduled_date=now - timedelta(days=2),
                        scheduled_time="02:00 PM",
                        estimated_cost=35000.0,
                        actual_cost=35000.0,
                        landlord_notes="Replaced lock cylinder with a brand new Yale High Security deadbolt. Tested 5 times smoothly.",
                        acknowledged_at=now - timedelta(days=3),
                        scheduled_at=now - timedelta(days=2, hours=10),
                        resolved_at=now - timedelta(days=1),
                        created_at=now - timedelta(days=3, hours=4),
                        updated_at=now - timedelta(days=1),
                    )
                    session.add(mr2)
                    await session.flush()

                    # MR 3: Closed completed
                    mr3 = MaintenanceRequest(
                        request_number="MR-2026-000003",
                        tenant_id=tenant_profile.id,
                        landlord_id=landlord_profile.id,
                        property_id=test_property.id,
                        unit_id=test_unit.id,
                        tenancy_id=test_tenancy.id,
                        title="Fluorescent tube fixture replacement",
                        description="Overhead display lights are buzzing and blinking.",
                        category=MaintenanceCategory.ELECTRICAL,
                        priority=MaintenancePriority.LOW,
                        status=MaintenanceStatus.CLOSED,
                        assigned_to="Emmanuel Habimana",
                        estimated_cost=15000.0,
                        actual_cost=15000.0,
                        tenant_notes="Confirmed fixed. New daylight LED tubes work wonderfully.",
                        acknowledged_at=now - timedelta(days=10),
                        resolved_at=now - timedelta(days=8),
                        closed_at=now - timedelta(days=7),
                        created_at=now - timedelta(days=11),
                        updated_at=now - timedelta(days=7),
                    )
                    session.add(mr3)

                    # MR 4: Urgent newly submitted
                    mr4 = MaintenanceRequest(
                        request_number="MR-2026-000004",
                        tenant_id=tenant_profile.id,
                        landlord_id=landlord_profile.id,
                        property_id=test_property.id,
                        unit_id=test_unit.id,
                        tenancy_id=test_tenancy.id,
                        title="Ceiling water seepage near exterior AC unit",
                        description="Noticed water seepage stains expanding on drywall ceiling following heavy afternoon downpour.",
                        category=MaintenanceCategory.STRUCTURAL,
                        priority=MaintenancePriority.URGENT,
                        status=MaintenanceStatus.SUBMITTED,
                        created_at=now - timedelta(hours=3),
                        updated_at=now - timedelta(hours=3),
                    )
                    session.add(mr4)

            # 9. Seed Phase 4 Complaints
            if test_tenancy:
                cmp1_res = await session.execute(select(Complaint).where(Complaint.complaint_number == "CMP-2026-000001"))
                if not cmp1_res.scalar_one_or_none():
                    now = datetime.now(timezone.utc)
                    cmp1 = Complaint(
                        complaint_number="CMP-2026-000001",
                        tenant_id=tenant_profile.id,
                        landlord_id=landlord_profile.id,
                        property_id=test_property.id,
                        unit_id=test_unit.id,
                        tenancy_id=test_tenancy.id,
                        subject="Early morning loading truck engine idling noise",
                        description="Heavy delivery trucks are idling their diesel engines right behind our unit windows starting at 5:00 AM.",
                        category=ComplaintCategory.NOISE,
                        priority=ComplaintPriority.MEDIUM,
                        status=ComplaintStatus.UNDER_REVIEW,
                        landlord_response="We have contacted the commercial complex logistics manager to restrict delivery bay engine idling before 7:30 AM.",
                        acknowledged_at=now - timedelta(days=2),
                        created_at=now - timedelta(days=3),
                        updated_at=now - timedelta(days=1),
                    )
                    session.add(cmp1)
                    await session.flush()

                    cc1 = ComplaintComment(
                        complaint_id=cmp1.id,
                        user_id=tenant_user.id,
                        author_name="Test Tenant",
                        author_role="TENANT",
                        message="It happened again this Tuesday morning. Thank you for addressing it.",
                        created_at=now - timedelta(days=2),
                    )
                    cc2 = ComplaintComment(
                        complaint_id=cmp1.id,
                        user_id=landlord_user.id,
                        author_name="Notify Dev Properties Ltd",
                        author_role="LANDLORD",
                        message="Security guard post has been instructed to turn away pre-7:30 AM idling vehicles.",
                        created_at=now - timedelta(days=1),
                    )
                    session.add_all([cc1, cc2])

                    cmp2 = Complaint(
                        complaint_number="CMP-2026-000002",
                        tenant_id=tenant_profile.id,
                        landlord_id=landlord_profile.id,
                        property_id=test_property.id,
                        unit_id=test_unit.id,
                        tenancy_id=test_tenancy.id,
                        subject="Corridor emergency lighting battery low indicator",
                        description="The backup battery beeper on the 1st floor corridor exit sign is beeping intermittently.",
                        category=ComplaintCategory.SECURITY,
                        priority=ComplaintPriority.HIGH,
                        status=ComplaintStatus.RESOLVED,
                        landlord_response="Battery pack replaced and test button verified with facility engineer.",
                        acknowledged_at=now - timedelta(days=6),
                        resolved_at=now - timedelta(days=4),
                        created_at=now - timedelta(days=7),
                        updated_at=now - timedelta(days=4),
                    )
                    session.add(cmp2)

            # 10. Seed Notifications
            now = datetime.now(timezone.utc)
            notif1 = Notification(
                user_id=tenant_user.id,
                type=NotificationType.MAINTENANCE_RESOLVED.value,
                title="Issue Marked as Resolved",
                message="Landlord marked MR-2026-000002 ('Entrance security lock cylinder sticking') as resolved. Please review and confirm.",
                entity_type="MAINTENANCE",
                is_read=False,
                created_at=now - timedelta(days=1),
                sent_at=now - timedelta(days=1),
            )
            notif2 = Notification(
                user_id=tenant_user.id,
                type=NotificationType.MAINTENANCE_SCHEDULED.value,
                title="Maintenance Visit Scheduled",
                message="Technician Jean-Claude Ndayisaba is scheduled for tomorrow at 10:00 AM regarding MR-2026-000001.",
                entity_type="MAINTENANCE",
                is_read=False,
                created_at=now - timedelta(hours=18),
                sent_at=now - timedelta(hours=18),
            )
            notif3 = Notification(
                user_id=landlord_user.id,
                type=NotificationType.MAINTENANCE_CREATED.value,
                title="Urgent Maintenance Request",
                message="New urgent maintenance request 'Ceiling water seepage near exterior AC unit' (MR-2026-000004) submitted.",
                entity_type="MAINTENANCE",
                is_read=False,
                created_at=now - timedelta(hours=3),
                sent_at=now - timedelta(hours=3),
            )
            session.add_all([notif1, notif2, notif3])

        await session.commit()
        logger.info("Phase 4 Development database seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_development_data())
