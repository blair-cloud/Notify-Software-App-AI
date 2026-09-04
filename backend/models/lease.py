import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, Enum as SQLEnum, DateTime, Date, ForeignKey, Numeric, Integer, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.core.database import Base
from backend.models.role import LeaseStatus


class Lease(Base):
    __tablename__ = "leases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenancy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenancies.id", ondelete="RESTRICT"), nullable=False, index=True)
    landlord_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("landlord_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenant_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="RESTRICT"), nullable=False)
    unit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    monthly_rent: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    security_deposit: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    payment_due_day: Mapped[int] = mapped_column(Integer, default=5)
    late_fee: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    currency: Mapped[str] = mapped_column(String(10), default="RWF")
    
    status: Mapped[LeaseStatus] = mapped_column(SQLEnum(LeaseStatus), default=LeaseStatus.ACTIVE)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    document_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    tenancy = relationship("Tenancy", back_populates="leases")
