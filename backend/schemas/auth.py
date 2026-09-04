from pydantic import BaseModel, Field
from typing import Optional
from backend.models.role import UserRole, UserLanguage, BusinessType

class LandlordRegisterRequest(BaseModel):
    email: str
    phone: str
    password: str = Field(..., min_length=8)
    first_name: str
    last_name: str
    business_type: BusinessType = BusinessType.INDIVIDUAL
    business_name: Optional[str] = None
    tax_identifier: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = "Nyarugenge"
    city: Optional[str] = "Kigali"
    language: UserLanguage = UserLanguage.EN

class TenantRegisterRequest(BaseModel):
    email: str
    phone: str
    password: str = Field(..., min_length=8)
    first_name: str
    last_name: str
    invitation_token: Optional[str] = None
    national_id: Optional[str] = None
    occupation: Optional[str] = None
    emergency_name: Optional[str] = None
    emergency_phone: Optional[str] = None
    language: UserLanguage = UserLanguage.EN

class LoginRequest(BaseModel):
    email_or_phone: str
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    role: UserRole
    email: str
    first_name: str
    last_name: str
