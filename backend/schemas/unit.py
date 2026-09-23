from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
import uuid
from backend.models.role import UnitStatus

class UnitCreate(BaseModel):
    property_id: uuid.UUID
    unit_number: str
    floor: int = 1
    unit_type: Optional[str] = "Apartment"
    rooms: Optional[int] = Field(default=None, ge=0)
    bathrooms: Optional[int] = Field(default=None, ge=0)
    square_meters: Optional[float] = Field(default=None, ge=0)
    monthly_rent: float
    currency: str = "RWF"
    description: Optional[str] = None

    @field_validator("property_id", mode="before")
    @classmethod
    def validate_property_id(cls, v):
        if not v or (isinstance(v, str) and not v.strip()):
            raise ValueError("Property ID is required. Please select a valid property.")
        if isinstance(v, str):
            try:
                return uuid.UUID(v.strip())
            except Exception:
                raise ValueError("Invalid Property ID format. Expected a valid UUID.")
        return v

    @field_validator("floor", mode="before")
    @classmethod
    def parse_floor(cls, v):
        if v is None or v == "" or (isinstance(v, str) and not v.strip()):
            return 1
        try:
            val = int(v)
            return val if val > 0 else 1
        except (ValueError, TypeError):
            return 1

    @field_validator("rooms", "bathrooms", mode="before")
    @classmethod
    def parse_optional_int(cls, v):
        if v is None or v == "" or (isinstance(v, str) and not v.strip()):
            return None
        try:
            val = int(v)
            return val if val >= 0 else None
        except (ValueError, TypeError):
            return None

    @field_validator("square_meters", mode="before")
    @classmethod
    def parse_optional_float(cls, v):
        if v is None or v == "" or (isinstance(v, str) and not v.strip()):
            return None
        try:
            val = float(v)
            return val if val >= 0 else None
        except (ValueError, TypeError):
            return None

    @field_validator("monthly_rent", mode="before")
    @classmethod
    def parse_monthly_rent(cls, v):
        if v is None or v == "":
            raise ValueError("Monthly rent is required.")
        try:
            val = float(v)
            if val < 0:
                raise ValueError("Monthly rent cannot be negative.")
            return val
        except (ValueError, TypeError) as e:
            raise ValueError(f"Invalid monthly rent: {e}")

    @field_validator("unit_type", mode="before")
    @classmethod
    def parse_unit_type(cls, v):
        if not v or (isinstance(v, str) and not v.strip()):
            return "Apartment"
        return str(v).strip()

class UnitUpdate(BaseModel):
    unit_number: Optional[str] = None
    floor: Optional[int] = None
    unit_type: Optional[str] = None
    rooms: Optional[int] = Field(default=None, ge=0)
    bathrooms: Optional[int] = Field(default=None, ge=0)
    square_meters: Optional[float] = Field(default=None, ge=0)
    monthly_rent: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[UnitStatus] = None
    description: Optional[str] = None

    @field_validator("floor", mode="before")
    @classmethod
    def parse_floor(cls, v):
        if v is None or v == "" or (isinstance(v, str) and not v.strip()):
            return None
        try:
            val = int(v)
            return val if val > 0 else 1
        except (ValueError, TypeError):
            return None

    @field_validator("rooms", "bathrooms", mode="before")
    @classmethod
    def parse_optional_int(cls, v):
        if v is None or v == "" or (isinstance(v, str) and not v.strip()):
            return None
        try:
            val = int(v)
            return val if val >= 0 else None
        except (ValueError, TypeError):
            return None

    @field_validator("square_meters", mode="before")
    @classmethod
    def parse_optional_float(cls, v):
        if v is None or v == "" or (isinstance(v, str) and not v.strip()):
            return None
        try:
            val = float(v)
            return val if val >= 0 else None
        except (ValueError, TypeError):
            return None

    @field_validator("monthly_rent", mode="before")
    @classmethod
    def parse_monthly_rent(cls, v):
        if v is None or v == "":
            return None
        try:
            val = float(v)
            if val < 0:
                raise ValueError("Monthly rent cannot be negative.")
            return val
        except (ValueError, TypeError) as e:
            raise ValueError(f"Invalid monthly rent: {e}")

class UnitResponse(BaseModel):
    id: uuid.UUID
    property_id: uuid.UUID
    landlord_id: uuid.UUID
    unit_number: str
    floor: int
    unit_type: Optional[str] = None
    rooms: Optional[int] = None
    bathrooms: Optional[int] = None
    square_meters: Optional[float] = None
    monthly_rent: float
    currency: str
    status: UnitStatus
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
