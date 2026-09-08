from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
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
    # The late payment penalty defaults to 0 and is only ever applied to an
    # invoice once this lease has actually ended and it's still unpaid - see
    # InvoiceService.update_overdue_statuses.
    late_fee: float = Field(default=0.0, ge=0)
    currency: str = "RWF"
    notes: Optional[str] = None
    status: Optional[LeaseStatus] = None

    @model_validator(mode="after")
    def _validate_dates(self):
        if self.end_date <= self.start_date:
            raise ValueError("End date must be after the start date.")
        return self

class LeaseUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    monthly_rent: Optional[float] = None
    security_deposit: Optional[float] = None
    payment_due_day: Optional[int] = None
    late_fee: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = None
    status: Optional[LeaseStatus] = None

    @model_validator(mode="after")
    def _validate_dates(self):
        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValueError("End date must be after the start date.")
        return self

class LeaseDocumentUpload(BaseModel):
    document_name: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = "application/pdf"
    file_size: Optional[int] = 0
    file_data: Optional[str] = None
    version_notes: Optional[str] = None
    uploaded_by: Optional[str] = None
    uploaded_by_role: Optional[str] = None

class LeaseSignRequest(BaseModel):
    signature_name: str

class LeaseDocumentVersionResponse(BaseModel):
    version: int
    document_name: str
    file_name: str
    file_type: str
    file_size: int
    storage_path: str
    file_data: Optional[str] = None
    uploaded_by: Optional[str] = None
    uploaded_by_role: Optional[str] = None
    uploaded_at: datetime
    version_notes: Optional[str] = None
    status: str

    class Config:
        from_attributes = True

class LeaseAgreementDocumentResponse(LeaseDocumentVersionResponse):
    id: uuid.UUID
    lease_id: uuid.UUID
    doc_type: str = "LEASE_AGREEMENT"
    is_verified: bool = True
    history: List[LeaseDocumentVersionResponse] = []

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

    agreement_document: Optional[LeaseAgreementDocumentResponse] = None
    document_history: List[LeaseDocumentVersionResponse] = []
    has_signed_document: bool = False
    compliance_status: str = "INCOMPLETE"
    compliance_notes: Optional[str] = None

    # Denormalized display fields - populated from the lease's tenancy chain
    # (tenant/landlord/property/unit) so the leases table and the printable
    # lease document don't need extra round trips.
    tenant_name: Optional[str] = None
    tenant_email: Optional[str] = None
    tenant_phone: Optional[str] = None
    tenant_national_id: Optional[str] = None
    property_name: Optional[str] = None
    property_address: Optional[str] = None
    property_district: Optional[str] = None
    unit_number: Optional[str] = None
    unit_floor: Optional[int] = None
    landlord_name: Optional[str] = None
    landlord_business_name: Optional[str] = None
    landlord_phone: Optional[str] = None
    landlord_email: Optional[str] = None
    landlord_address: Optional[str] = None
    days_remaining: Optional[int] = None

    tenant_signed_at: Optional[datetime] = None
    tenant_signature_name: Optional[str] = None
    tenant_document_status: str = "NO_DOCUMENT"

    class Config:
        from_attributes = True
