import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, Enum as SQLEnum, DateTime, Date, ForeignKey, Numeric, Uuid as UUID, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.core.database import Base
from backend.models.role import InvoiceType, InvoiceStatus


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        UniqueConstraint("lease_id", "billing_period_start", "billing_period_end", name="uq_invoice_lease_period"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)

    landlord_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("landlord_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenant_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="RESTRICT"), nullable=False, index=True)
    unit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="RESTRICT"), nullable=False, index=True)
    tenancy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenancies.id", ondelete="CASCADE"), nullable=False, index=True)
    lease_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("leases.id", ondelete="CASCADE"), nullable=False, index=True)

    invoice_type: Mapped[InvoiceType] = mapped_column(SQLEnum(InvoiceType), default=InvoiceType.RENT)

    billing_period_start: Mapped[date] = mapped_column(Date, nullable=False)
    billing_period_end: Mapped[date] = mapped_column(Date, nullable=False)

    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)

    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    discount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    late_fee: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    amount_paid: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    balance_due: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    currency: Mapped[str] = mapped_column(String(10), default="RWF")
    status: Mapped[InvoiceStatus] = mapped_column(SQLEnum(InvoiceStatus), default=InvoiceStatus.ISSUED)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")
    receipts = relationship("Receipt", back_populates="invoice", cascade="all, delete-orphan")
