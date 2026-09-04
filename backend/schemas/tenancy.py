from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
import uuid
from backend.models.role import TenancyStatus
from backend.schemas.tenant import TenantProfileResponse
from backend.schemas.property import PropertyResponse
from backend.schemas.unit import UnitResponse

class TenancyCreate(BaseModel):
    tenant_id: uuid.UUID
    property_id: uuid.UUID
    unit_id: uuid.UUID
    start_date: date
    end_date: Optional[date] = None

class TenancyUpdate(BaseModel):
    status: Optional[TenancyStatus] = None
    end_date: Optional[date] = None

class TenancyResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    landlord_id: uuid.UUID
    property_id: uuid.UUID
    unit_id: uuid.UUID
    status: TenancyStatus
    start_date: date
    end_date: Optional[date] = None
    created_at: datetime
    
    tenant: Optional[TenantProfileResponse] = None
    property: Optional[PropertyResponse] = None
    unit: Optional[UnitResponse] = None

    class Config:
        from_attributes = True
