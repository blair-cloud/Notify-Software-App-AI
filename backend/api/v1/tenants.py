from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.core.dependencies import get_current_tenant
from backend.models import TenantProfile
from backend.schemas.tenancy import TenancyResponse
from backend.repositories.tenancy_repository import TenancyRepository

router = APIRouter(prefix="/tenant", tags=["Tenant"])

@router.get("/tenancy", response_model=List[TenancyResponse])
async def get_tenant_tenancies(
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    repo = TenancyRepository(db)
    return await repo.list_by_tenant(tenant.id)
