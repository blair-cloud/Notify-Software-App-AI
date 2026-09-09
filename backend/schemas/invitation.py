from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
from backend.models.role import InvitationStatus

class InvitationCreate(BaseModel):
    tenant_email: Optional[str] = None
    tenant_phone: str
    # Optional - not required to send the invitation, but it means the tenant
    # shows up in the Tenants list under a real name instead of a placeholder.
    tenant_name: Optional[str] = None
    property_id: uuid.UUID
    unit_id: uuid.UUID

class InvitationAccept(BaseModel):
    token: str

class InvitationResponse(BaseModel):
    id: uuid.UUID
    landlord_id: uuid.UUID
    tenant_email: Optional[str] = None
    tenant_phone: str
    tenant_name: Optional[str] = None
    property_id: uuid.UUID
    unit_id: uuid.UUID
    tenant_profile_id: Optional[uuid.UUID] = None
    status: InvitationStatus
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DeliveryChannelResult(BaseModel):
    """How one delivery channel went, independent of the other."""
    attempted: bool
    ok: bool
    detail: Optional[str] = None


class InvitationCreateResponse(BaseModel):
    invitation: InvitationResponse
    raw_token: str
    invite_link: str
    # The shell tenant record created immediately, so the frontend can add it
    # to the Tenants list without waiting for a full refetch. None only for a
    # legacy invitation created before shell profiles existed.
    tenant_id: Optional[uuid.UUID] = None
    email: DeliveryChannelResult
    sms: DeliveryChannelResult
    whatsapp: DeliveryChannelResult
