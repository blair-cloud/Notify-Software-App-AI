-- =============================================================================
-- NOTIFY PROPERTY MANAGEMENT PLATFORM
-- COMPLETE SUPABASE / POSTGRESQL PRODUCTION DATABASE MIGRATION & SEED SCRIPT
-- =============================================================================
-- Instructions:
-- 1. Open your Supabase project dashboard:
--    https://supabase.com/dashboard/project/dxbciniopvkomnkqvdaw/sql
-- 2. Click "New query" or paste this entire script into the SQL Editor.
-- 3. Click "RUN" to apply the schema, constraints, RLS policies, triggers, and seed data.
-- =============================================================================

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- STEP 1: CLEAN DROP EXISTING OBJECTS (Topological Reverse Order)
-- =============================================================================
DROP TABLE IF EXISTS payment_matches CASCADE;
DROP TABLE IF EXISTS bank_transactions CASCADE;
DROP TABLE IF EXISTS bank_statements CASCADE;
DROP TABLE IF EXISTS bank_accounts CASCADE;
DROP TABLE IF EXISTS complaint_comments CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS maintenance_workers CASCADE;
DROP TABLE IF EXISTS maintenance_comments CASCADE;
DROP TABLE IF EXISTS maintenance_attachments CASCADE;
DROP TABLE IF EXISTS maintenance_requests CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS rent_schedules CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS reminder_histories CASCADE;
DROP TABLE IF EXISTS notification_delivery_logs CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS leases CASCADE;
DROP TABLE IF EXISTS tenancies CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS tenant_profiles CASCADE;
DROP TABLE IF EXISTS landlord_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop Enum Types
DROP TYPE IF EXISTS userrole CASCADE;
DROP TYPE IF EXISTS userstatus CASCADE;
DROP TYPE IF EXISTS userlanguage CASCADE;
DROP TYPE IF EXISTS businesstype CASCADE;
DROP TYPE IF EXISTS verificationstatus CASCADE;
DROP TYPE IF EXISTS propertytype CASCADE;
DROP TYPE IF EXISTS propertystatus CASCADE;
DROP TYPE IF EXISTS unitstatus CASCADE;
DROP TYPE IF EXISTS tenancystatus CASCADE;
DROP TYPE IF EXISTS leasestatus CASCADE;
DROP TYPE IF EXISTS invitationstatus CASCADE;
DROP TYPE IF EXISTS notificationchannel CASCADE;
DROP TYPE IF EXISTS notificationpriority CASCADE;
DROP TYPE IF EXISTS notificationcategory CASCADE;
DROP TYPE IF EXISTS notificationstatus CASCADE;
DROP TYPE IF EXISTS notificationtype CASCADE;
DROP TYPE IF EXISTS rentschedulefrequency CASCADE;
DROP TYPE IF EXISTS rentschedulestatus CASCADE;
DROP TYPE IF EXISTS invoicetype CASCADE;
DROP TYPE IF EXISTS invoicestatus CASCADE;
DROP TYPE IF EXISTS paymentmethod CASCADE;
DROP TYPE IF EXISTS paymentchannel CASCADE;
DROP TYPE IF EXISTS paymentstatus CASCADE;
DROP TYPE IF EXISTS expensecategory CASCADE;
DROP TYPE IF EXISTS expensestatus CASCADE;
DROP TYPE IF EXISTS maintenancecategory CASCADE;
DROP TYPE IF EXISTS maintenancepriority CASCADE;
DROP TYPE IF EXISTS maintenancestatus CASCADE;
DROP TYPE IF EXISTS workerspecialization CASCADE;
DROP TYPE IF EXISTS complaintcategory CASCADE;
DROP TYPE IF EXISTS complaintpriority CASCADE;
DROP TYPE IF EXISTS complaintstatus CASCADE;

-- =============================================================================
-- STEP 2: CREATE ENUMS
-- =============================================================================
CREATE TYPE userrole AS ENUM ('SYSTEM_ADMIN', 'LANDLORD', 'TENANT');
CREATE TYPE userstatus AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED', 'DEACTIVATED');
CREATE TYPE userlanguage AS ENUM ('EN', 'RW', 'FR');
CREATE TYPE businesstype AS ENUM ('INDIVIDUAL', 'COMPANY');
CREATE TYPE verificationstatus AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE propertytype AS ENUM ('APARTMENT', 'HOUSE', 'COMMERCIAL', 'OFFICE', 'MIXED_USE', 'ROOM', 'OTHER');
CREATE TYPE propertystatus AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED', 'MAINTENANCE');
CREATE TYPE unitstatus AS ENUM ('VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED', 'INACTIVE', 'UNDER_REPAIR');
CREATE TYPE tenancystatus AS ENUM ('INVITED', 'PENDING', 'ACTIVE', 'ENDED', 'TERMINATED');
CREATE TYPE leasestatus AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'TERMINATED');
CREATE TYPE invitationstatus AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE notificationchannel AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WHATSAPP');
CREATE TYPE notificationpriority AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE notificationcategory AS ENUM ('LEASE_EXPIRY', 'PAYMENT', 'MAINTENANCE', 'COMPLAINT', 'SYSTEM');
CREATE TYPE notificationstatus AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ', 'SKIPPED');
CREATE TYPE notificationtype AS ENUM (
    'MAINTENANCE_CREATED', 'MAINTENANCE_ACKNOWLEDGED', 'MAINTENANCE_SCHEDULED',
    'MAINTENANCE_RESOLVED', 'MAINTENANCE_REOPENED', 'MAINTENANCE_CLOSED',
    'COMPLAINT_CREATED', 'COMPLAINT_UPDATED', 'COMPLAINT_RESOLVED',
    'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'INVOICE_CREATED', 'INVOICE_OVERDUE',
    'LEASE_EXPIRING', 'LEASE_EXPIRY_30D', 'LEASE_EXPIRY_14D', 'LEASE_EXPIRY_7D',
    'LEASE_EXPIRY_3D', 'LEASE_EXPIRY_2D', 'LEASE_EXPIRY_1D', 'LEASE_EXPIRY_TODAY',
    'LEASE_EXPIRED', 'SYSTEM'
);
CREATE TYPE rentschedulefrequency AS ENUM ('MONTHLY', 'WEEKLY', 'QUARTERLY', 'YEARLY');
CREATE TYPE rentschedulestatus AS ENUM ('ACTIVE', 'INACTIVE', 'PAUSED');
CREATE TYPE invoicetype AS ENUM ('RENT', 'OTHER');
CREATE TYPE invoicestatus AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE paymentmethod AS ENUM ('MOBILE_MONEY', 'BANK', 'CARD', 'CASH', 'OTHER');
CREATE TYPE paymentchannel AS ENUM ('ONLINE', 'OFFLINE');
CREATE TYPE paymentstatus AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED', 'AWAITING_VERIFICATION');
CREATE TYPE expensecategory AS ENUM ('MAINTENANCE', 'UTILITIES', 'TAX', 'INSURANCE', 'SECURITY', 'CLEANING', 'STAFF', 'OTHER');
CREATE TYPE expensestatus AS ENUM ('RECORDED', 'CANCELLED');
CREATE TYPE maintenancecategory AS ENUM ('PLUMBING', 'ELECTRICAL', 'WATER', 'HEATING_COOLING', 'STRUCTURAL', 'APPLIANCE', 'SECURITY', 'CLEANING', 'INTERNET', 'OTHER');
CREATE TYPE maintenancepriority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE maintenancestatus AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'SCHEDULED', 'RESOLVED', 'REOPENED', 'CLOSED', 'REJECTED', 'CANCELLED');
CREATE TYPE workerspecialization AS ENUM ('PLUMBER', 'ELECTRICIAN', 'CARPENTER', 'CLEANER', 'SECURITY', 'GENERAL', 'OTHER');
CREATE TYPE complaintcategory AS ENUM ('NOISE', 'NEIGHBOR', 'PROPERTY_CONDITION', 'LANDLORD_SERVICE', 'SECURITY', 'UTILITY', 'PAYMENT', 'LEASE', 'OTHER');
CREATE TYPE complaintpriority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE complaintstatus AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED', 'REJECTED');

