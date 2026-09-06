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

    tenant_signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    tenant_signature_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    tenancy = relationship("Tenancy", back_populates="leases", lazy="selectin")
    documents = relationship(
        "LeaseDocument",
        back_populates="lease",
        cascade="all, delete-orphan",
        order_by="LeaseDocument.version",
    )

    @property
    def agreement_document(self):
        active = [d for d in self.documents if d.status == "ACTIVE"]
        if active:
            return active[-1]
        return self.documents[-1] if self.documents else None

    @property
    def document_history(self):
        return list(self.documents)

    @property
    def has_signed_document(self) -> bool:
        return len(self.documents) > 0

    @property
    def compliance_status(self) -> str:
        return "COMPLETE" if self.documents else "INCOMPLETE"

    @property
    def compliance_notes(self):
        return "All legal requirements met. Signed agreement on file." if self.documents else None

    # Denormalized display fields for the leases list/table and the printable
    # lease document. `tenancy` is eager-loaded (lazy="selectin"), and it in
    # turn eager-loads tenant/landlord/property/unit (also lazy="selectin"),
    # so none of these ever trigger a lazy load outside of an async context.
    @property
    def tenant_name(self):
        t = self.tenancy.tenant if self.tenancy else None
        u = t.user if t else None
        return f"{u.first_name} {u.last_name}".strip() if u else None

    @property
    def tenant_email(self):
        t = self.tenancy.tenant if self.tenancy else None
        return t.user.email if t and t.user else None

    @property
    def tenant_phone(self):
        t = self.tenancy.tenant if self.tenancy else None
        return t.user.phone if t and t.user else None

    @property
    def tenant_national_id(self):
        t = self.tenancy.tenant if self.tenancy else None
        return t.national_id if t else None

    @property
    def property_name(self):
        p = self.tenancy.property if self.tenancy else None
        return p.name if p else None

    @property
    def property_address(self):
        p = self.tenancy.property if self.tenancy else None
        return p.address if p else None

    @property
    def property_district(self):
        p = self.tenancy.property if self.tenancy else None
        return p.district if p else None

    @property
    def unit_number(self):
        u = self.tenancy.unit if self.tenancy else None
        return u.unit_number if u else None

    @property
    def unit_floor(self):
        u = self.tenancy.unit if self.tenancy else None
        return u.floor if u else None

    @property
    def landlord_name(self):
        lp = self.tenancy.landlord if self.tenancy else None
        u = lp.user if lp else None
        return f"{u.first_name} {u.last_name}".strip() if u else None

    @property
    def landlord_business_name(self):
        lp = self.tenancy.landlord if self.tenancy else None
        return lp.business_name if lp else None

    @property
    def landlord_phone(self):
        lp = self.tenancy.landlord if self.tenancy else None
        return lp.user.phone if lp and lp.user else None

    @property
    def landlord_email(self):
        lp = self.tenancy.landlord if self.tenancy else None
        return lp.user.email if lp and lp.user else None

    @property
    def landlord_address(self):
        lp = self.tenancy.landlord if self.tenancy else None
        return lp.address if lp else None

    @property
    def days_remaining(self):
        if self.status in (LeaseStatus.DRAFT, LeaseStatus.TERMINATED):
            return None
        return (self.end_date - date.today()).days

    @property
    def tenant_document_status(self) -> str:
        """
        Compliance status shown to the tenant for the current document:
        - NO_DOCUMENT: nothing uploaded yet
        - SIGNED: tenant has digitally signed the current agreement
        - UPLOADED: tenant uploaded their own signed copy (not yet digitally signed)
        - PENDING_SIGNATURE: a document exists but the tenant hasn't signed or uploaded one
        """
        doc = self.agreement_document
        if not doc:
            return "NO_DOCUMENT"
        if self.tenant_signed_at:
            return "SIGNED"
        if doc.uploaded_by_role == "TENANT":
            return "UPLOADED"
        return "PENDING_SIGNATURE"
