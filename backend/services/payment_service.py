import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from backend.models import (
    Invoice, Payment, Receipt, Notification,
    PaymentMethod, PaymentChannel, PaymentStatus, InvoiceStatus, NotificationChannel, NotificationStatus
)
from backend.core.logging import logger


class PaymentService:
    @staticmethod
    async def generate_payment_reference(session: AsyncSession) -> str:
        current_year = datetime.now().year
        prefix = f"PAY-{current_year}-"
        result = await session.execute(
            select(func.count(Payment.id)).where(Payment.payment_reference.like(f"{prefix}%"))
        )
        count = result.scalar() or 0
        return f"{prefix}{count + 1:06d}"

    @staticmethod
    async def generate_receipt_number(session: AsyncSession) -> str:
        current_year = datetime.now().year
        prefix = f"RCT-{current_year}-"
        result = await session.execute(
            select(func.count(Receipt.id)).where(Receipt.receipt_number.like(f"{prefix}%"))
        )
        count = result.scalar() or 0
        return f"{prefix}{count + 1:06d}"

    @staticmethod
    async def process_payment(
        session: AsyncSession,
        invoice_id: uuid.UUID,
        amount: float,
        payment_method: PaymentMethod,
        payment_channel: PaymentChannel = PaymentChannel.ONLINE,
        transaction_reference: Optional[str] = None,
        notes: Optional[str] = None,
        auto_verify: bool = False
    ) -> Tuple[Payment, Optional[Receipt]]:
        # Fetch invoice
        stmt = select(Invoice).where(Invoice.id == invoice_id)
        res = await session.execute(stmt)
        invoice = res.scalar_one_or_none()

        if not invoice:
            raise ValueError("Invoice not found.")

        if invoice.status == InvoiceStatus.PAID:
            raise ValueError("Invoice is already fully paid.")

        if invoice.status == InvoiceStatus.CANCELLED:
            raise ValueError("Cannot pay a cancelled invoice.")

        # Backend Security Check: Do not allow overpayment
        if amount <= 0:
            raise ValueError("Payment amount must be greater than zero.")

        if amount > invoice.balance_due:
            raise ValueError(f"Payment amount (RWF {amount:,.0f}) exceeds invoice balance due (RWF {invoice.balance_due:,.0f}).")

        pay_ref = await PaymentService.generate_payment_reference(session)

        # Set initial status
        if payment_channel == PaymentChannel.OFFLINE and not auto_verify:
            initial_status = PaymentStatus.AWAITING_VERIFICATION
        else:
            initial_status = PaymentStatus.COMPLETED

        payment = Payment(
            payment_reference=pay_ref,
            transaction_reference=transaction_reference or f"TXN-{uuid.uuid4().hex[:10].upper()}",
            invoice_id=invoice.id,
            tenancy_id=invoice.tenancy_id,
            lease_id=invoice.lease_id,
            landlord_id=invoice.landlord_id,
            tenant_id=invoice.tenant_id,
            property_id=invoice.property_id,
            unit_id=invoice.unit_id,
            amount=amount,
            currency=invoice.currency or "RWF",
            payment_method=payment_method,
            payment_channel=payment_channel,
            status=initial_status,
            paid_at=datetime.now(timezone.utc) if initial_status == PaymentStatus.COMPLETED else None,
            verified_at=datetime.now(timezone.utc) if auto_verify else None,
            notes=notes
        )

        session.add(payment)
        await session.flush()

        receipt = None
        if initial_status == PaymentStatus.COMPLETED:
            receipt = await PaymentService.apply_completed_payment(session, payment, invoice)

        await session.commit()
        await session.refresh(payment)
        if receipt:
            await session.refresh(receipt)

        return payment, receipt

    @staticmethod
    async def apply_completed_payment(
        session: AsyncSession,
        payment: Payment,
        invoice: Invoice
    ) -> Receipt:
        # Update invoice totals
        invoice.amount_paid = float(invoice.amount_paid) + float(payment.amount)
        invoice.balance_due = float(invoice.total_amount) - float(invoice.amount_paid)

        if invoice.balance_due <= 0.01:
            invoice.balance_due = 0.0
            invoice.status = InvoiceStatus.PAID
        else:
            invoice.status = InvoiceStatus.PARTIALLY_PAID

        # Generate Receipt
        receipt_num = await PaymentService.generate_receipt_number(session)
        receipt = Receipt(
            receipt_number=receipt_num,
            payment_id=payment.id,
            invoice_id=invoice.id,
            tenant_id=invoice.tenant_id,
            landlord_id=invoice.landlord_id,
            property_id=invoice.property_id,
            unit_id=invoice.unit_id,
            amount=payment.amount,
            currency=payment.currency,
            issued_at=datetime.now(timezone.utc)
        )
        session.add(receipt)

        # Notify Tenant
        notification = Notification(
            user_id=invoice.tenant_id,
            type="PAYMENT_RECEIVED",
            title="Payment Confirmed & Receipt Generated",
            message=f"Your payment of {payment.currency} {payment.amount:,.0f} for invoice {invoice.invoice_number} was successfully processed. Receipt #{receipt_num} is ready.",
            channel=NotificationChannel.IN_APP,
            status=NotificationStatus.SENT,
            reference_type="RECEIPT",
            reference_id=receipt.id,
            sent_at=datetime.now(timezone.utc)
        )
        session.add(notification)

        return receipt

    @staticmethod
    async def verify_offline_payment(
        session: AsyncSession,
        payment_id: uuid.UUID,
        verifier_id: uuid.UUID,
        confirm: bool,
        notes: Optional[str] = None
    ) -> Tuple[Payment, Optional[Receipt]]:
        stmt = select(Payment).where(Payment.id == payment_id)
        res = await session.execute(stmt)
        payment = res.scalar_one_or_none()

        if not payment:
            raise ValueError("Payment record not found.")

        if payment.status != PaymentStatus.AWAITING_VERIFICATION:
            raise ValueError(f"Payment cannot be verified because it is in status {payment.status}.")

        inv_stmt = select(Invoice).where(Invoice.id == payment.invoice_id)
        inv_res = await session.execute(inv_stmt)
        invoice = inv_res.scalar_one_or_none()

        if not invoice:
            raise ValueError("Associated invoice not found.")

        receipt = None
        if confirm:
            payment.status = PaymentStatus.COMPLETED
            payment.paid_at = datetime.now(timezone.utc)
            payment.verified_at = datetime.now(timezone.utc)
            payment.verified_by = verifier_id
            if notes:
                payment.notes = f"{payment.notes or ''} | Verification note: {notes}"

            receipt = await PaymentService.apply_completed_payment(session, payment, invoice)
        else:
            payment.status = PaymentStatus.FAILED
            payment.verified_at = datetime.now(timezone.utc)
            payment.verified_by = verifier_id
            if notes:
                payment.notes = f"{payment.notes or ''} | Rejected: {notes}"

            # Notify Tenant of Rejection
            notification = Notification(
                user_id=invoice.tenant_id,
                type="PAYMENT_REJECTED",
                title="Offline Payment Unverified",
                message=f"Your offline payment submission of {payment.currency} {payment.amount:,.0f} for invoice {invoice.invoice_number} could not be verified by landlord.",
                channel=NotificationChannel.IN_APP,
                status=NotificationStatus.SENT,
                reference_type="INVOICE",
                reference_id=invoice.id,
                sent_at=datetime.now(timezone.utc)
            )
            session.add(notification)

        await session.commit()
        await session.refresh(payment)
        if receipt:
            await session.refresh(receipt)

        return payment, receipt

    @staticmethod
    async def get_all_payments(session: AsyncSession) -> List[Payment]:
        stmt = select(Payment).order_by(Payment.created_at.desc())
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_payments_for_landlord(session: AsyncSession, landlord_id: uuid.UUID) -> List[Payment]:
        stmt = select(Payment).where(Payment.landlord_id == landlord_id).order_by(Payment.created_at.desc())
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_payments_for_tenant(session: AsyncSession, tenant_id: uuid.UUID) -> List[Payment]:
        stmt = select(Payment).where(Payment.tenant_id == tenant_id).order_by(Payment.created_at.desc())
        res = await session.execute(stmt)
        return list(res.scalars().all())