-- =============================================================================
-- STEP 3: CREATE ALL 31 TABLES & INDEXES
-- =============================================================================

-- 1. users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    role userrole NOT NULL DEFAULT 'TENANT',
    language userlanguage NOT NULL DEFAULT 'EN',
    status userstatus NOT NULL DEFAULT 'ACTIVE',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- 2. landlord_profiles
CREATE TABLE landlord_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    business_type businesstype NOT NULL DEFAULT 'INDIVIDUAL',
    business_name VARCHAR(255),
    tax_identifier VARCHAR(100),
    address VARCHAR(255),
    district VARCHAR(100),
    city VARCHAR(100) DEFAULT 'Kigali',
    country VARCHAR(100) DEFAULT 'Rwanda',
    verification_status verificationstatus NOT NULL DEFAULT 'VERIFIED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_landlord_profiles_user_id ON landlord_profiles(user_id);

-- 3. tenant_profiles
CREATE TABLE tenant_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    national_id VARCHAR(50),
    occupation VARCHAR(100),
    emergency_name VARCHAR(100),
    emergency_phone VARCHAR(50),
    verification_status verificationstatus NOT NULL DEFAULT 'VERIFIED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tenant_profiles_user_id ON tenant_profiles(user_id);

-- 4. properties
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    property_type propertytype NOT NULL DEFAULT 'COMMERCIAL',
    description TEXT,
    address VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL DEFAULT 'Nyarugenge',
    sector VARCHAR(100) DEFAULT 'Nyarugenge',
    cell VARCHAR(100),
    village VARCHAR(100),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    status propertystatus NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_properties_landlord_id ON properties(landlord_id);

-- 5. units
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    unit_number VARCHAR(50) NOT NULL,
    floor INTEGER DEFAULT 1,
    unit_type VARCHAR(100) DEFAULT 'Retail Shop',
    monthly_rent NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RWF',
    status unitstatus NOT NULL DEFAULT 'VACANT',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_units_property_id ON units(property_id);
CREATE INDEX idx_units_landlord_id ON units(landlord_id);

-- 6. invitations
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    tenant_email VARCHAR(255) NOT NULL,
    tenant_phone VARCHAR(50),
    token VARCHAR(255) NOT NULL UNIQUE,
    status invitationstatus NOT NULL DEFAULT 'PENDING',
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_landlord_id ON invitations(landlord_id);

-- 7. tenancies
CREATE TABLE tenancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    status tenancystatus NOT NULL DEFAULT 'ACTIVE',
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tenancies_tenant_id ON tenancies(tenant_id);
CREATE INDEX idx_tenancies_landlord_id ON tenancies(landlord_id);
CREATE INDEX idx_tenancies_unit_id ON tenancies(unit_id);

-- 8. leases
CREATE TABLE leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenancy_id UUID NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    lease_number VARCHAR(50) NOT NULL UNIQUE,
    rent_amount NUMERIC(12, 2) NOT NULL,
    deposit_amount NUMERIC(12, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'RWF',
    payment_frequency VARCHAR(50) DEFAULT 'MONTHLY',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status leasestatus NOT NULL DEFAULT 'ACTIVE',
    terms_and_conditions TEXT,
    document_url VARCHAR(500),
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_leases_tenancy_id ON leases(tenancy_id);
CREATE INDEX idx_leases_landlord_id ON leases(landlord_id);
CREATE INDEX idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX idx_leases_status ON leases(status);

-- 9. sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    device_info VARCHAR(255),
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- 10. rent_schedules
CREATE TABLE rent_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenancy_id UUID NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RWF',
    frequency rentschedulefrequency NOT NULL DEFAULT 'MONTHLY',
    due_day INTEGER NOT NULL DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE,
    next_due_date DATE NOT NULL,
    status rentschedulestatus NOT NULL DEFAULT 'ACTIVE',
    auto_invoice BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rent_schedules_lease_id ON rent_schedules(lease_id);

-- 11. invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    tenancy_id UUID REFERENCES tenancies(id) ON DELETE SET NULL,
    lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
    rent_schedule_id UUID REFERENCES rent_schedules(id) ON DELETE SET NULL,
    invoice_type invoicetype NOT NULL DEFAULT 'RENT',
    amount NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    balance NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RWF',
    status invoicestatus NOT NULL DEFAULT 'ISSUED',
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_invoices_landlord_id ON invoices(landlord_id);
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- 12. payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_reference VARCHAR(50) NOT NULL UNIQUE,
    transaction_reference VARCHAR(100),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RWF',
    payment_method paymentmethod NOT NULL DEFAULT 'MOBILE_MONEY',
    payment_channel paymentchannel NOT NULL DEFAULT 'ONLINE',
    payment_provider VARCHAR(50),
    status paymentstatus NOT NULL DEFAULT 'COMPLETED',
    payer_name VARCHAR(150),
    payer_phone VARCHAR(50),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    receipt_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_landlord_id ON payments(landlord_id);
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);

-- 13. receipts
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RWF',
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    document_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_receipts_payment_id ON receipts(payment_id);

-- 14. expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    category expensecategory NOT NULL DEFAULT 'MAINTENANCE',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RWF',
    expense_date DATE NOT NULL,
    vendor VARCHAR(150),
    receipt_url VARCHAR(500),
    status expensestatus NOT NULL DEFAULT 'RECORDED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_expenses_landlord_id ON expenses(landlord_id);

