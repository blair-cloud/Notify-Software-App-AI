import uuid
from datetime import datetime, date, timezone
from sqlalchemy import (
    String,
    Boolean,
    Integer,
    DateTime,
    Date,
    ForeignKey,
    Numeric,
    Text,
    Float,
    Uuid as UUID,
    Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.core.database import Base


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    landlord_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("landlord_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    bank_name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_name: Mapped[str] = mapped_column(String(150), nullable=False)
    account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="RWF")
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    statements = relationship("BankStatement", back_populates="bank_account")


class BankStatement(Base):
    __tablename__ = "bank_statements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    landlord_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("landlord_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    property_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("properties.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    bank_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bank_accounts.id", ondelete="SET NULL"),
        nullable=True
    )

    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), default="CSV")
    file_size: Mapped[int] = mapped_column(Integer, default=0)

    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)

    total_transactions_count: Mapped[int] = mapped_column(Integer, default=0)
    matched_count: Mapped[int] = mapped_column(Integer, default=0)
    unmatched_count: Mapped[int] = mapped_column(Integer, default=0)
    duplicate_count: Mapped[int] = mapped_column(Integer, default=0)

    total_incoming_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    matched_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)

    status: Mapped[str] = mapped_column(String(50), default="COMPLETED")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # AI Document Understanding & Extraction Audit Trail
    ai_provider: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    ai_model: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    extraction_status: Mapped[str | None] = mapped_column(String(50), default="COMPLETED")
    raw_ai_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    extraction_errors: Mapped[str | None] = mapped_column(Text, nullable=True)
    processing_duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0)

    # Statement-level metadata extracted by AI
    bank_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    account_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    account_number_masked: Mapped[str | None] = mapped_column(String(50), nullable=True)
    opening_balance: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True, default=0.0)
    closing_balance: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True, default=0.0)
    currency: Mapped[str] = mapped_column(String(10), default="RWF")

    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    bank_account = relationship("BankAccount", back_populates="statements")
    transactions = relationship("BankTransaction", back_populates="statement", cascade="all, delete-orphan")


class BankTransaction(Base):
    __tablename__ = "bank_transactions"
    __table_args__ = (
        Index("ix_bank_txn_dedup", "landlord_id", "transaction_reference", "transaction_date", "amount"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    statement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bank_statements.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    landlord_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("landlord_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    transaction_reference: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    transaction_time: Mapped[str | None] = mapped_column(String(30), nullable=True)

    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="RWF")
    is_credit: Mapped[bool] = mapped_column(Boolean, default=True)

    payer_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    payer_account: Mapped[str | None] = mapped_column(String(100), nullable=True)
    balance_after: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    extraction_confidence: Mapped[float | None] = mapped_column(Float, default=1.0)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    matching_status: Mapped[str] = mapped_column(String(50), default="UNMATCHED")  # MATCHED, PARTIAL, NEEDS_REVIEW, UNMATCHED, DUPLICATE, REJECTED
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)

    matched_tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenant_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    matched_invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    matched_payment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payments.id", ondelete="SET NULL"),
        nullable=True
    )
    match_method: Mapped[str | None] = mapped_column(String(60), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    statement = relationship("BankStatement", back_populates="transactions")
    matches = relationship("PaymentMatch", back_populates="transaction", cascade="all, delete-orphan")


class PaymentMatch(Base):
    __tablename__ = "payment_matches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bank_transactions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    statement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bank_statements.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    landlord_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("landlord_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenant_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    payment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payments.id", ondelete="SET NULL"),
        nullable=True
    )

    matched_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    confidence: Mapped[str] = mapped_column(String(20), default="HIGH")  # HIGH, MEDIUM, LOW
    confidence_score: Mapped[float] = mapped_column(Float, default=1.0)
    matching_signals: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON formatted signals

    review_status: Mapped[str] = mapped_column(String(30), default="AUTO_CONFIRMED")  # AUTO_CONFIRMED, PENDING_REVIEW, CONFIRMED_MANUALLY, REJECTED
    confirmed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    transaction = relationship("BankTransaction", back_populates="matches")


class TrackerCorrection(Base):
    """
    Stores historical landlord confirmation and rejection decisions to learn
    payer/narration patterns for future bank statement matching.
    """
    __tablename__ = "tracker_corrections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    landlord_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("landlord_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    payer_name_pattern: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    description_pattern: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)

    matched_tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenant_profiles.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    matched_invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    action: Mapped[str] = mapped_column(String(30), default="CONFIRMED")  # CONFIRMED | REJECTED
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )
