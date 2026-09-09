from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import uuid
from backend.models.role import NotificationChannel, NotificationStatus, NotificationPriority, NotificationCategory


class NotificationCreate(BaseModel):
    user_id: uuid.UUID
    type: str
    title: str
    message: str
    language: Optional[str] = "en"
    channel: Optional[NotificationChannel] = NotificationChannel.IN_APP
    priority: Optional[str] = "MEDIUM"
    category: Optional[str] = "SYSTEM"
    entity_type: Optional[str] = None
    entity_id: Optional[uuid.UUID] = None
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    metadata_json: Optional[str] = None


class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    title: str
    message: str
    language: str = "en"
    channel: NotificationChannel = NotificationChannel.IN_APP
    status: NotificationStatus = NotificationStatus.SENT
    priority: str = "MEDIUM"
    category: str = "SYSTEM"
    entity_type: Optional[str] = None
    entity_id: Optional[uuid.UUID] = None
    reference_type: Optional[str] = None
    reference_id: Optional[uuid.UUID] = None
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    metadata_json: Optional[str] = None
    is_read: bool = False
    read_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationPreferencesResponse(BaseModel):
    user_id: uuid.UUID
    lease_expiry_in_app: bool = True
    lease_expiry_email: bool = True
    lease_expiry_sms: bool = False
    lease_expiry_whatsapp: bool = True

    payment_in_app: bool = True
    payment_email: bool = True
    payment_sms: bool = True
    payment_whatsapp: bool = False

    maintenance_in_app: bool = True
    maintenance_email: bool = True
    maintenance_sms: bool = False
    maintenance_whatsapp: bool = False

    complaints_in_app: bool = True
    complaints_email: bool = True
    complaints_sms: bool = False
    complaints_whatsapp: bool = False

    system_in_app: bool = True
    system_email: bool = False
    system_sms: bool = False
    system_whatsapp: bool = False

    model_config = ConfigDict(from_attributes=True)


class NotificationPreferencesUpdate(BaseModel):
    lease_expiry_in_app: Optional[bool] = None
    lease_expiry_email: Optional[bool] = None
    lease_expiry_sms: Optional[bool] = None
    lease_expiry_whatsapp: Optional[bool] = None

    payment_in_app: Optional[bool] = None
    payment_email: Optional[bool] = None
    payment_sms: Optional[bool] = None
    payment_whatsapp: Optional[bool] = None

    maintenance_in_app: Optional[bool] = None
    maintenance_email: Optional[bool] = None
    maintenance_sms: Optional[bool] = None
    maintenance_whatsapp: Optional[bool] = None

    complaints_in_app: Optional[bool] = None
    complaints_email: Optional[bool] = None
    complaints_sms: Optional[bool] = None
    complaints_whatsapp: Optional[bool] = None

    system_in_app: Optional[bool] = None
    system_email: Optional[bool] = None
    system_sms: Optional[bool] = None
    system_whatsapp: Optional[bool] = None


class NotificationDeliveryLogResponse(BaseModel):
    id: uuid.UUID
    notification_id: Optional[uuid.UUID] = None
    user_id: uuid.UUID
    channel: str
    recipient: str
    subject: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    metadata_info: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReminderHistoryResponse(BaseModel):
    id: uuid.UUID
    lease_id: uuid.UUID
    milestone: str
    target_date: date
    notification_id: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationTemplateResponse(BaseModel):
    id: uuid.UUID
    code: str
    category: str
    title_template: str
    body_template: str
    action_label: Optional[str] = None
    action_url_template: Optional[str] = None
    default_priority: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProcessRemindersResult(BaseModel):
    checked_leases: int
    reminders_created: int
    reminders_skipped_duplicate: int
    emails_sent: int
    emails_skipped: int
    whatsapp_sent: int = 0
    whatsapp_skipped: int = 0
    expired_leases_updated: int
    details: List[Dict[str, Any]] = []
