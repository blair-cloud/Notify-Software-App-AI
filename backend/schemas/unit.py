from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
from backend.models.role import UnitStatus

class UnitCreate(BaseModel):
    property_id: uuid.UUID
    unit_number: str
    floor: int = 1
    unit_type: str = "Retail Shop"
    monthly_rent: float
    currency: str = "RWF"
    description: Optional[str] = None

class UnitUpdate(BaseModel):
    unit_number: Optional[str] = None
    floor: Optional[int] = None
    unit_type: Optional[str] = None
    monthly_rent: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[UnitStatus] = None
    description: Optional[str] = None

class UnitResponse(BaseModel):
    id: uuid.UUID
    property_id: uuid.UUID
    landlord_id: uuid.UUID
    unit_number: str
    floor: int
    unit_type: str
    monthly_rent: float
    currency: str
    status: UnitStatus
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
