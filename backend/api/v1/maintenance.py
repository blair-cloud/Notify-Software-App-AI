import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.core.dependencies import get_current_user, get_current_landlord, get_current_tenant, require_admin
from backend.models import User, LandlordProfile, TenantProfile, UserRole
from backend.schemas.maintenance import (
    MaintenanceRequestCreate,
    MaintenanceRequestUpdate,
    MaintenanceScheduleRequest,
    MaintenanceAssignRequest,
    MaintenanceResolveRequest,
    MaintenanceReopenRequest,
    MaintenanceCloseRequest,
    MaintenanceRequestResponse,
    MaintenanceWorkerCreate,
    MaintenanceWorkerResponse,
    MaintenanceCommentCreate,
    MaintenanceCommentResponse,
    MaintenanceStatsResponse,
)
from backend.services.maintenance_service import MaintenanceService

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


@router.post("", response_model=MaintenanceRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_maintenance_request(
    data: MaintenanceRequestCreate,
    user: User = Depends(get_current_user),
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    try:
        req = await MaintenanceService.create_maintenance_request(
            session=db,
            user_id=user.id,
            tenant_id=tenant.id,
            data=data,
        )
        augmented = await MaintenanceService.get_augmented_request(db, req.id)
        return augmented
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tenant", response_model=List[MaintenanceRequestResponse])
async def get_tenant_maintenance_requests(
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    return await MaintenanceService.get_requests_for_tenant(db, tenant.id)


@router.get("/landlord", response_model=List[MaintenanceRequestResponse])
async def get_landlord_maintenance_requests(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    return await MaintenanceService.get_requests_for_landlord(db, landlord.id)


@router.get("/all", response_model=List[MaintenanceRequestResponse])
async def get_all_maintenance_requests(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await MaintenanceService.get_all_requests(db)


@router.get("/stats/landlord", response_model=MaintenanceStatsResponse)
async def get_landlord_maintenance_stats(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    return await MaintenanceService.get_stats_for_landlord(db, landlord.id)


@router.get("/stats/all", response_model=MaintenanceStatsResponse)
async def get_all_maintenance_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await MaintenanceService.get_stats_all(db)


@router.get("/workers", response_model=List[MaintenanceWorkerResponse])
async def get_workers(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    return await MaintenanceService.get_workers(db, landlord.id)


@router.post("/workers", response_model=MaintenanceWorkerResponse, status_code=status.HTTP_201_CREATED)
async def create_worker(
    data: MaintenanceWorkerCreate,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    return await MaintenanceService.create_worker(db, landlord.id, data)


@router.get("/{request_id}", response_model=MaintenanceRequestResponse)
async def get_maintenance_request_details(
    request_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_uuid = uuid.UUID(request_id)
    augmented = await MaintenanceService.get_augmented_request(db, req_uuid)
    if not augmented:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
    return augmented


@router.post("/{request_id}/acknowledge", response_model=MaintenanceRequestResponse)
async def acknowledge_maintenance(
    request_id: str,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    try:
        req = await MaintenanceService.acknowledge_request(db, uuid.UUID(request_id), landlord.id)
        return await MaintenanceService.get_augmented_request(db, req.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{request_id}/schedule", response_model=MaintenanceRequestResponse)
async def schedule_maintenance(
    request_id: str,
    data: MaintenanceScheduleRequest,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    try:
        req = await MaintenanceService.schedule_maintenance(db, uuid.UUID(request_id), landlord.id, data)
        return await MaintenanceService.get_augmented_request(db, req.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{request_id}/assign", response_model=MaintenanceRequestResponse)
async def assign_worker(
    request_id: str,
    data: MaintenanceAssignRequest,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    try:
        req = await MaintenanceService.assign_worker(db, uuid.UUID(request_id), landlord.id, data)
        return await MaintenanceService.get_augmented_request(db, req.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{request_id}/in-progress", response_model=MaintenanceRequestResponse)
async def mark_in_progress(
    request_id: str,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    try:
        req = await MaintenanceService.mark_in_progress(db, uuid.UUID(request_id), landlord.id)
        return await MaintenanceService.get_augmented_request(db, req.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{request_id}/resolve", response_model=MaintenanceRequestResponse)
async def resolve_maintenance(
    request_id: str,
    data: MaintenanceResolveRequest,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    try:
        req = await MaintenanceService.resolve_request(db, uuid.UUID(request_id), landlord.id, data)
        return await MaintenanceService.get_augmented_request(db, req.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{request_id}/add-to-expenses", response_model=MaintenanceRequestResponse)
async def add_to_expenses(
    request_id: str,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    try:
        req, _ = await MaintenanceService.add_cost_to_expenses(db, uuid.UUID(request_id), landlord.id)
        return await MaintenanceService.get_augmented_request(db, req.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{request_id}/tenant-confirm", response_model=MaintenanceRequestResponse)
async def tenant_confirm(
    request_id: str,
    data: MaintenanceCloseRequest,
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    try:
        req = await MaintenanceService.tenant_confirm_and_close(db, uuid.UUID(request_id), tenant.id, data)
        return await MaintenanceService.get_augmented_request(db, req.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{request_id}/tenant-reopen", response_model=MaintenanceRequestResponse)
async def tenant_reopen(
    request_id: str,
    data: MaintenanceReopenRequest,
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    try:
        req = await MaintenanceService.tenant_reopen_request(db, uuid.UUID(request_id), tenant.id, data)
        return await MaintenanceService.get_augmented_request(db, req.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{request_id}/comments", response_model=MaintenanceCommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    request_id: str,
    data: MaintenanceCommentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        comment = await MaintenanceService.add_comment(
            session=db,
            request_id=uuid.UUID(request_id),
            user=user,
            message=data.message,
        )
        return comment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
