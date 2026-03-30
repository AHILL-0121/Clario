import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, ARRAY, REAL
from app.database import Base


class Embedding(Base):
    __tablename__ = "embeddings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)   # "knowledge_base" | "ticket" | "faq"
    source_id: Mapped[str] = mapped_column(String(255), nullable=True)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    faiss_index_id: Mapped[int] = mapped_column(nullable=True)             # row id in FAISS flat index
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