-- 15. notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notificationtype NOT NULL DEFAULT 'SYSTEM',
    category notificationcategory NOT NULL DEFAULT 'SYSTEM',
    priority notificationpriority NOT NULL DEFAULT 'MEDIUM',
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    action_label VARCHAR(100),
    action_url VARCHAR(500),
    channel notificationchannel NOT NULL DEFAULT 'IN_APP',
    status notificationstatus NOT NULL DEFAULT 'PENDING',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- 16. notification_preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    lease_expiry_in_app BOOLEAN NOT NULL DEFAULT TRUE,
    lease_expiry_email BOOLEAN NOT NULL DEFAULT TRUE,
    lease_expiry_sms BOOLEAN NOT NULL DEFAULT TRUE,
    lease_expiry_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
    payment_in_app BOOLEAN NOT NULL DEFAULT TRUE,
    payment_email BOOLEAN NOT NULL DEFAULT TRUE,
    payment_sms BOOLEAN NOT NULL DEFAULT TRUE,
    maintenance_in_app BOOLEAN NOT NULL DEFAULT TRUE,
    maintenance_email BOOLEAN NOT NULL DEFAULT TRUE,
    maintenance_sms BOOLEAN NOT NULL DEFAULT FALSE,
    marketing_email BOOLEAN NOT NULL DEFAULT FALSE,
    system_in_app BOOLEAN NOT NULL DEFAULT TRUE,
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    quiet_hours_start VARCHAR(10),
    quiet_hours_end VARCHAR(10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notification_prefs_user_id ON notification_preferences(user_id);

-- 17. notification_delivery_logs
CREATE TABLE notification_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel notificationchannel NOT NULL,
    recipient_identifier VARCHAR(255) NOT NULL,
    status notificationstatus NOT NULL DEFAULT 'SENT',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_message TEXT,
    provider_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_logs_notification_id ON notification_delivery_logs(notification_id);

-- 18. notification_templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    title_template VARCHAR(255) NOT NULL,
    body_template TEXT NOT NULL,
    action_label VARCHAR(100),
    action_url_template VARCHAR(255),
    default_priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. reminder_histories
CREATE TABLE reminder_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    milestone VARCHAR(50) NOT NULL,
    target_date DATE NOT NULL,
    notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reminder_histories_lease_id ON reminder_histories(lease_id);

-- 20. audit_logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- 21. maintenance_requests
CREATE TABLE maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) NOT NULL UNIQUE,
    tenant_id UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    tenancy_id UUID NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category maintenancecategory NOT NULL DEFAULT 'PLUMBING',
    priority maintenancepriority NOT NULL DEFAULT 'MEDIUM',
    status maintenancestatus NOT NULL DEFAULT 'SUBMITTED',
    assigned_to VARCHAR(255),
    assigned_worker_id UUID,
    scheduled_date TIMESTAMPTZ,
    scheduled_time VARCHAR(50),
    estimated_cost NUMERIC(12, 2) DEFAULT 0.0,
    actual_cost NUMERIC(12, 2) DEFAULT 0.0,
    currency VARCHAR(10) DEFAULT 'RWF',
    tenant_notes TEXT,
    landlord_notes TEXT,
    acknowledged_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    expense_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_maintenance_tenant_id ON maintenance_requests(tenant_id);
CREATE INDEX idx_maintenance_landlord_id ON maintenance_requests(landlord_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);

-- 22. maintenance_attachments
CREATE TABLE maintenance_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) DEFAULT 'image/jpeg',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23. maintenance_comments
CREATE TABLE maintenance_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 24. maintenance_workers
CREATE TABLE maintenance_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    specialization workerspecialization NOT NULL DEFAULT 'GENERAL',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_maintenance_workers_landlord ON maintenance_workers(landlord_id);

-- 25. complaints
CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_number VARCHAR(50) NOT NULL UNIQUE,
    tenant_id UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    tenancy_id UUID REFERENCES tenancies(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category complaintcategory NOT NULL DEFAULT 'OTHER',
    priority complaintpriority NOT NULL DEFAULT 'MEDIUM',
    status complaintstatus NOT NULL DEFAULT 'SUBMITTED',
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_complaints_tenant_id ON complaints(tenant_id);
CREATE INDEX idx_complaints_landlord_id ON complaints(landlord_id);
CREATE INDEX idx_complaints_status ON complaints(status);

-- 26. complaint_comments
CREATE TABLE complaint_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 27. messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    related_entity_id UUID,
    related_entity_type VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);

-- 28. bank_accounts
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'RWF',
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bank_accounts_landlord_id ON bank_accounts(landlord_id);

-- 29. bank_statements
CREATE TABLE bank_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL DEFAULT 'CSV',
    file_size INTEGER NOT NULL DEFAULT 0,
    period_start DATE,
    period_end DATE,
    total_transactions_count INTEGER NOT NULL DEFAULT 0,
    matched_count INTEGER NOT NULL DEFAULT 0,
    unmatched_count INTEGER NOT NULL DEFAULT 0,
    duplicate_count INTEGER NOT NULL DEFAULT 0,
    total_incoming_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.0,
    matched_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.0,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    notes TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bank_statements_landlord_id ON bank_statements(landlord_id);

-- 30. bank_transactions
CREATE TABLE bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    transaction_reference VARCHAR(120),
    transaction_date DATE NOT NULL,
    transaction_time VARCHAR(30),
    amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'RWF',
    is_credit BOOLEAN NOT NULL DEFAULT TRUE,
    payer_name VARCHAR(200),
    payer_account VARCHAR(100),
    description TEXT NOT NULL,
    raw_text TEXT,
    matching_status VARCHAR(50) NOT NULL DEFAULT 'UNMATCHED',
    confidence_score FLOAT NOT NULL DEFAULT 0.0,
    matched_tenant_id UUID REFERENCES tenant_profiles(id) ON DELETE SET NULL,
    matched_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    matched_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    match_method VARCHAR(60),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bank_trans_statement_id ON bank_transactions(statement_id);
CREATE INDEX idx_bank_trans_landlord_id ON bank_transactions(landlord_id);

-- 31. payment_matches
CREATE TABLE payment_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
    statement_id UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    matched_amount NUMERIC(14, 2) NOT NULL,
    confidence VARCHAR(20) NOT NULL DEFAULT 'HIGH',
    confidence_score FLOAT NOT NULL DEFAULT 1.0,
    matching_signals TEXT,
    review_status VARCHAR(30) NOT NULL DEFAULT 'AUTO_CONFIRMED',
    confirmed_by UUID,
    confirmed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payment_matches_trans_id ON payment_matches(transaction_id);
CREATE INDEX idx_payment_matches_landlord ON payment_matches(landlord_id);

