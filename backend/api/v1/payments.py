import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.services.payment_service import PaymentService
from backend.models import PaymentMethod, PaymentChannel, PaymentStatus

router = APIRouter(prefix="/payments", tags=["Payments"])


class PaymentRequest(BaseModel):
    invoice_id: uuid.UUID
    amount: float
    payment_method: PaymentMethod
    payment_channel: PaymentChannel = PaymentChannel.ONLINE
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
    auto_verify: bool = False


class PaymentVerifyRequest(BaseModel):
    verifier_id: uuid.UUID
    confirm: bool
    notes: Optional[str] = None


class PaymentSchema(BaseModel):
    id: uuid.UUID
    payment_reference: str
    transaction_reference: Optional[str]
    invoice_id: uuid.UUID
    tenancy_id: uuid.UUID
    lease_id: uuid.UUID
    landlord_id: uuid.UUID
    tenant_id: uuid.UUID
    property_id: uuid.UUID
    unit_id: uuid.UUID
    amount: float
    currency: str
    payment_method: PaymentMethod
    payment_channel: PaymentChannel
    status: PaymentStatus
    paid_at: Optional[datetime]
    verified_at: Optional[datetime]
    notes: Optional[str]

    model_config = ConfigDict(from_attributes=True)


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


class ProcessPaymentResponse(BaseModel):
    payment: PaymentSchema
    receipt: Optional[ReceiptSchema] = None


@router.post("/pay", response_model=ProcessPaymentResponse)
async def process_payment(req: PaymentRequest, db: AsyncSession = Depends(get_db)):
    try:
        payment, receipt = await PaymentService.process_payment(
            session=db,
            invoice_id=req.invoice_id,
            amount=req.amount,
            payment_method=req.payment_method,
            payment_channel=req.payment_channel,
            transaction_reference=req.transaction_reference,
            notes=req.notes,
            auto_verify=req.auto_verify
        )
        return ProcessPaymentResponse(payment=payment, receipt=receipt)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{payment_id}/verify", response_model=ProcessPaymentResponse)
async def verify_payment(payment_id: uuid.UUID, req: PaymentVerifyRequest, db: AsyncSession = Depends(get_db)):
    try:
        payment, receipt = await PaymentService.verify_offline_payment(
            session=db,
            payment_id=payment_id,
            verifier_id=req.verifier_id,
            confirm=req.confirm,
            notes=req.notes
        )
        return ProcessPaymentResponse(payment=payment, receipt=receipt)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[PaymentSchema])
@router.get("/", response_model=List[PaymentSchema])
async def get_all_payments(db: AsyncSession = Depends(get_db)):
    return await PaymentService.get_all_payments(db)


@router.get("/landlord/{landlord_id}", response_model=List[PaymentSchema])
async def get_landlord_payments(landlord_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await PaymentService.get_payments_for_landlord(db, landlord_id)


@router.get("/tenant/{tenant_id}", response_model=List[PaymentSchema])
async def get_tenant_payments(tenant_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await PaymentService.get_payments_for_tenant(db, tenant_id)
