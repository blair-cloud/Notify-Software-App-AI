import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.core.dependencies import get_current_landlord, get_current_tenant, get_current_user
from backend.core.exceptions import ForbiddenException
from backend.core.scoping import assert_landlord_id
from backend.models import LandlordProfile, TenantProfile, User
from backend.services.financial_service import FinancialService

router = APIRouter(prefix="/financials", tags=["Financials"])


@router.get("/landlord/me")
async def get_my_landlord_financials(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    return await FinancialService.get_landlord_financial_overview(db, landlord.id)


@router.get("/landlord/{landlord_id}")
async def get_landlord_financials(
    landlord_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Kept for the existing client, but the id in the URL must be the caller's
    # own - it used to expose any landlord's revenue to an anonymous request.
    await assert_landlord_id(db, current_user, landlord_id)
    return await FinancialService.get_landlord_financial_overview(db, landlord_id)


@router.get("/tenant/me")
async def get_my_tenant_financials(
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    return await FinancialService.get_tenant_financial_overview(db, tenant.id)


@router.get("/tenant/{tenant_id}")
async def get_tenant_financials(
    tenant_id: uuid.UUID,
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    if tenant.id != tenant_id:
        raise ForbiddenException("Isolation violation: You are not authorized to view this financial summary")
    return await FinancialService.get_tenant_financial_overview(db, tenant_id)
