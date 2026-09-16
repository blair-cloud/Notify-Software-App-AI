from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
from backend.models.role import PropertyType, PropertyStatus

class PropertyCreate(BaseModel):
    name: str
    landlord_id: Optional[uuid.UUID] = None
    property_type: PropertyType = PropertyType.COMMERCIAL
    description: Optional[str] = None
    address: str
    district: str = "Nyarugenge"
    sector: Optional[str] = "Nyarugenge"
    cell: Optional[str] = None
    village: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    property_type: Optional[PropertyType] = None
    description: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    sector: Optional[str] = None
    cell: Optional[str] = None
    village: Optional[str] = None
    status: Optional[PropertyStatus] = None

class PropertyResponse(BaseModel):
    id: uuid.UUID
    landlord_id: uuid.UUID
    name: str
    property_type: PropertyType
    description: Optional[str] = None
    address: str
    district: str
    sector: Optional[str] = None
    cell: Optional[str] = None
    village: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: PropertyStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