-- =============================================================================
-- STEP 4: DATABASE FUNCTIONS & TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
          AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_update_%I_modtime ON %I', t, t);
        EXECUTE format('CREATE TRIGGER trg_update_%I_modtime BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END;
$$;

-- =============================================================================
-- STEP 5: ROW LEVEL SECURITY (RLS) & POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_matches ENABLE ROW LEVEL SECURITY;

-- Grant Full Access to Service Role and Authenticated Users for App Functionality
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "service_role_full_access" ON %I', tbl);
        EXECUTE format('CREATE POLICY "service_role_full_access" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl);
        
        EXECUTE format('DROP POLICY IF EXISTS "allow_authenticated_all" ON %I', tbl);
        EXECUTE format('CREATE POLICY "allow_authenticated_all" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
        
        EXECUTE format('DROP POLICY IF EXISTS "allow_anon_read" ON %I', tbl);
        EXECUTE format('CREATE POLICY "allow_anon_read" ON %I FOR SELECT TO anon USING (true)', tbl);
    END LOOP;
END;
$$;

-- =============================================================================
-- STEP 6: STORAGE BUCKETS
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('notify-documents', 'notify-documents', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
    ('notify-avatars', 'notify-avatars', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('notify-property-images', 'notify-property-images', true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read notify-documents" ON storage.objects;
    DROP POLICY IF EXISTS "Public Read notify-avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Public Read notify-property-images" ON storage.objects;
    DROP POLICY IF EXISTS "Auth Upload notify-documents" ON storage.objects;
    DROP POLICY IF EXISTS "Auth Upload notify-avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Auth Upload notify-property-images" ON storage.objects;

    CREATE POLICY "Public Read notify-documents" ON storage.objects FOR SELECT USING (bucket_id = 'notify-documents');
    CREATE POLICY "Public Read notify-avatars" ON storage.objects FOR SELECT USING (bucket_id = 'notify-avatars');
    CREATE POLICY "Public Read notify-property-images" ON storage.objects FOR SELECT USING (bucket_id = 'notify-property-images');

    CREATE POLICY "Auth Upload notify-documents" ON storage.objects FOR INSERT TO authenticated, service_role WITH CHECK (bucket_id = 'notify-documents');
    CREATE POLICY "Auth Upload notify-avatars" ON storage.objects FOR INSERT TO authenticated, service_role WITH CHECK (bucket_id = 'notify-avatars');
    CREATE POLICY "Auth Upload notify-property-images" ON storage.objects FOR INSERT TO authenticated, service_role WITH CHECK (bucket_id = 'notify-property-images');
EXCEPTION WHEN OTHERS THEN
    NULL;
END;
$$;

-- =============================================================================
-- STEP 7: SEED DATA INSERTION
-- =============================================================================


-- Seed Data: users (6 records)
INSERT INTO users (id, email, phone, password_hash, first_name, last_name, avatar_url, role, language, status, email_verified, phone_verified, last_login_at, created_at, updated_at) VALUES
    ('ea7febe0-24b1-4043-85cf-192af944a04f', 'admin@notify.test', '+250788000001', '$argon2id$v=19$m=65536,t=3,p=4$eG+tdS7lPCckpNQaYwyhtA$rQGGDs2Ukx4R5TE8OH+jdHUcSyCMRGeVH96Ezsn7j8o', 'System', 'Administrator', NULL, 'SYSTEM_ADMIN', 'EN', 'ACTIVE', FALSE, FALSE, NULL, '2026-09-04 14:49:04.850253', '2026-09-05 09:42:02.884082'),
    ('42944a92-b7dd-4cf1-a920-4a4982a5e754', 'landlord@notify.test', '+250788111333', '$argon2id$v=19$m=65536,t=3,p=4$eE+JcU6J8R7jPKd0zjnn3A$3VdhXVV5msOOhEbLKaRogI4g8aHZoCOJc++Sbv3h+w0', 'Jean', 'Habimana', NULL, 'LANDLORD', 'EN', 'ACTIVE', FALSE, FALSE, '2026-09-05 10:43:21.421014', '2026-09-04 14:49:04.850258', '2026-09-05 10:43:21.429505'),
    ('507ba19b-de5f-4bd4-8b1d-e4776e7fe97f', 'landlord2@notify.test', '+250788333444', '$argon2id$v=19$m=65536,t=3,p=4$UorxvjdGCIGwlrI2phQiRA$lJmMtfbL/4IyR7owAGofwV2NZL1Zmbbcg+bjtsdhSz0', 'Claire', 'Uwase', NULL, 'LANDLORD', 'FR', 'ACTIVE', FALSE, FALSE, NULL, '2026-09-04 14:49:04.850260', '2026-09-05 09:42:02.884079'),
    ('89302b08-b7f7-4808-87ef-ebb8a3437816', 'tenant@notify.test', '+250788555666', '$argon2id$v=19$m=65536,t=3,p=4$bY0RImQMobQ25vwfA8A4hw$gPLcMt4fzmoFXfLKY1gbdEfZVgpODP5rFr2Tb1yKg7Y', 'Emma', 'Ndayishimiye', NULL, 'TENANT', 'EN', 'ACTIVE', FALSE, FALSE, '2026-09-04 18:13:26.600539', '2026-09-04 14:49:04.850262', '2026-09-05 09:42:02.884081'),
    ('6dd1cc71-454c-48ae-a82d-8e710346da91', 'tenant2@notify.test', '+250788777888', '$argon2id$v=19$m=65536,t=3,p=4$B6B0TiklxPhfKyXEeC9lDA$OE/yHPwp0TE02o8xzTqMvt7Vs/eY2TjVezNqD3fPaYc', 'Marie-Rose', 'Mutesi', NULL, 'TENANT', 'FR', 'ACTIVE', FALSE, FALSE, NULL, '2026-09-04 14:49:04.850263', '2026-09-05 09:42:02.884080'),
    ('c4e26dfe-5f9a-4c83-b5f3-7d1f329e10ca', 'tenant3@notify.test', '+250788999000', '$argon2id$v=19$m=65536,t=3,p=4$T6k1Zuxdi3EuZax1LmWsdQ$JP9kEyj1fbQBpWn9o4fFAzsHsSv/Vt3qcu9/rxRMerQ', 'David', 'Mugisha', NULL, 'TENANT', 'EN', 'ACTIVE', FALSE, FALSE, NULL, '2026-09-04 14:49:04.850265', '2026-09-05 09:42:02.884082')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: landlord_profiles (2 records)
INSERT INTO landlord_profiles (id, user_id, business_type, business_name, tax_identifier, address, district, city, country, verification_status, created_at, updated_at) VALUES
    ('c07af1fb-0ced-4166-9052-df6203fb366c', '42944a92-b7dd-4cf1-a920-4a4982a5e754', 'INDIVIDUAL', '', '', '', 'Nyarugenge', 'Kigali', 'Rwanda', 'VERIFIED', '2026-09-04 14:49:04.876130', '2026-09-04 17:12:43.431868'),
    ('988a0648-723d-4bda-ad4f-c48d2bb1b8c5', '507ba19b-de5f-4bd4-8b1d-e4776e7fe97f', 'INDIVIDUAL', 'Uwase Prime Holdings', '987654321', 'KG 11 Ave, Business Zone', 'Gasabo', 'Kigali', 'Rwanda', 'VERIFIED', '2026-09-04 14:49:04.876150', '2026-09-04 14:49:04.876154')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: tenant_profiles (3 records)
INSERT INTO tenant_profiles (id, user_id, national_id, occupation, emergency_name, emergency_phone, verification_status, created_at, updated_at) VALUES
    ('95f0a97c-0aec-4eab-b95d-f29cca175849', '89302b08-b7f7-4808-87ef-ebb8a3437816', '1199880011223344', 'IT Director - TechAfrica Ltd', 'Sarah Ndayishimiye', '+250788555777', 'VERIFIED', '2026-09-04 14:49:04.889558', '2026-09-04 14:49:04.889568'),
    ('adc3fb45-f484-44d3-a710-dad74d8c8c71', '6dd1cc71-454c-48ae-a82d-8e710346da91', '1199770022334455', 'Founder - Kigali Fashion Hub', 'Patrick Mutesi', '+250788777999', 'VERIFIED', '2026-09-04 14:49:04.889575', '2026-09-04 14:49:04.889578'),
    ('e669077b-18b8-40e3-a0ab-bd2e04a16adc', 'c4e26dfe-5f9a-4c83-b5f3-7d1f329e10ca', '1199660033445566', 'Operations Manager - EA Logistics', 'Alice Mugisha', '+250788999111', 'VERIFIED', '2026-09-04 14:49:04.889582', '2026-09-04 14:49:04.889584')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: properties (4 records)
INSERT INTO properties (id, landlord_id, name, property_type, description, address, district, sector, cell, village, latitude, longitude, status, created_at, updated_at) VALUES
    ('1c09de3a-bbb0-4d45-a498-959e6c83020b', 'c07af1fb-0ced-4166-9052-df6203fb366c', 'Kigali Commercial Center', 'COMMERCIAL', 'Modern 5-story commercial complex in Kigali CBD with high foot traffic, backup generators, and fiber connectivity.', 'KN 4 Ave, CBD', 'Nyarugenge', 'Nyarugenge', NULL, NULL, NULL, NULL, 'ACTIVE', '2026-09-04 14:49:04.902223', '2026-09-04 14:49:04.902231'),
    ('a1ac65e0-2e20-49b7-aa69-063df75cfffe', '988a0648-723d-4bda-ad4f-c48d2bb1b8c5', 'Remera Business Park', 'COMMERCIAL', 'Premier tech and corporate office hub located near Remera round-about.', 'KG 11 Ave, Remera', 'Gasabo', 'Remera', NULL, NULL, NULL, NULL, 'ACTIVE', '2026-09-04 14:49:04.902236', '2026-09-04 14:49:04.902240'),
    ('1b6af059-8587-4b2b-9511-c58f64893b2c', 'c07af1fb-0ced-4166-9052-df6203fb366c', 'M Peace Plaza', 'MIXED_USE', 'Main building.', 'KK 24', 'Gasabo', 'Town', NULL, NULL, NULL, NULL, 'ACTIVE', '2026-09-05 10:32:31.288355', '2026-09-05 10:32:31.288389'),
    ('37f3c480-a15e-43dc-95b3-81d34a9038e5', 'c07af1fb-0ced-4166-9052-df6203fb366c', 'M Peace Plaza', 'MIXED_USE', 'New houses.', 'KK 32', 'Gasabo', 'Town', NULL, NULL, NULL, NULL, 'ACTIVE', '2026-09-05 10:44:04.456624', '2026-09-05 10:44:04.456639')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: units (4 records)
INSERT INTO units (id, property_id, landlord_id, unit_number, floor, unit_type, monthly_rent, currency, status, description, created_at, updated_at) VALUES
    ('e597e6f9-a954-45c5-9caf-bbec295d8d34', '1c09de3a-bbb0-4d45-a498-959e6c83020b', 'c07af1fb-0ced-4166-9052-df6203fb366c', 'Suite 101', 1, 'Corporate Office Space', 1500000, 'RWF', 'OCCUPIED', '120 sqm open-plan office space with private boardroom and kitchenette.', '2026-09-04 14:49:04.908993', '2026-09-04 14:49:04.908999'),
    ('853f7e0f-9d3b-4a26-81c7-0f4dd5f0e07f', '1c09de3a-bbb0-4d45-a498-959e6c83020b', 'c07af1fb-0ced-4166-9052-df6203fb366c', 'Boutique 102', 1, 'Ground Retail Store', 1200000, 'RWF', 'OCCUPIED', '80 sqm premium glass-front retail boutique on main boulevard.', '2026-09-04 14:49:04.909003', '2026-09-04 14:49:04.909005'),
    ('1508bcd4-d065-433c-aae2-baa4c8366a18', '1c09de3a-bbb0-4d45-a498-959e6c83020b', 'c07af1fb-0ced-4166-9052-df6203fb366c', 'Suite 201', 2, 'Executive Suite', 2200000, 'RWF', 'VACANT', '180 sqm corner penthouse office with panoramic city views.', '2026-09-04 14:49:04.909007', '2026-09-04 14:49:04.909009'),
    ('e0eb54e7-f463-415a-9061-cf77c2ee6767', 'a1ac65e0-2e20-49b7-aa69-063df75cfffe', '988a0648-723d-4bda-ad4f-c48d2bb1b8c5', 'Office A-01', 1, 'Tech Office Suite', 850000, 'RWF', 'OCCUPIED', '75 sqm air-conditioned tech suite with high-speed internet infrastructure.', '2026-09-04 14:49:04.909011', '2026-09-04 14:49:04.909013')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: tenancies (3 records)
INSERT INTO tenancies (id, tenant_id, landlord_id, property_id, unit_id, status, start_date, end_date, created_at, updated_at) VALUES
    ('58c15264-94e5-41fa-a8e8-ed975bf941de', '95f0a97c-0aec-4eab-b95d-f29cca175849', 'c07af1fb-0ced-4166-9052-df6203fb366c', '1c09de3a-bbb0-4d45-a498-959e6c83020b', 'e597e6f9-a954-45c5-9caf-bbec295d8d34', 'ACTIVE', '2025-01-01', '2027-01-01', '2026-09-04 14:49:04.917602', '2026-09-04 14:49:04.917609'),
    ('fa72d077-64c1-4546-b557-5b841d8e6fe3', 'adc3fb45-f484-44d3-a710-dad74d8c8c71', 'c07af1fb-0ced-4166-9052-df6203fb366c', '1c09de3a-bbb0-4d45-a498-959e6c83020b', '853f7e0f-9d3b-4a26-81c7-0f4dd5f0e07f', 'ACTIVE', '2025-03-01', '2026-03-01', '2026-09-04 14:49:04.917613', '2026-09-04 14:49:04.917616'),
    ('bf8ddb0b-a769-4d3b-b8db-c16c3250ad11', 'e669077b-18b8-40e3-a0ab-bd2e04a16adc', '988a0648-723d-4bda-ad4f-c48d2bb1b8c5', 'a1ac65e0-2e20-49b7-aa69-063df75cfffe', 'e0eb54e7-f463-415a-9061-cf77c2ee6767', 'ACTIVE', '2025-06-01', '2026-06-01', '2026-09-04 14:49:04.917619', '2026-09-04 14:49:04.917621')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: leases (3 records)
INSERT INTO leases (id, tenancy_id, landlord_id, tenant_id, property_id, unit_id, start_date, end_date, monthly_rent, security_deposit, payment_due_day, late_fee, currency, status, notes, document_id, created_at, updated_at) VALUES
    ('d4e0b010-a30b-4e3d-9f66-4fd1d3a4823c', '58c15264-94e5-41fa-a8e8-ed975bf941de', 'c07af1fb-0ced-4166-9052-df6203fb366c', '95f0a97c-0aec-4eab-b95d-f29cca175849', '1c09de3a-bbb0-4d45-a498-959e6c83020b', 'e597e6f9-a954-45c5-9caf-bbec295d8d34', '2025-01-01', '2027-01-01', 1500000, 3000000, 5, 50000, 'RWF', 'ACTIVE', '2-year commercial lease agreement with annual inflation adjustment clause.', NULL, '2026-09-04 14:49:04.922235', '2026-09-04 14:49:04.922241'),
    ('5f4d4ab2-9413-4192-ba00-5ca54155d949', 'fa72d077-64c1-4546-b557-5b841d8e6fe3', 'c07af1fb-0ced-4166-9052-df6203fb366c', 'adc3fb45-f484-44d3-a710-dad74d8c8c71', '1c09de3a-bbb0-4d45-a498-959e6c83020b', '853f7e0f-9d3b-4a26-81c7-0f4dd5f0e07f', '2025-03-01', '2026-03-01', 1200000, 2400000, 1, 40000, 'RWF', 'EXPIRED', 'Standard 12-month commercial retail lease.', NULL, '2026-09-04 14:49:04.922245', '2026-09-04 17:12:07.589368'),
    ('596950ae-cd4d-4a29-8684-2d4c3934f941', 'bf8ddb0b-a769-4d3b-b8db-c16c3250ad11', '988a0648-723d-4bda-ad4f-c48d2bb1b8c5', 'e669077b-18b8-40e3-a0ab-bd2e04a16adc', 'a1ac65e0-2e20-49b7-aa69-063df75cfffe', 'e0eb54e7-f463-415a-9061-cf77c2ee6767', '2025-06-01', '2026-06-01', 850000, 1700000, 5, 25000, 'RWF', 'ACTIVE', 'Commercial lease agreement with options for extension.', NULL, '2026-09-04 14:49:04.922249', '2026-09-04 14:49:04.922251')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: invoices (3 records)
INSERT INTO invoices (id, invoice_number, landlord_id, tenant_id, property_id, unit_id, tenancy_id, lease_id, invoice_type, billing_period_start, billing_period_end, issue_date, due_date, subtotal, discount, late_fee, total_amount, amount_paid, balance_due, currency, status, created_at, updated_at) VALUES
    ('a6ad6b81-5dbe-4b35-8107-175802360e44', 'INV-2026-0901', 'c07af1fb-0ced-4166-9052-df6203fb366c', '95f0a97c-0aec-4eab-b95d-f29cca175849', '1c09de3a-bbb0-4d45-a498-959e6c83020b', 'e597e6f9-a954-45c5-9caf-bbec295d8d34', '58c15264-94e5-41fa-a8e8-ed975bf941de', 'd4e0b010-a30b-4e3d-9f66-4fd1d3a4823c', 'RENT', '2026-09-01', '2026-09-30', '2026-09-01', '2026-09-05', 1500000, 0, 0, 1500000, 1500000, 0, 'RWF', 'PAID', '2026-09-04 14:49:04.927994', '2026-09-04 14:49:04.927998'),
    ('255cbcbf-5a57-4c31-8f15-1bab15ed3323', 'INV-2026-0902', 'c07af1fb-0ced-4166-9052-df6203fb366c', 'adc3fb45-f484-44d3-a710-dad74d8c8c71', '1c09de3a-bbb0-4d45-a498-959e6c83020b', '853f7e0f-9d3b-4a26-81c7-0f4dd5f0e07f', 'fa72d077-64c1-4546-b557-5b841d8e6fe3', '5f4d4ab2-9413-4192-ba00-5ca54155d949', 'RENT', '2026-09-01', '2026-09-30', '2026-09-01', '2026-09-01', 1200000, 0, 0, 1200000, 1200000, 0, 'RWF', 'PAID', '2026-09-04 14:49:04.928000', '2026-09-04 14:49:04.928001'),
    ('f7602f74-200d-48f9-9b7e-5184780b21ad', 'INV-2026-0903', '988a0648-723d-4bda-ad4f-c48d2bb1b8c5', 'e669077b-18b8-40e3-a0ab-bd2e04a16adc', 'a1ac65e0-2e20-49b7-aa69-063df75cfffe', 'e0eb54e7-f463-415a-9061-cf77c2ee6767', 'bf8ddb0b-a769-4d3b-b8db-c16c3250ad11', '596950ae-cd4d-4a29-8684-2d4c3934f941', 'RENT', '2026-09-01', '2026-09-30', '2026-09-01', '2026-09-05', 850000, 0, 0, 850000, 0, 850000, 'RWF', 'ISSUED', '2026-09-04 14:49:04.928002', '2026-09-04 14:49:04.928003')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: payments (2 records)
INSERT INTO payments (id, payment_reference, transaction_reference, invoice_id, tenancy_id, lease_id, landlord_id, tenant_id, property_id, unit_id, amount, currency, payment_method, payment_channel, status, paid_at, verified_at, verified_by, notes, created_at, updated_at) VALUES
    ('239d50bb-dfc7-44e1-94d9-e22edf6d8449', 'PAY-MTN-998822', 'MTN-MOMO-20260902-8812', 'a6ad6b81-5dbe-4b35-8107-175802360e44', '58c15264-94e5-41fa-a8e8-ed975bf941de', 'd4e0b010-a30b-4e3d-9f66-4fd1d3a4823c', 'c07af1fb-0ced-4166-9052-df6203fb366c', '95f0a97c-0aec-4eab-b95d-f29cca175849', '1c09de3a-bbb0-4d45-a498-959e6c83020b', 'e597e6f9-a954-45c5-9caf-bbec295d8d34', 1500000, 'RWF', 'MOBILE_MONEY', 'ONLINE', 'COMPLETED', '2026-09-02 10:15:00.000000', NULL, NULL, 'Paid via MTN MoMo Pay', '2026-09-04 14:49:04.934408', '2026-09-04 14:49:04.934414'),
    ('0f316dd9-5e2e-4e6a-9ec8-ad52916f4250', 'PAY-BK-771122', 'BK-FT-20260901-4412', '255cbcbf-5a57-4c31-8f15-1bab15ed3323', 'fa72d077-64c1-4546-b557-5b841d8e6fe3', '5f4d4ab2-9413-4192-ba00-5ca54155d949', 'c07af1fb-0ced-4166-9052-df6203fb366c', 'adc3fb45-f484-44d3-a710-dad74d8c8c71', '1c09de3a-bbb0-4d45-a498-959e6c83020b', '853f7e0f-9d3b-4a26-81c7-0f4dd5f0e07f', 1200000, 'RWF', 'BANK', 'ONLINE', 'COMPLETED', '2026-09-01 14:30:00.000000', NULL, NULL, 'Paid via Bank of Kigali Direct Transfer', '2026-09-04 14:49:04.934417', '2026-09-04 14:49:04.934419')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: receipts (2 records)
INSERT INTO receipts (id, receipt_number, payment_id, invoice_id, tenant_id, landlord_id, property_id, unit_id, amount, currency, issued_at, created_at) VALUES
    ('491606cf-71c0-4daf-9a8e-6fbe3635dda8', 'REC-2026-0901', '239d50bb-dfc7-44e1-94d9-e22edf6d8449', 'a6ad6b81-5dbe-4b35-8107-175802360e44', '95f0a97c-0aec-4eab-b95d-f29cca175849', 'c07af1fb-0ced-4166-9052-df6203fb366c', '1c09de3a-bbb0-4d45-a498-959e6c83020b', 'e597e6f9-a954-45c5-9caf-bbec295d8d34', 1500000, 'RWF', '2026-09-02 10:16:00.000000', '2026-09-04 14:49:04.936847'),
    ('5a77d9e5-085d-4a6d-a143-0a8cdf0b8039', 'REC-2026-0902', '0f316dd9-5e2e-4e6a-9ec8-ad52916f4250', '255cbcbf-5a57-4c31-8f15-1bab15ed3323', 'adc3fb45-f484-44d3-a710-dad74d8c8c71', 'c07af1fb-0ced-4166-9052-df6203fb366c', '1c09de3a-bbb0-4d45-a498-959e6c83020b', '853f7e0f-9d3b-4a26-81c7-0f4dd5f0e07f', 1200000, 'RWF', '2026-09-01 14:31:00.000000', '2026-09-04 14:49:04.936851')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: expenses (2 records)
INSERT INTO expenses (id, landlord_id, property_id, unit_id, category, description, amount, currency, expense_date, vendor, reference, status, created_at, updated_at) VALUES
    ('4b50848e-f1bc-4567-81b9-bf5c362e2c2a', 'c07af1fb-0ced-4166-9052-df6203fb366c', '1c09de3a-bbb0-4d45-a498-959e6c83020b', NULL, 'UTILITIES', 'Backup Generator Diesel Fuel Purchase - 200 Liters for Kigali Commercial Center', 280000, 'RWF', '2026-08-25', 'SP Petroleum Kigali', 'SP-REC-9088', 'RECORDED', '2026-09-04 14:49:04.974106', '2026-09-04 14:49:04.974121'),
    ('1ee6a94b-83e2-4873-82f7-614ed17612a5', 'c07af1fb-0ced-4166-9052-df6203fb366c', '1c09de3a-bbb0-4d45-a498-959e6c83020b', NULL, 'SECURITY', '24/7 Commercial Security Guarding Services for Kigali Heights building', 450000, 'RWF', '2026-08-30', 'ISCO Security Rwanda', 'ISCO-INV-4412', 'RECORDED', '2026-09-04 14:49:04.974133', '2026-09-04 14:49:04.974141')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: maintenance_requests (2 records)
INSERT INTO maintenance_requests (id, request_number, tenant_id, landlord_id, property_id, unit_id, tenancy_id, title, description, category, priority, status, assigned_to, assigned_worker_id, scheduled_date, scheduled_time, estimated_cost, actual_cost, currency, tenant_notes, landlord_notes, acknowledged_at, scheduled_at, resolved_at, closed_at, expense_id, created_at, updated_at) VALUES
    ('85e53929-f371-4fb9-a920-2988708f324a', 'MR-2026-001', '95f0a97c-0aec-4eab-b95d-f29cca175849', 'c07af1fb-0ced-4166-9052-df6203fb366c', '1c09de3a-bbb0-4d45-a498-959e6c83020b', 'e597e6f9-a954-45c5-9caf-bbec295d8d34', '58c15264-94e5-41fa-a8e8-ed975bf941de', 'Water pressure drop in Suite 101 restroom', 'The water pressure in executive restroom sink has dropped significantly over the past 2 days.', 'PLUMBING', 'MEDIUM', 'IN_PROGRESS', 'Kigali Plumbing Solutions', NULL, NULL, NULL, 35000.0, 0.0, 'RWF', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-04 14:49:05.000864', '2026-09-04 14:49:05.000876'),
    ('0d121e8a-a216-4588-b6f6-03bf165c09d5', 'MR-2026-002', 'adc3fb45-f484-44d3-a710-dad74d8c8c71', 'c07af1fb-0ced-4166-9052-df6203fb366c', '1c09de3a-bbb0-4d45-a498-959e6c83020b', '853f7e0f-9d3b-4a26-81c7-0f4dd5f0e07f', 'fa72d077-64c1-4546-b557-5b841d8e6fe3', 'HVAC Air Conditioning Filter Cleaning', 'Routine air conditioning unit filter cleaning and coil servicing for ground retail boutique.', 'HEATING_COOLING', 'LOW', 'RESOLVED', 'CoolAir Tech Rwanda', NULL, NULL, NULL, 25000.0, 25000.0, 'RWF', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-04 14:49:05.010003', '2026-09-04 14:49:05.010008')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: complaints (1 records)
INSERT INTO complaints (id, complaint_number, tenant_id, landlord_id, property_id, unit_id, tenancy_id, subject, description, category, priority, status, landlord_response, attachment_path, acknowledged_at, resolved_at, closed_at, created_at, updated_at) VALUES
    ('c219856e-022c-43ba-be57-9d396a2a3eca', 'CMP-2026-001', '95f0a97c-0aec-4eab-b95d-f29cca175849', 'c07af1fb-0ced-4166-9052-df6203fb366c', '1c09de3a-bbb0-4d45-a498-959e6c83020b', 'e597e6f9-a954-45c5-9caf-bbec295d8d34', '58c15264-94e5-41fa-a8e8-ed975bf941de', 'Unauthorized parking blocking loading dock 2', 'An unregistered delivery vehicle was parked in reserved loading bay 2 for over 3 hours during morning offloading.', 'PROPERTY_CONDITION', 'MEDIUM', 'UNDER_REVIEW', NULL, NULL, NULL, NULL, NULL, '2026-09-04 14:49:04.940233', '2026-09-04 14:49:04.940237')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: messages (2 records)
INSERT INTO messages (id, sender_id, recipient_id, sender_role, property_id, unit_id, tenancy_id, message_type, content, attachment_url, attachment_name, attachment_size, maintenance_request_id, is_read, read_at, created_at, updated_at) VALUES
    ('c00fedd2-c194-4cf0-822f-017aaeeaec2f', '89302b08-b7f7-4808-87ef-ebb8a3437816', '42944a92-b7dd-4cf1-a920-4a4982a5e754', 'TENANT', '1c09de3a-bbb0-4d45-a498-959e6c83020b', NULL, NULL, 'GENERAL', 'Hello Jean-Paul, I have completed the rent payment for Suite 101 via MTN MoMo. Please confirm receipt. Thank you!', NULL, NULL, 0, NULL, TRUE, NULL, '2026-09-04 14:49:05.018200', '2026-09-04 14:49:05.018209'),
    ('4af3d64f-26c5-4bd1-8090-2b886c1b3723', '42944a92-b7dd-4cf1-a920-4a4982a5e754', '89302b08-b7f7-4808-87ef-ebb8a3437816', 'LANDLORD', '1c09de3a-bbb0-4d45-a498-959e6c83020b', NULL, NULL, 'GENERAL', 'Hello Emmanuel, thank you for your prompt payment! The receipt REC-2026-0901 has been automatically generated in your portal.', NULL, NULL, 0, NULL, TRUE, '2026-09-04 14:58:08.840365', '2026-09-04 14:49:05.018216', '2026-09-04 14:58:08.841771')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: notifications (1 records)
INSERT INTO notifications (id, user_id, type, title, message, language, channel, status, priority, category, entity_type, entity_id, reference_type, reference_id, action_url, action_label, metadata_json, is_read, read_at, sent_at, created_at) VALUES
    ('e3cbc31a-97a4-43f7-bcdd-332cc519bc6e', '89302b08-b7f7-4808-87ef-ebb8a3437816', 'PAYMENT_RECEIVED', 'Payment Received & Receipt Generated', 'Your rent payment of 1,500,000 RWF for Suite 101 has been verified. Receipt REC-2026-0901 is available for download.', 'en', 'IN_APP', 'SENT', 'MEDIUM', 'PAYMENT', NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, NULL, NULL, '2026-09-04 14:49:05.025437')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: notification_preferences (2 records)
INSERT INTO notification_preferences (id, user_id, lease_expiry_in_app, lease_expiry_email, lease_expiry_sms, lease_expiry_whatsapp, payment_in_app, payment_email, payment_sms, payment_whatsapp, maintenance_in_app, maintenance_email, maintenance_sms, maintenance_whatsapp, complaints_in_app, complaints_email, complaints_sms, complaints_whatsapp, system_in_app, system_email, system_sms, system_whatsapp, updated_at) VALUES
    ('e1c905a2-78eb-43d9-9108-9933f7191a5a', '89302b08-b7f7-4808-87ef-ebb8a3437816', TRUE, TRUE, FALSE, FALSE, TRUE, TRUE, TRUE, 0, TRUE, TRUE, FALSE, 0, 1, 1, 0, 0, TRUE, 0, 0, 0, '2026-09-04 14:58:01.392861'),
    ('beb920fd-6138-4cfd-9fd9-eed5d3c9a41c', '42944a92-b7dd-4cf1-a920-4a4982a5e754', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 0, TRUE, TRUE, FALSE, 0, 1, 1, 0, 0, TRUE, 0, 0, 0, '2026-09-04 17:12:57.617573')
ON CONFLICT (id) DO NOTHING;


-- Seed Notification Templates
INSERT INTO notification_templates (id, code, category, title_template, body_template, action_label, action_url_template, default_priority) VALUES
    ('10000000-0000-0000-0000-000000000001', 'RENT_DUE_REMINDER', 'PAYMENT', 'Rent Payment Due', 'Hello {tenant_name}, your rent of {amount} {currency} for unit {unit_number} is due on {due_date}.', 'View Invoice', '/tenant/invoices/{invoice_id}', 'HIGH'),
    ('10000000-0000-0000-0000-000000000002', 'RENT_OVERDUE_NOTICE', 'PAYMENT', 'Urgent: Rent Payment Overdue', 'Hello {tenant_name}, your rent invoice {invoice_number} is overdue. Please settle immediately.', 'Pay Now', '/tenant/invoices/{invoice_id}', 'CRITICAL'),
    ('10000000-0000-0000-0000-000000000003', 'PAYMENT_RECEIVED', 'PAYMENT', 'Payment Received & Verified', 'Thank you! Your payment of {amount} {currency} for invoice {invoice_number} has been confirmed.', 'View Receipt', '/tenant/payments/{payment_id}', 'MEDIUM'),
    ('10000000-0000-0000-0000-000000000004', 'MAINTENANCE_STATUS_UPDATE', 'MAINTENANCE', 'Maintenance Request Update', 'Your maintenance ticket #{request_number} ({title}) status is now: {status}.', 'View Ticket', '/tenant/maintenance/{request_id}', 'MEDIUM'),
    ('10000000-0000-0000-0000-000000000005', 'LEASE_EXPIRY_30D', 'LEASE_EXPIRY', 'Lease Expiring in 30 Days', 'Your lease for unit {unit_number} expires on {end_date}. Please contact your landlord regarding renewal.', 'Review Lease', '/tenant/leases/{lease_id}', 'HIGH')
ON CONFLICT (code) DO NOTHING;

-- Seed Bank Accounts (Landlords)
INSERT INTO bank_accounts (id, landlord_id, bank_name, account_name, account_number, currency, is_primary) VALUES
    ('20000000-0000-0000-0000-000000000001', 'b3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e', 'Bank of Kigali (BK)', 'Jean Mugisha Real Estate', '00040-06945821-35', 'RWF', TRUE),
    ('20000000-0000-0000-0000-000000000002', 'c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f', 'I&M Bank Rwanda', 'Kigali Living Properties Ltd', '20015-89241002-88', 'RWF', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Seed Maintenance Workers
INSERT INTO maintenance_workers (id, landlord_id, name, phone, email, specialization, is_active) VALUES
    ('30000000-0000-0000-0000-000000000001', 'b3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e', 'Alexis Hakizimana', '+250788111222', 'alexis.plumbing@notify.test', 'PLUMBER', TRUE),
    ('30000000-0000-0000-0000-000000000002', 'b3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e', 'Claude Bizimana', '+250788333444', 'claude.electric@notify.test', 'ELECTRICIAN', TRUE)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================
SELECT table_name, (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
FROM (
  SELECT table_name, 
         query_to_xml(format('SELECT count(*) as cnt FROM %I', table_name), false, true, '') as xml_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
) counts
ORDER BY table_name;
