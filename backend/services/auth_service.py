"""
What is left of authentication in this backend.

Supabase Auth owns sign up, sign in, sign out, password hashing, sessions,
access and refresh tokens, email confirmation and password resets. None of that
happens here any more.

This service owns only the *application* side of an account:

* bootstrapping the `profiles` row after Supabase creates the auth user,
* deciding what role that profile is allowed to have,
* creating the landlord/tenant profile that hangs off it,
* redeeming an invitation so a new tenant is linked to their unit,
* ordinary profile edits.
"""
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotifyException,
)
from backend.integrations.supabase_admin import SupabaseAdminError, set_user_role
from backend.models import LandlordProfile, TenantProfile, User, UserRole, UserStatus
from backend.schemas.auth import ProfileBootstrapRequest
from backend.schemas.user import UserUpdate
from backend.utils.validators import validate_rwanda_phone

logger = logging.getLogger("auth_service")

# A client may ask to be a landlord or a tenant - both are ordinary sign-ups in
# this product. It may never ask to be an administrator: that is granted only by
# an existing administrator.
SELF_SELECTABLE_ROLES = {UserRole.LANDLORD, UserRole.TENANT}


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ------------------------------------------------------------------
    # Profile bootstrap
    # ------------------------------------------------------------------

    async def bootstrap_profile(self, user: User, req: ProfileBootstrapRequest) -> User:
        """
        Finish setting up an account straight after Supabase Auth created it.

        `user` was resolved from a verified Supabase token, so the identity is
        trusted; only the *details* come from the request body. The role is
        validated here rather than taken at face value.
        """
        # An omitted role means "keep what the account already has" - the role
        # chosen at sign-up. Defaulting to TENANT here would demote every
        # landlord who confirmed their address by email before signing in.
        requested = req.role or user.role or UserRole.TENANT

        # An administrator completing their own profile needs no landlord or
        # tenant record, and must not be pushed into the self-selectable set.
        if req.role is None and user.role == UserRole.SYSTEM_ADMIN:
            user.status = UserStatus.ACTIVE
            await self.db.commit()
            await self.db.refresh(user)
            return user

        if requested not in SELF_SELECTABLE_ROLES:
            raise ForbiddenException(
                "That role cannot be chosen at sign-up. Contact an administrator."
            )

        # Roles are set once. Re-running bootstrap must not let a tenant turn
        # into a landlord (or the reverse) later on.
        already_bootstrapped = (
            user.landlord_profile is not None or user.tenant_profile is not None
        )
        if already_bootstrapped and user.role != requested:
            raise ConflictException(
                f"This account is already set up as a {user.role.value.lower()}."
            )

        if req.first_name:
            user.first_name = req.first_name.strip()
        if req.last_name is not None:
            user.last_name = req.last_name.strip()
        if req.language:
            user.language = req.language
        if req.phone:
            phone = validate_rwanda_phone(req.phone)
            clash = (
                await self.db.execute(
                    select(User).where(User.phone == phone, User.id != user.id)
                )
            ).scalar_one_or_none()
            if clash:
                raise ConflictException("That phone number is already in use by another account.")
            user.phone = phone

        # app_metadata is the source of truth the database trigger reads back
        # whenever Supabase touches auth.users (every sign-in does). Setting the
        # profile alone would work until the next sign-in silently reverted it.
        await self._mirror_role_to_supabase(user, requested)

        user.role = requested
        user.status = UserStatus.ACTIVE

        if requested == UserRole.LANDLORD and user.landlord_profile is None:
            self.db.add(
                LandlordProfile(
                    user_id=user.id,
                    business_type=req.business_type,
                    business_name=req.business_name,
                    tax_identifier=req.tax_identifier,
                    address=req.address,
                    district=req.district,
                    city=req.city,
                )
            )
        elif (
            requested == UserRole.TENANT
            and user.tenant_profile is None
            and not (req.invitation_token and req.invitation_token.strip())
        ):
            # No invitation to claim an existing record with, so this is a
            # standalone tenant account: make a fresh profile. When an
            # invitation *is* present, creating one here would leave two
            # tenant_profiles rows for the same person - the landlord's
            # pre-created shell, and this one - so that case is left entirely
            # to accept_invitation_transaction below, which claims the shell
            # instead of making a second record.
            self.db.add(
                TenantProfile(
                    user_id=user.id,
                    national_id=req.national_id,
                    occupation=req.occupation,
                    emergency_name=req.emergency_name,
                    emergency_phone=req.emergency_phone,
                )
            )

        await self.db.flush()

        # An invitation links the new tenant to their unit. It has to be
        # redeemed after the tenant profile exists.
        if req.invitation_token and req.invitation_token.strip():
            from backend.services.invitation_service import InvitationService

            await self.db.refresh(user)
            await InvitationService(self.db).accept_invitation_transaction(
                req.invitation_token.strip(), user
            )

        user.last_login_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    # ------------------------------------------------------------------
    # Profile maintenance
    # ------------------------------------------------------------------

    async def update_user_profile(self, user: User, req: UserUpdate) -> User:
        if req.first_name is not None:
            user.first_name = req.first_name
        if req.last_name is not None:
            user.last_name = req.last_name
        if req.avatar_url is not None:
            user.avatar_url = req.avatar_url
        if req.language is not None:
            user.language = req.language
        if req.phone is not None:
            phone = validate_rwanda_phone(req.phone)
            clash = (
                await self.db.execute(
                    select(User).where(User.phone == phone, User.id != user.id)
                )
            ).scalar_one_or_none()
            if clash:
                raise ConflictException("That phone number is already in use by another account.")
            user.phone = phone

        if user.role == UserRole.LANDLORD:
            profile = (
                await self.db.execute(
                    select(LandlordProfile).where(LandlordProfile.user_id == user.id)
                )
            ).scalar_one_or_none()
            if profile:
                for field in (
                    "business_type",
                    "business_name",
                    "tax_identifier",
                    "address",
                    "district",
                    "city",
                ):
                    value = getattr(req, field, None)
                    if value is not None:
                        setattr(profile, field, value)

        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def _mirror_role_to_supabase(self, user: User, role: UserRole) -> None:
        """
        Write the role into the Supabase user's app_metadata.

        Only the service role can write app_metadata, which is what makes it a
        trustworthy source for the database trigger - and why the role cannot be
        set by a client.
        """
        try:
            await set_user_role(str(user.id), role.value)
        except SupabaseAdminError as exc:
            # Failing loudly is right: leaving the two out of step means the
            # role silently reverts at the next sign-in.
            raise NotifyException(
                f"Could not apply the account role in Supabase Auth: {exc}"
            ) from exc

    async def set_role(self, actor: User, target: User, role: UserRole) -> User:
        """Change someone's role. Administrators only."""
        if actor.role != UserRole.SYSTEM_ADMIN:
            raise ForbiddenException("Only a system administrator can change a role.")
        if actor.id == target.id and role != UserRole.SYSTEM_ADMIN:
            raise NotifyException("You cannot remove your own administrator access.")

        await self._mirror_role_to_supabase(target, role)
        target.role = role
        if role == UserRole.LANDLORD and target.landlord_profile is None:
            self.db.add(LandlordProfile(user_id=target.id))
        elif role == UserRole.TENANT and target.tenant_profile is None:
            self.db.add(TenantProfile(user_id=target.id))

        await self.db.commit()
        await self.db.refresh(target)
        return target
