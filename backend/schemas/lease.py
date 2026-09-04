from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
import uuid
from backend.models.role import LeaseStatus

class LeaseCreate(BaseModel):
    tenancy_id: uuid.UUID
    start_date: date
    end_date: date
    monthly_rent: float
    security_deposit: float = 0.0
    payment_due_day: int = 5
    late_fee: float = 0.0
    currency: str = "RWF"
    notes: Optional[str] = None

class LeaseUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    monthly_rent: Optional[float] = None
    security_deposit: Optional[float] = None
    payment_due_day: Optional[int] = None
    late_fee: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[LeaseStatus] = None

class LeaseResponse(BaseModel):
    id: uuid.UUID
    tenancy_id: uuid.UUID
    landlord_id: uuid.UUID
    tenant_id: uuid.UUID
    property_id: uuid.UUID
    unit_id: uuid.UUID
    start_date: date
    end_date: date
    monthly_rent: float
    security_deposit: float
    payment_due_day: int
    late_fee: float
    currency: str
    status: LeaseStatus
    notes: Optional[str] = None
    document_id: Optional[uuid.UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True
