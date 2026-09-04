from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
from backend.models.role import BusinessType, VerificationStatus
from backend.schemas.user import UserResponse

class LandlordProfileBase(BaseModel):
    business_type: BusinessType = BusinessType.INDIVIDUAL
    business_name: Optional[str] = None
    tax_identifier: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = "Nyarugenge"
    city: Optional[str] = "Kigali"
    country: Optional[str] = "Rwanda"

class LandlordProfileUpdate(BaseModel):
    business_type: Optional[BusinessType] = None
    business_name: Optional[str] = None
    tax_identifier: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None

class LandlordProfileResponse(LandlordProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    verification_status: VerificationStatus
    created_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True
