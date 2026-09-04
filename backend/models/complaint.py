import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Enum as SQLEnum, DateTime, ForeignKey, Text, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column
from backend.core.database import Base
from backend.models.role import ComplaintCategory, ComplaintPriority, ComplaintStatus


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenant_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    landlord_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("landlord_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    tenancy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenancies.id", ondelete="CASCADE"), nullable=False, index=True)


    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    category: Mapped[ComplaintCategory] = mapped_column(SQLEnum(ComplaintCategory), default=ComplaintCategory.NOISE)
    priority: Mapped[ComplaintPriority] = mapped_column(SQLEnum(ComplaintPriority), default=ComplaintPriority.MEDIUM)
    status: Mapped[ComplaintStatus] = mapped_column(SQLEnum(ComplaintStatus), default=ComplaintStatus.SUBMITTED)

    landlord_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ComplaintComment(Base):
    __tablename__ = "complaint_comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    author_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    author_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
