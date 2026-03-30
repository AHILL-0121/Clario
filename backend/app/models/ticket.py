import uuid
import secrets
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Enum as SAEnum, Float, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from app.database import Base


class TicketStatus(str, enum.Enum):
    OPEN = "OPEN"
    AI_DRAFTED = "AI_DRAFTED"
    WAITING_CUSTOMER = "WAITING_CUSTOMER"
    ESCALATED = "ESCALATED"
    CLOSED = "CLOSED"


class TicketChannel(str, enum.Enum):
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    WEB_CHAT = "web_chat"


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False, index=True)
    assigned_agent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[TicketStatus] = mapped_column(SAEnum(TicketStatus), default=TicketStatus.OPEN)
    channel: Mapped[TicketChannel] = mapped_column(SAEnum(TicketChannel), default=TicketChannel.WEB_CHAT)
    frustration_score: Mapped[float] = mapped_column(Float, default=0.0)
    ai_draft: Mapped[str] = mapped_column(Text, nullable=True)
    share_token: Mapped[str] = mapped_column(String(64), nullable=True, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    closed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    @staticmethod
    def generate_share_token() -> str:
        """Generate a secure random token for sharing tickets"""
        return secrets.token_urlsafe(32)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="tickets")  # noqa: F821
    customer: Mapped["Customer"] = relationship("Customer", back_populates="tickets")  # noqa: F821
    assigned_agent: Mapped["User"] = relationship("User", back_populates="tickets")  # noqa: F821
    messages: Mapped[list["Message"]] = relationship("Message", back_populates="ticket", cascade="all, delete-orphan")  # noqa: F821
    ai_logs: Mapped[list["AILog"]] = relationship("AILog", back_populates="ticket", cascade="all, delete-orphan")  # noqa: F821
    escalation_logs: Mapped[list["EscalationLog"]] = relationship("EscalationLog", back_populates="ticket", cascade="all, delete-orphan")  # noqa: F821
