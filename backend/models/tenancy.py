import uuid
from datetime import datetime, date, timezone
from sqlalchemy import Enum as SQLEnum, DateTime, Date, ForeignKey, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.core.database import Base
from backend.models.role import TenancyStatus


class Tenancy(Base):
    __tablename__ = "tenancies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenant_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    landlord_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("landlord_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="RESTRICT"), nullable=False)
    unit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    status: Mapped[TenancyStatus] = mapped_column(SQLEnum(TenancyStatus), default=TenancyStatus.ACTIVE)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    tenant = relationship("TenantProfile", back_populates="tenancies")
    landlord = relationship("LandlordProfile", back_populates="tenancies")
    property = relationship("Property", back_populates="tenancies")
    unit = relationship("Unit", back_populates="tenancies")
    leases = relationship("Lease", back_populates="tenancy", cascade="all, delete-orphan")
