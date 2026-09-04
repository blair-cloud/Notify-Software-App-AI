from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
import uuid
from backend.models.role import ComplaintCategory, ComplaintPriority, ComplaintStatus


class ComplaintCommentCreate(BaseModel):
    message: str


class ComplaintCommentResponse(BaseModel):
    id: uuid.UUID
    complaint_id: uuid.UUID
    user_id: uuid.UUID
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    message: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ComplaintCreate(BaseModel):
    tenancy_id: Optional[uuid.UUID] = None
    subject: str
    description: str
    category: ComplaintCategory = ComplaintCategory.NOISE
    priority: ComplaintPriority = ComplaintPriority.MEDIUM
    attachment_path: Optional[str] = None


class ComplaintUpdate(BaseModel):
    status: Optional[ComplaintStatus] = None
    priority: Optional[ComplaintPriority] = None
    landlord_response: Optional[str] = None


class ComplaintResolveRequest(BaseModel):
    resolution_notes: str


class ComplaintResponse(BaseModel):
    id: uuid.UUID
    complaint_number: str
    tenant_id: uuid.UUID
    landlord_id: uuid.UUID
    property_id: uuid.UUID
    unit_id: uuid.UUID
    tenancy_id: uuid.UUID
    subject: str
    description: str
    category: ComplaintCategory
    priority: ComplaintPriority
    status: ComplaintStatus
    landlord_response: Optional[str] = None
    attachment_path: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Augmented fields
    tenant_name: Optional[str] = None
    property_name: Optional[str] = None
    unit_number: Optional[str] = None
    comments: Optional[List[ComplaintCommentResponse]] = None

    model_config = ConfigDict(from_attributes=True)


class ComplaintStatsResponse(BaseModel):
    total_complaints: int
    open_complaints: int
    under_review: int
    resolved: int
    closed: int
    category_distribution: dict
