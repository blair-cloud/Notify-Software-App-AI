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

import os
from pydantic import BaseModel, EmailStr
from fastapi import Request
from backend.core.config import settings
from backend.core.logging import logger
from backend.integrations.supabase_admin import generate_password_reset_link
from backend.integrations.email import send_email_message


class ForgotPasswordRequest(BaseModel):
    email: str


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, request: Request):
    """
    Generate and email a password-reset link with direct production routing.
    Guarantees the link uses the production domain (or caller's origin) and
    never routes to localhost in production.
    """
    clean_email = req.email.strip().lower()
    
    # 1. Determine frontend origin dynamically
    origin = request.headers.get("origin") or request.headers.get("referer")
    if origin:
        from urllib.parse import urlparse
        p = urlparse(origin)
        base_url = f"{p.scheme}://{p.netloc}".rstrip("/")
    else:
        base_url = settings.frontend_origin.rstrip("/")

    is_prod = (
        settings.ENVIRONMENT.lower() in ("production", "prod")
        or bool(os.environ.get("RENDER"))
        or bool(os.environ.get("VERCEL"))
        or bool(os.environ.get("FLY_ALLOC_ID"))
    )
    if is_prod and ("localhost" in base_url or not base_url):
        base_url = "https://notifyappo.web.app"

    try:
        token_hash = await generate_password_reset_link(clean_email)
        if token_hash:
            reset_link = f"{base_url}/reset-password?token_hash={token_hash}&type=recovery"
            
            subject = "Reset Your Password - Notify"
            body = (
                f"Hello,\n\n"
                f"You requested a password reset for your Notify account.\n\n"
                f"Click the link below to set a new password:\n{reset_link}\n\n"
                f"This link expires in 60 minutes. If you did not request this, you can safely ignore this email."
            )
            html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B;">
  <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #331A6F; padding: 28px 24px; text-align: center;">
      <h1 style="color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Notify</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0 0; font-size: 13px;">Rental & Property Management Rwanda</p>
    </div>
    <div style="padding: 32px 28px;">
      <h2 style="margin: 0 0 16px 0; color: #0F172A; font-size: 18px; font-weight: 700;">Reset Your Password</h2>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
        We received a request to reset the password for your Notify account (<strong>{clean_email}</strong>). Click the button below to choose a new password:
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="{reset_link}" style="display: inline-block; background-color: #331A6F; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 2px 4px rgba(51,26,111,0.2);">
          Set New Password
        </a>
      </div>
      <p style="margin: 24px 0 8px 0; font-size: 12px; color: #94A3B8; line-height: 1.5;">
        Or copy and paste this URL into your browser:<br/>
        <a href="{reset_link}" style="color: #331A6F; word-break: break-all;">{reset_link}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #F1F5F9; margin: 24px 0;" />
      <p style="margin: 0; font-size: 12px; color: #94A3B8; line-height: 1.5;">
        This link is single-use and expires in 60 minutes.<br/>
        If you did not request this password reset, please ignore this email; your account remains completely secure.
      </p>
    </div>
  </div>
</body>
</html>"""
            delivery = await send_email_message(
                to_email=clean_email,
                subject=subject,
                body=body,
                html_content=html,
                metadata={"purpose": "PASSWORD_RESET"}
            )
            logger.info("Password reset email for %s: ok=%s provider=%s error=%s link=%s", clean_email, delivery.ok, delivery.provider, delivery.error, reset_link)
            if not delivery.ok:
                logger.error("Password reset email delivery failed for %s: %s", clean_email, delivery.error)
        else:
            logger.info("Password reset requested for non-existent user %s", clean_email)
    except Exception as exc:
        logger.exception("Password reset processing failed: %s", exc)

    return {
        "message": (
            "If that email address has a Notify account, a password reset link is on its way. "
            "Please check your inbox, including the spam folder."
        )
    }
