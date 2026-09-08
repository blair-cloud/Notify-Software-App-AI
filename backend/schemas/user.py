from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
import uuid
from backend.models.role import UserRole, UserStatus, UserLanguage

class UserBase(BaseModel):
    email: str
    phone: str
    first_name: str
    last_name: str
    avatar_url: Optional[str] = None
    language: UserLanguage = UserLanguage.EN

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    language: Optional[UserLanguage] = None
    phone: Optional[str] = None
    business_type: Optional[str] = None
    business_name: Optional[str] = None
    tax_identifier: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None

class LandlordProfileSummary(BaseModel):
    """The landlord details the account screen edits."""
    id: uuid.UUID
    business_type: Optional[str] = None
    business_name: Optional[str] = None
    tax_identifier: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TenantProfileSummary(BaseModel):
    id: uuid.UUID
    national_id: Optional[str] = None
    occupation: Optional[str] = None
    emergency_name: Optional[str] = None
    emergency_phone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserResponse(UserBase):
    id: uuid.UUID
    role: UserRole
    status: UserStatus
    email_verified: bool
    phone_verified: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

    # The account screens read these (user.landlord_profile.business_name and
    # friends). Without them the landlord account form loaded empty every time.
    landlord_profile: Optional[LandlordProfileSummary] = None
    tenant_profile: Optional[TenantProfileSummary] = None

    model_config = ConfigDict(from_attributes=True)
