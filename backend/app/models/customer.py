import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    external_id: Mapped[str] = mapped_column(String(255), nullable=True)   # CRM ID
    crm_source: Mapped[str] = mapped_column(String(50), nullable=True)     # zoho | hubspot | shopify
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=True)
    is_vip: Mapped[bool] = mapped_column(Boolean, default=False)
    extra_data: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="customers")  # noqa: F821
    tickets: Mapped[list["Ticket"]] = relationship("Ticket", back_populates="customer")  # noqa: F821
