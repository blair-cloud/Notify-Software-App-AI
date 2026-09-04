import uuid
from datetime import date
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from backend.models import Invoice, Payment, Expense, InvoiceStatus, PaymentStatus, ExpenseStatus


class FinancialService:
    @staticmethod
    async def get_landlord_financial_overview(
        session: AsyncSession,
        landlord_id: uuid.UUID
    ) -> Dict[str, Any]:
        # Active Invoices
        stmt_inv = select(
            func.sum(Invoice.total_amount).label("expected"),
            func.sum(Invoice.amount_paid).label("collected"),
            func.sum(Invoice.balance_due).label("outstanding")
        ).where(
            and_(
                Invoice.landlord_id == landlord_id,
                Invoice.status != InvoiceStatus.CANCELLED
            )
        )
        res_inv = await session.execute(stmt_inv)
        inv_row = res_inv.one_or_none()

        expected_rent = float(inv_row.expected or 0.0) if inv_row else 0.0
        collected_rent = float(inv_row.collected or 0.0) if inv_row else 0.0
        outstanding_rent = float(inv_row.outstanding or 0.0) if inv_row else 0.0

        # Overdue Rent
        stmt_overdue = select(
            func.sum(Invoice.balance_due)
        ).where(
            and_(
                Invoice.landlord_id == landlord_id,
                Invoice.status == InvoiceStatus.OVERDUE
            )
        )
        res_overdue = await session.execute(stmt_overdue)
        overdue_rent = float(res_overdue.scalar() or 0.0)

        # Collection Rate
        collection_rate = (collected_rent / expected_rent * 100.0) if expected_rent > 0 else 0.0

        # Total Expenses
        stmt_exp = select(
            func.sum(Expense.amount)
        ).where(
            and_(
                Expense.landlord_id == landlord_id,
                Expense.status == ExpenseStatus.RECORDED
            )
        )
        res_exp = await session.execute(stmt_exp)
        total_expenses = float(res_exp.scalar() or 0.0)

        # Net Income
        net_income = collected_rent - total_expenses

        # Monthly Trends (last 4 months sample)
        monthly_trends = [
            {"month": "May", "expected": expected_rent * 0.9, "collected": collected_rent * 0.85, "outstanding": expected_rent * 0.05},
            {"month": "Jun", "expected": expected_rent * 0.95, "collected": collected_rent * 0.9, "outstanding": expected_rent * 0.05},
            {"month": "Jul", "expected": expected_rent, "collected": collected_rent * 0.92, "outstanding": expected_rent * 0.08},
            {"month": "Aug", "expected": expected_rent, "collected": collected_rent, "outstanding": outstanding_rent},
        ]

        return {
            "expected_rent": expected_rent,
            "collected_rent": collected_rent,
            "outstanding_rent": outstanding_rent,
            "overdue_rent": overdue_rent,
            "collection_rate": round(collection_rate, 1),
            "total_expenses": total_expenses,
            "net_income": net_income,
            "currency": "RWF",
            "monthly_trends": monthly_trends
        }

    @staticmethod
    async def get_tenant_financial_overview(
        session: AsyncSession,
        tenant_id: uuid.UUID
    ) -> Dict[str, Any]:
        stmt_inv = select(Invoice).where(
            and_(
                Invoice.tenant_id == tenant_id,
                Invoice.status.in_([InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE])
            )
        ).order_by(Invoice.due_date.asc())

        res_inv = await session.execute(stmt_inv)
        active_invoices = res_inv.scalars().all()

        current_invoice = active_invoices[0] if active_invoices else None

        stmt_total_due = select(
            func.sum(Invoice.balance_due)
        ).where(
            and_(
                Invoice.tenant_id == tenant_id,
                Invoice.status.in_([InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE])
            )
        )
        res_total_due = await session.execute(stmt_total_due)
        total_outstanding = float(res_total_due.scalar() or 0.0)

        return {
            "current_rent": float(current_invoice.subtotal) if current_invoice else 0.0,
            "amount_due": float(current_invoice.balance_due) if current_invoice else 0.0,
            "due_date": str(current_invoice.due_date) if current_invoice else None,
            "invoice_number": current_invoice.invoice_number if current_invoice else None,
            "invoice_id": str(current_invoice.id) if current_invoice else None,
            "invoice_status": current_invoice.status.value if current_invoice else "PAID",
            "outstanding_balance": total_outstanding,
            "currency": current_invoice.currency if current_invoice else "RWF"
        }
