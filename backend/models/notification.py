import uuid
from datetime import datetime, timezone, date
from sqlalchemy import String, Enum as SQLEnum, DateTime, Date, ForeignKey, Text, Boolean, Integer, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column
from backend.core.database import Base
from backend.models.role import NotificationChannel, NotificationStatus, NotificationPriority, NotificationCategory


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(10), default="en")
    
    channel: Mapped[NotificationChannel] = mapped_column(SQLEnum(NotificationChannel), default=NotificationChannel.IN_APP)
    status: Mapped[NotificationStatus] = mapped_column(SQLEnum(NotificationStatus), default=NotificationStatus.PENDING)
    priority: Mapped[str] = mapped_column(String(50), default="MEDIUM")
    category: Mapped[str] = mapped_column(String(50), default="SYSTEM")
    
    entity_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    reference_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    action_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    action_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    # Lease Expiry Reminders
    lease_expiry_in_app: Mapped[bool] = mapped_column(Boolean, default=True)
    lease_expiry_email: Mapped[bool] = mapped_column(Boolean, default=True)
    lease_expiry_sms: Mapped[bool] = mapped_column(Boolean, default=False)
    lease_expiry_whatsapp: Mapped[bool] = mapped_column(Boolean, default=False)

    # Payment & Invoice Reminders
    payment_in_app: Mapped[bool] = mapped_column(Boolean, default=True)
    payment_email: Mapped[bool] = mapped_column(Boolean, default=True)
    payment_sms: Mapped[bool] = mapped_column(Boolean, default=True)
    payment_whatsapp: Mapped[bool] = mapped_column(Boolean, default=False)

    # Maintenance Notifications
    maintenance_in_app: Mapped[bool] = mapped_column(Boolean, default=True)
    maintenance_email: Mapped[bool] = mapped_column(Boolean, default=True)
    maintenance_sms: Mapped[bool] = mapped_column(Boolean, default=False)
    maintenance_whatsapp: Mapped[bool] = mapped_column(Boolean, default=False)

    # Complaints Notifications
    complaints_in_app: Mapped[bool] = mapped_column(Boolean, default=True)
    complaints_email: Mapped[bool] = mapped_column(Boolean, default=True)
    complaints_sms: Mapped[bool] = mapped_column(Boolean, default=False)
    complaints_whatsapp: Mapped[bool] = mapped_column(Boolean, default=False)

    # System & Platform Notifications
    system_in_app: Mapped[bool] = mapped_column(Boolean, default=True)
    system_email: Mapped[bool] = mapped_column(Boolean, default=False)
    system_sms: Mapped[bool] = mapped_column(Boolean, default=False)
    system_whatsapp: Mapped[bool] = mapped_column(Boolean, default=False)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )


class NotificationDeliveryLog(Base):
    __tablename__ = "notification_delivery_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    notification_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("notifications.id", ondelete="SET NULL"), nullable=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    channel: Mapped[str] = mapped_column(String(50), nullable=False)
    recipient: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="SENT")  # SENT, FAILED, SKIPPED
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_info: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ReminderHistory(Base):
    __tablename__ = "reminder_histories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lease_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("leases.id", ondelete="CASCADE"), nullable=False, index=True)
    milestone: Mapped[str] = mapped_column(String(50), nullable=False)  # 30D, 14D, 7D, 3D, 2D, 1D, TODAY, EXPIRED
    target_date: Mapped[date] = mapped_column(Date, nullable=False)
    notification_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("notifications.id", ondelete="SET NULL"), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class NotificationTemplate(Base):
    __tablename__ = "notification_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    title_template: Mapped[str] = mapped_column(String(255), nullable=False)
    body_template: Mapped[Text] = mapped_column(Text, nullable=False)
    action_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    action_url_template: Mapped[str | None] = mapped_column(String(255), nullable=True)
    default_priority: Mapped[str] = mapped_column(String(50), default="MEDIUM")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
