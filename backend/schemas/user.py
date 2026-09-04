from pydantic import BaseModel
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

class UserResponse(UserBase):
    id: uuid.UUID
    role: UserRole
    status: UserStatus
    email_verified: bool
    phone_verified: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
