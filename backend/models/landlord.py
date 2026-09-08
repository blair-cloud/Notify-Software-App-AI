import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Enum as SQLEnum, DateTime, ForeignKey, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.core.database import Base
from backend.models.role import BusinessType, VerificationStatus


class LandlordProfile(Base):
    __tablename__ = "landlord_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    business_type: Mapped[BusinessType] = mapped_column(SQLEnum(BusinessType), default=BusinessType.INDIVIDUAL)
    business_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tax_identifier: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), default="Kigali")
    country: Mapped[str | None] = mapped_column(String(100), default="Rwanda")
    
    verification_status: Mapped[VerificationStatus] = mapped_column(SQLEnum(VerificationStatus), default=VerificationStatus.VERIFIED)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    user = relationship("User", back_populates="landlord_profile", lazy="selectin")
    properties = relationship("Property", back_populates="landlord", cascade="all, delete-orphan")
    units = relationship("Unit", back_populates="landlord", cascade="all, delete-orphan")
    tenancies = relationship("Tenancy", back_populates="landlord")
