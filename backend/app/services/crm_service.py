"""
CRM Service – normalizes webhook payloads from Zoho, HubSpot, Shopify,
and upserts customer records.
"""

import uuid
import structlog
from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.customer import Customer
from app.core.websocket import manager

log = structlog.get_logger()


NORMALIZERS = {
    "zoho": lambda d: {
        "external_id": str(d.get("id", "")),
        "full_name": f"{d.get('First_Name', '')} {d.get('Last_Name', '')}".strip(),
        "email": d.get("Email"),
        "phone": d.get("Phone"),
        "crm_source": "zoho",
    },
    "hubspot": lambda d: {
        "external_id": str(d.get("objectId", d.get("vid", ""))),
        "full_name": d.get("properties", {}).get("firstname", {}).get("value", "Unknown"),
        "email": d.get("properties", {}).get("email", {}).get("value"),
        "phone": d.get("properties", {}).get("phone", {}).get("value"),
        "crm_source": "hubspot",
    },
    "shopify": lambda d: {
        "external_id": str(d.get("id", "")),
        "full_name": f"{d.get('first_name', '')} {d.get('last_name', '')}".strip(),
        "email": d.get("email"),
        "phone": d.get("phone"),
        "crm_source": "shopify",
    },
    "generic": lambda d: {
        "external_id": str(d.get("id", "")),
        "full_name": d.get("name", "Unknown"),
        "email": d.get("email"),
        "phone": d.get("phone"),
        "crm_source": "generic",
    },
}


class CRMService:
    async def process_event(
        self,
        crm: str,
        payload: Dict[str, Any],
        tenant_id: uuid.UUID,
        db: AsyncSession,
    ):
        normalizer = NORMALIZERS.get(crm, NORMALIZERS["generic"])
        event = payload.get("event", "contact.update")
        data = payload.get("data", payload)

        try:
            normalized = normalizer(data)
        except Exception as e:
            log.error("CRM normalization failed", crm=crm, error=str(e))
            return

        normalized["extra_data"] = data  # store raw

        # Upsert customer
        external_id = normalized.get("external_id")
        if external_id:
            result = await db.execute(
                select(Customer).where(
                    Customer.tenant_id == tenant_id,
                    Customer.external_id == external_id,
                    Customer.crm_source == crm,
                )
            )
            customer = result.scalar_one_or_none()
            if customer:
                for k, v in normalized.items():
                    if v is not None:
                        setattr(customer, k, v)
                log.info("Customer updated from CRM", crm=crm, external_id=external_id)
            else:
                customer = Customer(tenant_id=tenant_id, **normalized)
                db.add(customer)
                log.info("Customer created from CRM", crm=crm, external_id=external_id)
        else:
            customer = Customer(tenant_id=tenant_id, **normalized)
            db.add(customer)

        await db.commit()

        await manager.broadcast(
            tenant_id,
            "crm.customer_upserted",
            {"crm": crm, "event": event, "external_id": external_id},
        )
