from pydantic import BaseModel, EmailStr
from app.models.user import UserRole
import uuid
from datetime import datetime


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    tenant_name: str  # creates a new tenant


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    tenant_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True
