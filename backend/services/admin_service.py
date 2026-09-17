import secrets
import uuid
from typing import Sequence, List, Optional, Dict, Any
from sqlalchemy import select, func, case, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.models import (
    User, LandlordProfile, TenantProfile, Property, Unit, Tenancy, Lease, 
    Invoice, Payment, Expense, MaintenanceRequest, Notification, UserStatus, UserRole, UnitStatus, LeaseStatus,
    PaymentStatus, MaintenancePriority
)
from backend.schemas.admin import AdminDashboardStats, UserStatusUpdate, UserRoleUpdate, UserCreateAdmin
from backend.repositories.user_repository import UserRepository
from backend.core.exceptions import NotFoundException
from backend.integrations.supabase_admin import create_auth_user, SupabaseAdminError

class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def get_dashboard_stats(self) -> AdminDashboardStats:
        total_users = (await self.db.execute(select(func.count(User.id)))).scalar() or 0
        total_landlords = (await self.db.execute(select(func.count(LandlordProfile.id)))).scalar() or 0
        total_tenants = (await self.db.execute(select(func.count(TenantProfile.id)))).scalar() or 0
        total_properties = (await self.db.execute(select(func.count(Property.id)))).scalar() or 0
        total_units = (await self.db.execute(select(func.count(Unit.id)))).scalar() or 0
        occupied_units = (await self.db.execute(select(func.count(Unit.id)).where(Unit.status == UnitStatus.OCCUPIED))).scalar() or 0
        vacant_units = (await self.db.execute(select(func.count(Unit.id)).where(Unit.status == UnitStatus.VACANT))).scalar() or 0
        active_tenancies = (await self.db.execute(select(func.count(Tenancy.id)))).scalar() or 0
        active_leases = (await self.db.execute(select(func.count(Lease.id)).where(Lease.status == LeaseStatus.ACTIVE))).scalar() or 0
        expiring_leases = (await self.db.execute(select(func.count(Lease.id)).where(Lease.status == LeaseStatus.EXPIRING_SOON))).scalar() or 0
        
        # Financial aggregates
        raw_expected = (await self.db.execute(select(func.sum(Invoice.total_amount)))).scalar()
        raw_collected = (await self.db.execute(select(func.sum(Invoice.amount_paid)))).scalar()
        raw_outstanding = (await self.db.execute(select(func.sum(Invoice.balance_due)))).scalar()
        raw_expenses = (await self.db.execute(select(func.sum(Expense.amount)))).scalar()

        total_expected = float(raw_expected or 0.0)
        total_collected = float(raw_collected or 0.0)
        total_outstanding = float(raw_outstanding or 0.0)
        total_expenses = float(raw_expenses or 0.0)

        net_income = total_collected - total_expenses
        collection_rate = (total_collected / total_expected * 100.0) if total_expected > 0 else 0.0

        # Pending items
        pending_payments = (await self.db.execute(
            select(func.count(Payment.id)).where(
                Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.AWAITING_VERIFICATION])
            )
        )).scalar() or 0
        urgent_maint = (await self.db.execute(
            select(func.count(MaintenanceRequest.id)).where(MaintenanceRequest.priority == MaintenancePriority.URGENT)
        )).scalar() or 0

        occupancy_rate = round(occupied_units / total_units * 100.0, 1) if total_units > 0 else 0.0
        active_users = (await self.db.execute(select(func.count(User.id)).where(User.status == UserStatus.ACTIVE))).scalar() or 0
        suspended_users = (await self.db.execute(select(func.count(User.id)).where(User.status == UserStatus.SUSPENDED))).scalar() or 0
        draft_leases = (await self.db.execute(select(func.count(Lease.id)).where(Lease.status == LeaseStatus.DRAFT))).scalar() or 0
        expired_leases = (await self.db.execute(select(func.count(Lease.id)).where(Lease.status == LeaseStatus.EXPIRED))).scalar() or 0

        # Compliance
        missing_docs = (await self.db.execute(
            select(func.count(Lease.id)).where(Lease.status == LeaseStatus.ACTIVE, Lease.document_id.is_(None))
        )).scalar() or 0
        compliance_score = round(((active_leases - missing_docs) / active_leases * 100.0), 1) if active_leases > 0 else 100.0

        return AdminDashboardStats(
            total_users=total_users,
            total_landlords=total_landlords,
            total_tenants=total_tenants,
            total_properties=total_properties,
            total_units=total_units,
            occupied_units=occupied_units,
            vacant_units=vacant_units,
            occupancy_rate=occupancy_rate,
            active_tenancies=active_tenancies,
            active_leases=active_leases,
            expiring_leases=expiring_leases,
            expected_rent=float(total_expected),
            collected_rent=float(total_collected),
            outstanding_balance=float(total_outstanding),
            outstanding_rent=float(total_outstanding),
            total_expenses=float(total_expenses),
            net_income=float(net_income),
            collection_rate=round(float(collection_rate), 1),
            pending_payments=pending_payments,
            urgent_maintenance=urgent_maint,
            missing_docs_count=missing_docs,
            compliance_score=compliance_score,
            compliance_rate=compliance_score,
            landlords_count=total_landlords,
            tenants_count=total_tenants,
            active_users=active_users,
            suspended_users=suspended_users,
            draft_leases=draft_leases,
            expired_leases=expired_leases,
            currency="RWF"
        )

    async def get_all_users(self) -> Sequence[User]:
        result = await self.db.execute(select(User))
        return result.scalars().all()

    async def create_user(self, req: UserCreateAdmin) -> User:
        """
        Create an account as an administrator.

        The identity is created in Supabase Auth, which hashes the password and
        owns the credential. The row written here is only the application
        profile - it deliberately has nowhere to put a password.
        """
        existing = await self.user_repo.get_by_email(req.email)
        if existing:
            raise ValueError(f"User with email {req.email} already exists")

        try:
            auth_user = await create_auth_user(
                email=req.email,
                password=req.password or secrets.token_urlsafe(16),
                role=req.role.value,
                phone=req.phone,
                first_name=req.first_name,
                last_name=req.last_name,
            )
        except SupabaseAdminError as exc:
            raise ValueError(f"Could not create the account in Supabase Auth: {exc}") from exc

        auth_id = uuid.UUID(auth_user["id"])

        # The on_auth_user_created trigger normally inserts the profile; take
        # whichever row exists so this works either way.
        existing_profile = (
            await self.db.execute(select(User).where(User.id == auth_id))
        ).scalar_one_or_none()

        if existing_profile:
            new_user = existing_profile
            new_user.first_name = req.first_name
            new_user.last_name = req.last_name
            new_user.email = req.email
            if req.phone:
                new_user.phone = req.phone
            new_user.role = req.role
            new_user.status = UserStatus.ACTIVE
        else:
            new_user = User(
                id=auth_id,
                first_name=req.first_name,
                last_name=req.last_name,
                email=req.email,
                phone=req.phone or f"pending-{str(auth_id)[:8]}",
                role=req.role,
                status=UserStatus.ACTIVE,
            )
            self.db.add(new_user)

        await self.db.flush()

        if req.role == UserRole.LANDLORD:
            landlord_profile = LandlordProfile(
                id=uuid.uuid4(),
                user_id=new_user.id,
                business_name=req.business_name or f"{req.last_name} Properties Ltd"
            )
            self.db.add(landlord_profile)
        elif req.role == UserRole.TENANT:
            tenant_profile = TenantProfile(
                id=uuid.uuid4(),
                user_id=new_user.id
            )
            self.db.add(tenant_profile)

        await self.db.flush()
        return new_user

    async def update_user_status(self, user_id: uuid.UUID, req: UserStatusUpdate) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")
        user.status = req.status
        await self.db.flush()
        return user

    async def update_user_role(self, user_id: uuid.UUID, req: UserRoleUpdate) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")
        user.role = req.role
        await self.db.flush()
        return user

    async def reassign_property_landlord(self, property_id: uuid.UUID, landlord_id: uuid.UUID) -> Property:
        prop = (await self.db.execute(select(Property).where(Property.id == property_id))).scalar_one_or_none()
        if not prop:
            raise NotFoundException("Property not found")
        prop.landlord_id = landlord_id
        await self.db.flush()
        return prop

    async def list_landlords(self) -> List[Dict[str, Any]]:
        # 1. Properties count per landlord
        p_res = await self.db.execute(
            select(Property.landlord_id, func.count(Property.id)).group_by(Property.landlord_id)
        )
        props_by_landlord: Dict[uuid.UUID, int] = dict(p_res.all())

        # 2. Units (total + occupied) per landlord
        u_res = await self.db.execute(
            select(
                Property.landlord_id,
                func.count(Unit.id),
                func.sum(case((Unit.status == UnitStatus.OCCUPIED, 1), else_=0))
            )
            .join(Property, Unit.property_id == Property.id)
            .group_by(Property.landlord_id)
        )
        units_by_landlord: Dict[uuid.UUID, tuple[int, int]] = {
            row[0]: (int(row[1] or 0), int(row[2] or 0)) for row in u_res.all()
        }

        # 3. Rent roll per landlord (from active leases)
        l_res = await self.db.execute(
            select(Lease.landlord_id, func.sum(Lease.monthly_rent))
            .where(Lease.status.in_([LeaseStatus.ACTIVE, LeaseStatus.EXPIRING_SOON]))
            .group_by(Lease.landlord_id)
        )
        rent_roll_by_landlord: Dict[uuid.UUID, float] = {
            row[0]: float(row[1] or 0) for row in l_res.all()
        }

        # 4. Outstanding invoices per landlord
        i_res = await self.db.execute(
            select(Invoice.landlord_id, func.sum(Invoice.balance_due))
            .where(Invoice.balance_due > 0)
            .group_by(Invoice.landlord_id)
        )
        outstanding_by_landlord: Dict[uuid.UUID, float] = {
            row[0]: float(row[1] or 0) for row in i_res.all()
        }

        # 5. All units with tenancy and occupant information
        units_res = await self.db.execute(
            select(
                Unit.id,
                Unit.property_id,
                Unit.landlord_id,
                Unit.unit_number,
                Unit.unit_type,
                Unit.status,
                Unit.monthly_rent,
                Unit.currency,
                User.first_name,
                User.last_name,
            )
            .outerjoin(Tenancy, and_(Tenancy.unit_id == Unit.id, Tenancy.status == "ACTIVE"))
            .outerjoin(TenantProfile, Tenancy.tenant_id == TenantProfile.id)
            .outerjoin(User, TenantProfile.user_id == User.id)
            .order_by(Unit.unit_number.asc())
        )
        units_by_property: Dict[uuid.UUID, List[Dict[str, Any]]] = {}
        for u_row in units_res.all():
            p_id = u_row[1]
            t_name = f"{u_row[8] or ''} {u_row[9] or ''}".strip() or None
            unit_data = {
                "id": str(u_row[0]),
                "unit_number": u_row[3],
                "unit_type": u_row[4] or "Unit",
                "status": u_row[5].value if hasattr(u_row[5], "value") else str(u_row[5]),
                "monthly_rent": float(u_row[6] or 0.0),
                "currency": u_row[7] or "RWF",
                "tenant_name": t_name,
            }
            units_by_property.setdefault(p_id, []).append(unit_data)

        # 6. All properties for the detail modal
        props_res = await self.db.execute(
            select(Property).order_by(Property.created_at.desc())
        )
        all_props = props_res.scalars().all()
        props_list_by_landlord: Dict[uuid.UUID, List[Dict[str, Any]]] = {}
        for p in all_props:
            prop_units = units_by_property.get(p.id, [])
            total_u = len(prop_units)
            occ_u = sum(1 for u in prop_units if u["status"] == "OCCUPIED")
            vac_u = sum(1 for u in prop_units if u["status"] == "VACANT")
            prop_expected_monthly = sum(u["monthly_rent"] for u in prop_units)

            props_list_by_landlord.setdefault(p.landlord_id, []).append({
                "id": str(p.id),
                "name": p.name,
                "property_type": p.property_type.value if hasattr(p.property_type, "value") else str(p.property_type),
                "district": p.district or "",
                "address": p.address or "",
                "total_units": total_u,
                "occupied_units": occ_u,
                "vacant_units": vac_u,
                "expected_monthly_rent": prop_expected_monthly,
                "units": prop_units,
            })

        # 7. Profiles and Users joined
        prof_res = await self.db.execute(
            select(LandlordProfile, User)
            .join(User, LandlordProfile.user_id == User.id)
            .order_by(LandlordProfile.created_at.desc())
        )
        rows = prof_res.all()

        landlord_list = []
        for lp, u in rows:
            p_data = props_list_by_landlord.get(lp.id, [])
            total_units_count = sum(p["total_units"] for p in p_data)
            occupied_units_count = sum(p["occupied_units"] for p in p_data)

            # Expected monthly rent: prioritize active lease rent roll, otherwise sum of units' monthly_rent
            active_lease_rent = rent_roll_by_landlord.get(lp.id, 0.0)
            units_rent_sum = sum(p["expected_monthly_rent"] for p in p_data)
            expected_monthly = active_lease_rent if active_lease_rent > 0 else units_rent_sum
            outstanding_bal = outstanding_by_landlord.get(lp.id, 0.0)

            landlord_list.append({
                "id": str(lp.id),
                "landlord_id": str(lp.id),
                "user_id": str(u.id),
                "first_name": u.first_name,
                "last_name": u.last_name,
                "email": u.email,
                "phone": u.phone,
                "avatar_url": u.avatar_url,
                "status": u.status.value if hasattr(u.status, "value") else str(u.status),
                "is_active": u.status == UserStatus.ACTIVE,
                "business_name": lp.business_name or f"{u.first_name} {u.last_name}",
                "business_type": lp.business_type.value if hasattr(lp.business_type, "value") else str(lp.business_type or "INDIVIDUAL"),
                "tax_identifier": lp.tax_identifier or "",
                "address": lp.address or "",
                "district": lp.district or "",
                "city": lp.city or "Kigali",
                "country": lp.country or "Rwanda",
                "verification_status": lp.verification_status.value if hasattr(lp.verification_status, "value") else str(lp.verification_status or "VERIFIED"),
                "properties_count": len(p_data),
                "units_count": total_units_count,
                "occupied_units": occupied_units_count,
                "monthly_rent_roll": expected_monthly,
                "expected_monthly_rent": expected_monthly,
                "outstanding_rent": outstanding_bal,
                "created_at": lp.created_at.isoformat() if lp.created_at else None,
                "properties": p_data,
                "properties_list": p_data,
            })
        return landlord_list

    async def list_tenants(self) -> List[Dict[str, Any]]:
        # 1. Outstanding by tenant
        inv_res = await self.db.execute(
            select(Invoice.tenant_id, func.sum(Invoice.balance_due))
            .where(Invoice.balance_due > 0)
            .group_by(Invoice.tenant_id)
        )
        outstanding_by_tenant = {row[0]: float(row[1] or 0) for row in inv_res.all()}

        # 2. Landlord names
        ll_res = await self.db.execute(
            select(LandlordProfile.id, User.first_name, User.last_name, LandlordProfile.business_name)
            .join(User, LandlordProfile.user_id == User.id)
        )
        landlord_names = {row[0]: (row[3] or f"{row[1]} {row[2]}") for row in ll_res.all()}

        # 3. Active leases scalars
        leases_res = await self.db.execute(
            select(
                Lease.id,
                Lease.tenant_id,
                Lease.status,
                Lease.monthly_rent,
                Lease.start_date,
                Lease.end_date,
                Lease.security_deposit
            ).where(Lease.status.in_([LeaseStatus.ACTIVE, LeaseStatus.EXPIRING_SOON]))
        )
        lease_by_tenant = {}
        for row in leases_res.all():
            if row[1] not in lease_by_tenant:
                lease_by_tenant[row[1]] = {
                    "id": str(row[0]),
                    "status": row[2].value if hasattr(row[2], "value") else str(row[2]),
                    "monthly_rent": float(row[3]),
                    "start_date": row[4].isoformat() if row[4] else None,
                    "end_date": row[5].isoformat() if row[5] else None,
                    "security_deposit": float(row[6] or 0.0),
                    "agreement_document": None,
                }

        # 4. Tenancies with Property and Unit as column scalars
        tenancies_res = await self.db.execute(
            select(
                Tenancy.tenant_id,
                Tenancy.start_date,
                Property.id,
                Property.name,
                Unit.id,
                Unit.unit_number,
                Unit.monthly_rent,
                Tenancy.landlord_id
            )
            .join(Property, Tenancy.property_id == Property.id)
            .join(Unit, Tenancy.unit_id == Unit.id)
            .order_by(Tenancy.created_at.desc())
        )
        tenancy_by_tenant = {}
        for row in tenancies_res.all():
            tid = row[0]
            if tid not in tenancy_by_tenant:
                tenancy_by_tenant[tid] = {
                    "start_date": row[1].isoformat() if row[1] else None,
                    "property_id": str(row[2]),
                    "property_name": row[3],
                    "unit_id": str(row[4]),
                    "unit_number": row[5],
                    "unit_rent": float(row[6] or 0.0),
                    "landlord_id": row[7],
                }

        # 5. TenantProfiles and User as column scalars
        tp_res = await self.db.execute(
            select(
                TenantProfile.id,
                TenantProfile.user_id,
                TenantProfile.national_id,
                TenantProfile.occupation,
                TenantProfile.emergency_name,
                TenantProfile.emergency_phone,
                TenantProfile.created_at,
                TenantProfile.pending_first_name,
                TenantProfile.pending_last_name,
                TenantProfile.pending_email,
                TenantProfile.pending_phone,
                User.first_name,
                User.last_name,
                User.email,
                User.phone,
                User.status
            )
            .outerjoin(User, TenantProfile.user_id == User.id)
            .order_by(TenantProfile.created_at.desc())
        )
        rows = tp_res.all()

        tenants = []
        for r in rows:
            tp_id = r[0]
            u_id = r[1]
            first_name = (r[11] or r[7]) or "Tenant"
            last_name = (r[12] or r[8]) or ""
            email = (r[13] or r[9]) or ""
            phone = (r[14] or r[10]) or ""
            status = r[15].value if (r[15] and hasattr(r[15], "value")) else "ACTIVE"

            t_info = tenancy_by_tenant.get(tp_id)
            lease_data = lease_by_tenant.get(tp_id)

            monthly_rent = lease_data["monthly_rent"] if lease_data else (t_info["unit_rent"] if t_info else 0.0)
            lease_status = lease_data["status"] if lease_data else ("ACTIVE" if t_info else "DRAFT")
            landlord_name = landlord_names.get(t_info["landlord_id"], "Notify Properties") if t_info else "Notify Properties"

            tenants.append({
                "id": str(tp_id),
                "tenant_id": str(tp_id),
                "user_id": str(u_id) if u_id else None,
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "phone": phone,
                "status": status,
                "is_active": status == "ACTIVE",
                "national_id": r[2] or "",
                "occupation": r[3] or "Residential Tenant",
                "emergency_name": r[4] or "",
                "emergency_phone": r[5] or "",
                "created_at": r[6].isoformat() if r[6] else None,
                "property_id": t_info["property_id"] if t_info else None,
                "property_name": t_info["property_name"] if t_info else "Unassigned Property",
                "unit_id": t_info["unit_id"] if t_info else None,
                "unit_number": t_info["unit_number"] if t_info else "None",
                "landlord_name": landlord_name,
                "lease_status": lease_status,
                "monthly_rent": monthly_rent,
                "outstanding_balance": outstanding_by_tenant.get(tp_id, 0.0),
                "tenancy_start_date": t_info["start_date"] if t_info else None,
                "lease": lease_data,
            })
        return tenants

