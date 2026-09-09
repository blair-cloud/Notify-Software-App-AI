import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Enum as SQLEnum, DateTime, ForeignKey, Text, Integer, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column
from backend.core.database import Base
from backend.models.role import WhatsAppMessageType, WhatsAppMessageStatus


class WhatsAppMessage(Base):
    """
    One row per WhatsApp message Notify tries to send.

    This is the delivery record the landlord sees and the webhook updates: it
    is written *before* the send is attempted (QUEUED), updated with the
    provider's message id on the way out (SENT), and then moved to
    DELIVERED/READ/FAILED when Meta calls the status webhook back. Nothing
    else in the app is a reliable place to look up "did that tenant actually
    get their reminder", which is why it exists alongside the generic
    NotificationDeliveryLog rather than inside it: it needs the provider's
    wamid, the template used, and a link to the invoice/lease/invitation the
    message was about.
    """
    __tablename__ = "whatsapp_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Who it was about / who it went to. All optional so a message can still
    # be logged for a pending tenant with no account, or a bare test send.
    landlord_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("landlord_profiles.id", ondelete="SET NULL"), nullable=True, index=True
    )
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenant_profiles.id", ondelete="SET NULL"), nullable=True, index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True, index=True
    )
    recipient_phone: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    recipient_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    message_type: Mapped[WhatsAppMessageType] = mapped_column(
        SQLEnum(WhatsAppMessageType), nullable=False, index=True
    )
    # Null when the message went out as free-form text rather than an
    # approved template (only valid inside a 24h customer service window).
    template_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    template_language: Mapped[str | None] = mapped_column(String(20), nullable=True)
    body_preview: Mapped[str | None] = mapped_column(Text, nullable=True)

    # What the message was about, so the landlord can trace it back.
    invitation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invitations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    lease_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leases.id", ondelete="SET NULL"), nullable=True, index=True
    )
    invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True, index=True
    )

    status: Mapped[WhatsAppMessageStatus] = mapped_column(
        SQLEnum(WhatsAppMessageStatus), default=WhatsAppMessageStatus.QUEUED, nullable=False, index=True
    )
    # Meta's "wamid.*" id. Unique so a replayed status webhook cannot match
    # two rows, and indexed because the webhook looks messages up by it.
    provider_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)

    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
