import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.services.invoice_service import InvoiceService
from backend.models import InvoiceStatus, InvoiceType

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


@router.get("", response_model=List[InvoiceSchema])
@router.get("/", response_model=List[InvoiceSchema])
async def get_all_invoices(db: AsyncSession = Depends(get_db)):
    await InvoiceService.update_overdue_statuses(db)
    return await InvoiceService.get_all_invoices(db)


@router.get("/landlord/{landlord_id}", response_model=List[InvoiceSchema])
async def get_landlord_invoices(landlord_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    # Automatically update overdue statuses before returning
    await InvoiceService.update_overdue_statuses(db)
    return await InvoiceService.get_invoices_for_landlord(db, landlord_id)


@router.get("/tenant/{tenant_id}", response_model=List[InvoiceSchema])
async def get_tenant_invoices(tenant_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await InvoiceService.update_overdue_statuses(db)
    return await InvoiceService.get_invoices_for_tenant(db, tenant_id)


@router.get("/{invoice_id}", response_model=InvoiceSchema)
async def get_invoice_details(invoice_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    inv = await InvoiceService.get_invoice_by_id(db, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv


@router.post("/generate", response_model=List[InvoiceSchema])
async def trigger_invoice_generation(db: AsyncSession = Depends(get_db)):
    return await InvoiceService.auto_generate_monthly_invoices(db)
