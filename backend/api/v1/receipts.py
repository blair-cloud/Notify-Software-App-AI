import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.core.database import get_db
from backend.core.dependencies import get_current_tenant
from backend.core.exceptions import ForbiddenException
from backend.models import Receipt, TenantProfile

router = APIRouter(prefix="/receipts", tags=["Receipts"])


class ReceiptSchema(BaseModel):
    id: uuid.UUID
    receipt_number: str
    payment_id: uuid.UUID
    invoice_id: uuid.UUID
    tenant_id: uuid.UUID
    landlord_id: uuid.UUID
    property_id: uuid.UUID
    unit_id: uuid.UUID
    amount: float
    currency: str
    issued_at: datetime

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=List[ReceiptSchema])
@router.get("/", response_model=List[ReceiptSchema])
async def get_all_receipts(db: AsyncSession = Depends(get_db)):
    stmt = select(Receipt).order_by(Receipt.issued_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.get("/{receipt_id}", response_model=ReceiptSchema)
async def get_receipt(receipt_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(Receipt).where(Receipt.id == receipt_id)
    res = await db.execute(stmt)
    receipt = res.scalar_one_or_none()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt


@router.get("/payment/{payment_id}", response_model=ReceiptSchema)
async def get_receipt_by_payment(payment_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(Receipt).where(Receipt.payment_id == payment_id)
    res = await db.execute(stmt)
    receipt = res.scalar_one_or_none()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt for payment not found")
    return receipt


@router.get("/tenant/me", response_model=List[ReceiptSchema])
async def get_my_receipts(
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Receipt).where(Receipt.tenant_id == tenant.id).order_by(Receipt.issued_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.get("/tenant/{tenant_id}", response_model=List[ReceiptSchema])
async def get_tenant_receipts(
    tenant_id: uuid.UUID,
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    if tenant.id != tenant_id:
        raise ForbiddenException("Isolation violation: You are not authorized to view these receipts")
    stmt = select(Receipt).where(Receipt.tenant_id == tenant_id).order_by(Receipt.issued_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.get("/landlord/{landlord_id}", response_model=List[ReceiptSchema])
async def get_landlord_receipts(landlord_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(Receipt).where(Receipt.landlord_id == landlord_id).order_by(Receipt.issued_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())
