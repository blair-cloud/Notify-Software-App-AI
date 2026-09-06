import uuid
from backend.core.exceptions import ForbiddenException
from backend.models import LandlordProfile, TenantProfile, Tenancy


def verify_landlord_ownership(landlord: LandlordProfile, resource_landlord_id: uuid.UUID, resource_name: str = "Resource"):
    """
    Enforces Landlord Isolation Rule:
    A landlord may only access resources where landlord_id = current_user.landlord_id.
    """
    if not landlord:
        raise ForbiddenException("Landlord profile required")
    if landlord.id != resource_landlord_id:
        raise ForbiddenException(f"Isolation violation: You do not own this {resource_name}")


def verify_tenant_tenancy(tenant: TenantProfile, tenancy: Tenancy):
    """
    Enforces Tenant Isolation Rule:
    A tenant should access only resources associated with their active tenancy.
    """
    if not tenant:
        raise ForbiddenException("Tenant profile required")
    if tenancy.tenant_id != tenant.id:
        raise ForbiddenException("Isolation violation: You are not authorized for this tenancy")


def verify_tenant_ownership(tenant: TenantProfile, resource_tenant_id: uuid.UUID, resource_name: str = "Resource"):
    """
    Enforces Tenant Isolation Rule for resources keyed directly by tenant_id
    (e.g. leases): a tenant may only access resources where tenant_id = their own.
    """
    if not tenant:
        raise ForbiddenException("Tenant profile required")
    if tenant.id != resource_tenant_id:
        raise ForbiddenException(f"Isolation violation: You do not own this {resource_name}")
