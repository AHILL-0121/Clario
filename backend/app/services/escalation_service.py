"""
Escalation Engine
frustration_score = 0.5 * sentiment_neg + 0.3 * message_frequency + 0.2 * vip_flag
Threshold: 0.7
"""

import uuid
from typing import Optional

try:
    import structlog
    log = structlog.get_logger()
except ImportError:
    import logging
    log = logging.getLogger(__name__)

from app.config import settings


class EscalationService:

    def _compute_score(
        self,
        sentiment: float,         # -1.0 to 1.0 (negative = bad)
        message_frequency: float, # 0.0–1.0 normalised burst rate
        is_vip: bool,
    ) -> float:
        sentiment_neg = max(0.0, -sentiment)   # flip: negative sentiment -> positive factor
        vip_flag = 1.0 if is_vip else 0.0
        score = (0.5 * sentiment_neg) + (0.3 * message_frequency) + (0.2 * vip_flag)
        return round(score, 4)

    async def evaluate(self, ticket_id: str, tenant_id: str):
        """
        Background task: re-compute frustration score for the latest messages
        and escalate if threshold exceeded.
        """
        from app.database import AsyncSessionLocal
        from app.models.ticket import Ticket, TicketStatus
        from app.models.message import Message, MessageSender
        from app.models.customer import Customer
        from app.models.escalation import EscalationLog
        from app.models.ai_log import AILog
        from app.core.websocket import manager
        from app.services.email_service import EmailService
        from sqlalchemy import select, update, func
        import datetime

        email_service = EmailService()

        async with AsyncSessionLocal() as db:
            # Fetch ticket + customer
            t_res = await db.execute(
                select(Ticket).where(Ticket.id == uuid.UUID(ticket_id))
            )
            ticket: Optional[Ticket] = t_res.scalar_one_or_none()
            if not ticket or ticket.status in (TicketStatus.ESCALATED, TicketStatus.CLOSED):
                return

            c_res = await db.execute(select(Customer).where(Customer.id == ticket.customer_id))
            customer: Optional[Customer] = c_res.scalar_one_or_none()
            is_vip = bool(customer and customer.is_vip)

            # Latest AI sentiment
            ai_res = await db.execute(
                select(AILog).where(AILog.ticket_id == ticket.id)
                .order_by(AILog.created_at.desc())
                .limit(1)
            )
            ai_log = ai_res.scalar_one_or_none()
            sentiment = ai_log.sentiment if ai_log and ai_log.sentiment is not None else 0.0

            # Message frequency (msgs in last 10 min / 5 = normalised)
            window = datetime.datetime.utcnow() - datetime.timedelta(minutes=10)
            freq_res = await db.execute(
                select(func.count()).where(
                    Message.ticket_id == ticket.id,
                    Message.sender == MessageSender.CUSTOMER,
                    Message.created_at >= window,
                )
            )
            msg_count = freq_res.scalar() or 0
            frequency = min(1.0, msg_count / 5.0)

            score = self._compute_score(sentiment, frequency, is_vip)

            # Update ticket frustration score
            await db.execute(
                update(Ticket).where(Ticket.id == ticket.id).values(frustration_score=score)
            )

            if score >= settings.ESCALATION_THRESHOLD and ticket.status != TicketStatus.ESCALATED:
                # Generate share token if not already present
                if not ticket.share_token:
                    share_token = Ticket.generate_share_token()
                    await db.execute(
                        update(Ticket).where(Ticket.id == ticket.id).values(share_token=share_token)
                    )
                else:
                    share_token = ticket.share_token

                # Update ticket status to escalated
                await db.execute(
                    update(Ticket).where(Ticket.id == ticket.id).values(status=TicketStatus.ESCALATED)
                )

                # Create escalation log
                esc_log = EscalationLog(
                    tenant_id=uuid.UUID(tenant_id),
                    ticket_id=ticket.id,
                    frustration_score=score,
                    sentiment_score=sentiment,
                    reason=f"score={score:.2f} >= threshold={settings.ESCALATION_THRESHOLD}",
                )
                db.add(esc_log)
                await db.commit()

                # Refresh to get updated share_token
                await db.refresh(ticket)

                # Check if customer is actively viewing the ticket
                customer_is_active = manager.is_customer_active(ticket.id, ticket.customer_id)

                if customer_is_active:
                    # Customer is active - send real-time notification through WebSocket
                    await manager.send_to_customer(
                        ticket.id,
                        ticket.customer_id,
                        "ticket.escalated.active",
                        {
                            "ticket_id": ticket_id,
                            "score": score,
                            "message": "Your support request has been escalated to a human specialist. They will respond shortly.",
                            "share_token": share_token,
                        },
                    )
                    log.info("Customer active - sent real-time escalation notification", ticket_id=ticket_id)
                else:
                    # Customer is not active - send email with link
                    if customer and customer.email:
                        await email_service.send_escalation_email(
                            customer_email=customer.email,
                            customer_name=customer.full_name or "Customer",
                            ticket_id=ticket_id,
                            share_token=share_token,
                            subject=ticket.subject,
                        )
                        log.info("Customer inactive - sent escalation email", ticket_id=ticket_id, customer_email=customer.email)

                # Broadcast to internal team (managers, owners)
                await manager.broadcast(
                    uuid.UUID(tenant_id),
                    "ticket.escalated",
                    {"ticket_id": ticket_id, "score": score, "share_token": share_token},
                )
                log.warning("Ticket escalated", ticket_id=ticket_id, score=score, customer_active=customer_is_active)
            else:
                await db.commit()
