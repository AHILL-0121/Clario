from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.customer import Customer
from app.models.ticket import Ticket, TicketStatus, TicketChannel
from app.models.message import Message, MessageSender, MessageType
from app.core.security import get_current_user
from app.core.websocket import manager
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


class PublicRoomCreateRequest(BaseModel):
    customer_name: str
    customer_email: str
    order_reference: Optional[str] = None
    issue_summary: Optional[str] = None


class PublicRoomChatRequest(BaseModel):
    message: Optional[str] = ""
    image_base64: Optional[str] = None


class PublicRoomLeaveRequest(BaseModel):
    reason: Optional[str] = None


def _build_subject(issue_summary: Optional[str], order_reference: Optional[str]) -> str:
    subject = (issue_summary or "Web chat inquiry").strip()
    if order_reference:
        return f"[{order_reference.strip()}] {subject}"[:500]
    return subject[:500]


async def _get_ticket_by_room(room_id: str, db: AsyncSession) -> Ticket:
    result = await db.execute(
        select(Ticket).where(
            Ticket.tenant_id == SWIFTROUTE_TENANT_ID,
            Ticket.share_token == room_id,
        )
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Chat room not found")
    return ticket


async def _ensure_room_session_seed(room_id: str, ticket: Ticket, db: AsyncSession):
    """Backfill AI session memory from persisted ticket messages when empty."""
    existing = ai_service.get_session_history(room_id)
    if existing:
        return

    result = await db.execute(
        select(Message)
        .where(Message.ticket_id == ticket.id)
        .order_by(Message.created_at)
    )
    rows = result.scalars().all()

    history: list[dict] = []
    for row in rows:
        if row.sender == MessageSender.CUSTOMER:
            history.append({"role": "user", "content": row.content})
        elif row.sender in (MessageSender.AI, MessageSender.AGENT, MessageSender.SYSTEM):
            history.append({"role": "assistant", "content": row.content})

    if history:
        ai_service.set_session_history(room_id, history)


@router.post("/public/rooms", tags=["Public"])
async def create_public_room(body: PublicRoomCreateRequest, db: AsyncSession = Depends(get_db)):
    """
    Create a persistent room-backed ticket and return permanent room link token.
    Room URL format: /chat/{room_id}
    """
    tenant_id = SWIFTROUTE_TENANT_ID

    # Find or create customer using email for continuity across rooms.
    customer_result = await db.execute(
        select(Customer).where(
            Customer.email == body.customer_email,
            Customer.tenant_id == tenant_id,
        )
    )
    customer = customer_result.scalar_one_or_none()
    if not customer:
        customer = Customer(
            id=_uuid.uuid4(),
            tenant_id=tenant_id,
            full_name=(body.customer_name or "Web Visitor").strip(),
            email=body.customer_email.strip(),
            is_vip=False,
        )
        db.add(customer)
        await db.flush()

    room_id = Ticket.generate_share_token()
    subject = _build_subject(body.issue_summary, body.order_reference)

    ticket = Ticket(
        id=_uuid.uuid4(),
        tenant_id=tenant_id,
        customer_id=customer.id,
        subject=subject,
        status=TicketStatus.OPEN,
        channel=TicketChannel.WEB_CHAT,
        share_token=room_id,
        frustration_score=0.0,
        created_at=datetime.now(timezone.utc),
    )
    db.add(ticket)
    await db.flush()

    open_note = (
        "[Public chat room created]\n"
        f"Customer: {customer.full_name}\n"
        f"Email: {customer.email or 'Not provided'}\n"
        f"Order/Reference: {body.order_reference or 'Not provided'}"
    )
    db.add(Message(
        id=_uuid.uuid4(),
        tenant_id=tenant_id,
        ticket_id=ticket.id,
        sender=MessageSender.SYSTEM,
        msg_type=MessageType.TEXT,
        content=open_note,
        created_at=datetime.now(timezone.utc),
    ))

    # Seed customer-facing conversation with an assistant greeting.
    db.add(Message(
        id=_uuid.uuid4(),
        tenant_id=tenant_id,
        ticket_id=ticket.id,
        sender=MessageSender.AI,
        msg_type=MessageType.TEXT,
        content=(
            "👋 Welcome to SwiftRoute Logistics Support! I'm your AI assistant — available 24/7.\n\n"
            "I can help you track shipments, raise claims, understand our COD or customs policies, and more.\n\n"
            "How can I help you today?"
        ),
        created_at=datetime.now(timezone.utc),
    ))

    await db.commit()
    await manager.broadcast(tenant_id, "ticket.created", {"ticket_id": str(ticket.id)})

    return {
        "room_id": room_id,
        "ticket_id": str(ticket.id),
        "status": ticket.status,
        "room_url": f"/chat/{room_id}",
    }


@router.get("/public/rooms/{room_id}", tags=["Public"])
async def get_public_room(room_id: str, db: AsyncSession = Depends(get_db)):
    ticket = await _get_ticket_by_room(room_id, db)

    customer_result = await db.execute(
        select(Customer).where(Customer.id == ticket.customer_id)
    )
    customer = customer_result.scalar_one_or_none()

    return {
        "room_id": room_id,
        "ticket_id": str(ticket.id),
        "status": ticket.status,
        "subject": ticket.subject,
        "created_at": ticket.created_at,
        "is_resolved": ticket.status == TicketStatus.CLOSED,
        "customer": {
            "name": customer.full_name if customer else "Web Visitor",
            "email": customer.email if customer else None,
        },
    }


@router.get("/public/rooms/{room_id}/messages", tags=["Public"])
async def get_public_room_messages(room_id: str, db: AsyncSession = Depends(get_db)):
    ticket = await _get_ticket_by_room(room_id, db)

    result = await db.execute(
        select(Message)
        .where(Message.ticket_id == ticket.id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()

    return [
        {
            "id": str(msg.id),
            "sender": msg.sender,
            "msg_type": msg.msg_type,
            "content": msg.content,
            "created_at": msg.created_at,
        }
        for msg in messages
        if msg.sender != MessageSender.SYSTEM
    ]


@router.post("/public/rooms/{room_id}/chat", tags=["Public"])
async def public_room_chat(
    room_id: str,
    body: PublicRoomChatRequest,
    db: AsyncSession = Depends(get_db),
):
    ticket = await _get_ticket_by_room(room_id, db)

    if ticket.status == TicketStatus.CLOSED:
        raise HTTPException(status_code=409, detail="This chat room is closed because the ticket is resolved")

    text = (body.message or "").strip()
    has_image = bool(body.image_base64)
    if not text and not has_image:
        raise HTTPException(status_code=400, detail="Message or image is required")

    customer_content = text if text else "[Image attached by customer]"
    customer_msg_type = MessageType.IMAGE if has_image else MessageType.TEXT

    db.add(Message(
        id=_uuid.uuid4(),
        tenant_id=ticket.tenant_id,
        ticket_id=ticket.id,
        sender=MessageSender.CUSTOMER,
        msg_type=customer_msg_type,
        content=customer_content,
        created_at=datetime.now(timezone.utc),
    ))

    # If already escalated, queue customer updates for human team without AI auto-replies.
    if ticket.status == TicketStatus.ESCALATED:
        await db.commit()
        await manager.broadcast(ticket.tenant_id, "message.new", {"ticket_id": str(ticket.id)})
        return {
            "status": ticket.status,
            "mode": "human_support",
            "response": "Your message has been added. A human support specialist will reply in this room.",
        }

    await _ensure_room_session_seed(room_id, ticket, db)
    ai_input = text if text else "I attached an image, can you help me with it?"
    if has_image:
        ai_input += "\n\n[Customer included an image attachment in this turn.]"

    ai_result = await ai_service.chat(
        message=ai_input,
        tenant_id=str(ticket.tenant_id),
        ticket_id=str(ticket.id),
        session_id=room_id,
    )

    reply_text = ai_result.get("response", "")
    if reply_text:
        db.add(Message(
            id=_uuid.uuid4(),
            tenant_id=ticket.tenant_id,
            ticket_id=ticket.id,
            sender=MessageSender.AI,
            msg_type=MessageType.TEXT,
            content=reply_text,
            created_at=datetime.now(timezone.utc),
        ))

    # Keep active while unresolved; AI response implies waiting on customer follow-up.
    if ticket.status in (TicketStatus.OPEN, TicketStatus.AI_DRAFTED):
        ticket.status = TicketStatus.WAITING_CUSTOMER

    await db.commit()
    await manager.broadcast(ticket.tenant_id, "message.new", {"ticket_id": str(ticket.id)})

    return {
        "status": ticket.status,
        "mode": "ai",
        "response": reply_text,
        "intent": ai_result.get("intent"),
        "sentiment": ai_result.get("sentiment"),
    }


@router.post("/public/rooms/{room_id}/connect-human", tags=["Public"])
async def connect_public_room_to_human(room_id: str, db: AsyncSession = Depends(get_db)):
    ticket = await _get_ticket_by_room(room_id, db)

    if ticket.status == TicketStatus.CLOSED:
        raise HTTPException(status_code=409, detail="Ticket is already resolved")

    if ticket.status != TicketStatus.ESCALATED:
        ticket.status = TicketStatus.ESCALATED
        db.add(Message(
            id=_uuid.uuid4(),
            tenant_id=ticket.tenant_id,
            ticket_id=ticket.id,
            sender=MessageSender.SYSTEM,
            msg_type=MessageType.TEXT,
            content=(
                "[Human support requested]\n"
                "Customer requested a specialist handoff. Keep this room active until ticket resolution."
            ),
            created_at=datetime.now(timezone.utc),
        ))

    await db.commit()
    await manager.broadcast(ticket.tenant_id, "ticket.updated", {"ticket_id": str(ticket.id), "status": ticket.status})
    await manager.broadcast(ticket.tenant_id, "ticket.escalated", {"ticket_id": str(ticket.id)})

    return {
        "status": ticket.status,
        "message": "You are now connected to human support. This room remains active until the ticket is resolved.",
    }


@router.post("/public/rooms/{room_id}/leave", tags=["Public"])
async def leave_public_room(
    room_id: str,
    body: Optional[PublicRoomLeaveRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    ticket = await _get_ticket_by_room(room_id, db)

    if ticket.status != TicketStatus.CLOSED:
        reason = (body.reason if body and body.reason else "left_without_notice").strip()
        db.add(Message(
            id=_uuid.uuid4(),
            tenant_id=ticket.tenant_id,
            ticket_id=ticket.id,
            sender=MessageSender.SYSTEM,
            msg_type=MessageType.TEXT,
            content=(
                "[Customer left room]\n"
                f"Reason: {reason}\n"
                "Room remains active for follow-up until ticket is resolved."
            ),
            created_at=datetime.now(timezone.utc),
        ))
        await db.commit()

    return {
        "status": ticket.status,
        "message": "Room remains active until ticket resolution.",
    }


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
        source_id=body.source_id or "manual",
    )
    return {"chunks_indexed": count}


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    transcript = await ai_service.transcribe_audio_bytes(content, file.filename or "audio.wav")
    return {"transcript": transcript}


@router.post("/ocr")
async def ocr_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    text = await ai_service.ocr_image_bytes(content)
    return {"text": text}
