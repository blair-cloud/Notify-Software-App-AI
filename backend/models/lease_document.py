import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Text, Boolean, DateTime, ForeignKey, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.core.database import Base


class LeaseDocument(Base):
    __tablename__ = "lease_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lease_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("leases.id", ondelete="CASCADE"), nullable=False, index=True)

    document_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(100), default="application/pdf")
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    file_data: Mapped[str | None] = mapped_column(Text, nullable=True)

    version: Mapped[int] = mapped_column(Integer, default=1)
    version_notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    uploaded_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    uploaded_by_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    lease = relationship("Lease", back_populates="documents")

    @property
    def storage_path(self) -> str:
        return f"leases/{self.lease_id}/agreement/v{self.version}/{self.file_name}"

    @property
    def uploaded_at(self) -> datetime:
        return self.created_at

    @property
    def history(self):
        return list(self.lease.documents) if self.lease else [self]

    @property
    def safe_file_data(self) -> str | None:
        from sqlalchemy.orm.attributes import instance_state
        if 'file_data' in instance_state(self).unloaded:
            return None
        return self.file_data
