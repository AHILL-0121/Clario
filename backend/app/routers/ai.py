from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.customer import Customer
from app.models.ticket import Ticket, TicketStatus, TicketChannel
from app.models.message import Message, MessageSender, MessageType
from app.core.security import get_current_user
from app.services.ai_service import AIService
from app.services.rag_service import RAGService
from pydantic import BaseModel
from typing import Optional
import uuid as _uuid
from datetime import datetime, timezone

router = APIRouter()
ai_service = AIService()
rag_service = RAGService()

# ── Public tenant ID — use Demo Company as the default inbox for public chats ──
# Managers of SwiftRoute (or whichever tenant) will be configured here
SWIFTROUTE_TENANT_ID = _uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")


class ChatRequest(BaseModel):
    message: str
    ticket_id: Optional[_uuid.UUID] = None


class PublicChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None   # browser-generated, for conversation continuity
    visitor_name: Optional[str] = None


class SaveChatRequest(BaseModel):
    session_id: str
    customer_email: str
    customer_name: Optional[str] = "Web Visitor"
    order_reference: Optional[str] = None   # order/AWB/invoice number from conversation
    issue_summary: Optional[str] = None     # brief subject line


@router.post("/public/chat", tags=["Public"])
async def public_chat(body: PublicChatRequest):
    """
    No-auth endpoint for the web chat widget.
    Supports multi-turn conversation via session_id.
    Channels: web_chat and email only (no WhatsApp).
    """
    result = await ai_service.chat(
        message=body.message,
        tenant_id=str(SWIFTROUTE_TENANT_ID),
        ticket_id=None,
        session_id=body.session_id,
    )
    return {
        "response": result.get("response", ""),
        "intent": result.get("intent", "general_inquiry"),
        "sentiment": result.get("sentiment", 0.0),
        "session_id": body.session_id,
    }


@router.post("/public/save-chat", tags=["Public"])
async def save_chat(body: SaveChatRequest, db: AsyncSession = Depends(get_db)):
    """
    Called when the customer submits their inquiry after providing email + order reference.
    Saves the full chat history as an OPEN ticket for manager review.
    Manager contacts the customer via email or web chat — no WhatsApp.
    """
    tenant_id = SWIFTROUTE_TENANT_ID

    # 1. Find or create customer by email
    res = await db.execute(
        select(Customer).where(
            Customer.email == body.customer_email,
            Customer.tenant_id == tenant_id,
        )
    )
    customer = res.scalar_one_or_none()
    if not customer:
        customer = Customer(
            id=_uuid.uuid4(),
            tenant_id=tenant_id,
            full_name=body.customer_name or "Web Visitor",
            email=body.customer_email,
            is_vip=False,
        )
        db.add(customer)
        await db.flush()

    # 2. Build ticket subject
    subject = body.issue_summary or "Web chat inquiry"
    if body.order_reference:
        subject = f"[{body.order_reference}] {subject}"

    # 3. Create ticket — OPEN, WEB_CHAT, unassigned (manager reviews)
    ticket_id = _uuid.uuid4()
    ticket = Ticket(
        id=ticket_id,
        tenant_id=tenant_id,
        customer_id=customer.id,
        assigned_agent_id=None,
        subject=subject[:500],
        status=TicketStatus.OPEN,
        channel=TicketChannel.WEB_CHAT,
        frustration_score=0.0,
        created_at=datetime.now(timezone.utc),
    )
    db.add(ticket)
    await db.flush()

    # 4. Replay session history as ticket messages
    history = ai_service.get_session_history(body.session_id)
    for turn in history:
        role = turn.get("role", "user")
        content = turn.get("content", "")
        if role == "user":
            sender = MessageSender.CUSTOMER
        elif role == "assistant":
            sender = MessageSender.AI
        else:
            continue
        db.add(Message(
            id=_uuid.uuid4(),
            tenant_id=tenant_id,
            ticket_id=ticket_id,
            sender=sender,
            msg_type=MessageType.TEXT,
            content=content,
            created_at=datetime.now(timezone.utc),
        ))

    # 5. Add a system note for the manager
    note = (
        f"[Web chat inquiry submitted]\n"
        f"Customer email: {body.customer_email}\n"
        f"Order/Reference: {body.order_reference or 'Not provided'}\n"
        f"Action required: Manager to review conversation and contact customer "
        f"via email or web chat."
    )
    db.add(Message(
        id=_uuid.uuid4(),
        tenant_id=tenant_id,
        ticket_id=ticket_id,
        sender=MessageSender.SYSTEM,
        msg_type=MessageType.TEXT,
        content=note,
        created_at=datetime.now(timezone.utc),
    ))

    await db.commit()
    return {
        "ticket_id": str(ticket_id),
        "message": (
            f"Your inquiry has been logged. Our team will contact you at "
            f"{body.customer_email} within 4 hours via email or web chat."
        ),
    }


class IngestRequest(BaseModel):
    text: str
    source_type: str = "knowledge_base"
    source_id: Optional[str] = None


@router.post("/chat")
async def chat(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await ai_service.chat(
        message=body.message,
        tenant_id=str(current_user.tenant_id),
        ticket_id=str(body.ticket_id) if body.ticket_id else None,
    )
    return result


@router.post("/ingest")
async def ingest_knowledge(
    body: IngestRequest,
    current_user: User = Depends(get_current_user),
):
    count = await rag_service.ingest_text(
        text=body.text,
        tenant_id=str(current_user.tenant_id),
        source_type=body.source_type,
        source_id=body.source_id,
    )
    return {"chunks_indexed": count}


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    transcript = await ai_service.transcribe_audio_bytes(content, file.filename)
    return {"transcript": transcript}


@router.post("/ocr")
async def ocr_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    text = await ai_service.ocr_image_bytes(content)
    return {"text": text}
