import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Enum as SQLEnum, DateTime, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.core.database import Base
from backend.models.role import UserRole, UserStatus, UserLanguage


class User(Base):
    """
    Application profile for a Supabase Auth user.

    `id` is not generated here - it *is* `auth.users.id`. Supabase Auth owns
    identity (credentials, sessions, email confirmation, password resets), and
    this table holds only what the application needs on top of that. There is
    deliberately no password column: passwords never touch application tables.

    The class is still called `User` because the whole codebase refers to it
    that way; the table it maps to is `profiles`.
    """

    __tablename__ = "profiles"

    # Matches auth.users.id. The foreign key itself lives in the migration,
    # because SQLAlchemy does not manage Supabase's `auth` schema.
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), nullable=False, default=UserRole.TENANT)
    language: Mapped[UserLanguage] = mapped_column(SQLEnum(UserLanguage), nullable=False, default=UserLanguage.EN)
    status: Mapped[UserStatus] = mapped_column(SQLEnum(UserStatus), nullable=False, default=UserStatus.ACTIVE)

    # Mirrors auth.users.email_confirmed_at, kept current by a trigger so the
    # application can read it without querying the auth schema.
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    landlord_profile = relationship("LandlordProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="selectin")
    tenant_profile = relationship("TenantProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="selectin")
