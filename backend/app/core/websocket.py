import uuid
import json
from typing import Dict, List, Optional, Set
from fastapi import WebSocket


class ConnectionManager:
    """Manages per-tenant WebSocket connections and tracks active customer sessions."""

    def __init__(self):
        # tenant_id -> list of active WebSocket connections
        self._connections: Dict[str, List[WebSocket]] = {}
        # Track active customer sessions by ticket_id
        # ticket_id -> set of customer_ids actively viewing the ticket
        self._active_customers: Dict[str, Set[str]] = {}
        # Map websocket to metadata (for cleanup)
        self._websocket_metadata: Dict[WebSocket, Dict[str, str]] = {}

    async def connect(self, websocket: WebSocket, tenant_id: uuid.UUID, customer_id: Optional[uuid.UUID] = None, ticket_id: Optional[uuid.UUID] = None):
        await websocket.accept()
        key = str(tenant_id)
        self._connections.setdefault(key, []).append(websocket)

        # Track metadata for this connection
        metadata = {"tenant_id": key}
        if customer_id:
            metadata["customer_id"] = str(customer_id)
        if ticket_id:
            metadata["ticket_id"] = str(ticket_id)
            # Track active customer viewing this ticket
            if customer_id:
                ticket_key = str(ticket_id)
                self._active_customers.setdefault(ticket_key, set()).add(str(customer_id))

        self._websocket_metadata[websocket] = metadata

    def disconnect(self, websocket: WebSocket, tenant_id: uuid.UUID):
        key = str(tenant_id)
        conns = self._connections.get(key, [])
        if websocket in conns:
            conns.remove(websocket)

        # Clean up active customer tracking
        if websocket in self._websocket_metadata:
            metadata = self._websocket_metadata[websocket]
            ticket_id = metadata.get("ticket_id")
            customer_id = metadata.get("customer_id")

            if ticket_id and customer_id:
                if ticket_id in self._active_customers:
                    self._active_customers[ticket_id].discard(customer_id)
                    if not self._active_customers[ticket_id]:
                        del self._active_customers[ticket_id]

            del self._websocket_metadata[websocket]

    def is_customer_active(self, ticket_id: uuid.UUID, customer_id: uuid.UUID) -> bool:
        """Check if a customer is actively viewing a specific ticket"""
        ticket_key = str(ticket_id)
        customer_key = str(customer_id)
        return customer_key in self._active_customers.get(ticket_key, set())

    async def broadcast(self, tenant_id: uuid.UUID, event_type: str, data: dict):
        """Push a JSON event to all connections for a tenant."""
        payload = json.dumps({"event": event_type, "data": data})
        key = str(tenant_id)
        dead = []
        for ws in self._connections.get(key, []):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, tenant_id)

    async def send_to_customer(self, ticket_id: uuid.UUID, customer_id: uuid.UUID, event_type: str, data: dict):
        """Send a message to a specific customer viewing a ticket"""
        payload = json.dumps({"event": event_type, "data": data})
        ticket_key = str(ticket_id)
        customer_key = str(customer_id)

        for ws, metadata in self._websocket_metadata.items():
            if metadata.get("ticket_id") == ticket_key and metadata.get("customer_id") == customer_key:
                try:
                    await ws.send_text(payload)
                except Exception:
                    # Connection is dead, will be cleaned up later
                    pass


manager = ConnectionManager()
