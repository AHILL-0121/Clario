import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.database import get_db
from app.models.user import User
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerOut
from app.core.security import get_current_user

router = APIRouter()


@router.post("/", response_model=CustomerOut, status_code=201)
async def create_customer(
    body: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = Customer(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer


@router.get("/", response_model=List[CustomerOut])
async def list_customers(
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Customer).where(Customer.tenant_id == current_user.tenant_id)
    if search:
        q = q.where(
            or_(
                Customer.full_name.ilike(f"%{search}%"),
                Customer.email.ilike(f"%{search}%"),
                Customer.phone.ilike(f"%{search}%"),
            )
        )
    result = await db.execute(q.offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/{customer_id}", response_model=CustomerOut)
async def get_customer(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.tenant_id == current_user.tenant_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer
