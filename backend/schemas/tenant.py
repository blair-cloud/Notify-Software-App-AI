from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
from backend.models.role import VerificationStatus
from backend.schemas.user import UserResponse

class TenantProfileBase(BaseModel):
    national_id: Optional[str] = None
    occupation: Optional[str] = None
    emergency_name: Optional[str] = None
    emergency_phone: Optional[str] = None

class TenantProfileUpdate(BaseModel):
    national_id: Optional[str] = None
    occupation: Optional[str] = None
    emergency_name: Optional[str] = None
    emergency_phone: Optional[str] = None

class TenantProfileResponse(TenantProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    verification_status: VerificationStatus
    created_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True
