import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Enum as SQLEnum, DateTime, ForeignKey, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column
from backend.core.database import Base
from backend.models.role import InvitationStatus


class Invitation(Base):
    __tablename__ = "invitations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    landlord_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("landlord_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tenant_phone: Mapped[str] = mapped_column(String(50), nullable=False)
    # Optional - not required to send an invitation, but lets the landlord see
    # a real name in the Tenants list immediately instead of a placeholder.
    tenant_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    unit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="CASCADE"), nullable=False)

    # The shell TenantProfile created the moment this invitation is sent, so
    # the landlord has something to show in the Tenants list and to attach a
    # lease to before the invited person ever signs up. Accepting the
    # invitation claims this same row (sets its user_id) rather than creating
    # a second one - this FK is what accept_invitation_transaction resolves to
    # find the right row to claim.
    tenant_profile_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenant_profiles.id", ondelete="SET NULL"), nullable=True, index=True
    )

    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    status: Mapped[InvitationStatus] = mapped_column(SQLEnum(InvitationStatus), default=InvitationStatus.PENDING, index=True)

    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
