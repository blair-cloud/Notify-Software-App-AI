import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.core.dependencies import get_current_landlord, get_current_user
from backend.core.scoping import is_admin
from backend.core.permissions import verify_landlord_ownership
from backend.models import ExpenseCategory, ExpenseStatus, LandlordProfile, User
from backend.services.expense_service import ExpenseService

router = APIRouter(prefix="/expenses", tags=["Expenses"])


class ExpenseCreateRequest(BaseModel):
    property_id: uuid.UUID
    unit_id: Optional[uuid.UUID] = None
    category: ExpenseCategory
    description: str
    amount: float
    expense_date: date
    vendor: Optional[str] = None
    reference: Optional[str] = None
    currency: str = "RWF"


class ExpenseUpdateRequest(BaseModel):
    property_id: Optional[uuid.UUID] = None
    unit_id: Optional[uuid.UUID] = None
    category: Optional[ExpenseCategory] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    expense_date: Optional[date] = None
    vendor: Optional[str] = None
    reference: Optional[str] = None
    currency: Optional[str] = None


class ExpenseSchema(BaseModel):
    id: uuid.UUID
    landlord_id: uuid.UUID
    property_id: uuid.UUID
    property_name: Optional[str] = None
    unit_id: Optional[uuid.UUID] = None
    unit_number: Optional[str] = None
    category: ExpenseCategory
    description: str
    amount: float
    currency: str
    expense_date: date
    vendor: Optional[str] = None
    reference: Optional[str] = None
    status: ExpenseStatus
    # Present when the expense came from a maintenance job.
    maintenance_request_id: Optional[uuid.UUID] = None
    maintenance_request_number: Optional[str] = None
    maintenance_title: Optional[str] = None
    source: str = "MANUAL"
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=List[ExpenseSchema])
@router.get("/", response_model=List[ExpenseSchema])
async def get_my_expenses(
    property_id: Optional[uuid.UUID] = None,
    category: Optional[ExpenseCategory] = None,
    start_date: Optional[date] = Query(None, description="Only expenses on or after this date"),
    end_date: Optional[date] = Query(None, description="Only expenses on or before this date"),
    landlord: LandlordProfile = Depends(get_current_landlord),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Expenses belonging to the signed-in landlord, newest first."""
    if landlord is None and is_admin(current_user):
        expenses = await ExpenseService.get_all_expenses(db)
    else:
        expenses = await ExpenseService.get_expenses_for_landlord(
            db, landlord.id, property_id, category, start_date, end_date
        )
    return await ExpenseService.serialize(db, expenses)


@router.post("", response_model=ExpenseSchema, status_code=status.HTTP_201_CREATED)
async def create_expense(
    req: ExpenseCreateRequest,
    landlord: LandlordProfile = Depends(get_current_landlord),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_landlord_id = landlord.id if landlord else None
    if not target_landlord_id and is_admin(current_user):
        from backend.models import Property
        prop = await db.get(Property, req.property_id)
        if not prop:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Property not found")
        target_landlord_id = prop.landlord_id

    expense = await ExpenseService.create_expense(
        session=db,
        landlord_id=target_landlord_id,
        property_id=req.property_id,
        category=req.category,
        description=req.description,
        amount=req.amount,
        expense_date=req.expense_date,
        unit_id=req.unit_id,
        vendor=req.vendor,
        reference=req.reference,
        currency=req.currency,
    )
    return (await ExpenseService.serialize(db, [expense]))[0]


@router.put("/{expense_id}", response_model=ExpenseSchema)
@router.patch("/{expense_id}", response_model=ExpenseSchema)
async def update_expense(
    expense_id: uuid.UUID,
    req: ExpenseUpdateRequest,
    landlord: LandlordProfile = Depends(get_current_landlord),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_landlord_id = None if is_admin(current_user) else (landlord.id if landlord else None)
    expense = await ExpenseService.update_expense(
        db, target_landlord_id, expense_id, req.model_dump(exclude_unset=True)
    )
    return (await ExpenseService.serialize(db, [expense]))[0]


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: uuid.UUID,
    landlord: LandlordProfile = Depends(get_current_landlord),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_landlord_id = None if is_admin(current_user) else (landlord.id if landlord else None)
    await ExpenseService.delete_expense(db, target_landlord_id, expense_id)
    return {"status": "success", "message": "Expense removed"}


@router.get("/summary")
async def get_my_expense_summary(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Totals by category, property and month, plus the maintenance breakdown."""
    return await ExpenseService.get_expense_summary(db, landlord.id)


# ----------------------------------------------------------------------
# Legacy id-in-path routes. Kept so existing callers keep working, but now
# they verify the id belongs to the caller instead of trusting it.
# ----------------------------------------------------------------------

@router.get("/landlord/{landlord_id}", response_model=List[ExpenseSchema])
async def get_landlord_expenses(
    landlord_id: uuid.UUID,
    property_id: Optional[uuid.UUID] = None,
    category: Optional[ExpenseCategory] = None,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    verify_landlord_ownership(landlord, landlord_id, "Expenses")
    expenses = await ExpenseService.get_expenses_for_landlord(db, landlord.id, property_id, category)
    return await ExpenseService.serialize(db, expenses)


@router.get("/summary/{landlord_id}")
async def get_expense_summary(
    landlord_id: uuid.UUID,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    verify_landlord_ownership(landlord, landlord_id, "Expenses")
    return await ExpenseService.get_expense_summary(db, landlord.id)
