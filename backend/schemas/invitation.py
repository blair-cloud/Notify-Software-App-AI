from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
from backend.models.role import InvitationStatus

class InvitationCreate(BaseModel):
    tenant_email: str
    tenant_phone: str
    property_id: uuid.UUID
    unit_id: uuid.UUID

class InvitationAccept(BaseModel):
    token: str

class InvitationResponse(BaseModel):
    id: uuid.UUID
    landlord_id: uuid.UUID
    tenant_email: str
    tenant_phone: str
    property_id: uuid.UUID
    unit_id: uuid.UUID
    status: InvitationStatus
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
