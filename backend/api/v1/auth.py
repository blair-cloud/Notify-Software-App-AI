"""
Account endpoints.

Sign up, sign in, sign out, password reset and token refresh are NOT here: the
browser talks to Supabase Auth directly for all of those. What remains is the
application's own view of an account - the profile, its role, and the one-time
bootstrap that runs after Supabase has created the user.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.core.dependencies import get_current_user
from backend.models import User
from backend.schemas.auth import ProfileBootstrapRequest, SessionInfo
from backend.schemas.user import UserResponse, UserUpdate
from backend.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Account"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """The signed-in user's profile, resolved from their Supabase token."""
    return current_user


@router.get("/session", response_model=SessionInfo)
async def get_session(current_user: User = Depends(get_current_user)):
    """
    A compact answer to "who am I and where do I belong".

    `needs_bootstrap` tells the client that Supabase created the account but the
    application profile has not been completed yet, so it should finish sign-up
    rather than drop the user on a dashboard with nothing in it.
    """
    needs_bootstrap = (
        current_user.landlord_profile is None and current_user.tenant_profile is None
    )
    return SessionInfo(
        user_id=str(current_user.id),
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role=current_user.role,
        status=current_user.status.value,
        email_verified=bool(current_user.email_verified),
        needs_bootstrap=needs_bootstrap,
    )


@router.post("/bootstrap", response_model=UserResponse)
async def bootstrap_profile(
    req: ProfileBootstrapRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Complete a new account: role, names, and the landlord or tenant profile.

    Called once by the frontend straight after `supabase.auth.signUp()`. The
    identity comes from the access token, so this cannot be used to set up
    somebody else's account, and the role is validated server-side.
    """
    return await AuthService(db).bootstrap_profile(current_user, req)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    req: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AuthService(db).update_user_profile(current_user, req)
