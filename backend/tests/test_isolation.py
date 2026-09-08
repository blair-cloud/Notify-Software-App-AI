import os
import uuid

import asyncio
import pytest
import pytest_asyncio
from datetime import date, timedelta, datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from backend.core.database import Base
from backend.core.exceptions import ForbiddenException, NotFoundException, ConflictException
from backend.models import User, LandlordProfile, TenantProfile, UserRole, UserStatus, Property, Unit, UnitStatus
from backend.repositories.user_repository import UserRepository
from backend.repositories.property_repository import PropertyRepository
from backend.repositories.unit_repository import UnitRepository
from backend.services.property_service import PropertyService
from backend.services.unit_service import UnitService
from backend.services.invitation_service import InvitationService
from backend.schemas.property import PropertyCreate
from backend.schemas.unit import UnitCreate
from backend.schemas.invitation import InvitationCreate

# These tests exercise the service layer's ownership rules against a real
# database. SQLite is gone, so they need a PostgreSQL URL - point TEST_DATABASE_URL
# at a scratch database (a local Postgres, or a second Supabase project). They
# skip rather than fail when one is not configured, because they create and drop
# the whole schema and must never be aimed at production data.
TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", "")

pytestmark = pytest.mark.skipif(
    not TEST_DB_URL,
    reason="Set TEST_DATABASE_URL to a scratch PostgreSQL database to run the isolation tests.",
)


@pytest_asyncio.fixture
async def async_session():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.mark.asyncio
async def test_security_isolation_scenarios(async_session: AsyncSession):
    user_repo = UserRepository(async_session)
    prop_service = PropertyService(async_session)
    unit_service = UnitService(async_session)
    inv_service = InvitationService(async_session)

    # Setup Landlord A
    u_la = User(id=uuid.uuid4(), email="la@notify.rw", phone="+250788111111", first_name="Landlord", last_name="A", role=UserRole.LANDLORD)
    await user_repo.create_user(u_la)
    lp_a = LandlordProfile(user_id=u_la.id, business_name="Landlord A Corp")
    await user_repo.create_landlord_profile(lp_a)

    # Setup Landlord B
    u_lb = User(id=uuid.uuid4(), email="lb@notify.rw", phone="+250788222222", first_name="Landlord", last_name="B", role=UserRole.LANDLORD)
    await user_repo.create_user(u_lb)
    lp_b = LandlordProfile(user_id=u_lb.id, business_name="Landlord B Corp")
    await user_repo.create_landlord_profile(lp_b)

    # Setup Tenant A
    u_ta = User(id=uuid.uuid4(), email="ta@notify.rw", phone="+250788333333", first_name="Tenant", last_name="A", role=UserRole.TENANT)
    await user_repo.create_user(u_ta)
    tp_a = TenantProfile(user_id=u_ta.id, national_id="1199000111")
    await user_repo.create_tenant_profile(tp_a)

    # Create Property A for Landlord A
    prop_a = await prop_service.create_property(lp_a, PropertyCreate(name="Property A", address="Kigali Street 1"))
    unit_a = await unit_service.create_unit(lp_a, UnitCreate(property_id=prop_a.id, unit_number="A1", monthly_rent=100000))

    # Create Property B for Landlord B
    prop_b = await prop_service.create_property(lp_b, PropertyCreate(name="Property B", address="Kigali Street 2"))
    unit_b = await unit_service.create_unit(lp_b, UnitCreate(property_id=prop_b.id, unit_number="B1", monthly_rent=200000))

    # Test 1: Landlord A requests Landlord B's property -> ForbiddenException / NotFoundException
    with pytest.raises(ForbiddenException):
        await prop_service.get_property_by_id(lp_a, prop_b.id)

    # Test 2: Landlord A requests Landlord B's unit -> ForbiddenException / NotFoundException
    with pytest.raises(ForbiddenException):
        await unit_service.get_unit_by_id(lp_a, unit_b.id)

    # Test 7: Landlord A attempts to invite a tenant to Landlord B's unit -> ForbiddenException
    with pytest.raises(ForbiddenException):
        await inv_service.create_invitation(
            lp_a,
            InvitationCreate(
                tenant_email="newtenant@notify.rw",
                tenant_phone="+250788444444",
                property_id=prop_b.id,
                unit_id=unit_b.id
            )
        )

    # Test 5 & 6: Invitation flow security
    inv_a, raw_token_a = await inv_service.create_invitation(
        lp_a,
        InvitationCreate(
            tenant_email="ta@notify.rw",
            tenant_phone="+250788333333",
            property_id=prop_a.id,
            unit_id=unit_a.id
        )
    )

    # Tenant A accepts invitation -> Success
    tenancy = await inv_service.accept_invitation_transaction(raw_token_a, u_ta)
    assert tenancy is not None
    assert tenancy.landlord_id == lp_a.id

    # Test 6: Tenant attempts to reuse an accepted invitation -> ConflictException
    with pytest.raises(ConflictException):
        await inv_service.accept_invitation_transaction(raw_token_a, u_ta)
