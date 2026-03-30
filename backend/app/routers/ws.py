import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.websocket import manager
from app.core.security import decode_token
import structlog

log = structlog.get_logger()
router = APIRouter()


@router.websocket("/connect")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    """
    Clients connect via:
      ws://host/ws/connect?token=<JWT>

    Events pushed (JSON):
      { "event": "ticket.created" | "ticket.updated" | "message.new" | "crm.event", "data": {...} }
    """
    try:
        payload = decode_token(token)
        tenant_id = uuid.UUID(payload["tenant_id"])
    except Exception:
        await websocket.close(code=4001)
        return

    await manager.connect(websocket, tenant_id)
    log.info("WebSocket connected", tenant_id=str(tenant_id))
    try:
        while True:
            # Keep-alive: accept ping frames from client
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, tenant_id)
        log.info("WebSocket disconnected", tenant_id=str(tenant_id))
