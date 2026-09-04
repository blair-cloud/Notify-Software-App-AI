from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.core.dependencies import get_current_user
from backend.models import User
from backend.schemas.auth import LandlordRegisterRequest, TenantRegisterRequest, LoginRequest, TokenResponse, ChangePasswordRequest
from backend.schemas.user import UserResponse, UserUpdate
from backend.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register/landlord", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_landlord(req: LandlordRegisterRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.register_landlord(req)

@router.post("/register/tenant", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_tenant(req: TenantRegisterRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.register_tenant(req)

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.login(req)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserResponse)
async def update_me(
    req: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    return await service.update_user_profile(current_user, req)

@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    return await service.change_password(current_user, req)
