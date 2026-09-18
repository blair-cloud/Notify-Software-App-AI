import uuid
from datetime import datetime, date, time, timezone, timedelta
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from backend.models import Invoice, Lease, RentSchedule, Tenancy, InvoiceType, InvoiceStatus, LeaseStatus, Property, Unit, TenantProfile
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
        """
        Overdue is driven entirely by the lease's own end date/time, not a
        fixed offset from the invoice's due_date: an unpaid invoice only
        becomes OVERDUE once its lease has actually ended. This recomputes
        every eligible invoice's status from scratch on each call (not just
        one-directionally to OVERDUE), so the result is correct however many
        times it's re-run - including reverting an invoice that was
        previously flagged OVERDUE if its lease's end date/time has not
        actually passed (e.g. after a lease renewal pushed end_date out).
        """
        now = datetime.now(timezone.utc)
        stmt = (
            select(Invoice, Lease)
            .outerjoin(Lease, Invoice.lease_id == Lease.id)
            .where(
                Invoice.balance_due > 0,
                Invoice.status.in_([InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]),
            )
        )
        res = await session.execute(stmt)
        rows = res.all()

        updated_count = 0
        for inv, lease in rows:
            # The lease's end date has no time-of-day column, so "end date and
            # time" is treated as end-of-day (23:59:59) on end_date - the
            # lease is not yet over on its own last day.
            lease_ended = bool(lease) and now > datetime.combine(lease.end_date, time.max, tzinfo=timezone.utc)

            if lease_ended and inv.status != InvoiceStatus.OVERDUE:
                inv.status = InvoiceStatus.OVERDUE
                # Apply the lease's late payment penalty once, the moment the
                # invoice actually becomes overdue - not reapplied or
                # recalculated on every subsequent refresh.
                if lease.late_fee and float(lease.late_fee) > 0 and float(inv.late_fee) == 0:
                    inv.late_fee = float(lease.late_fee)
                    inv.total_amount = float(inv.subtotal) - float(inv.discount) + float(inv.late_fee)
                    inv.balance_due = float(inv.total_amount) - float(inv.amount_paid)
                updated_count += 1
            elif not lease_ended and inv.status == InvoiceStatus.OVERDUE:
                # The lease's end date/time is no longer in the past (e.g. it
                # was renewed) - this invoice should no longer read as overdue.
                inv.status = InvoiceStatus.PARTIALLY_PAID if float(inv.amount_paid) > 0 else InvoiceStatus.ISSUED
                updated_count += 1

        if updated_count > 0:
            await session.commit()

        return updated_count

    @staticmethod
    async def enrich_invoices(session: AsyncSession, invoices: List[Invoice]) -> List[Invoice]:
        if not invoices:
            return invoices

        tenant_ids = {inv.tenant_id for inv in invoices if inv.tenant_id}
        property_ids = {inv.property_id for inv in invoices if inv.property_id}
        unit_ids = {inv.unit_id for inv in invoices if inv.unit_id}
        lease_ids = {inv.lease_id for inv in invoices if inv.lease_id}

        tenants_map = {}
        if tenant_ids:
            stmt = (
                select(TenantProfile)
                .options(selectinload(TenantProfile.user))
                .where(TenantProfile.id.in_(list(tenant_ids)))
            )
            res = await session.execute(stmt)
            for tp in res.scalars().all():
                if tp.user:
                    name = f"{tp.user.first_name or ''} {tp.user.last_name or ''}".strip()
                else:
                    name = f"{tp.pending_first_name or ''} {tp.pending_last_name or ''}".strip()
                tenants_map[tp.id] = name or "Tenant"

        leases_map = {}
        if lease_ids:
            stmt = select(Lease).where(Lease.id.in_(list(lease_ids)))
            res = await session.execute(stmt)
            for l in res.scalars().all():
                if l.tenant_name:
                    leases_map[l.id] = l.tenant_name

        props_map = {}
        if property_ids:
            stmt = select(Property).where(Property.id.in_(list(property_ids)))
            res = await session.execute(stmt)
            for p in res.scalars().all():
                props_map[p.id] = p.name

        units_map = {}
        if unit_ids:
            stmt = select(Unit).where(Unit.id.in_(list(unit_ids)))
            res = await session.execute(stmt)
            for u in res.scalars().all():
                units_map[u.id] = u.unit_number

        for inv in invoices:
            inv.tenant_name = tenants_map.get(inv.tenant_id) or leases_map.get(inv.lease_id) or "Tenant"
            inv.property_name = props_map.get(inv.property_id) or ""
            inv.unit_number = units_map.get(inv.unit_id) or ""

        return invoices

    @staticmethod
    async def get_all_invoices(session: AsyncSession) -> List[Invoice]:
        stmt = select(Invoice).order_by(Invoice.issue_date.desc())
        res = await session.execute(stmt)
        invoices = list(res.scalars().all())
        return await InvoiceService.enrich_invoices(session, invoices)

    @staticmethod
    async def get_invoices_for_landlord(session: AsyncSession, landlord_id: uuid.UUID) -> List[Invoice]:
        stmt = select(Invoice).where(Invoice.landlord_id == landlord_id).order_by(Invoice.issue_date.desc())
        res = await session.execute(stmt)
        invoices = list(res.scalars().all())
        return await InvoiceService.enrich_invoices(session, invoices)

    @staticmethod
    async def get_invoices_for_tenant(session: AsyncSession, tenant_id: uuid.UUID) -> List[Invoice]:
        stmt = select(Invoice).where(Invoice.tenant_id == tenant_id).order_by(Invoice.issue_date.desc())
        res = await session.execute(stmt)
        invoices = list(res.scalars().all())
        return await InvoiceService.enrich_invoices(session, invoices)

    @staticmethod
    async def get_invoice_by_id(session: AsyncSession, invoice_id: uuid.UUID) -> Optional[Invoice]:
        stmt = select(Invoice).where(Invoice.id == invoice_id)
        res = await session.execute(stmt)
        inv = res.scalar_one_or_none()
        if inv:
            enriched = await InvoiceService.enrich_invoices(session, [inv])
            return enriched[0]
        return None
