import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.models.user import User
from app.models.ticket import Ticket, TicketStatus
from app.models.message import Message, MessageSender, MessageType
from app.models.subscription import Subscription
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketOut, MessageCreate, MessageOut
from app.core.security import get_current_user
from app.core.websocket import manager
from app.services.ai_service import AIService
from app.services.escalation_service import EscalationService

try:
    import structlog
    log = structlog.get_logger()
except ImportError:
    import logging
    log = logging.getLogger(__name__)
router = APIRouter()
ai_service = AIService()
escalation_service = EscalationService()


async def _check_ticket_limit(tenant_id: uuid.UUID, db: AsyncSession):
    result = await db.execute(select(Subscription).where(Subscription.tenant_id == tenant_id))
    sub = result.scalar_one_or_none()
    if sub and sub.tickets_used >= sub.ticket_limit:
        raise HTTPException(status_code=402, detail="Ticket limit reached for your subscription plan")


@router.post("/", response_model=TicketOut, status_code=201)
async def create_ticket(
    body: TicketCreate,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check_ticket_limit(current_user.tenant_id, db)

    ticket_id = uuid.uuid4()
    ticket = Ticket(
        id=ticket_id,
        tenant_id=current_user.tenant_id,
        customer_id=body.customer_id,
        subject=body.subject,
        channel=body.channel,
    )
    db.add(ticket)

    if body.initial_message:
        msg = Message(
            tenant_id=current_user.tenant_id,
            ticket_id=ticket_id,
            sender=MessageSender.CUSTOMER,
            msg_type=MessageType.TEXT,
            content=body.initial_message,
        )
        db.add(msg)

    # Increment usage
    await db.execute(
        update(Subscription)
        .where(Subscription.tenant_id == current_user.tenant_id)
        .values(tickets_used=Subscription.tickets_used + 1)
    )
    await db.commit()
    await db.refresh(ticket)

    # Trigger AI draft generation in background
    if body.initial_message:
        bg.add_task(ai_service.generate_draft, str(ticket.id), str(current_user.tenant_id), body.initial_message)

    await manager.broadcast(current_user.tenant_id, "ticket.created", {"ticket_id": str(ticket.id)})
    return ticket


@router.get("/", response_model=List[TicketOut])
async def list_tickets(
    status: Optional[TicketStatus] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Ticket).where(Ticket.tenant_id == current_user.tenant_id)
    if status:
        q = q.where(Ticket.status == status)
    q = q.offset(skip).limit(limit).order_by(Ticket.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{ticket_id}", response_model=TicketOut)
async def get_ticket(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id, Ticket.tenant_id == current_user.tenant_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.patch("/{ticket_id}", response_model=TicketOut)
async def update_ticket(
    ticket_id: uuid.UUID,
    body: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id, Ticket.tenant_id == current_user.tenant_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(ticket, field, val)

    await db.commit()
    await db.refresh(ticket)
    await manager.broadcast(current_user.tenant_id, "ticket.updated", {"ticket_id": str(ticket.id), "status": ticket.status})
    return ticket


@router.post("/{ticket_id}/messages", response_model=MessageOut, status_code=201)
async def add_message(
    ticket_id: uuid.UUID,
    body: MessageCreate,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id, Ticket.tenant_id == current_user.tenant_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    msg = Message(
        tenant_id=current_user.tenant_id,
        ticket_id=ticket_id,
        sender=body.sender,
        msg_type=body.msg_type,
        content=body.content,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    # Re-score escalation and re-generate draft after each customer message
    if body.sender == "customer":
        bg.add_task(escalation_service.evaluate, str(ticket.id), str(current_user.tenant_id))
        bg.add_task(ai_service.generate_draft, str(ticket.id), str(current_user.tenant_id), body.content)

    await manager.broadcast(current_user.tenant_id, "message.new", {"ticket_id": str(ticket_id)})
    return msg


@router.post("/{ticket_id}/audio", status_code=202)
async def upload_audio(
    ticket_id: uuid.UUID,
    bg: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    filename = file.filename or "audio.mp3"
    bg.add_task(ai_service.process_audio, str(ticket_id), str(current_user.tenant_id), content, filename)
    return {"status": "processing"}


@router.post("/{ticket_id}/image", status_code=202)
async def upload_image(
    ticket_id: uuid.UUID,
    bg: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    bg.add_task(ai_service.process_image, str(ticket_id), str(current_user.tenant_id), content)
    return {"status": "processing"}


@router.get("/{ticket_id}/messages", response_model=List[MessageOut])
async def get_messages(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Message).where(Message.ticket_id == ticket_id, Message.tenant_id == current_user.tenant_id)
        .order_by(Message.created_at)
    )
    return result.scalars().all()


# ============= PUBLIC ENDPOINTS (share token access) =============


@router.get("/shared/{share_token}", response_model=TicketOut)
async def get_ticket_by_share_token(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint: Access ticket via share token (no authentication required)
    Used for customer access via email link
    """
    result = await db.execute(
        select(Ticket).where(Ticket.share_token == share_token)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found or link is invalid")
    return ticket


@router.get("/shared/{share_token}/messages", response_model=List[MessageOut])
async def get_messages_by_share_token(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint: Get ticket messages via share token
    """
    # First get the ticket
    result = await db.execute(
        select(Ticket).where(Ticket.share_token == share_token)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found or link is invalid")

    # Get messages
    messages_result = await db.execute(
        select(Message).where(Message.ticket_id == ticket.id)
        .order_by(Message.created_at)
    )
    return messages_result.scalars().all()


@router.post("/shared/{share_token}/messages", response_model=MessageOut, status_code=201)
async def add_message_by_share_token(
    share_token: str,
    body: MessageCreate,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint: Customer adds message via share token
    """
    # Get the ticket
    result = await db.execute(
        select(Ticket).where(Ticket.share_token == share_token)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found or link is invalid")

    if ticket.status == TicketStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Cannot add messages to closed ticket")

    # Add message
    msg = Message(
        tenant_id=ticket.tenant_id,
        ticket_id=ticket.id,
        sender=MessageSender.CUSTOMER,
        msg_type=body.msg_type,
        content=body.content,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    # Notify the team via WebSocket
    await manager.broadcast(ticket.tenant_id, "message.new", {"ticket_id": str(ticket.id)})

    return msg
