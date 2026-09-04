import uuid
from datetime import datetime, date, timezone, timedelta
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from backend.models import Invoice, Lease, RentSchedule, Tenancy, InvoiceType, InvoiceStatus, LeaseStatus
from backend.core.logging import logger


class InvoiceService:
    @staticmethod
    async def generate_invoice_number(session: AsyncSession) -> str:
        current_year = datetime.now().year
        prefix = f"INV-{current_year}-"
        result = await session.execute(
            select(func.count(Invoice.id)).where(Invoice.invoice_number.like(f"{prefix}%"))
        )
        count = result.scalar() or 0
        return f"{prefix}{count + 1:06d}"

    @staticmethod
    async def create_invoice_for_lease(
        session: AsyncSession,
        lease: Lease,
        period_start: date,
        period_end: date,
        due_date: Optional[date] = None
    ) -> Optional[Invoice]:
        # Check uniqueness constraint (lease_id, billing_period_start, billing_period_end)
        stmt = select(Invoice).where(
            and_(
                Invoice.lease_id == lease.id,
                Invoice.billing_period_start == period_start,
                Invoice.billing_period_end == period_end
            )
        )
        res = await session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            logger.info(f"Invoice already exists for lease {lease.id} period {period_start} to {period_end}")
            return existing

        inv_number = await InvoiceService.generate_invoice_number(session)
        calculated_due_date = due_date or date(period_start.year, period_start.month, min(lease.payment_due_day or 5, 28))

        subtotal = float(lease.monthly_rent)
        discount = 0.0
        late_fee = 0.0
        total_amount = subtotal - discount + late_fee
        balance_due = total_amount

        invoice = Invoice(
            invoice_number=inv_number,
            landlord_id=lease.landlord_id,
            tenant_id=lease.tenant_id,
            property_id=lease.property_id,
            unit_id=lease.unit_id,
            tenancy_id=lease.tenancy_id,
            lease_id=lease.id,
            invoice_type=InvoiceType.RENT,
            billing_period_start=period_start,
            billing_period_end=period_end,
            issue_date=date.today(),
            due_date=calculated_due_date,
            subtotal=subtotal,
            discount=discount,
            late_fee=late_fee,
            total_amount=total_amount,
            amount_paid=0.0,
            balance_due=balance_due,
            currency=lease.currency or "RWF",
            status=InvoiceStatus.ISSUED
        )

        session.add(invoice)
        await session.commit()
        await session.refresh(invoice)
        return invoice

    @staticmethod
    async def auto_generate_monthly_invoices(session: AsyncSession) -> List[Invoice]:
        # Fetch active leases
        stmt = select(Lease).where(Lease.status == LeaseStatus.ACTIVE)
        res = await session.execute(stmt)
        active_leases = res.scalars().all()

        today = date.today()
        # First day of current month
        period_start = date(today.year, today.month, 1)
        # Last day of current month
        if today.month == 12:
            period_end = date(today.year, 12, 31)
        else:
            period_end = date(today.year, today.month + 1, 1) - timedelta(days=1)

        generated = []
        for lease in active_leases:
            inv = await InvoiceService.create_invoice_for_lease(session, lease, period_start, period_end)
            if inv:
                generated.append(inv)

        return generated

    @staticmethod
    async def update_overdue_statuses(session: AsyncSession) -> int:
        today = date.today()
        stmt = select(Invoice).where(
            and_(
                Invoice.due_date < today,
                Invoice.balance_due > 0,
                Invoice.status.in_([InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID])
            )
        )
        res = await session.execute(stmt)
        overdue_invoices = res.scalars().all()

        updated_count = 0
        for inv in overdue_invoices:
            inv.status = InvoiceStatus.OVERDUE
            # Apply lease late fee if applicable and not already added
            if inv.lease_id:
                lease_res = await session.execute(select(Lease).where(Lease.id == inv.lease_id))
                lease = lease_res.scalar_one_or_none()
                if lease and lease.late_fee > 0 and inv.late_fee == 0:
                    inv.late_fee = float(lease.late_fee)
                    inv.total_amount = float(inv.subtotal) - float(inv.discount) + float(inv.late_fee)
                    inv.balance_due = float(inv.total_amount) - float(inv.amount_paid)

            updated_count += 1

        if updated_count > 0:
            await session.commit()

        return updated_count

    @staticmethod
    async def get_all_invoices(session: AsyncSession) -> List[Invoice]:
        stmt = select(Invoice).order_by(Invoice.issue_date.desc())
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_invoices_for_landlord(session: AsyncSession, landlord_id: uuid.UUID) -> List[Invoice]:
        stmt = select(Invoice).where(Invoice.landlord_id == landlord_id).order_by(Invoice.issue_date.desc())
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_invoices_for_tenant(session: AsyncSession, tenant_id: uuid.UUID) -> List[Invoice]:
        stmt = select(Invoice).where(Invoice.tenant_id == tenant_id).order_by(Invoice.issue_date.desc())
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_invoice_by_id(session: AsyncSession, invoice_id: uuid.UUID) -> Optional[Invoice]:
        stmt = select(Invoice).where(Invoice.id == invoice_id)
        res = await session.execute(stmt)
        return res.scalar_one_or_none()
