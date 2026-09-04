import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Enum as SQLEnum, DateTime, ForeignKey, Numeric, Text, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.core.database import Base
from backend.models.role import PropertyType, PropertyStatus


class Property(Base):
    __tablename__ = "properties"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    landlord_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("landlord_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    property_type: Mapped[PropertyType] = mapped_column(SQLEnum(PropertyType), default=PropertyType.COMMERCIAL)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False, default="Nyarugenge")
    sector: Mapped[str | None] = mapped_column(String(100), nullable=True, default="Nyarugenge")
    cell: Mapped[str | None] = mapped_column(String(100), nullable=True)
    village: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 8), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(11, 8), nullable=True)
    
    status: Mapped[PropertyStatus] = mapped_column(SQLEnum(PropertyStatus), default=PropertyStatus.ACTIVE)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    landlord = relationship("LandlordProfile", back_populates="properties")
    units = relationship("Unit", back_populates="property", cascade="all, delete-orphan")
    tenancies = relationship("Tenancy", back_populates="property")
