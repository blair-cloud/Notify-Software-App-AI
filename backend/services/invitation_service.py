import uuid
from typing import Optional
from datetime import datetime, date, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.security import hash_token
from backend.core.exceptions import NotFoundException, ConflictException, ForbiddenException, NotifyException
from backend.models import Invitation, Tenancy, Lease, Property, Unit, LandlordProfile, TenantProfile, InvitationStatus, TenancyStatus, LeaseStatus, UnitStatus, User, UserRole
from backend.repositories.invitation_repository import InvitationRepository
from backend.repositories.property_repository import PropertyRepository
from backend.repositories.unit_repository import UnitRepository
from backend.repositories.tenancy_repository import TenancyRepository
from backend.repositories.lease_repository import LeaseRepository
from backend.repositories.user_repository import UserRepository
from backend.schemas.invitation import InvitationCreate
from backend.utils.helpers import generate_random_token

class InvitationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.invitation_repo = InvitationRepository(db)
        self.property_repo = PropertyRepository(db)
        self.unit_repo = UnitRepository(db)
        self.tenancy_repo = TenancyRepository(db)
        self.lease_repo = LeaseRepository(db)
        self.user_repo = UserRepository(db)

    async def create_invitation(self, landlord: LandlordProfile, req: InvitationCreate) -> tuple[Invitation, str]:
        prop = await self.property_repo.get_by_id(req.property_id)
        if not prop or prop.landlord_id != landlord.id:
            raise ForbiddenException("Property not found or does not belong to you")

        unit = await self.unit_repo.get_by_id(req.unit_id)
        if not unit or unit.landlord_id != landlord.id or unit.property_id != req.property_id:
            raise ForbiddenException("Unit not found or does not belong to this property/landlord")

        raw_token = generate_random_token(32)
        token_hash = hash_token(raw_token)

        invitation = Invitation(
            landlord_id=landlord.id,
            tenant_email=req.tenant_email,
            tenant_phone=req.tenant_phone,
            property_id=req.property_id,
            unit_id=req.unit_id,
            token_hash=token_hash,
            status=InvitationStatus.PENDING,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        invitation = await self.invitation_repo.create(invitation)
        return invitation, raw_token

    async def get_invitation_by_token(self, raw_token: str) -> dict:
        token_hash = hash_token(raw_token)
        invitation = await self.invitation_repo.get_by_token_hash(token_hash)
        if not invitation:
            raise NotFoundException("Invalid or expired invitation token")

        if invitation.status != InvitationStatus.PENDING:
            raise ConflictException(f"Invitation is already {invitation.status.value}")

        if invitation.expires_at < datetime.now(timezone.utc):
            invitation.status = InvitationStatus.EXPIRED
            await self.invitation_repo.update(invitation)
            raise ConflictException("Invitation has expired")

        prop = await self.property_repo.get_by_id(invitation.property_id)
        unit = await self.unit_repo.get_by_id(invitation.unit_id)
        landlord = await self.user_repo.get_by_id(invitation.landlord_id)

        landlord_name = f"{landlord.first_name} {landlord.last_name}" if landlord else "Property Landlord"

        return {
            "id": str(invitation.id),
            "tenant_email": invitation.tenant_email,
            "tenant_phone": invitation.tenant_phone,
            "property_name": prop.name if prop else "Unknown Property",
            "unit_number": unit.unit_number if unit else "Unknown Unit",
            "monthly_rent": float(unit.monthly_rent) if unit else 0.0,
            "currency": unit.currency if unit else "RWF",
            "landlord_name": landlord_name,
            "status": invitation.status.value,
            "expires_at": invitation.expires_at.isoformat()
        }

    async def cancel_invitation(self, landlord: LandlordProfile, invitation_id: uuid.UUID) -> Invitation:
        invitation = await self.invitation_repo.get_by_id(invitation_id)
        if not invitation or invitation.landlord_id != landlord.id:
            raise ForbiddenException("Invitation not found or does not belong to you")

        if invitation.status != InvitationStatus.PENDING:
            raise ConflictException(f"Cannot cancel invitation with status {invitation.status.value}")

        invitation.status = InvitationStatus.CANCELLED
        return await self.invitation_repo.update(invitation)

    async def accept_invitation_transaction(self, raw_token: str, user: User) -> Tenancy:
        """
        Executes atomic invitation transaction:
        Validate invitation -> Validate landlord/property/unit -> Find/Verify tenant ->
        Create tenancy -> Mark invitation ACCEPTED -> Commit
        """
        token_hash = hash_token(raw_token)
        invitation = await self.invitation_repo.get_by_token_hash(token_hash)
        if not invitation:
            raise NotFoundException("Invalid or expired invitation token")

        if invitation.status != InvitationStatus.PENDING:
            raise ConflictException(f"Invitation is already {invitation.status.value}")

        if invitation.expires_at < datetime.now(timezone.utc):
            invitation.status = InvitationStatus.EXPIRED
            await self.invitation_repo.update(invitation)
            raise ConflictException("Invitation has expired")

        stmt_tenant = await self.user_repo.get_by_id(user.id)
        if not stmt_tenant or not stmt_tenant.tenant_profile:
            raise ForbiddenException("Only user with a tenant profile can accept invitation")

        tenant_profile = stmt_tenant.tenant_profile

        unit = await self.unit_repo.get_by_id(invitation.unit_id)
        if not unit:
            raise NotFoundException("Invited unit no longer exists")

        # Create Tenancy
        tenancy = Tenancy(
            tenant_id=tenant_profile.id,
            landlord_id=invitation.landlord_id,
            property_id=invitation.property_id,
            unit_id=invitation.unit_id,
            status=TenancyStatus.ACTIVE,
            start_date=date.today()
        )
        tenancy = await self.tenancy_repo.create(tenancy)

        # Create Default Lease
        lease = Lease(
            tenancy_id=tenancy.id,
            landlord_id=invitation.landlord_id,
            tenant_id=tenant_profile.id,
            property_id=invitation.property_id,
            unit_id=invitation.unit_id,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=365),
            monthly_rent=unit.monthly_rent,
            security_deposit=unit.monthly_rent,
            payment_due_day=5,
            currency=unit.currency,
            status=LeaseStatus.ACTIVE
        )
        await self.lease_repo.create(lease)

        # Update Unit & Invitation status
        unit.status = UnitStatus.OCCUPIED
        await self.unit_repo.update(unit)

        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_at = datetime.now(timezone.utc)
        await self.invitation_repo.update(invitation)

        return tenancy
