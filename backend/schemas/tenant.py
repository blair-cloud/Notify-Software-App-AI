from pydantic import BaseModel, model_validator
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
    # None for a tenant who was invited but has not signed up yet - the
    # shell record exists (so a lease can already be built against it) before
    # there is any account to link.
    user_id: Optional[uuid.UUID] = None
    is_pending: bool = False
    verification_status: VerificationStatus
    created_at: datetime
    user: Optional[UserResponse] = None

    @model_validator(mode="after")
    def _derive_is_pending(self):
        # Not a real column - derived from user_id so this is always right,
        # including when pydantic-core builds this as a nested field of
        # another response model (e.g. TenancyResponse.tenant), which does not
        # go through a plain classmethod override.
        self.is_pending = self.user_id is None
        return self

    class Config:
        from_attributes = True
