import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.services.financial_service import FinancialService

router = APIRouter(prefix="/financials", tags=["Financials"])


@router.get("/landlord/{landlord_id}")
async def get_landlord_financials(landlord_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await FinancialService.get_landlord_financial_overview(db, landlord_id)


@router.get("/tenant/{tenant_id}")
async def get_tenant_financials(tenant_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await FinancialService.get_tenant_financial_overview(db, tenant_id)
