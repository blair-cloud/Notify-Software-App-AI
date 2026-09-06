import uuid
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict
from backend.models.role import UserRole, MaintenanceCategory, MaintenancePriority, MaintenanceStatus


class MessageCreate(BaseModel):
    recipient_id: Optional[uuid.UUID] = None
    property_id: Optional[uuid.UUID] = None
    unit_id: Optional[uuid.UUID] = None
    tenancy_id: Optional[uuid.UUID] = None
    message_type: str = "GENERAL"  # "GENERAL" | "MAINTENANCE"
    content: str
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_size: Optional[int] = 0

    # Maintenance specific payload (if message_type == "MAINTENANCE")
    maintenance_title: Optional[str] = None
    maintenance_category: Optional[MaintenanceCategory] = MaintenanceCategory.PLUMBING
    maintenance_priority: Optional[MaintenancePriority] = MaintenancePriority.MEDIUM
    maintenance_request_id: Optional[uuid.UUID] = None


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sender_id: uuid.UUID
    recipient_id: uuid.UUID
    sender_role: UserRole
    sender_name: Optional[str] = None
    recipient_name: Optional[str] = None
    property_id: Optional[uuid.UUID] = None
    property_name: Optional[str] = None
    unit_id: Optional[uuid.UUID] = None
    unit_number: Optional[str] = None
    tenancy_id: Optional[uuid.UUID] = None
    message_type: str = "GENERAL"
    content: str
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_size: Optional[int] = 0
    maintenance_request_id: Optional[uuid.UUID] = None
    maintenance_category: Optional[str] = None
    maintenance_priority: Optional[str] = None
    maintenance_status: Optional[str] = None
    maintenance_title: Optional[str] = None
    maintenance_request: Optional[Any] = None
    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime


class LocalizedMessage(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None


class BulkMessageRequest(BaseModel):
    """A landlord-approved message going to one or more of their tenants."""
    recipient_ids: List[str]
    channels: List[str] = ["IN_APP"]
    template_code: str = "CUSTOM"
    # Landlord-reviewed wording per language: {"EN": {...}, "FR": {...}, "RW": {...}}
    messages: Dict[str, LocalizedMessage] = {}
    variables: Dict[str, Any] = {}
    category: str = "SYSTEM"
    priority: str = "MEDIUM"
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    # Set to send everyone the same language instead of each tenant's own.
    force_language: Optional[str] = None


class MessagePreviewRequest(BaseModel):
    template_code: str = "CUSTOM"
    variables: Dict[str, Any] = {}
    overrides: Dict[str, LocalizedMessage] = {}


class TranslateRequest(BaseModel):
    text: str
    source_language: str = "EN"
    target_languages: Optional[List[str]] = None


class ConversationSummary(BaseModel):
    id: str
    partner_id: uuid.UUID
    partner_name: str
    partner_role: str
    partner_avatar: Optional[str] = None
    property_id: Optional[uuid.UUID] = None
    property_name: Optional[str] = None
    unit_id: Optional[uuid.UUID] = None
    unit_number: Optional[str] = None
    last_message: str
    last_message_at: datetime
    unread_count: int = 0
    message_type: str = "GENERAL"
    has_maintenance: bool = False
    maintenance_request_id: Optional[uuid.UUID] = None
    maintenance_title: Optional[str] = None
    maintenance_status: Optional[str] = None
