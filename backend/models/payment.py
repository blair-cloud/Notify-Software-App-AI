import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Enum as SQLEnum, DateTime, ForeignKey, Numeric, Text, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.core.database import Base
from backend.models.role import PaymentMethod, PaymentChannel, PaymentStatus


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_reference: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    transaction_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)

    invoice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="RESTRICT"), nullable=False, index=True)
    tenancy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenancies.id", ondelete="RESTRICT"), nullable=False, index=True)
    lease_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("leases.id", ondelete="RESTRICT"), nullable=False, index=True)

    landlord_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("landlord_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenant_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="RESTRICT"), nullable=False, index=True)
    unit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="RESTRICT"), nullable=False, index=True)

    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="RWF")

    payment_method: Mapped[PaymentMethod] = mapped_column(SQLEnum(PaymentMethod), nullable=False)
    payment_channel: Mapped[PaymentChannel] = mapped_column(SQLEnum(PaymentChannel), default=PaymentChannel.ONLINE)
    status: Mapped[PaymentStatus] = mapped_column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)

    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    invoice = relationship("Invoice", back_populates="payments")
    receipt = relationship("Receipt", back_populates="payment", uselist=False, cascade="all, delete-orphan")
