import uuid
from datetime import datetime
from sqlalchemy import Text, DateTime, ForeignKey, Float, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class EscalationLog(Base):
    __tablename__ = "escalation_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False, index=True)
    frustration_score: Mapped[float] = mapped_column(Float, nullable=False)
    sentiment_score: Mapped[float] = mapped_column(Float, nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=True)
    notified_manager_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="escalation_logs")  # noqa: F821
