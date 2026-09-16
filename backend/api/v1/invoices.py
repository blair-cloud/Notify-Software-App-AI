import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.core.dependencies import get_current_tenant, get_current_user
from backend.core.exceptions import ForbiddenException
from backend.core.scoping import assert_landlord_id, assert_owns_record, caller_profile_ids, is_admin
from backend.models import InvoiceStatus, InvoiceType, TenantProfile, User
from backend.services.invoice_service import InvoiceService

router = APIRouter(prefix="/invoices", tags=["Invoices"])


class InvoiceSchema(BaseModel):
    id: uuid.UUID
    invoice_number: str
    landlord_id: uuid.UUID
    tenant_id: uuid.UUID
    property_id: uuid.UUID
    unit_id: uuid.UUID
    tenancy_id: uuid.UUID
    lease_id: uuid.UUID
    invoice_type: InvoiceType
    billing_period_start: date
    billing_period_end: date
    issue_date: date
    due_date: date
    subtotal: float
    discount: float
    late_fee: float
    total_amount: float
    amount_paid: float
    balance_due: float
    currency: str
    status: InvoiceStatus

    model_config = ConfigDict(from_attributes=True)


class InvoiceCreateRequest(BaseModel):
    lease_id: uuid.UUID
    billing_period_start: Optional[date] = None
    billing_period_end: Optional[date] = None
    due_date: Optional[date] = None
    amount: Optional[float] = None
    notes: Optional[str] = None


@router.post("", response_model=InvoiceSchema, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    req: InvoiceCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from datetime import timedelta
    from backend.models import Lease
    lease = await db.get(Lease, req.lease_id)
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")

    if not is_admin(current_user):
        landlord_id, _ = await caller_profile_ids(db, current_user)
        if not landlord_id or lease.landlord_id != landlord_id:
            raise ForbiddenException("You are not authorized to issue invoices for this lease.")

    today = date.today()
    start_date = req.billing_period_start or date(today.year, today.month, 1)
    if not req.billing_period_end:
        if today.month == 12:
            end_date = date(today.year, 12, 31)
        else:
            end_date = date(today.year, today.month + 1, 1) - timedelta(days=1)
    else:
        end_date = req.billing_period_end

    inv = await InvoiceService.create_invoice_for_lease(
        session=db,
        lease=lease,
        period_start=start_date,
        period_end=end_date,
        due_date=req.due_date
    )
    if not inv:
        raise HTTPException(status_code=400, detail="Invoice could not be created")

    if req.amount is not None and req.amount > 0:
        inv.subtotal = float(req.amount)
        inv.total_amount = float(req.amount)
        inv.balance_due = float(req.amount) - float(inv.amount_paid)
        await db.commit()
        await db.refresh(inv)

    return inv


@router.get("", response_model=List[InvoiceSchema])
@router.get("/", response_model=List[InvoiceSchema])
async def get_all_invoices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    The caller's invoices. This used to return every invoice in the system to
    anyone who asked, which is what the landlord dashboard was loading.
    """
    await InvoiceService.update_overdue_statuses(db)
    if is_admin(current_user):
        return await InvoiceService.get_all_invoices(db)

    landlord_id, tenant_id = await caller_profile_ids(db, current_user)
    if landlord_id:
        return await InvoiceService.get_invoices_for_landlord(db, landlord_id)
    if tenant_id:
        return await InvoiceService.get_invoices_for_tenant(db, tenant_id)
    return []


@router.get("/landlord/{landlord_id}", response_model=List[InvoiceSchema])
async def get_landlord_invoices(
    landlord_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await assert_landlord_id(db, current_user, landlord_id)
    # Automatically update overdue statuses before returning
    await InvoiceService.update_overdue_statuses(db)
    return await InvoiceService.get_invoices_for_landlord(db, landlord_id)


@router.get("/tenant/me", response_model=List[InvoiceSchema])
async def get_my_invoices(
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    await InvoiceService.update_overdue_statuses(db)
    return await InvoiceService.get_invoices_for_tenant(db, tenant.id)


@router.get("/tenant/{tenant_id}", response_model=List[InvoiceSchema])
async def get_tenant_invoices(
    tenant_id: uuid.UUID,
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    if tenant.id != tenant_id:
        raise ForbiddenException("Isolation violation: You are not authorized to view these invoices")
    await InvoiceService.update_overdue_statuses(db)
    return await InvoiceService.get_invoices_for_tenant(db, tenant_id)


@router.get("/{invoice_id}", response_model=InvoiceSchema)
async def get_invoice_details(
    invoice_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    inv = await InvoiceService.get_invoice_by_id(db, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    await assert_owns_record(db, current_user, inv)
    return inv


@router.post("/generate", response_model=List[InvoiceSchema])
async def trigger_invoice_generation(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Run the monthly invoice generation, returning only the caller's own."""
    generated = await InvoiceService.auto_generate_monthly_invoices(db)
    if is_admin(current_user):
        return generated

    landlord_id, tenant_id = await caller_profile_ids(db, current_user)
    if not landlord_id:
        raise ForbiddenException("Only landlord accounts can generate invoices.")
    return [inv for inv in generated if inv.landlord_id == landlord_id]
