import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.services.expense_service import ExpenseService
from backend.models import ExpenseCategory, ExpenseStatus

router = APIRouter(prefix="/expenses", tags=["Expenses"])


class ExpenseCreateRequest(BaseModel):
    landlord_id: uuid.UUID
    property_id: uuid.UUID
    unit_id: Optional[uuid.UUID] = None
    category: ExpenseCategory
    description: str
    amount: float
    expense_date: date
    vendor: Optional[str] = None
    reference: Optional[str] = None
    currency: str = "RWF"


class ExpenseSchema(BaseModel):
    id: uuid.UUID
    landlord_id: uuid.UUID
    property_id: uuid.UUID
    unit_id: Optional[uuid.UUID]
    category: ExpenseCategory
    description: str
    amount: float
    currency: str
    expense_date: date
    vendor: Optional[str]
    reference: Optional[str]
    status: ExpenseStatus

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=List[ExpenseSchema])
@router.get("/", response_model=List[ExpenseSchema])
async def get_all_expenses(db: AsyncSession = Depends(get_db)):
    return await ExpenseService.get_all_expenses(db)


@router.post("", response_model=ExpenseSchema)
async def create_expense(req: ExpenseCreateRequest, db: AsyncSession = Depends(get_db)):
    return await ExpenseService.create_expense(
        session=db,
        landlord_id=req.landlord_id,
        property_id=req.property_id,
        category=req.category,
        description=req.description,
        amount=req.amount,
        expense_date=req.expense_date,
        unit_id=req.unit_id,
        vendor=req.vendor,
        reference=req.reference,
        currency=req.currency
    )


@router.get("/landlord/{landlord_id}", response_model=List[ExpenseSchema])
async def get_landlord_expenses(
    landlord_id: uuid.UUID,
    property_id: Optional[uuid.UUID] = None,
    category: Optional[ExpenseCategory] = None,
    db: AsyncSession = Depends(get_db)
):
    return await ExpenseService.get_expenses_for_landlord(db, landlord_id, property_id, category)


@router.get("/summary/{landlord_id}")
async def get_expense_summary(landlord_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await ExpenseService.get_expense_summary(db, landlord_id)
