from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import datetime
import uuid
from backend.models.role import UserStatus, UserRole

class AdminDashboardStats(BaseModel):
    total_users: int = 0
    total_landlords: int = 0
    total_tenants: int = 0
    total_properties: int = 0
    total_units: int = 0
    occupied_units: int = 0
    vacant_units: int = 0
    active_tenancies: int = 0
    active_leases: int = 0
    expiring_leases: int = 0
    expected_rent: float = 0.0
    collected_rent: float = 0.0
    outstanding_balance: float = 0.0
    collection_rate: float = 0.0
    pending_payments: int = 0
    urgent_maintenance: int = 0
    missing_docs_count: int = 0
    compliance_score: float = 100.0
    currency: str = "RWF"

class UserStatusUpdate(BaseModel):
    status: UserStatus
    reason: Optional[str] = None

class UserRoleUpdate(BaseModel):
    role: UserRole
    reason: Optional[str] = None

class UserCreateAdmin(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    role: UserRole
    business_name: Optional[str] = None
    password: Optional[str] = "NotifyAdmin2026!"

class PropertyReassignRequest(BaseModel):
    landlord_id: uuid.UUID

class AdminBroadcastRequest(BaseModel):
    title: str
    message: str
    target_audience: str = "ALL"
    priority: str = "HIGH"

class AdminPlatformSettingsSchema(BaseModel):
    platform_name: str = "Notify Real Estate ERP"
    currency: str = "RWF"
    grace_period_days: int = 5
    late_fee_percentage: float = 5.0
    auto_generate_invoices_day: int = 1
    invoice_due_days_after: int = 5
    enable_sms_notifications: bool = True
    enable_email_notifications: bool = True
    maintenance_auto_dispatch: bool = False
    enforce_lease_kyc_checks: bool = True
    support_phone: str = "+250 788 000 111"
    support_email: str = "support@notify.rw"
    system_version: str = "2.4.0-enterprise"

