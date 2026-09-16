from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.core.dependencies import require_admin
from backend.models import User, UserStatus
from backend.schemas.admin import AdminDashboardStats, UserStatusUpdate, UserRoleUpdate, UserCreateAdmin, PropertyReassignRequest
from backend.schemas.user import UserResponse
from backend.services.admin_service import AdminService
from backend.repositories.user_repository import UserRepository
import uuid

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/dashboard", response_model=AdminDashboardStats)
@router.get("/stats", response_model=AdminDashboardStats)
async def get_admin_dashboard(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    service = AdminService(db)
    return await service.get_dashboard_stats()

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db)
    return await repo.list_all_users(skip=skip, limit=limit)

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    req: UserCreateAdmin,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    service = AdminService(db)
    try:
        return await service.create_user(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/users/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: str,
    req: UserStatusUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    service = AdminService(db)
    return await service.update_user_status(uuid.UUID(user_id), req)

@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    req: UserRoleUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    service = AdminService(db)
    return await service.update_user_role(uuid.UUID(user_id), req)

@router.patch("/users/{user_id}/suspend", response_model=UserResponse)
@router.post("/users/{user_id}/suspend", response_model=UserResponse)
async def suspend_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    service = AdminService(db)
    return await service.update_user_status(uuid.UUID(user_id), UserStatusUpdate(status=UserStatus.SUSPENDED))

@router.patch("/users/{user_id}/activate", response_model=UserResponse)
@router.post("/users/{user_id}/activate", response_model=UserResponse)
async def activate_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    service = AdminService(db)
    return await service.update_user_status(uuid.UUID(user_id), UserStatusUpdate(status=UserStatus.ACTIVE))

@router.post("/properties/{property_id}/reassign")
async def reassign_property_landlord(
    property_id: str,
    req: PropertyReassignRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    service = AdminService(db)
    prop = await service.reassign_property_landlord(uuid.UUID(property_id), req.landlord_id)
    return {"message": "Property reassigned successfully", "property_id": str(prop.id), "landlord_id": str(prop.landlord_id)}
@router.get("/landlords")
async def list_landlords(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    service = AdminService(db)
    return await service.list_landlords()

@router.get("/tenants")
async def list_tenants(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    service = AdminService(db)
    return await service.list_tenants()
