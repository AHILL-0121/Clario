"""
Analytics Service – aggregates weekly metrics and generates AI executive summary.
"""

import uuid
from datetime import datetime, timedelta, date
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.ticket import Ticket, TicketStatus
from app.models.escalation import EscalationLog
from app.models.ai_log import AILog
from app.models.analytics import WeeklyMetric
from app.services.ai_service import AIService

log = structlog.get_logger()
_ai = AIService()

BI_PROMPT = """You are a business intelligence analyst generating an executive summary for an MSME owner.

Metrics for the week starting {week_start}:
- Total tickets: {total_tickets}
- Resolved: {resolved_tickets}
- Escalations: {escalations}
- Automation rate: {automation_rate:.1f}%
- Average sentiment: {avg_sentiment:.2f} (range -1 to 1)
- Churn risk score: {churn_risk:.2f}

Write a concise 3-paragraph executive summary covering:
1. Support performance overview
2. Key concerns and escalation trends
3. Actionable recommendations for next week

Keep it professional and under 200 words."""


class AnalyticsService:
    async def generate_weekly_summary(self, tenant_id: str, db: AsyncSession) -> dict:
        tid = uuid.UUID(tenant_id)
        week_start = date.today() - timedelta(days=date.today().weekday() + 7)
        week_end = week_start + timedelta(days=7)

        # Aggregate tickets
        total_res = await db.execute(
            select(func.count()).where(
                Ticket.tenant_id == tid,
                Ticket.created_at >= week_start,
                Ticket.created_at < week_end,
            )
        )
        total = total_res.scalar() or 0

        resolved_res = await db.execute(
            select(func.count()).where(
                Ticket.tenant_id == tid,
                Ticket.status == TicketStatus.CLOSED,
                Ticket.created_at >= week_start,
                Ticket.created_at < week_end,
            )
        )
        resolved = resolved_res.scalar() or 0

        esc_res = await db.execute(
            select(func.count()).where(
                EscalationLog.tenant_id == tid,
                EscalationLog.created_at >= week_start,
                EscalationLog.created_at < week_end,
            )
        )
        escalations = esc_res.scalar() or 0

        # AI drafted / automation rate
        ai_drafted_res = await db.execute(
            select(func.count()).where(
                Ticket.tenant_id == tid,
                Ticket.status.in_([TicketStatus.AI_DRAFTED, TicketStatus.CLOSED]),
                Ticket.created_at >= week_start,
                Ticket.created_at < week_end,
            )
        )
        ai_drafted = ai_drafted_res.scalar() or 0
        automation_rate = (ai_drafted / total * 100) if total > 0 else 0.0

        # Avg sentiment
        sent_res = await db.execute(
            select(func.avg(AILog.sentiment)).where(
                AILog.tenant_id == tid,
                AILog.created_at >= week_start,
                AILog.created_at < week_end,
            )
        )
        avg_sentiment = sent_res.scalar() or 0.0

        # Churn risk (heuristic: escalation rate * 2 + negative sentiment * 0.5)
        esc_rate = escalations / max(total, 1)
        sentiment_neg = max(0.0, -avg_sentiment)
        churn_risk = min(1.0, esc_rate * 2 + sentiment_neg * 0.5)

        # Generate AI summary
        ai_summary = await _ai._call_ollama(
            BI_PROMPT.format(
                week_start=str(week_start),
                total_tickets=total,
                resolved_tickets=resolved,
                escalations=escalations,
                automation_rate=automation_rate,
                avg_sentiment=avg_sentiment,
                churn_risk=churn_risk,
            )
        )

        metric = WeeklyMetric(
            tenant_id=tid,
            week_start=week_start,
            total_tickets=total,
            resolved_tickets=resolved,
            escalations=escalations,
            automation_rate=automation_rate,
            avg_sentiment=float(avg_sentiment),
            churn_risk_score=churn_risk,
            ai_summary=ai_summary,
            raw_metrics={
                "ai_drafted": ai_drafted,
                "esc_rate": esc_rate,
            },
        )
        db.add(metric)
        await db.commit()
        await db.refresh(metric)
        log.info("Weekly summary generated", tenant_id=tenant_id, week=str(week_start))
        return {
            "week_start": str(week_start),
            "total_tickets": total,
            "resolved_tickets": resolved,
            "escalations": escalations,
            "automation_rate": automation_rate,
            "avg_sentiment": avg_sentiment,
            "churn_risk_score": churn_risk,
            "ai_summary": ai_summary,
        }
