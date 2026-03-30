import uuid
from datetime import datetime
from sqlalchemy import Float, Boolean, Integer, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class TenantSettings(Base):
    """Per-tenant configurable policies managed by tenant_admin / owner."""
    __tablename__ = "tenant_settings"

    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), primary_key=True)
    escalation_threshold: Mapped[float] = mapped_column(Float, default=0.7)
    auto_draft_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_escalate_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    max_response_time_hours: Mapped[int] = mapped_column(Integer, default=24)
    welcome_message: Mapped[str] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
