import uuid
from datetime import datetime, date, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from backend.models import Expense, ExpenseCategory, ExpenseStatus


class ExpenseService:
    @staticmethod
    async def create_expense(
        session: AsyncSession,
        landlord_id: uuid.UUID,
        property_id: uuid.UUID,
        category: ExpenseCategory,
        description: str,
        amount: float,
        expense_date: date,
        unit_id: Optional[uuid.UUID] = None,
        vendor: Optional[str] = None,
        reference: Optional[str] = None,
        currency: str = "RWF"
    ) -> Expense:
        expense = Expense(
            landlord_id=landlord_id,
            property_id=property_id,
            unit_id=unit_id,
            category=category,
            description=description,
            amount=amount,
            currency=currency,
            expense_date=expense_date,
            vendor=vendor,
            reference=reference,
            status=ExpenseStatus.RECORDED
        )
        session.add(expense)
        await session.commit()
        await session.refresh(expense)
        return expense

    @staticmethod
    async def get_all_expenses(session: AsyncSession) -> List[Expense]:
        stmt = select(Expense).where(Expense.status == ExpenseStatus.RECORDED).order_by(Expense.expense_date.desc())
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_expenses_for_landlord(
        session: AsyncSession,
        landlord_id: uuid.UUID,
        property_id: Optional[uuid.UUID] = None,
        category: Optional[ExpenseCategory] = None
    ) -> List[Expense]:
        conditions = [Expense.landlord_id == landlord_id, Expense.status == ExpenseStatus.RECORDED]
        if property_id:
            conditions.append(Expense.property_id == property_id)
        if category:
            conditions.append(Expense.category == category)

        stmt = select(Expense).where(and_(*conditions)).order_by(Expense.expense_date.desc())
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_expense_summary(
        session: AsyncSession,
        landlord_id: uuid.UUID
    ) -> Dict[str, Any]:
        stmt = select(
            func.sum(Expense.amount)
        ).where(
            and_(Expense.landlord_id == landlord_id, Expense.status == ExpenseStatus.RECORDED)
        )
        res = await session.execute(stmt)
        total_expenses = res.scalar() or 0.0

        # Group by category
        cat_stmt = select(
            Expense.category,
            func.sum(Expense.amount)
        ).where(
            and_(Expense.landlord_id == landlord_id, Expense.status == ExpenseStatus.RECORDED)
        ).group_by(Expense.category)

        cat_res = await session.execute(cat_stmt)
        by_category = {row[0].value: float(row[1] or 0.0) for row[1] in cat_res.all()}

        return {
            "total_expenses": float(total_expenses),
            "by_category": by_category
        }
