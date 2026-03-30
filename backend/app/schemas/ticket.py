from pydantic import BaseModel
from app.models.ticket import TicketStatus, TicketChannel
import uuid
from datetime import datetime
from typing import Optional


class TicketCreate(BaseModel):
    customer_id: uuid.UUID
    subject: str
    channel: TicketChannel = TicketChannel.WEB_CHAT
    initial_message: Optional[str] = None


class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    assigned_agent_id: Optional[uuid.UUID] = None
    ai_draft: Optional[str] = None


class TicketOut(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    customer_id: uuid.UUID
    assigned_agent_id: Optional[uuid.UUID]
    subject: str
    status: TicketStatus
    channel: TicketChannel
    frustration_score: float
    ai_draft: Optional[str]
    share_token: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    content: str
    sender: str = "customer"
    msg_type: str = "text"


class MessageOut(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    sender: str
    msg_type: str
    content: str
    transcript: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
