import secrets
import uuid
from typing import Sequence, List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import (
    User, LandlordProfile, TenantProfile, Property, Unit, Tenancy, Lease, 
    Invoice, Payment, Expense, MaintenanceRequest, Notification, UserStatus, UserRole, UnitStatus, LeaseStatus
)
from backend.schemas.admin import AdminDashboardStats, UserStatusUpdate, UserRoleUpdate, UserCreateAdmin
from backend.repositories.user_repository import UserRepository
from backend.core.exceptions import NotFoundException
from backend.integrations.supabase_admin import create_auth_user, SupabaseAdminError

class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def get_dashboard_stats(self) -> AdminDashboardStats:
        total_users = (await self.db.execute(select(func.count(User.id)))).scalar() or 0
        total_landlords = (await self.db.execute(select(func.count(LandlordProfile.id)))).scalar() or 0
        total_tenants = (await self.db.execute(select(func.count(TenantProfile.id)))).scalar() or 0
        total_properties = (await self.db.execute(select(func.count(Property.id)))).scalar() or 0
        total_units = (await self.db.execute(select(func.count(Unit.id)))).scalar() or 0
        occupied_units = (await self.db.execute(select(func.count(Unit.id)).where(Unit.status == UnitStatus.OCCUPIED))).scalar() or 0
        vacant_units = (await self.db.execute(select(func.count(Unit.id)).where(Unit.status == UnitStatus.VACANT))).scalar() or 0
        active_tenancies = (await self.db.execute(select(func.count(Tenancy.id)))).scalar() or 0
        active_leases = (await self.db.execute(select(func.count(Lease.id)).where(Lease.status == LeaseStatus.ACTIVE))).scalar() or 0
        expiring_leases = (await self.db.execute(select(func.count(Lease.id)).where(Lease.status == LeaseStatus.EXPIRING_SOON))).scalar() or 0
        
        # Financial aggregates
        total_expected = (await self.db.execute(select(func.sum(Invoice.total_amount)))).scalar() or 0.0
        total_collected = (await self.db.execute(select(func.sum(Invoice.amount_paid)))).scalar() or 0.0
        total_outstanding = (await self.db.execute(select(func.sum(Invoice.balance_due)))).scalar() or 0.0
        collection_rate = (total_collected / total_expected * 100.0) if total_expected > 0 else 0.0

        # Pending items
        pending_payments = (await self.db.execute(select(func.count(Payment.id)).where(Payment.status == 'AWAITING_VERIFICATION'))).scalar() or 0
        urgent_maint = (await self.db.execute(select(func.count(MaintenanceRequest.id)).where(MaintenanceRequest.priority == 'URGENT'))).scalar() or 0

        return AdminDashboardStats(
            total_users=total_users,
            total_landlords=total_landlords,
            total_tenants=total_tenants,
            total_properties=total_properties,
            total_units=total_units,
            occupied_units=occupied_units,
            vacant_units=vacant_units,
            active_tenancies=active_tenancies,
            active_leases=active_leases,
            expiring_leases=expiring_leases,
            expected_rent=float(total_expected),
            collected_rent=float(total_collected),
            outstanding_balance=float(total_outstanding),
            collection_rate=round(float(collection_rate), 1),
            pending_payments=pending_payments,
            urgent_maintenance=urgent_maint,
            missing_docs_count=0,
            compliance_score=98.5,
            currency="RWF"
        )

    async def get_all_users(self) -> Sequence[User]:
        result = await self.db.execute(select(User))
        return result.scalars().all()

    async def create_user(self, req: UserCreateAdmin) -> User:
        """
        Create an account as an administrator.

        The identity is created in Supabase Auth, which hashes the password and
        owns the credential. The row written here is only the application
        profile - it deliberately has nowhere to put a password.
        """
        existing = await self.user_repo.get_by_email(req.email)
        if existing:
            raise ValueError(f"User with email {req.email} already exists")

        try:
            auth_user = await create_auth_user(
                email=req.email,
                password=req.password or secrets.token_urlsafe(16),
                role=req.role.value,
                phone=req.phone,
                first_name=req.first_name,
                last_name=req.last_name,
            )
        except SupabaseAdminError as exc:
            raise ValueError(f"Could not create the account in Supabase Auth: {exc}") from exc

        auth_id = uuid.UUID(auth_user["id"])

        # The on_auth_user_created trigger normally inserts the profile; take
        # whichever row exists so this works either way.
        existing_profile = (
            await self.db.execute(select(User).where(User.id == auth_id))
        ).scalar_one_or_none()

        if existing_profile:
            new_user = existing_profile
            new_user.first_name = req.first_name
            new_user.last_name = req.last_name
            new_user.email = req.email
            if req.phone:
                new_user.phone = req.phone
            new_user.role = req.role
            new_user.status = UserStatus.ACTIVE
        else:
            new_user = User(
                id=auth_id,
                first_name=req.first_name,
                last_name=req.last_name,
                email=req.email,
                phone=req.phone or f"pending-{str(auth_id)[:8]}",
                role=req.role,
                status=UserStatus.ACTIVE,
            )
            self.db.add(new_user)

        await self.db.flush()

        if req.role == UserRole.LANDLORD:
            landlord_profile = LandlordProfile(
                id=uuid.uuid4(),
                user_id=new_user.id,
                business_name=req.business_name or f"{req.last_name} Properties Ltd"
            )
            self.db.add(landlord_profile)
        elif req.role == UserRole.TENANT:
            tenant_profile = TenantProfile(
                id=uuid.uuid4(),
                user_id=new_user.id
            )
            self.db.add(tenant_profile)

        await self.db.flush()
        return new_user

    async def update_user_status(self, user_id: uuid.UUID, req: UserStatusUpdate) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")
        user.status = req.status
        await self.db.flush()
        return user

    async def update_user_role(self, user_id: uuid.UUID, req: UserRoleUpdate) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")
        user.role = req.role
        await self.db.flush()
        return user

    async def reassign_property_landlord(self, property_id: uuid.UUID, landlord_id: uuid.UUID) -> Property:
        prop = (await self.db.execute(select(Property).where(Property.id == property_id))).scalar_one_or_none()
        if not prop:
            raise NotFoundException("Property not found")
        prop.landlord_id = landlord_id
        await self.db.flush()
        return prop

