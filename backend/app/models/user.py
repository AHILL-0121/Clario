import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"           # Platform super-admin (manages all MSME tenants)
    TENANT_ADMIN = "tenant_admin"  # Company admin (KB, roles, policies)
    OWNER = "owner"           # Tenant owner (registered, billing)
    MANAGER = "manager"       # Operations manager within tenant
    AGENT = "agent"           # Support agent


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.AGENT)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")  # noqa: F821
    tickets: Mapped[list["Ticket"]] = relationship("Ticket", back_populates="assigned_agent")  # noqa: F821
