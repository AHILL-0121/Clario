from fastapi import APIRouter, Request, HTTPException, Header, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.customer import Customer
from app.core.security import verify_hmac_signature
from app.core.websocket import manager
from app.config import settings
from app.services.crm_service import CRMService
import structlog
import uuid

log = structlog.get_logger()
router = APIRouter()
crm_service = CRMService()

SECRETS = {
    "zoho": settings.ZOHO_WEBHOOK_SECRET,
    "hubspot": settings.HUBSPOT_WEBHOOK_SECRET,
    "shopify": settings.SHOPIFY_WEBHOOK_SECRET,
}


async def _validate_and_route(
    crm: str,
    request: Request,
    signature: str,
    tenant_id: uuid.UUID,
    db: AsyncSession,
    bg: BackgroundTasks,
):
    body = await request.body()
    secret = SECRETS.get(crm, "")
    if secret and not verify_hmac_signature(body, secret, signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    payload = await request.json()
    bg.add_task(crm_service.process_event, crm, payload, tenant_id, db)
    await manager.broadcast(tenant_id, "crm.event", {"crm": crm, "event": payload.get("event")})
    return {"status": "accepted"}


@router.post("/zoho/{tenant_id}")
async def zoho_webhook(
    tenant_id: uuid.UUID,
    request: Request,
    bg: BackgroundTasks,
    x_zoho_signature: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    return await _validate_and_route("zoho", request, x_zoho_signature, tenant_id, db, bg)


@router.post("/hubspot/{tenant_id}")
async def hubspot_webhook(
    tenant_id: uuid.UUID,
    request: Request,
    bg: BackgroundTasks,
    x_hubspot_signature: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    return await _validate_and_route("hubspot", request, x_hubspot_signature, tenant_id, db, bg)


@router.post("/shopify/{tenant_id}")
async def shopify_webhook(
    tenant_id: uuid.UUID,
    request: Request,
    bg: BackgroundTasks,
    x_shopify_hmac_sha256: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    return await _validate_and_route("shopify", request, x_shopify_hmac_sha256, tenant_id, db, bg)


@router.post("/generic/{tenant_id}")
async def generic_webhook(
    tenant_id: uuid.UUID,
    request: Request,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    return await _validate_and_route("generic", request, "", tenant_id, db, bg)
