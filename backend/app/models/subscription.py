import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from app.database import Base


class PlanType(str, enum.Enum):
    BASIC = "basic"
    PRO = "pro"
    PREMIUM = "premium"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), unique=True, nullable=False)
    plan: Mapped[PlanType] = mapped_column(SAEnum(PlanType), default=PlanType.BASIC)
    ticket_limit: Mapped[int] = mapped_column(Integer, default=500)
    agent_limit: Mapped[int] = mapped_column(Integer, default=3)
    ai_token_limit: Mapped[int] = mapped_column(Integer, default=100000)
    tickets_used: Mapped[int] = mapped_column(Integer, default=0)
    agents_used: Mapped[int] = mapped_column(Integer, default=0)
    ai_tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    valid_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="subscription")  # noqa: F821
