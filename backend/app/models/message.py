import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from app.database import Base


class MessageSender(str, enum.Enum):
    CUSTOMER = "customer"
    AGENT = "agent"
    AI = "ai"
    SYSTEM = "system"


class MessageType(str, enum.Enum):
    TEXT = "text"
    AUDIO = "audio"
    IMAGE = "image"


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False, index=True)
    sender: Mapped[MessageSender] = mapped_column(SAEnum(MessageSender))
    msg_type: Mapped[MessageType] = mapped_column(SAEnum(MessageType), default=MessageType.TEXT)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    raw_file_path: Mapped[str] = mapped_column(String(500), nullable=True)  # audio/image path
    transcript: Mapped[str] = mapped_column(Text, nullable=True)            # from Whisper/OCR
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="messages")  # noqa: F821
