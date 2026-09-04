from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
import uuid
from backend.models.role import MaintenanceCategory, MaintenancePriority, MaintenanceStatus, WorkerSpecialization


class MaintenanceAttachmentCreate(BaseModel):
    file_path: str
    file_name: str
    mime_type: Optional[str] = "image/jpeg"
    size: Optional[int] = 0


class MaintenanceAttachmentResponse(BaseModel):
    id: uuid.UUID
    maintenance_request_id: uuid.UUID
    file_path: str
    file_name: str
    mime_type: str
    size: int
    uploaded_by: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MaintenanceCommentCreate(BaseModel):
    message: str


class MaintenanceCommentResponse(BaseModel):
    id: uuid.UUID
    maintenance_request_id: uuid.UUID
    user_id: uuid.UUID
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    message: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MaintenanceWorkerCreate(BaseModel):
    name: str
    phone: str
    specialization: WorkerSpecialization = WorkerSpecialization.GENERAL
    notes: Optional[str] = None


class MaintenanceWorkerResponse(BaseModel):
    id: uuid.UUID
    landlord_id: uuid.UUID
    name: str
    phone: str
    specialization: WorkerSpecialization
    status: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MaintenanceRequestCreate(BaseModel):
    tenancy_id: Optional[uuid.UUID] = None
    title: str
    description: str
    category: MaintenanceCategory = MaintenanceCategory.PLUMBING
    priority: MaintenancePriority = MaintenancePriority.MEDIUM
    photos: Optional[List[MaintenanceAttachmentCreate]] = None


class MaintenanceRequestUpdate(BaseModel):
    status: Optional[MaintenanceStatus] = None
    priority: Optional[MaintenancePriority] = None
    assigned_to: Optional[str] = None
    assigned_worker_id: Optional[uuid.UUID] = None
    scheduled_date: Optional[datetime] = None
    scheduled_time: Optional[str] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    tenant_notes: Optional[str] = None
    landlord_notes: Optional[str] = None


class MaintenanceScheduleRequest(BaseModel):
    scheduled_date: datetime
    scheduled_time: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_worker_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None


class MaintenanceAssignRequest(BaseModel):
    assigned_to: str
    assigned_worker_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None


class MaintenanceResolveRequest(BaseModel):
    actual_cost: Optional[float] = None
    landlord_notes: Optional[str] = None
    add_to_expenses: Optional[bool] = False


class MaintenanceReopenRequest(BaseModel):
    reason: str


class MaintenanceCloseRequest(BaseModel):
    tenant_feedback: Optional[str] = None


class MaintenanceRequestResponse(BaseModel):
    id: uuid.UUID
    request_number: str
    tenant_id: uuid.UUID
    landlord_id: uuid.UUID
    property_id: uuid.UUID
    unit_id: uuid.UUID
    tenancy_id: uuid.UUID
    title: str
    description: str
    category: MaintenanceCategory
    priority: MaintenancePriority
    status: MaintenanceStatus
    assigned_to: Optional[str] = None
    assigned_worker_id: Optional[uuid.UUID] = None
    scheduled_date: Optional[datetime] = None
    scheduled_time: Optional[str] = None
    estimated_cost: float = 0.0
    actual_cost: float = 0.0
    currency: str = "RWF"
    tenant_notes: Optional[str] = None
    landlord_notes: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    expense_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    # Augmented fields
    tenant_name: Optional[str] = None
    property_name: Optional[str] = None
    unit_number: Optional[str] = None
    attachments: Optional[List[MaintenanceAttachmentResponse]] = None
    comments: Optional[List[MaintenanceCommentResponse]] = None

    model_config = ConfigDict(from_attributes=True)


class MaintenanceStatsResponse(BaseModel):
    total_requests: int
    open_requests: int
    urgent_requests: int
    in_progress_requests: int
    resolved_this_month: int
    closed_requests: int
    average_resolution_days: float
    average_acknowledgement_hours: float
    category_distribution: dict
