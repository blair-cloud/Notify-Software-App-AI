from fastapi import APIRouter, Depends, status
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.core.dependencies import get_current_landlord, get_current_tenant
from backend.models import LandlordProfile, TenantProfile
from backend.schemas.lease import LeaseCreate, LeaseUpdate, LeaseResponse, LeaseDocumentUpload, LeaseSignRequest
from backend.services.lease_service import LeaseService
import uuid

router = APIRouter(prefix="/leases", tags=["Leases"])

@router.post("", response_model=LeaseResponse, status_code=status.HTTP_201_CREATED)
async def create_lease(
    req: LeaseCreate,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = LeaseService(db)
    return await service.create_lease(landlord, req)

@router.get("", response_model=List[LeaseResponse])
async def list_leases(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = LeaseService(db)
    return await service.list_landlord_leases(landlord)

# ----------------------------------------------------------------------
# Tenant-facing routes. These MUST be declared before the landlord's
# "/{lease_id}" routes below - "me" is a plain string path segment there
# (not UUID-typed), so a dynamic route registered first would otherwise
# swallow "/leases/me..." requests and blow up trying to parse "me" as a UUID.
# ----------------------------------------------------------------------

@router.get("/me", response_model=List[LeaseResponse])
async def list_my_leases(
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    service = LeaseService(db)
    return await service.list_tenant_leases(tenant)

@router.get("/me/{lease_id}", response_model=LeaseResponse)
async def get_my_lease(
    lease_id: str,
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    service = LeaseService(db)
    return await service.get_tenant_lease_by_id(tenant, uuid.UUID(lease_id))

@router.post("/me/{lease_id}/document", response_model=LeaseResponse, status_code=status.HTTP_201_CREATED)
async def upload_my_lease_document(
    lease_id: str,
    req: LeaseDocumentUpload,
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    service = LeaseService(db)
    return await service.upload_document_as_tenant(tenant, uuid.UUID(lease_id), req)

@router.post("/me/{lease_id}/sign", response_model=LeaseResponse)
async def sign_my_lease(
    lease_id: str,
    req: LeaseSignRequest,
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    service = LeaseService(db)
    return await service.sign_lease_as_tenant(tenant, uuid.UUID(lease_id), req)

@router.get("/{lease_id}", response_model=LeaseResponse)
async def get_lease(
    lease_id: str,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = LeaseService(db)
    return await service.get_lease_by_id(landlord, uuid.UUID(lease_id))

@router.patch("/{lease_id}", response_model=LeaseResponse)
async def update_lease(
    lease_id: str,
    req: LeaseUpdate,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = LeaseService(db)
    return await service.update_lease(landlord, uuid.UUID(lease_id), req)

@router.post("/{lease_id}/document", response_model=LeaseResponse, status_code=status.HTTP_201_CREATED)
async def upload_lease_document(
    lease_id: str,
    req: LeaseDocumentUpload,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = LeaseService(db)
    return await service.upload_document(landlord, uuid.UUID(lease_id), req)

@router.post("/{lease_id}/activate", response_model=LeaseResponse)
async def activate_lease(
    lease_id: str,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    service = LeaseService(db)
    return await service.activate_lease(landlord, uuid.UUID(lease_id))
