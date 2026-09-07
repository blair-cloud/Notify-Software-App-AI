import uuid
from collections import defaultdict
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.exceptions import ForbiddenException, NotFoundException
from backend.models import (
    Expense,
    ExpenseCategory,
    ExpenseStatus,
    MaintenanceRequest,
    Property,
    Unit,
)


class ExpenseService:
    """
    Landlord operating costs. Every read and write is scoped to one landlord,
    and expenses created from maintenance jobs stay linked to their ticket.
    """

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    async def _verify_property(session: AsyncSession, landlord_id: uuid.UUID, property_id: uuid.UUID) -> Property:
        res = await session.execute(select(Property).where(Property.id == property_id))
        prop = res.scalar_one_or_none()
        if not prop:
            raise NotFoundException("Property not found")
        if prop.landlord_id != landlord_id:
            raise ForbiddenException("Property does not belong to this landlord")
        return prop

    @staticmethod
    async def _verify_unit(
        session: AsyncSession, property_id: uuid.UUID, unit_id: Optional[uuid.UUID]
    ) -> Optional[Unit]:
        if not unit_id:
            return None
        res = await session.execute(select(Unit).where(Unit.id == unit_id))
        unit = res.scalar_one_or_none()
        if not unit:
            raise NotFoundException("Unit not found")
        if unit.property_id != property_id:
            raise ForbiddenException("Unit does not belong to the selected property")
        return unit

    @staticmethod
    async def _get_owned(session: AsyncSession, landlord_id: uuid.UUID, expense_id: uuid.UUID) -> Expense:
        res = await session.execute(select(Expense).where(Expense.id == expense_id))
        expense = res.scalar_one_or_none()
        if not expense:
            raise NotFoundException("Expense not found")
        if expense.landlord_id != landlord_id:
            raise ForbiddenException("Expense does not belong to this landlord")
        return expense

    @staticmethod
    async def serialize(session: AsyncSession, expenses: List[Expense]) -> List[Dict[str, Any]]:
        """Attach property/unit names and the source ticket in one pass."""
        if not expenses:
            return []

        property_ids = {e.property_id for e in expenses if e.property_id}
        unit_ids = {e.unit_id for e in expenses if e.unit_id}
        request_ids = {e.maintenance_request_id for e in expenses if e.maintenance_request_id}

        props: Dict[uuid.UUID, Property] = {}
        if property_ids:
            res = await session.execute(select(Property).where(Property.id.in_(property_ids)))
            props = {p.id: p for p in res.scalars().all()}

        units: Dict[uuid.UUID, Unit] = {}
        if unit_ids:
            res = await session.execute(select(Unit).where(Unit.id.in_(unit_ids)))
            units = {u.id: u for u in res.scalars().all()}

        requests: Dict[uuid.UUID, MaintenanceRequest] = {}
        if request_ids:
            res = await session.execute(
                select(MaintenanceRequest).where(MaintenanceRequest.id.in_(request_ids))
            )
            requests = {r.id: r for r in res.scalars().all()}

        out: List[Dict[str, Any]] = []
        for e in expenses:
            prop = props.get(e.property_id)
            unit = units.get(e.unit_id) if e.unit_id else None
            req = requests.get(e.maintenance_request_id) if e.maintenance_request_id else None
            out.append(
                {
                    "id": e.id,
                    "landlord_id": e.landlord_id,
                    "property_id": e.property_id,
                    "property_name": prop.name if prop else None,
                    "unit_id": e.unit_id,
                    "unit_number": unit.unit_number if unit else None,
                    "category": e.category,
                    "description": e.description,
                    "amount": float(e.amount or 0),
                    "currency": e.currency,
                    "expense_date": e.expense_date,
                    "vendor": e.vendor,
                    "reference": e.reference,
                    "status": e.status,
                    "maintenance_request_id": e.maintenance_request_id,
                    "maintenance_request_number": req.request_number if req else None,
                    "maintenance_title": req.title if req else None,
                    "source": "MAINTENANCE" if e.maintenance_request_id else "MANUAL",
                    "created_at": e.created_at,
                }
            )
        return out

    # ------------------------------------------------------------------
    # Commands
    # ------------------------------------------------------------------

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
        currency: str = "RWF",
        maintenance_request_id: Optional[uuid.UUID] = None,
    ) -> Expense:
        if amount is None or float(amount) <= 0:
            raise ValueError("Expense amount must be greater than zero.")

        await ExpenseService._verify_property(session, landlord_id, property_id)
        await ExpenseService._verify_unit(session, property_id, unit_id)

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
            status=ExpenseStatus.RECORDED,
            maintenance_request_id=maintenance_request_id,
        )
        session.add(expense)
        await session.commit()
        await session.refresh(expense)
        return expense

    @staticmethod
    async def update_expense(
        session: AsyncSession,
        landlord_id: uuid.UUID,
        expense_id: uuid.UUID,
        updates: Dict[str, Any],
    ) -> Expense:
        expense = await ExpenseService._get_owned(session, landlord_id, expense_id)

        if "amount" in updates and updates["amount"] is not None and float(updates["amount"]) <= 0:
            raise ValueError("Expense amount must be greater than zero.")

        target_property = updates.get("property_id") or expense.property_id
        if "property_id" in updates and updates["property_id"]:
            await ExpenseService._verify_property(session, landlord_id, updates["property_id"])
        if "unit_id" in updates:
            await ExpenseService._verify_unit(session, target_property, updates.get("unit_id"))

        editable = {
            "property_id", "unit_id", "category", "description",
            "amount", "currency", "expense_date", "vendor", "reference",
        }
        for field, value in updates.items():
            if field in editable and value is not None:
                setattr(expense, field, value)

        # Keep a maintenance-sourced expense in step with its ticket.
        if expense.maintenance_request_id and "amount" in updates and updates["amount"] is not None:
            res = await session.execute(
                select(MaintenanceRequest).where(MaintenanceRequest.id == expense.maintenance_request_id)
            )
            req = res.scalar_one_or_none()
            if req:
                req.actual_cost = float(updates["amount"])
                req.updated_at = datetime.now(timezone.utc)

        expense.updated_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(expense)
        return expense

    @staticmethod
    async def delete_expense(session: AsyncSession, landlord_id: uuid.UUID, expense_id: uuid.UUID) -> bool:
        """
        Cancels rather than destroys: the row stays for audit, drops out of every
        listing and total, and releases the maintenance ticket so its cost can be
        re-posted if needed.
        """
        expense = await ExpenseService._get_owned(session, landlord_id, expense_id)
        expense.status = ExpenseStatus.CANCELLED
        expense.updated_at = datetime.now(timezone.utc)

        if expense.maintenance_request_id:
            res = await session.execute(
                select(MaintenanceRequest).where(MaintenanceRequest.id == expense.maintenance_request_id)
            )
            req = res.scalar_one_or_none()
            if req and req.expense_id == expense.id:
                req.expense_id = None

        await session.commit()
        return True

    @staticmethod
    async def sync_from_maintenance(
        session: AsyncSession, request: MaintenanceRequest
    ) -> Optional[Expense]:
        """Push a revised repair cost onto the expense that ticket created."""
        if not request.expense_id:
            return None
        res = await session.execute(select(Expense).where(Expense.id == request.expense_id))
        expense = res.scalar_one_or_none()
        if not expense or expense.status != ExpenseStatus.RECORDED:
            return None
        if float(expense.amount or 0) == float(request.actual_cost or 0):
            return expense

        expense.amount = request.actual_cost
        expense.description = f"Maintenance {request.request_number}: {request.title}"
        expense.updated_at = datetime.now(timezone.utc)
        return expense

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    @staticmethod
    async def get_expenses_for_landlord(
        session: AsyncSession,
        landlord_id: uuid.UUID,
        property_id: Optional[uuid.UUID] = None,
        category: Optional[ExpenseCategory] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Expense]:
        conditions = [Expense.landlord_id == landlord_id, Expense.status == ExpenseStatus.RECORDED]
        if property_id:
            conditions.append(Expense.property_id == property_id)
        if category:
            conditions.append(Expense.category == category)
        if start_date:
            conditions.append(Expense.expense_date >= start_date)
        if end_date:
            conditions.append(Expense.expense_date <= end_date)

        stmt = select(Expense).where(and_(*conditions)).order_by(Expense.expense_date.desc())
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_expense_summary(session: AsyncSession, landlord_id: uuid.UUID) -> Dict[str, Any]:
        """
        Totals the expense tracker and the financial overview both read from,
        including how much of it came from repairs and maintenance.
        """
        expenses = await ExpenseService.get_expenses_for_landlord(session, landlord_id)

        by_category: Dict[str, float] = defaultdict(float)
        by_property: Dict[str, float] = defaultdict(float)
        by_month: Dict[str, float] = defaultdict(float)
        maintenance_total = 0.0
        maintenance_linked_total = 0.0
        maintenance_linked_count = 0
        total = 0.0

        for e in expenses:
            amount = float(e.amount or 0)
            total += amount
            category = e.category.value if hasattr(e.category, "value") else str(e.category)
            by_category[category] += amount
            by_property[str(e.property_id)] += amount
            if e.expense_date:
                by_month[e.expense_date.strftime("%Y-%m")] += amount
            if category == ExpenseCategory.MAINTENANCE.value:
                maintenance_total += amount
            if e.maintenance_request_id:
                maintenance_linked_total += amount
                maintenance_linked_count += 1

        # Repair costs recorded on tickets that have not been posted as an
        # expense yet - money spent that the totals above do not include.
        unposted_stmt = select(func.coalesce(func.sum(MaintenanceRequest.actual_cost), 0.0)).where(
            and_(
                MaintenanceRequest.landlord_id == landlord_id,
                MaintenanceRequest.actual_cost > 0,
                MaintenanceRequest.expense_id.is_(None),
            )
        )
        unposted_res = await session.execute(unposted_stmt)
        unposted_maintenance = float(unposted_res.scalar() or 0.0)

        return {
            "total_expenses": round(total, 2),
            "expense_count": len(expenses),
            "by_category": {k: round(v, 2) for k, v in sorted(by_category.items())},
            "by_property": {k: round(v, 2) for k, v in by_property.items()},
            "by_month": {k: round(v, 2) for k, v in sorted(by_month.items())},
            # "Repairs & Maintenance" as shown in the tracker
            "maintenance_total": round(maintenance_total, 2),
            "maintenance_from_tickets": round(maintenance_linked_total, 2),
            "maintenance_ticket_count": maintenance_linked_count,
            "maintenance_unposted": round(unposted_maintenance, 2),
            "currency": "RWF",
        }
