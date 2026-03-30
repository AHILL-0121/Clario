import uuid
from datetime import datetime, date
from sqlalchemy import Text, DateTime, Date, ForeignKey, Float, Integer, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class WeeklyMetric(Base):
    __tablename__ = "weekly_metrics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    week_start: Mapped[date] = mapped_column(Date, nullable=False)
    total_tickets: Mapped[int] = mapped_column(Integer, default=0)
    resolved_tickets: Mapped[int] = mapped_column(Integer, default=0)
    escalations: Mapped[int] = mapped_column(Integer, default=0)
    automation_rate: Mapped[float] = mapped_column(Float, default=0.0)
    avg_sentiment: Mapped[float] = mapped_column(Float, default=0.0)
    churn_risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    ai_summary: Mapped[str] = mapped_column(Text, nullable=True)
    raw_metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
