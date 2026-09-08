import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Enum as SQLEnum, DateTime, ForeignKey, Text, Boolean, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.core.database import Base
from backend.models.role import UserRole, MaintenanceCategory, MaintenancePriority, MaintenanceStatus


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), nullable=False)

    property_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="SET NULL"), nullable=True, index=True)
    unit_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="SET NULL"), nullable=True, index=True)
    tenancy_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tenancies.id", ondelete="SET NULL"), nullable=True, index=True)

    message_type: Mapped[str] = mapped_column(String(50), default="GENERAL") # GENERAL, MAINTENANCE
    content: Mapped[str] = mapped_column(Text, nullable=False)

    attachment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    attachment_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    attachment_size: Mapped[int | None] = mapped_column(nullable=True, default=0)

    maintenance_request_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("maintenance_requests.id", ondelete="SET NULL"), nullable=True, index=True)

    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
