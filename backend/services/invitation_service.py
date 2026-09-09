import logging
import uuid
from typing import Optional
from datetime import datetime, date, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.config import settings
from backend.core.security import hash_token
from backend.core.exceptions import NotFoundException, ConflictException, ForbiddenException, NotifyException
from backend.models import (
    Invitation, Tenancy, Lease, Property, Unit, LandlordProfile, TenantProfile,
    InvitationStatus, TenancyStatus, LeaseStatus, UnitStatus, User, UserRole,
)
from backend.repositories.invitation_repository import InvitationRepository
from backend.repositories.property_repository import PropertyRepository
from backend.repositories.unit_repository import UnitRepository
from backend.repositories.tenancy_repository import TenancyRepository
from backend.repositories.lease_repository import LeaseRepository
from backend.repositories.user_repository import UserRepository
from backend.schemas.invitation import InvitationCreate, DeliveryChannelResult
from backend.utils.helpers import generate_random_token
from backend.utils.validators import split_full_name

logger = logging.getLogger("invitation_service")


def _as_utc(value):
    """
    SQLite gives datetimes back without a timezone, and comparing one of those
    against an aware `datetime.now(timezone.utc)` raises. Treat a naive value as
    the UTC it was stored as.
    """
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


class InvitationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.invitation_repo = InvitationRepository(db)
        self.property_repo = PropertyRepository(db)
        self.unit_repo = UnitRepository(db)
        self.tenancy_repo = TenancyRepository(db)
        self.lease_repo = LeaseRepository(db)
        self.user_repo = UserRepository(db)

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    async def create_invitation(
        self, landlord: LandlordProfile, req: InvitationCreate
    ) -> tuple[Invitation, str, TenantProfile]:
        """
        Send an invitation and make the tenant visible immediately.

        Creates a "shell" TenantProfile (no auth account yet - user_id stays
        NULL) and an INVITED Tenancy right now, rather than waiting for the
        invited person to sign up. That is what lets them show up in the
        Tenants list and be assigned a lease straight away: everything downstream
        (leases, invoices, payments) is keyed off this stable tenant_profiles.id,
        never off the auth account, so none of it has to wait on that account
        existing.
        """
        prop = await self.property_repo.get_by_id(req.property_id)
        if not prop or prop.landlord_id != landlord.id:
            raise ForbiddenException("Property not found or does not belong to you")

        unit = await self.unit_repo.get_by_id(req.unit_id)
        if not unit or unit.landlord_id != landlord.id or unit.property_id != req.property_id:
            raise ForbiddenException("Unit not found or does not belong to this property/landlord")

        first_name, last_name = split_full_name(req.tenant_name) if req.tenant_name else ("", "")

        shell = TenantProfile(
            user_id=None,
            pending_first_name=first_name or None,
            pending_last_name=last_name or None,
            pending_email=req.tenant_email,
            pending_phone=req.tenant_phone,
        )
        self.db.add(shell)
        await self.db.flush()

        tenancy = Tenancy(
            tenant_id=shell.id,
            landlord_id=landlord.id,
            property_id=req.property_id,
            unit_id=req.unit_id,
            status=TenancyStatus.INVITED,
            start_date=date.today(),
        )
        self.db.add(tenancy)

        raw_token = generate_random_token(32)
        token_hash = hash_token(raw_token)

        invitation = Invitation(
            landlord_id=landlord.id,
            tenant_email=req.tenant_email,
            tenant_phone=req.tenant_phone,
            tenant_name=req.tenant_name,
            property_id=req.property_id,
            unit_id=req.unit_id,
            tenant_profile_id=shell.id,
            token_hash=token_hash,
            status=InvitationStatus.PENDING,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        invitation = await self.invitation_repo.create(invitation)

        return invitation, raw_token, shell

    async def send_invitation_notifications(
        self,
        invitation: Invitation,
        raw_token: str,
        property_name: str,
        unit_number: str,
        landlord_name: str = "Your landlord",
    ) -> tuple[DeliveryChannelResult, DeliveryChannelResult, DeliveryChannelResult]:
        """
        Deliver the invitation link by email, SMS, and WhatsApp, independently.
        One channel failing must never hide whether the others worked - the
        caller gets all three results and can tell the landlord exactly what
        happened.
        """
        from backend.integrations.email import send_email_message
        from backend.integrations.sms import send_sms_message
        from backend.models import WhatsAppMessageType
        from backend.services.whatsapp_service import WhatsAppService

        link = f"{settings.FRONTEND_URL.rstrip('/')}/accept-invitation?token={raw_token}"
        first_name = (invitation.tenant_name or "").split()[0] if invitation.tenant_name else "there"

        email_result = DeliveryChannelResult(attempted=False, ok=False)
        if invitation.tenant_email:
            try:
                subject = f"You're invited to {property_name} - Notify"
                body = (
                    f"Hello {first_name},\n\n"
                    f"You have been invited to become the tenant of Unit {unit_number} at "
                    f"{property_name}.\n\nComplete your account here:\n{link}\n\n"
                    "This link expires in 7 days."
                )
                html = (
                    f"<p>Hello {first_name},</p>"
                    f"<p>You have been invited to become the tenant of "
                    f"<strong>Unit {unit_number}</strong> at <strong>{property_name}</strong>.</p>"
                    f"<p><a href=\"{link}\" style=\"display:inline-block;background:#331A6F;color:#fff;"
                    f"text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;\">"
                    f"Accept invitation</a></p>"
                    f"<p style=\"color:#64748B;font-size:13px;\">This link expires in 7 days.</p>"
                )
                result = await send_email_message(
                    invitation.tenant_email, subject, body, html_content=html,
                    metadata={"purpose": "TENANT_INVITATION"},
                )
                email_result = DeliveryChannelResult(
                    attempted=True, ok=result.ok,
                    detail=None if result.ok else (result.error or "Delivery failed"),
                )
            except Exception as exc:  # noqa: BLE001 - one channel's failure must not sink the other
                logger.exception("Failed to send invitation email: %s", exc)
                email_result = DeliveryChannelResult(attempted=True, ok=False, detail=str(exc))

        sms_result = DeliveryChannelResult(attempted=False, ok=False)
        if invitation.tenant_phone:
            try:
                message = (
                    f"Notify: You're invited to rent Unit {unit_number} at {property_name}. "
                    f"Complete your account: {link}"
                )
                result = await send_sms_message(invitation.tenant_phone, message)
                sms_result = DeliveryChannelResult(
                    attempted=True, ok=result.ok,
                    detail=None if result.ok else (result.error or "Delivery failed"),
                )
            except Exception as exc:  # noqa: BLE001
                logger.exception("Failed to send invitation SMS: %s", exc)
                sms_result = DeliveryChannelResult(attempted=True, ok=False, detail=str(exc))

        whatsapp_result = DeliveryChannelResult(attempted=False, ok=False)
        if invitation.tenant_phone:
            try:
                params, text = WhatsAppService.build_invitation(
                    tenant_name=(invitation.tenant_name or "").strip(),
                    property_name=property_name,
                    unit_number=unit_number,
                    landlord_name=landlord_name,
                    link=link,
                )
                result, _record = await WhatsAppService.send(
                    self.db,
                    phone=invitation.tenant_phone,
                    message_type=WhatsAppMessageType.INVITATION,
                    body_params=params,
                    fallback_text=text,
                    recipient_name=invitation.tenant_name,
                    landlord_id=invitation.landlord_id,
                    tenant_id=invitation.tenant_profile_id,
                    invitation_id=invitation.id,
                )
                whatsapp_result = DeliveryChannelResult(
                    attempted=True, ok=result.ok,
                    detail=None if result.ok else (result.error or "Delivery failed"),
                )
            except Exception as exc:  # noqa: BLE001
                logger.exception("Failed to send invitation WhatsApp message: %s", exc)
                whatsapp_result = DeliveryChannelResult(attempted=True, ok=False, detail=str(exc))

        return email_result, sms_result, whatsapp_result

    # ------------------------------------------------------------------
    # Lookups
    # ------------------------------------------------------------------

    async def get_invitation_by_token(self, raw_token: str) -> dict:
        token_hash = hash_token(raw_token)
        invitation = await self.invitation_repo.get_by_token_hash(token_hash)
        if not invitation:
            raise NotFoundException("Invalid or expired invitation token")

        if invitation.status != InvitationStatus.PENDING:
            raise ConflictException(f"Invitation is already {invitation.status.value}")

        if _as_utc(invitation.expires_at) < datetime.now(timezone.utc):
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
            "tenant_name": invitation.tenant_name,
            "property_name": prop.name if prop else "Unknown Property",
            "unit_number": unit.unit_number if unit else "Unknown Unit",
            "monthly_rent": float(unit.monthly_rent) if unit else 0.0,
            "currency": unit.currency if unit else "RWF",
            "landlord_name": landlord_name,
            "status": invitation.status.value,
            "expires_at": invitation.expires_at.isoformat(),
        }

    async def reissue_invitation(
        self, landlord: LandlordProfile, invitation_id: uuid.UUID
    ) -> tuple[Invitation, str]:
        """
        Issue a fresh token for an existing invitation so it can be re-sent.

        Only the hash of a token is stored, so the original link cannot be
        recovered to send again - a resend mints a new one and invalidates
        the old, which is also what you want if the first link leaked. The
        invitation row, its shell tenant, and any lease already built against
        it are all left exactly as they are.
        """
        invitation = await self.invitation_repo.get_by_id(invitation_id)
        if not invitation or invitation.landlord_id != landlord.id:
            raise ForbiddenException("Invitation not found or does not belong to you")

        if invitation.status == InvitationStatus.ACCEPTED:
            raise ConflictException("This invitation has already been accepted.")
        if invitation.status == InvitationStatus.CANCELLED:
            raise ConflictException("This invitation was cancelled. Create a new one instead.")

        raw_token = generate_random_token(32)
        invitation.token_hash = hash_token(raw_token)
        invitation.status = InvitationStatus.PENDING
        invitation.expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        await self.invitation_repo.update(invitation)
        return invitation, raw_token

    async def cancel_invitation(self, landlord: LandlordProfile, invitation_id: uuid.UUID) -> Invitation:
        invitation = await self.invitation_repo.get_by_id(invitation_id)
        if not invitation or invitation.landlord_id != landlord.id:
            raise ForbiddenException("Invitation not found or does not belong to you")

        if invitation.status != InvitationStatus.PENDING:
            raise ConflictException(f"Cannot cancel invitation with status {invitation.status.value}")

        invitation.status = InvitationStatus.CANCELLED
        return await self.invitation_repo.update(invitation)

    # ------------------------------------------------------------------
    # Accept
    # ------------------------------------------------------------------

    async def _resolve_tenant_profile(self, invitation: Invitation, user: User) -> TenantProfile:
        """
        Claim the shell profile this invitation created, rather than making a
        new one. This is the step that prevents a duplicate tenant record: the
        row already exists (with whatever lease/tenancy the landlord may have
        already built against it), and accepting the invitation just attaches
        the newly authenticated account to it.
        """
        if invitation.tenant_profile_id:
            shell = await self.db.get(TenantProfile, invitation.tenant_profile_id)
            if not shell:
                raise NotFoundException("The tenant record for this invitation no longer exists.")
            if shell.user_id is not None and shell.user_id != user.id:
                # Someone else already claimed this exact invitation - a
                # concurrent double-accept, not a legitimate second use.
                raise ForbiddenException("This invitation has already been used by another account.")
            if shell.user_id is None:
                shell.user_id = user.id
            return shell

        # Legacy fallback: an invitation created before this feature existed
        # (or via a path that skipped shell creation) has no tenant_profile_id.
        # Behave exactly as the pre-existing flow did.
        await self.db.refresh(user, attribute_names=["tenant_profile"])
        if user.tenant_profile:
            return user.tenant_profile
        fresh = TenantProfile(user_id=user.id)
        self.db.add(fresh)
        await self.db.flush()
        return fresh

    async def accept_invitation_transaction(self, raw_token: str, user: User) -> Tenancy:
        """
        Validate the invitation, claim its tenant record, and make sure exactly
        one ACTIVE tenancy and one lease exist for it - reusing whatever the
        landlord already created ahead of time instead of duplicating it.
        """
        token_hash = hash_token(raw_token)
        invitation = await self.invitation_repo.get_by_token_hash(token_hash)
        if not invitation:
            raise NotFoundException("Invalid or expired invitation token")

        if invitation.status != InvitationStatus.PENDING:
            raise ConflictException(f"Invitation is already {invitation.status.value}")

        if _as_utc(invitation.expires_at) < datetime.now(timezone.utc):
            invitation.status = InvitationStatus.EXPIRED
            await self.invitation_repo.update(invitation)
            raise ConflictException("Invitation has expired")

        if user.role != UserRole.TENANT:
            raise ForbiddenException("Only a tenant account can accept a tenant invitation")

        tenant_profile = await self._resolve_tenant_profile(invitation, user)

        unit = await self.unit_repo.get_by_id(invitation.unit_id)
        if not unit:
            raise NotFoundException("Invited unit no longer exists")

        # Reuse the INVITED tenancy created at invite time; only fall back to
        # creating one if this invitation predates that (tenant_profile_id was
        # never set, so no shell tenancy exists to find).
        stmt = select(Tenancy).where(
            Tenancy.tenant_id == tenant_profile.id,
            Tenancy.unit_id == invitation.unit_id,
        )
        tenancy = (await self.db.execute(stmt)).scalars().first()

        if tenancy:
            tenancy.status = TenancyStatus.ACTIVE
        else:
            tenancy = Tenancy(
                tenant_id=tenant_profile.id,
                landlord_id=invitation.landlord_id,
                property_id=invitation.property_id,
                unit_id=invitation.unit_id,
                status=TenancyStatus.ACTIVE,
                start_date=date.today(),
            )
            tenancy = await self.tenancy_repo.create(tenancy)

        # Only create the default lease if the landlord did not already build
        # a real one ahead of time via "Create Lease" - never stack a second,
        # auto-generated lease on top of one that already exists.
        existing_lease_stmt = select(Lease).where(Lease.tenancy_id == tenancy.id)
        existing_lease = (await self.db.execute(existing_lease_stmt)).scalars().first()

        if not existing_lease:
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
                status=LeaseStatus.ACTIVE,
            )
            await self.lease_repo.create(lease)

        unit.status = UnitStatus.OCCUPIED
        await self.unit_repo.update(unit)

        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_at = datetime.now(timezone.utc)
        await self.invitation_repo.update(invitation)

        return tenancy
