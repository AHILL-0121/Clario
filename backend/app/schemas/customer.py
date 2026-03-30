from pydantic import BaseModel
from typing import Optional, Any, Dict
import uuid
from datetime import datetime


class CustomerCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    is_vip: bool = False
    external_id: Optional[str] = None
    crm_source: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = {}


class CustomerOut(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    full_name: str
    email: Optional[str]
    phone: Optional[str]
    is_vip: bool
    crm_source: Optional[str]
    external_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class WebhookPayload(BaseModel):
    event: str
    crm: str                          # zoho | hubspot | shopify | generic
    data: Dict[str, Any]
