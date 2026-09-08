from typing import Optional

from pydantic import BaseModel, model_validator

from backend.models.role import BusinessType, UserLanguage, UserRole


class ProfileBootstrapRequest(BaseModel):
    """
    Sent once, immediately after Supabase Auth creates the account, to fill in
    the application profile.

    There is no email or password here: Supabase Auth already holds both, and
    the caller's identity comes from the verified access token rather than from
    anything in this body.

    `role` is a *request*, not an instruction - the service refuses anything
    outside the self-selectable set.
    """

    # Omitted when the account was confirmed by email: the role was already
    # recorded at sign-up, so bootstrap must keep it rather than reset it.
    role: Optional[UserRole] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    language: UserLanguage = UserLanguage.EN

    # Landlord
    business_type: BusinessType = BusinessType.INDIVIDUAL
    business_name: Optional[str] = None
    tax_identifier: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = "Nyarugenge"
    city: Optional[str] = "Kigali"

    # Tenant
    invitation_token: Optional[str] = None
    national_id: Optional[str] = None
    occupation: Optional[str] = None
    emergency_name: Optional[str] = None
    emergency_phone: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def _accept_full_name(cls, data):
        """The sign-up form collects one 'Full name' field."""
        if not isinstance(data, dict):
            return data
        data = dict(data)
        if not data.get("first_name") and data.get("full_name"):
            from backend.utils.validators import split_full_name

            first, last = split_full_name(str(data["full_name"]))
            data["first_name"] = first
            data.setdefault("last_name", last)
        return data


class SetRoleRequest(BaseModel):
    role: UserRole


class MessageResponse(BaseModel):
    message: str
    status: str = "success"


class SessionInfo(BaseModel):
    """What the frontend needs to render the right dashboard."""

    user_id: str
    email: str
    first_name: str
    last_name: str
    role: UserRole
    status: str
    email_verified: bool
    needs_bootstrap: bool
