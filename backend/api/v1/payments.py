import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.core.dependencies import get_current_tenant, get_current_user
from backend.core.exceptions import ForbiddenException
from backend.core.scoping import assert_landlord_id, assert_owns_record, caller_profile_ids, is_admin
from backend.services.payment_service import PaymentService
from backend.services.invoice_service import InvoiceService
from backend.models import PaymentMethod, PaymentChannel, PaymentStatus, TenantProfile, User

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
    # verifier_id is accepted for backwards compatibility but ignored: the
    # verifier is always the signed-in landlord, never a value the caller
    # picks. Typed as a plain string (not uuid.UUID) since it's never parsed
    # as one - a stray non-UUID value here must never fail this endpoint.
    verifier_id: Optional[str] = None
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
async def process_payment(
    req: PaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Anyone could previously post a payment against any invoice in the system.
    invoice = await InvoiceService.get_invoice_by_id(db, req.invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    await assert_owns_record(db, current_user, invoice)
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
async def verify_payment(
    payment_id: uuid.UUID,
    req: PaymentVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    payment = await PaymentService.get_payment_by_id(db, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    landlord_id, _ = await caller_profile_ids(db, current_user)
    if not is_admin(current_user):
        if not landlord_id or payment.landlord_id != landlord_id:
            raise ForbiddenException("Only the landlord who issued this invoice can verify its payment.")

    try:
        payment, receipt = await PaymentService.verify_offline_payment(
            session=db,
            payment_id=payment_id,
            verifier_id=landlord_id or payment.landlord_id,
            confirm=req.confirm,
            notes=req.notes
        )
        return ProcessPaymentResponse(payment=payment, receipt=receipt)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[PaymentSchema])
@router.get("/", response_model=List[PaymentSchema])
async def get_all_payments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """The caller's payments - this used to return every payment on record."""
    if is_admin(current_user):
        return await PaymentService.get_all_payments(db)

    landlord_id, tenant_id = await caller_profile_ids(db, current_user)
    if landlord_id:
        return await PaymentService.get_payments_for_landlord(db, landlord_id)
    if tenant_id:
        return await PaymentService.get_payments_for_tenant(db, tenant_id)
    return []


@router.get("/landlord/{landlord_id}", response_model=List[PaymentSchema])
async def get_landlord_payments(
    landlord_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await assert_landlord_id(db, current_user, landlord_id)
    return await PaymentService.get_payments_for_landlord(db, landlord_id)


@router.get("/tenant/me", response_model=List[PaymentSchema])
async def get_my_payments(
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    return await PaymentService.get_payments_for_tenant(db, tenant.id)


@router.get("/tenant/{tenant_id}", response_model=List[PaymentSchema])
async def get_tenant_payments(
    tenant_id: uuid.UUID,
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    if tenant.id != tenant_id:
        raise ForbiddenException("Isolation violation: You are not authorized to view these payments")
    return await PaymentService.get_payments_for_tenant(db, tenant_id)
