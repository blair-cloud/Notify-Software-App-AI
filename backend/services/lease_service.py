import uuid
from typing import Sequence, Optional
from datetime import date, datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.exceptions import NotFoundException, ForbiddenException, ConflictException
from backend.core.permissions import verify_landlord_ownership, verify_tenant_ownership
from backend.models import Lease, LeaseDocument, Tenancy, LandlordProfile, TenantProfile, LeaseStatus, TenancyStatus
from backend.repositories.lease_repository import LeaseRepository
from backend.repositories.tenancy_repository import TenancyRepository
from backend.repositories.property_repository import PropertyRepository
from backend.repositories.unit_repository import UnitRepository
from backend.schemas.lease import LeaseCreate, LeaseUpdate, LeaseDocumentUpload, LeaseSignRequest

class LeaseService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.lease_repo = LeaseRepository(db)
        self.tenancy_repo = TenancyRepository(db)
        self.property_repo = PropertyRepository(db)
        self.unit_repo = UnitRepository(db)

    def calculate_lease_status(self, start_date: date, end_date: date, current_status: LeaseStatus) -> LeaseStatus:
        if current_status in [LeaseStatus.DRAFT, LeaseStatus.TERMINATED, LeaseStatus.PENDING]:
            return current_status
        
        today = date.today()
        if end_date < today:
            return LeaseStatus.EXPIRED
        elif (end_date - today).days <= 5:
            return LeaseStatus.EXPIRING_SOON
        else:
            return LeaseStatus.ACTIVE

    async def create_lease(self, landlord: LandlordProfile, req: LeaseCreate) -> Lease:
        tenancy = await self.tenancy_repo.get_by_id(req.tenancy_id)
        if not tenancy:
            raise NotFoundException("Tenancy not found")
        
        if tenancy.landlord_id != landlord.id:
            raise ForbiddenException("Tenancy does not belong to this landlord")

        if req.status == LeaseStatus.DRAFT:
            status = LeaseStatus.DRAFT
        else:
            status = self.calculate_lease_status(req.start_date, req.end_date, LeaseStatus.ACTIVE)

        lease = Lease(
            tenancy_id=req.tenancy_id,
            landlord_id=landlord.id,
            tenant_id=tenancy.tenant_id,
            property_id=tenancy.property_id,
            unit_id=tenancy.unit_id,
            start_date=req.start_date,
            end_date=req.end_date,
            monthly_rent=req.monthly_rent,
            security_deposit=req.security_deposit,
            payment_due_day=req.payment_due_day,
            late_fee=req.late_fee,
            currency=req.currency,
            notes=req.notes,
            status=status
        )
        lease = await self.lease_repo.create(lease)

        # Re-fetch with relationships eager-loaded so response serialization
        # (LeaseResponse.agreement_document/document_history) never triggers a
        # lazy load outside of an async context.
        return await self.lease_repo.get_by_id(lease.id)

    async def list_all_leases(self) -> Sequence[Lease]:
        """Every lease on the platform. System-admin views only."""
        res = await self.db.execute(select(Lease).order_by(Lease.created_at.desc()))
        leases = list(res.scalars().all())
        for lease in leases:
            new_status = self.calculate_lease_status(lease.start_date, lease.end_date, lease.status)
            if new_status != lease.status:
                lease.status = new_status
        return leases

    async def list_landlord_leases(self, landlord: LandlordProfile) -> Sequence[Lease]:
        leases = await self.lease_repo.list_by_landlord(landlord.id)
        # Refresh dynamic status
        for lease in leases:
            new_status = self.calculate_lease_status(lease.start_date, lease.end_date, lease.status)
            if new_status != lease.status:
                lease.status = new_status
        return leases

    async def get_lease_by_id(self, landlord: LandlordProfile, lease_id: uuid.UUID) -> Lease:
        lease = await self.lease_repo.get_by_id(lease_id)
        if not lease:
            raise NotFoundException("Lease not found")
        verify_landlord_ownership(landlord, lease.landlord_id, "Lease")
        lease.status = self.calculate_lease_status(lease.start_date, lease.end_date, lease.status)
        return lease

    async def update_lease(self, landlord: LandlordProfile, lease_id: uuid.UUID, req: LeaseUpdate) -> Lease:
        lease = await self.get_lease_by_id(landlord, lease_id)
        for field, value in req.model_dump(exclude_unset=True).items():
            setattr(lease, field, value)
        lease.status = self.calculate_lease_status(lease.start_date, lease.end_date, lease.status)
        return lease

    async def _add_document_version(self, lease: Lease, req: LeaseDocumentUpload, default_role: str) -> Lease:
        """
        Shared document-versioning logic used by both the landlord and tenant
        upload endpoints: supersedes the current version and appends a new one.
        """
        existing_docs = list(lease.documents)
        for doc in existing_docs:
            doc.status = "SUPERSEDED"

        new_version = (existing_docs[-1].version if existing_docs else 0) + 1
        file_name = req.file_name or f"lease_agreement_v{new_version}.pdf"
        document_name = req.document_name or file_name
        uploaded_by_role = req.uploaded_by_role or default_role
        uploaded_by = req.uploaded_by or ("Landlord" if uploaded_by_role == "LANDLORD" else "Tenant")

        new_doc = LeaseDocument(
            lease_id=lease.id,
            document_name=document_name,
            file_name=file_name,
            file_type=req.file_type or "application/pdf",
            file_size=req.file_size or 0,
            file_data=req.file_data,
            version=new_version,
            version_notes=req.version_notes or (
                "Initial signed agreement uploaded." if new_version == 1 else f"Version {new_version} uploaded by {uploaded_by}."
            ),
            uploaded_by=uploaded_by,
            uploaded_by_role=uploaded_by_role,
            status="ACTIVE",
            is_verified=True,
        )
        await self.lease_repo.add_document(new_doc)
        lease.documents.append(new_doc)

        # A newly uploaded document supersedes any prior tenant digital
        # signature - it must be reviewed and signed/acknowledged again.
        lease.tenant_signed_at = None
        lease.tenant_signature_name = None

        return lease

    async def upload_document(self, landlord: LandlordProfile, lease_id: uuid.UUID, req: LeaseDocumentUpload) -> Lease:
        lease = await self.get_lease_by_id(landlord, lease_id)
        return await self._add_document_version(lease, req, default_role="LANDLORD")

    async def activate_lease(self, landlord: LandlordProfile, lease_id: uuid.UUID) -> Lease:
        lease = await self.get_lease_by_id(landlord, lease_id)

        if lease.status != LeaseStatus.DRAFT:
            raise ConflictException(f"Only draft leases can be activated (current status: {lease.status.value}).")

        if not lease.documents:
            raise ConflictException("Cannot activate a lease without a signed agreement document on file.")

        lease.status = self.calculate_lease_status(lease.start_date, lease.end_date, LeaseStatus.ACTIVE)
        return lease

    # ------------------------------------------------------------------
    # Tenant-facing operations - every entry point verifies the lease
    # actually belongs to the requesting tenant before touching it.
    # ------------------------------------------------------------------

    async def list_tenant_leases(self, tenant: TenantProfile) -> Sequence[Lease]:
        leases = await self.lease_repo.list_by_tenant(tenant.id)
        for lease in leases:
            new_status = self.calculate_lease_status(lease.start_date, lease.end_date, lease.status)
            if new_status != lease.status:
                lease.status = new_status
        return leases

    async def get_tenant_lease_by_id(self, tenant: TenantProfile, lease_id: uuid.UUID) -> Lease:
        lease = await self.lease_repo.get_by_id(lease_id)
        if not lease:
            raise NotFoundException("Lease not found")
        verify_tenant_ownership(tenant, lease.tenant_id, "Lease")
        lease.status = self.calculate_lease_status(lease.start_date, lease.end_date, lease.status)
        return lease

    async def upload_document_as_tenant(self, tenant: TenantProfile, lease_id: uuid.UUID, req: LeaseDocumentUpload) -> Lease:
        lease = await self.get_tenant_lease_by_id(tenant, lease_id)
        return await self._add_document_version(lease, req, default_role="TENANT")

    async def sign_lease_as_tenant(self, tenant: TenantProfile, lease_id: uuid.UUID, req: LeaseSignRequest) -> Lease:
        lease = await self.get_tenant_lease_by_id(tenant, lease_id)

        if not lease.documents:
            raise ConflictException("There is no lease agreement document to sign yet.")

        signature_name = req.signature_name.strip()
        if not signature_name:
            raise ConflictException("Please provide your full legal name to sign this lease.")

        lease.tenant_signed_at = datetime.now(timezone.utc)
        lease.tenant_signature_name = signature_name
        return lease
