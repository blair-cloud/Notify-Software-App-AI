from datetime import datetime, timezone
import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_jwt_token, hash_token
from backend.core.exceptions import UnauthorizedException, ConflictException, NotFoundException
from backend.models import User, LandlordProfile, TenantProfile, UserRole, UserStatus, Session
from backend.schemas.auth import LandlordRegisterRequest, TenantRegisterRequest, LoginRequest, TokenResponse, ChangePasswordRequest
from backend.schemas.user import UserUpdate
from backend.repositories.user_repository import UserRepository
from backend.utils.validators import validate_rwanda_phone

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def register_landlord(self, req: LandlordRegisterRequest) -> TokenResponse:
        phone_formatted = validate_rwanda_phone(req.phone)
        if await self.user_repo.get_by_email(req.email):
            raise ConflictException("Email already registered")
        if await self.user_repo.get_by_phone(phone_formatted):
            raise ConflictException("Phone number already registered")

        user = User(
            email=req.email,
            phone=phone_formatted,
            password_hash=hash_password(req.password),
            first_name=req.first_name,
            last_name=req.last_name,
            role=UserRole.LANDLORD,
            language=req.language,
            status=UserStatus.ACTIVE
        )
        user = await self.user_repo.create_user(user)

        landlord_profile = LandlordProfile(
            user_id=user.id,
            business_type=req.business_type,
            business_name=req.business_name,
            tax_identifier=req.tax_identifier,
            address=req.address,
            district=req.district,
            city=req.city
        )
        await self.user_repo.create_landlord_profile(landlord_profile)

        access_token = create_access_token(str(user.id), user.role.value)
        refresh_token = create_refresh_token(str(user.id), user.role.value)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user_id=str(user.id),
            role=user.role,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name
        )

    async def register_tenant(self, req: TenantRegisterRequest) -> TokenResponse:
        phone_formatted = validate_rwanda_phone(req.phone)
        if await self.user_repo.get_by_email(req.email):
            raise ConflictException("Email already registered")
        if await self.user_repo.get_by_phone(phone_formatted):
            raise ConflictException("Phone number already registered")

        user = User(
            email=req.email,
            phone=phone_formatted,
            password_hash=hash_password(req.password),
            first_name=req.first_name,
            last_name=req.last_name,
            role=UserRole.TENANT,
            language=req.language,
            status=UserStatus.ACTIVE
        )
        user = await self.user_repo.create_user(user)

        tenant_profile = TenantProfile(
            user_id=user.id,
            national_id=req.national_id,
            occupation=req.occupation,
            emergency_name=req.emergency_name,
            emergency_phone=req.emergency_phone
        )
        await self.user_repo.create_tenant_profile(tenant_profile)

        access_token = create_access_token(str(user.id), user.role.value)
        refresh_token = create_refresh_token(str(user.id), user.role.value)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user_id=str(user.id),
            role=user.role,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name
        )

    async def login(self, req: LoginRequest) -> TokenResponse:
        user = None
        if "@" in req.email_or_phone:
            user = await self.user_repo.get_by_email(req.email_or_phone)
        else:
            try:
                phone_formatted = validate_rwanda_phone(req.email_or_phone)
                user = await self.user_repo.get_by_phone(phone_formatted)
            except Exception:
                user = await self.user_repo.get_by_phone(req.email_or_phone)

        if not user or not verify_password(req.password, user.password_hash):
            raise UnauthorizedException("Invalid email/phone or password")

        if user.status != UserStatus.ACTIVE:
            raise UnauthorizedException(f"Account is {user.status.value}")

        user.last_login_at = datetime.now(timezone.utc)

        access_token = create_access_token(str(user.id), user.role.value)
        refresh_token = create_refresh_token(str(user.id), user.role.value)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user_id=str(user.id),
            role=user.role,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name
        )

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
            try:
                user.phone = validate_rwanda_phone(req.phone)
            except Exception:
                user.phone = req.phone

        if user.role == UserRole.LANDLORD:
            profile = await self.user_repo.get_landlord_profile_by_user_id(user.id)
            if profile:
                if req.business_type is not None:
                    profile.business_type = req.business_type
                if req.business_name is not None:
                    profile.business_name = req.business_name
                if req.tax_identifier is not None:
                    profile.tax_identifier = req.tax_identifier
                if req.address is not None:
                    profile.address = req.address
                if req.district is not None:
                    profile.district = req.district
                if req.city is not None:
                    profile.city = req.city

        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def change_password(self, user: User, req: ChangePasswordRequest) -> dict:
        if not verify_password(req.current_password, user.password_hash):
            raise UnauthorizedException("Current password does not match")

        user.password_hash = hash_password(req.new_password)
        await self.db.commit()
        return {"status": "success", "message": "Password updated successfully"}
