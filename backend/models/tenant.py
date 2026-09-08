import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Enum as SQLEnum, DateTime, ForeignKey, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.core.database import Base
from backend.models.role import VerificationStatus


class TenantProfile(Base):
    __tablename__ = "tenant_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Nullable: a landlord's invitation creates this row immediately, before the
    # invited person has any Supabase Auth account to link it to. `user_id` is
    # NULL for that whole "invited, not yet accepted" window and is the single
    # source of truth for it - a tenant is pending exactly when this is NULL,
    # and becomes a real tenant the moment accepting the invitation sets it.
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), unique=True, nullable=True
    )

    national_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(100), nullable=True)

    emergency_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    emergency_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # What the landlord typed into the invitation form. Displayed only while
    # user_id is still NULL - once the real profile is linked, that profile's
    # own (confirmed) name/email/phone are what everything else reads instead.
    pending_first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pending_last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pending_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pending_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    verification_status: Mapped[VerificationStatus] = mapped_column(SQLEnum(VerificationStatus), default=VerificationStatus.VERIFIED)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    user = relationship("User", back_populates="tenant_profile", lazy="selectin")
    tenancies = relationship("Tenancy", back_populates="tenant")
