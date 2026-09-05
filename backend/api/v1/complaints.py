import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.core.dependencies import get_current_user, get_current_landlord, get_current_tenant, require_admin
from backend.models import User, LandlordProfile, TenantProfile
from backend.schemas.complaint import (
    ComplaintCreate,
    ComplaintUpdate,
    ComplaintResolveRequest,
    ComplaintResponse,
    ComplaintCommentCreate,
    ComplaintCommentResponse,
    ComplaintStatsResponse,
)
from backend.services.complaint_service import ComplaintService

router = APIRouter(prefix="/complaints", tags=["Complaints"])


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def create_complaint(
    data: ComplaintCreate,
    user: User = Depends(get_current_user),
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    try:
        comp = await ComplaintService.create_complaint(
            session=db,
            user_id=user.id,
            tenant_id=tenant.id,
            data=data,
        )
        return await ComplaintService.get_augmented_complaint(db, comp.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tenant", response_model=List[ComplaintResponse])
@router.get("/tenant/me", response_model=List[ComplaintResponse])
async def get_tenant_complaints(
    tenant: TenantProfile = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    return await ComplaintService.get_complaints_for_tenant(db, tenant.id)


@router.get("/landlord", response_model=List[ComplaintResponse])
@router.get("/landlord/me", response_model=List[ComplaintResponse])
async def get_landlord_complaints(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    return await ComplaintService.get_complaints_for_landlord(db, landlord.id)


@router.get("/all", response_model=List[ComplaintResponse])
async def get_all_complaints(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await ComplaintService.get_all_complaints(db)


@router.get("/landlord/stats", response_model=ComplaintStatsResponse)
@router.get("/stats/landlord", response_model=ComplaintStatsResponse)
async def get_landlord_complaint_stats(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    return await ComplaintService.get_stats_for_landlord(db, landlord.id)


@router.get("/stats/all", response_model=ComplaintStatsResponse)
async def get_all_complaint_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await ComplaintService.get_stats_all(db)


@router.get("/{complaint_id}", response_model=ComplaintResponse)
async def get_complaint_details(
    complaint_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    augmented = await ComplaintService.get_augmented_complaint(db, uuid.UUID(complaint_id))
    if not augmented:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return augmented


@router.post("/{complaint_id}/acknowledge", response_model=ComplaintResponse)
async def acknowledge_complaint(
    complaint_id: str,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    try:
        comp = await ComplaintService.acknowledge_complaint(db, uuid.UUID(complaint_id), landlord.id)
        return await ComplaintService.get_augmented_complaint(db, comp.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{complaint_id}/under-review", response_model=ComplaintResponse)
async def mark_under_review(
    complaint_id: str,
    update_data: Optional[ComplaintUpdate] = None,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    try:
        response_notes = update_data.landlord_response if update_data else None
        comp = await ComplaintService.mark_under_review(db, uuid.UUID(complaint_id), landlord.id, response_notes)
        return await ComplaintService.get_augmented_complaint(db, comp.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{complaint_id}/resolve", response_model=ComplaintResponse)
async def resolve_complaint(
    complaint_id: str,
    data: ComplaintResolveRequest,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db),
):
    try:
        comp = await ComplaintService.resolve_complaint(db, uuid.UUID(complaint_id), landlord.id, data)
        return await ComplaintService.get_augmented_complaint(db, comp.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{complaint_id}/close", response_model=ComplaintResponse)
async def close_complaint(
    complaint_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        comp = await ComplaintService.close_complaint(db, uuid.UUID(complaint_id), user.id)
        return await ComplaintService.get_augmented_complaint(db, comp.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{complaint_id}/comments", response_model=ComplaintCommentResponse, status_code=status.HTTP_201_CREATED)
async def add_complaint_comment(
    complaint_id: str,
    data: ComplaintCommentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        comment = await ComplaintService.add_comment(
            session=db,
            complaint_id=uuid.UUID(complaint_id),
            user=user,
            message=data.message,
        )
        return comment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
