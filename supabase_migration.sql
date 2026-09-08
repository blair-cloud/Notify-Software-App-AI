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
-- STEP 1: CLEAN DROP EXISTING TABLES (Reverse Topological Order)
-- =============================================================================

DROP TABLE IF EXISTS payment_matches CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS bank_transactions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS rent_schedules CASCADE;
DROP TABLE IF EXISTS reminder_histories CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS maintenance_comments CASCADE;
DROP TABLE IF EXISTS maintenance_attachments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS complaint_comments CASCADE;
DROP TABLE IF EXISTS maintenance_requests CASCADE;
DROP TABLE IF EXISTS leases CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS tenancies CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS bank_statements CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS notification_delivery_logs CASCADE;
DROP TABLE IF EXISTS maintenance_workers CASCADE;
DROP TABLE IF EXISTS bank_accounts CASCADE;
DROP TABLE IF EXISTS tenant_profiles CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS landlord_profiles CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;

-- =============================================================================
-- STEP 2: DROP & RECREATE ENUMS
-- =============================================================================

DROP TYPE IF EXISTS businesstype CASCADE;
DROP TYPE IF EXISTS complaintcategory CASCADE;
DROP TYPE IF EXISTS complaintpriority CASCADE;
DROP TYPE IF EXISTS complaintstatus CASCADE;
DROP TYPE IF EXISTS expensecategory CASCADE;
DROP TYPE IF EXISTS expensestatus CASCADE;
DROP TYPE IF EXISTS invitationstatus CASCADE;
DROP TYPE IF EXISTS invoicestatus CASCADE;
DROP TYPE IF EXISTS invoicetype CASCADE;
DROP TYPE IF EXISTS leasestatus CASCADE;
DROP TYPE IF EXISTS maintenancecategory CASCADE;
DROP TYPE IF EXISTS maintenancepriority CASCADE;
DROP TYPE IF EXISTS maintenancestatus CASCADE;
DROP TYPE IF EXISTS notificationchannel CASCADE;
DROP TYPE IF EXISTS notificationstatus CASCADE;
DROP TYPE IF EXISTS paymentchannel CASCADE;
DROP TYPE IF EXISTS paymentmethod CASCADE;
DROP TYPE IF EXISTS paymentstatus CASCADE;
DROP TYPE IF EXISTS propertystatus CASCADE;
DROP TYPE IF EXISTS propertytype CASCADE;
DROP TYPE IF EXISTS rentschedulefrequency CASCADE;
DROP TYPE IF EXISTS rentschedulestatus CASCADE;
DROP TYPE IF EXISTS tenancystatus CASCADE;
DROP TYPE IF EXISTS unitstatus CASCADE;
DROP TYPE IF EXISTS userlanguage CASCADE;
DROP TYPE IF EXISTS userrole CASCADE;
DROP TYPE IF EXISTS userstatus CASCADE;
DROP TYPE IF EXISTS verificationstatus CASCADE;
DROP TYPE IF EXISTS workerspecialization CASCADE;

CREATE TYPE businesstype AS ENUM ('INDIVIDUAL', 'COMPANY');
CREATE TYPE complaintcategory AS ENUM ('NOISE', 'NEIGHBOR', 'PROPERTY_CONDITION', 'LANDLORD_SERVICE', 'SECURITY', 'UTILITY', 'PAYMENT', 'LEASE', 'OTHER');
CREATE TYPE complaintpriority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE complaintstatus AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED', 'REJECTED');
CREATE TYPE expensecategory AS ENUM ('MAINTENANCE', 'UTILITIES', 'TAX', 'INSURANCE', 'SECURITY', 'CLEANING', 'STAFF', 'OTHER');
CREATE TYPE expensestatus AS ENUM ('RECORDED', 'CANCELLED');
CREATE TYPE invitationstatus AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE invoicestatus AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE invoicetype AS ENUM ('RENT', 'OTHER');
CREATE TYPE leasestatus AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'TERMINATED');
CREATE TYPE maintenancecategory AS ENUM ('PLUMBING', 'ELECTRICAL', 'WATER', 'HEATING_COOLING', 'STRUCTURAL', 'APPLIANCE', 'SECURITY', 'CLEANING', 'INTERNET', 'OTHER');
CREATE TYPE maintenancepriority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE maintenancestatus AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'SCHEDULED', 'RESOLVED', 'REOPENED', 'CLOSED', 'REJECTED', 'CANCELLED');
CREATE TYPE notificationchannel AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WHATSAPP');
CREATE TYPE notificationstatus AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ', 'SKIPPED');
CREATE TYPE paymentchannel AS ENUM ('ONLINE', 'OFFLINE');
CREATE TYPE paymentmethod AS ENUM ('MOBILE_MONEY', 'BANK', 'CARD', 'CASH', 'OTHER');
CREATE TYPE paymentstatus AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED', 'AWAITING_VERIFICATION');
CREATE TYPE propertystatus AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED', 'MAINTENANCE');
CREATE TYPE propertytype AS ENUM ('APARTMENT', 'HOUSE', 'COMMERCIAL', 'OFFICE', 'MIXED_USE', 'ROOM', 'OTHER');
CREATE TYPE rentschedulefrequency AS ENUM ('MONTHLY', 'WEEKLY', 'QUARTERLY', 'YEARLY');
CREATE TYPE rentschedulestatus AS ENUM ('ACTIVE', 'INACTIVE', 'PAUSED');
CREATE TYPE tenancystatus AS ENUM ('INVITED', 'PENDING', 'ACTIVE', 'ENDED', 'TERMINATED');
CREATE TYPE unitstatus AS ENUM ('VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED', 'INACTIVE', 'UNDER_REPAIR');
CREATE TYPE userlanguage AS ENUM ('EN', 'RW', 'FR');
CREATE TYPE userrole AS ENUM ('SYSTEM_ADMIN', 'LANDLORD', 'TENANT');
CREATE TYPE userstatus AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED', 'DEACTIVATED');
CREATE TYPE verificationstatus AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE workerspecialization AS ENUM ('PLUMBER', 'ELECTRICIAN', 'CARPENTER', 'CLEANER', 'SECURITY', 'GENERAL', 'OTHER');

-- =============================================================================
-- STEP 3: CREATE TABLES (Topological Order)
-- =============================================================================

-- Table: notification_templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    title_template VARCHAR(255) NOT NULL,
    body_template TEXT NOT NULL,
    action_label VARCHAR(100),
    action_url_template VARCHAR(255),
    default_priority VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table: users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    role userrole NOT NULL,
    language userlanguage NOT NULL,
    status userstatus NOT NULL,
    email_verified BOOLEAN DEFAULT TRUE NOT NULL,
    phone_verified BOOLEAN DEFAULT TRUE NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Table: audit_logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Table: landlord_profiles
CREATE TABLE landlord_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    business_type businesstype NOT NULL,
    business_name VARCHAR(255),
    tax_identifier VARCHAR(100),
    address VARCHAR(255),
    district VARCHAR(100),
    city VARCHAR(100),
    country VARCHAR(100),
    verification_status verificationstatus NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_landlord_profiles_user_id ON landlord_profiles(user_id);

-- Table: notification_preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lease_expiry_in_app BOOLEAN DEFAULT TRUE NOT NULL,
    lease_expiry_email BOOLEAN DEFAULT TRUE NOT NULL,
    lease_expiry_sms BOOLEAN NOT NULL,
    lease_expiry_whatsapp BOOLEAN NOT NULL,
    payment_in_app BOOLEAN DEFAULT TRUE NOT NULL,
    payment_email BOOLEAN DEFAULT TRUE NOT NULL,
    payment_sms BOOLEAN DEFAULT FALSE NOT NULL,
    payment_whatsapp BOOLEAN DEFAULT FALSE NOT NULL,
    maintenance_in_app BOOLEAN DEFAULT TRUE NOT NULL,
    maintenance_email BOOLEAN DEFAULT TRUE NOT NULL,
    maintenance_sms BOOLEAN DEFAULT FALSE NOT NULL,
    maintenance_whatsapp BOOLEAN DEFAULT FALSE NOT NULL,
    complaints_in_app BOOLEAN NOT NULL,
    complaints_email BOOLEAN NOT NULL,
    complaints_sms BOOLEAN DEFAULT FALSE NOT NULL,
    complaints_whatsapp BOOLEAN DEFAULT FALSE NOT NULL,
    system_in_app BOOLEAN DEFAULT TRUE NOT NULL,
    system_email BOOLEAN NOT NULL,
    system_sms BOOLEAN DEFAULT FALSE NOT NULL,
    system_whatsapp BOOLEAN DEFAULT FALSE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Table: notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    language VARCHAR(10) NOT NULL,
    channel notificationchannel NOT NULL,
    status notificationstatus NOT NULL,
    priority VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    reference_type VARCHAR(100),
    reference_id UUID,
    action_url VARCHAR(255),
    action_label VARCHAR(100),
    metadata_json TEXT,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- Table: sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_name VARCHAR(100),
    device_type VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Table: tenant_profiles
CREATE TABLE tenant_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    national_id VARCHAR(50),
    occupation VARCHAR(100),
    emergency_name VARCHAR(100),
    emergency_phone VARCHAR(50),
    verification_status verificationstatus NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_user_id ON tenant_profiles(user_id);

-- Table: bank_accounts
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RWF' NOT NULL,
    is_primary BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_landlord_id ON bank_accounts(landlord_id);

-- Table: maintenance_workers
CREATE TABLE maintenance_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    specialization workerspecialization NOT NULL,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_maintenance_workers_landlord_id ON maintenance_workers(landlord_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_workers_status ON maintenance_workers(status);

-- Table: notification_delivery_logs
CREATE TABLE notification_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID,
    user_id UUID NOT NULL,
    channel VARCHAR(50) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    metadata_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_user_id ON notification_delivery_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_notification_id ON notification_delivery_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_status ON notification_delivery_logs(status);

-- Table: properties
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    property_type propertytype NOT NULL,
    description TEXT,
    address VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    sector VARCHAR(100),
    cell VARCHAR(100),
    village VARCHAR(100),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    status propertystatus NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);

-- Table: bank_statements
CREATE TABLE bank_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL,
    property_id UUID,
    bank_account_id UUID,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER DEFAULT 0 NOT NULL,
    period_start DATE,
    period_end DATE,
    total_transactions_count INTEGER DEFAULT 0 NOT NULL,
    matched_count INTEGER DEFAULT 0 NOT NULL,
    unmatched_count INTEGER DEFAULT 0 NOT NULL,
    duplicate_count INTEGER DEFAULT 0 NOT NULL,
    total_incoming_amount NUMERIC(14, 2) DEFAULT 0.00 NOT NULL,
    matched_amount NUMERIC(14, 2) DEFAULT 0.00 NOT NULL,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_bank_statements_bank_account_id ON bank_statements(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_landlord_id ON bank_statements(landlord_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_property_id ON bank_statements(property_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_status ON bank_statements(status);

-- Table: units
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    landlord_id UUID NOT NULL,
    unit_number VARCHAR(50) NOT NULL,
    floor INTEGER NOT NULL,
    unit_type VARCHAR(100) NOT NULL,
    monthly_rent NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RWF' NOT NULL,
    status unitstatus NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_units_landlord_id ON units(landlord_id);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);

-- Table: expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL,
    property_id UUID NOT NULL,
    unit_id UUID,
    category expensecategory NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RWF' NOT NULL,
    expense_date DATE NOT NULL,
    vendor VARCHAR(255),
    reference VARCHAR(100),
    status expensestatus NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_landlord_id ON expenses(landlord_id);
CREATE INDEX IF NOT EXISTS idx_expenses_unit_id ON expenses(unit_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

-- Table: invitations
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL,
    tenant_email VARCHAR(255) NOT NULL,
    tenant_phone VARCHAR(50) NOT NULL,
    property_id UUID NOT NULL,
    unit_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    status invitationstatus NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_invitations_unit_id ON invitations(unit_id);
CREATE INDEX IF NOT EXISTS idx_invitations_landlord_id ON invitations(landlord_id);
CREATE INDEX IF NOT EXISTS idx_invitations_property_id ON invitations(property_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- Table: tenancies
CREATE TABLE tenancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    landlord_id UUID NOT NULL,
    property_id UUID NOT NULL,
    unit_id UUID NOT NULL,
    status tenancystatus NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenant_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tenancies_landlord_id ON tenancies(landlord_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_property_id ON tenancies(property_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_unit_id ON tenancies(unit_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_tenant_id ON tenancies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_status ON tenancies(status);

-- Table: complaints
CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_number VARCHAR(50) NOT NULL,
    tenant_id UUID NOT NULL,
    landlord_id UUID NOT NULL,
    property_id UUID NOT NULL,
    unit_id UUID NOT NULL,
    tenancy_id UUID NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category complaintcategory NOT NULL,
    priority complaintpriority NOT NULL,
    status complaintstatus NOT NULL,
    landlord_response TEXT,
    attachment_path VARCHAR(500),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (tenancy_id) REFERENCES tenancies(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenant_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_complaints_tenancy_id ON complaints(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_complaints_unit_id ON complaints(unit_id);
CREATE INDEX IF NOT EXISTS idx_complaints_property_id ON complaints(property_id);
CREATE INDEX IF NOT EXISTS idx_complaints_landlord_id ON complaints(landlord_id);
CREATE INDEX IF NOT EXISTS idx_complaints_tenant_id ON complaints(tenant_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);

-- Table: leases
CREATE TABLE leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenancy_id UUID NOT NULL,
    landlord_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    property_id UUID NOT NULL,
    unit_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent NUMERIC(12, 2) NOT NULL,
    security_deposit NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    payment_due_day INTEGER NOT NULL,
    late_fee NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    currency VARCHAR(10) DEFAULT 'RWF' NOT NULL,
    status leasestatus NOT NULL,
    notes VARCHAR(500),
    document_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (tenancy_id) REFERENCES tenancies(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_leases_landlord_id ON leases(landlord_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenancy_id ON leases(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);

-- Table: maintenance_requests
CREATE TABLE maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) NOT NULL,
    tenant_id UUID NOT NULL,
    landlord_id UUID NOT NULL,
    property_id UUID NOT NULL,
    unit_id UUID NOT NULL,
    tenancy_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category maintenancecategory NOT NULL,
    priority maintenancepriority NOT NULL,
    status maintenancestatus NOT NULL,
    assigned_to VARCHAR(255),
    assigned_worker_id UUID,
    scheduled_date TIMESTAMP WITH TIME ZONE,
    scheduled_time VARCHAR(50),
    estimated_cost FLOAT DEFAULT 0.00 NOT NULL,
    actual_cost FLOAT DEFAULT 0.00 NOT NULL,
    currency VARCHAR(10) DEFAULT 'RWF' NOT NULL,
    tenant_notes TEXT,
    landlord_notes TEXT,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    expense_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (tenancy_id) REFERENCES tenancies(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenant_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tenancy_id ON maintenance_requests(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_unit_id ON maintenance_requests(unit_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_property_id ON maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_landlord_id ON maintenance_requests(landlord_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tenant_id ON maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests(status);

-- Table: complaint_comments
CREATE TABLE complaint_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL,
    user_id UUID NOT NULL,
    author_name VARCHAR(255),
    author_role VARCHAR(50),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_complaint_comments_user_id ON complaint_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_complaint_comments_complaint_id ON complaint_comments(complaint_id);

-- Table: invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL,
    landlord_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    property_id UUID NOT NULL,
    unit_id UUID NOT NULL,
    tenancy_id UUID NOT NULL,
    lease_id UUID NOT NULL,
    invoice_type invoicetype NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    discount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    late_fee NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    balance_due NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    currency VARCHAR(10) DEFAULT 'RWF' NOT NULL,
    status invoicestatus NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (tenancy_id) REFERENCES tenancies(id) ON DELETE CASCADE,
    FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_unit_id ON invoices(unit_id);
CREATE INDEX IF NOT EXISTS idx_invoices_landlord_id ON invoices(landlord_id);
CREATE INDEX IF NOT EXISTS idx_invoices_property_id ON invoices(property_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenancy_id ON invoices(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_invoices_lease_id ON invoices(lease_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Table: maintenance_attachments
CREATE TABLE maintenance_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_request_id UUID NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (maintenance_request_id) REFERENCES maintenance_requests(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_maintenance_attachments_maintenance_request_id ON maintenance_attachments(maintenance_request_id);

-- Table: maintenance_comments
CREATE TABLE maintenance_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_request_id UUID NOT NULL,
    user_id UUID NOT NULL,
    author_name VARCHAR(255),
    author_role VARCHAR(50),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (maintenance_request_id) REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_maintenance_comments_maintenance_request_id ON maintenance_comments(maintenance_request_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_comments_user_id ON maintenance_comments(user_id);

-- Table: messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    sender_role userrole NOT NULL,
    property_id UUID,
    unit_id UUID,
    tenancy_id UUID,
    message_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    attachment_url VARCHAR(500),
    attachment_name VARCHAR(255),
    attachment_size INTEGER,
    maintenance_request_id UUID,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (maintenance_request_id) REFERENCES maintenance_requests(id) ON DELETE SET NULL,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tenancy_id) REFERENCES tenancies(id) ON DELETE SET NULL,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_maintenance_request_id ON messages(maintenance_request_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenancy_id ON messages(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_messages_unit_id ON messages(unit_id);
CREATE INDEX IF NOT EXISTS idx_messages_property_id ON messages(property_id);

-- Table: reminder_histories
CREATE TABLE reminder_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID NOT NULL,
    milestone VARCHAR(50) NOT NULL,
    target_date DATE NOT NULL,
    notification_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE SET NULL,
    FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reminder_histories_notification_id ON reminder_histories(notification_id);
CREATE INDEX IF NOT EXISTS idx_reminder_histories_lease_id ON reminder_histories(lease_id);

-- Table: rent_schedules
CREATE TABLE rent_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenancy_id UUID NOT NULL,
    lease_id UUID NOT NULL,
    landlord_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    property_id UUID NOT NULL,
    unit_id UUID NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RWF' NOT NULL,
    frequency rentschedulefrequency NOT NULL,
    due_day INTEGER NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    status rentschedulestatus NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (tenancy_id) REFERENCES tenancies(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_rent_schedules_tenancy_id ON rent_schedules(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_rent_schedules_unit_id ON rent_schedules(unit_id);
CREATE INDEX IF NOT EXISTS idx_rent_schedules_property_id ON rent_schedules(property_id);
CREATE INDEX IF NOT EXISTS idx_rent_schedules_tenant_id ON rent_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_schedules_lease_id ON rent_schedules(lease_id);
CREATE INDEX IF NOT EXISTS idx_rent_schedules_landlord_id ON rent_schedules(landlord_id);
CREATE INDEX IF NOT EXISTS idx_rent_schedules_status ON rent_schedules(status);

-- Table: payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_reference VARCHAR(50) NOT NULL,
    transaction_reference VARCHAR(100),
    invoice_id UUID NOT NULL,
    tenancy_id UUID NOT NULL,
    lease_id UUID NOT NULL,
    landlord_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    property_id UUID NOT NULL,
    unit_id UUID NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RWF' NOT NULL,
    payment_method paymentmethod NOT NULL,
    payment_channel paymentchannel NOT NULL,
    status paymentstatus NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (tenancy_id) REFERENCES tenancies(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payments_unit_id ON payments(unit_id);
CREATE INDEX IF NOT EXISTS idx_payments_property_id ON payments(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenancy_id ON payments(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_payments_landlord_id ON payments(landlord_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_lease_id ON payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Table: bank_transactions
CREATE TABLE bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID NOT NULL,
    landlord_id UUID NOT NULL,
    transaction_reference VARCHAR(120),
    transaction_date DATE NOT NULL,
    transaction_time VARCHAR(30),
    amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RWF' NOT NULL,
    is_credit BOOLEAN DEFAULT TRUE NOT NULL,
    payer_name VARCHAR(200),
    payer_account VARCHAR(100),
    description TEXT NOT NULL,
    raw_text TEXT,
    matching_status VARCHAR(50) NOT NULL,
    confidence_score FLOAT NOT NULL,
    matched_tenant_id UUID,
    matched_invoice_id UUID,
    matched_payment_id UUID,
    match_method VARCHAR(60),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (matched_tenant_id) REFERENCES tenant_profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (statement_id) REFERENCES bank_statements(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_payment_id) REFERENCES payments(id) ON DELETE SET NULL,
    FOREIGN KEY (matched_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_matched_tenant_id ON bank_transactions(matched_tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_landlord_id ON bank_transactions(landlord_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_statement_id ON bank_transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_matched_payment_id ON bank_transactions(matched_payment_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_matched_invoice_id ON bank_transactions(matched_invoice_id);

-- Table: receipts
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(50) NOT NULL,
    payment_id UUID NOT NULL,
    invoice_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    landlord_id UUID NOT NULL,
    property_id UUID NOT NULL,
    unit_id UUID NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RWF' NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_receipts_payment_id ON receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_unit_id ON receipts(unit_id);
CREATE INDEX IF NOT EXISTS idx_receipts_property_id ON receipts(property_id);
CREATE INDEX IF NOT EXISTS idx_receipts_tenant_id ON receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_landlord_id ON receipts(landlord_id);

-- Table: payment_matches
CREATE TABLE payment_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    statement_id UUID NOT NULL,
    landlord_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    invoice_id UUID NOT NULL,
    payment_id UUID,
    matched_amount NUMERIC(14, 2) DEFAULT 0.00 NOT NULL,
    confidence VARCHAR(20) NOT NULL,
    confidence_score FLOAT NOT NULL,
    matching_signals TEXT,
    review_status VARCHAR(30) NOT NULL,
    confirmed_by UUID,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (statement_id) REFERENCES bank_statements(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES bank_transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payment_matches_payment_id ON payment_matches(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_matches_invoice_id ON payment_matches(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_matches_tenant_id ON payment_matches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_matches_statement_id ON payment_matches(statement_id);
CREATE INDEX IF NOT EXISTS idx_payment_matches_transaction_id ON payment_matches(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_matches_landlord_id ON payment_matches(landlord_id);

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

-- Apply updated_at triggers to all tables having updated_at column
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
          AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_update_%I_modtime ON %I', tbl, tbl);
        EXECUTE format('CREATE TRIGGER trg_update_%I_modtime BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tbl, tbl);
    END LOOP;
END;
$$;

-- =============================================================================
-- STEP 5: ROW LEVEL SECURITY (RLS) & POLICIES
-- =============================================================================

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_matches ENABLE ROW LEVEL SECURITY;

-- Only the service role reaches these tables.
--
-- The application does not use Supabase Auth or PostgREST: the FastAPI backend
-- connects over DATABASE_URL and enforces per-user access itself, and no browser
-- code holds a Supabase client. Nothing legitimate therefore arrives as the
-- `anon` or `authenticated` PostgREST roles.
--
-- The previous policy set granted `anon` SELECT on every table with USING(true).
-- The anon key is publishable by design, so that made every row - including
-- users.password_hash and sessions.refresh_token_hash - readable by anyone
-- holding it. `authenticated` likewise had FOR ALL USING(true) on everything.
-- Both are dropped here; RLS now denies by default and only service_role passes.
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "service_role_full_access" ON %I', tbl);
        EXECUTE format('CREATE POLICY "service_role_full_access" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl);

        -- Removed: these exposed every table to any holder of the anon key.
        EXECUTE format('DROP POLICY IF EXISTS "allow_authenticated_all" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "allow_anon_read" ON %I', tbl);
    END LOOP;
END;
$$;

-- Belt and braces: even without a policy, revoke the table grants PostgREST
-- relies on, so a future ENABLE-less table is not silently exposed.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

-- =============================================================================
-- STEP 6: STORAGE BUCKETS CONFIGURATION
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    -- notify-documents holds leases and other personal paperwork, so it is
    -- private: the backend hands out short-lived signed URLs for it. Avatars and
    -- property images stay public because they are displayed openly.
    ('notify-documents', 'notify-documents', false, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
    ('notify-avatars', 'notify-avatars', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('notify-property-images', 'notify-property-images', true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read notify-documents" ON storage.objects;
    DROP POLICY IF EXISTS "Service Read notify-documents" ON storage.objects;
    DROP POLICY IF EXISTS "Public Read notify-avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Public Read notify-property-images" ON storage.objects;
    DROP POLICY IF EXISTS "Auth Upload notify-documents" ON storage.objects;
    DROP POLICY IF EXISTS "Auth Upload notify-avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Auth Upload notify-property-images" ON storage.objects;

    -- No public read on notify-documents: a lease PDF was world-readable to
    -- anyone who learned its URL, which defeated the signed URLs the backend
    -- already generates. Reads there go through service_role.
    CREATE POLICY "Service Read notify-documents" ON storage.objects FOR SELECT TO service_role USING (bucket_id = 'notify-documents');
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
    ('ea7febe0-24b1-4043-85cf-192af944a04f', 'admin@notify.test', '+250788000001', '$argon2id$v=19$m=65536,t=3,p=4$eG+tdS7lPCckpNQaYwyhtA$rQGGDs2Ukx4R5TE8OH+jdHUcSyCMRGeVH96Ezsn7j8o', 'System', 'Administrator', NULL, 'SYSTEM_ADMIN', 'EN', 'ACTIVE', FALSE, FALSE, '2026-09-05 11:10:29.962554', '2026-09-04 14:49:04.850253', '2026-09-05 11:10:29.964692'),
    ('42944a92-b7dd-4cf1-a920-4a4982a5e754', 'landlord@notify.test', '+250788111333', '$argon2id$v=19$m=65536,t=3,p=4$eE+JcU6J8R7jPKd0zjnn3A$3VdhXVV5msOOhEbLKaRogI4g8aHZoCOJc++Sbv3h+w0', 'Jean', 'Habimana', NULL, 'LANDLORD', 'EN', 'ACTIVE', FALSE, FALSE, '2026-09-05 11:09:46.457062', '2026-09-04 14:49:04.850258', '2026-09-05 11:09:46.460396'),
    ('507ba19b-de5f-4bd4-8b1d-e4776e7fe97f', 'landlord2@notify.test', '+250788333444', '$argon2id$v=19$m=65536,t=3,p=4$UorxvjdGCIGwlrI2phQiRA$lJmMtfbL/4IyR7owAGofwV2NZL1Zmbbcg+bjtsdhSz0', 'Claire', 'Uwase', NULL, 'LANDLORD', 'FR', 'ACTIVE', FALSE, FALSE, NULL, '2026-09-04 14:49:04.850260', '2026-09-05 09:42:02.884079'),
    ('89302b08-b7f7-4808-87ef-ebb8a3437816', 'tenant@notify.test', '+250788555666', '$argon2id$v=19$m=65536,t=3,p=4$bY0RImQMobQ25vwfA8A4hw$gPLcMt4fzmoFXfLKY1gbdEfZVgpODP5rFr2Tb1yKg7Y', 'Emma', 'Ndayishimiye', NULL, 'TENANT', 'EN', 'ACTIVE', FALSE, FALSE, '2026-09-05 13:04:51.975080', '2026-09-04 14:49:04.850262', '2026-09-05 13:04:51.980958'),
    ('6dd1cc71-454c-48ae-a82d-8e710346da91', 'tenant2@notify.test', '+250788777888', '$argon2id$v=19$m=65536,t=3,p=4$B6B0TiklxPhfKyXEeC9lDA$OE/yHPwp0TE02o8xzTqMvt7Vs/eY2TjVezNqD3fPaYc', 'Marie-Rose', 'Mutesi', NULL, 'TENANT', 'FR', 'ACTIVE', FALSE, FALSE, NULL, '2026-09-04 14:49:04.850263', '2026-09-05 09:42:02.884080'),
    ('c4e26dfe-5f9a-4c83-b5f3-7d1f329e10ca', 'tenant3@notify.test', '+250788999000', '$argon2id$v=19$m=65536,t=3,p=4$T6k1Zuxdi3EuZax1LmWsdQ$JP9kEyj1fbQBpWn9o4fFAzsHsSv/Vt3qcu9/rxRMerQ', 'David', 'Mugisha', NULL, 'TENANT', 'EN', 'ACTIVE', FALSE, FALSE, NULL, '2026-09-04 14:49:04.850265', '2026-09-05 09:42:02.884082')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: landlord_profiles (2 records)
INSERT INTO landlord_profiles (id, user_id, business_type, business_name, tax_identifier, address, district, city, country, verification_status, created_at, updated_at) VALUES
    ('c07af1fb-0ced-4166-9052-df6203fb366c', '42944a92-b7dd-4cf1-a920-4a4982a5e754', 'INDIVIDUAL', '', '', '', 'Nyarugenge', 'Kigali', 'Rwanda', 'VERIFIED', '2026-09-04 14:49:04.876130', '2026-09-04 17:12:43.431868'),
    ('988a0648-723d-4bda-ad4f-c48d2bb1b8c5', '507ba19b-de5f-4bd4-8b1d-e4776e7fe97f', 'INDIVIDUAL', 'Uwase Prime Holdings', '987654321', 'KG 11 Ave, Business Zone', 'Gasabo', 'Kigali', 'Rwanda', 'VERIFIED', '2026-09-04 14:49:04.876150', '2026-09-04 14:49:04.876154')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: notification_preferences (2 records)
INSERT INTO notification_preferences (id, user_id, lease_expiry_in_app, lease_expiry_email, lease_expiry_sms, lease_expiry_whatsapp, payment_in_app, payment_email, payment_sms, payment_whatsapp, maintenance_in_app, maintenance_email, maintenance_sms, maintenance_whatsapp, complaints_in_app, complaints_email, complaints_sms, complaints_whatsapp, system_in_app, system_email, system_sms, system_whatsapp, updated_at) VALUES
    ('e1c905a2-78eb-43d9-9108-9933f7191a5a', '89302b08-b7f7-4808-87ef-ebb8a3437816', TRUE, TRUE, FALSE, FALSE, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, FALSE, FALSE, TRUE, TRUE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, '2026-09-04 14:58:01.392861'),
    ('beb920fd-6138-4cfd-9fd9-eed5d3c9a41c', '42944a92-b7dd-4cf1-a920-4a4982a5e754', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, FALSE, FALSE, TRUE, TRUE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, '2026-09-04 17:12:57.617573')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: notifications (1 records)
INSERT INTO notifications (id, user_id, type, title, message, language, channel, status, priority, category, entity_type, entity_id, reference_type, reference_id, action_url, action_label, metadata_json, is_read, read_at, sent_at, created_at) VALUES
    ('e3cbc31a-97a4-43f7-bcdd-332cc519bc6e', '89302b08-b7f7-4808-87ef-ebb8a3437816', 'PAYMENT_RECEIVED', 'Payment Received & Receipt Generated', 'Your rent payment of 1,500,000 RWF for Suite 101 has been verified. Receipt REC-2026-0901 is available for download.', 'en', 'IN_APP', 'SENT', 'MEDIUM', 'PAYMENT', NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, NULL, NULL, '2026-09-04 14:49:05.025437')
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


-- Seed Data: expenses (2 records)
INSERT INTO expenses (id, landlord_id, property_id, unit_id, category, description, amount, currency, expense_date, vendor, reference, status, created_at, updated_at) VALUES
    ('4b50848e-f1bc-4567-81b9-bf5c362e2c2a', 'c07af1fb-0ced-4166-9052-df6203fb366c', '1c09de3a-bbb0-4d45-a498-959e6c83020b', NULL, 'UTILITIES', 'Backup Generator Diesel Fuel Purchase - 200 Liters for Kigali Commercial Center', 280000, 'RWF', '2026-08-25', 'SP Petroleum Kigali', 'SP-REC-9088', 'RECORDED', '2026-09-04 14:49:04.974106', '2026-09-04 14:49:04.974121'),
    ('1ee6a94b-83e2-4873-82f7-614ed17612a5', 'c07af1fb-0ced-4166-9052-df6203fb366c', '1c09de3a-bbb0-4d45-a498-959e6c83020b', NULL, 'SECURITY', '24/7 Commercial Security Guarding Services for Kigali Heights building', 450000, 'RWF', '2026-08-30', 'ISCO Security Rwanda', 'ISCO-INV-4412', 'RECORDED', '2026-09-04 14:49:04.974133', '2026-09-04 14:49:04.974141')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: tenancies (3 records)
INSERT INTO tenancies (id, tenant_id, landlord_id, property_id, unit_id, status, start_date, end_date, created_at, updated_at) VALUES
    ('58c15264-94e5-41fa-a8e8-ed975bf941de', '95f0a97c-0aec-4eab-b95d-f29cca175849', 'c07af1fb-0ced-4166-9052-df6203fb366c', '1c09de3a-bbb0-4d45-a498-959e6c83020b', 'e597e6f9-a954-45c5-9caf-bbec295d8d34', 'ACTIVE', '2025-01-01', '2027-01-01', '2026-09-04 14:49:04.917602', '2026-09-04 14:49:04.917609'),
    ('fa72d077-64c1-4546-b557-5b841d8e6fe3', 'adc3fb45-f484-44d3-a710-dad74d8c8c71', 'c07af1fb-0ced-4166-9052-df6203fb366c', '1c09de3a-bbb0-4d45-a498-959e6c83020b', '853f7e0f-9d3b-4a26-81c7-0f4dd5f0e07f', 'ACTIVE', '2025-03-01', '2026-03-01', '2026-09-04 14:49:04.917613', '2026-09-04 14:49:04.917616'),
    ('bf8ddb0b-a769-4d3b-b8db-c16c3250ad11', 'e669077b-18b8-40e3-a0ab-bd2e04a16adc', '988a0648-723d-4bda-ad4f-c48d2bb1b8c5', 'a1ac65e0-2e20-49b7-aa69-063df75cfffe', 'e0eb54e7-f463-415a-9061-cf77c2ee6767', 'ACTIVE', '2025-06-01', '2026-06-01', '2026-09-04 14:49:04.917619', '2026-09-04 14:49:04.917621')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: complaints (1 records)
INSERT INTO complaints (id, complaint_number, tenant_id, landlord_id, property_id, unit_id, tenancy_id, subject, description, category, priority, status, landlord_response, attachment_path, acknowledged_at, resolved_at, closed_at, created_at, updated_at) VALUES
    ('c219856e-022c-43ba-be57-9d396a2a3eca', 'CMP-2026-001', '95f0a97c-0aec-4eab-b95d-f29cca175849', 'c07af1fb-0ced-4166-9052-df6203fb366c', '1c09de3a-bbb0-4d45-a498-959e6c83020b', 'e597e6f9-a954-45c5-9caf-bbec295d8d34', '58c15264-94e5-41fa-a8e8-ed975bf941de', 'Unauthorized parking blocking loading dock 2', 'An unregistered delivery vehicle was parked in reserved loading bay 2 for over 3 hours during morning offloading.', 'PROPERTY_CONDITION', 'MEDIUM', 'UNDER_REVIEW', NULL, NULL, NULL, NULL, NULL, '2026-09-04 14:49:04.940233', '2026-09-04 14:49:04.940237')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: leases (3 records)
INSERT INTO leases (id, tenancy_id, landlord_id, tenant_id, property_id, unit_id, start_date, end_date, monthly_rent, security_deposit, payment_due_day, late_fee, currency, status, notes, document_id, created_at, updated_at) VALUES
    ('d4e0b010-a30b-4e3d-9f66-4fd1d3a4823c', '58c15264-94e5-41fa-a8e8-ed975bf941de', 'c07af1fb-0ced-4166-9052-df6203fb366c', '95f0a97c-0aec-4eab-b95d-f29cca175849', '1c09de3a-bbb0-4d45-a498-959e6c83020b', 'e597e6f9-a954-45c5-9caf-bbec295d8d34', '2025-01-01', '2027-01-01', 1500000, 3000000, 5, 50000, 'RWF', 'ACTIVE', '2-year commercial lease agreement with annual inflation adjustment clause.', NULL, '2026-09-04 14:49:04.922235', '2026-09-04 14:49:04.922241'),
    ('5f4d4ab2-9413-4192-ba00-5ca54155d949', 'fa72d077-64c1-4546-b557-5b841d8e6fe3', 'c07af1fb-0ced-4166-9052-df6203fb366c', 'adc3fb45-f484-44d3-a710-dad74d8c8c71', '1c09de3a-bbb0-4d45-a498-959e6c83020b', '853f7e0f-9d3b-4a26-81c7-0f4dd5f0e07f', '2025-03-01', '2026-03-01', 1200000, 2400000, 1, 40000, 'RWF', 'EXPIRED', 'Standard 12-month commercial retail lease.', NULL, '2026-09-04 14:49:04.922245', '2026-09-04 17:12:07.589368'),
    ('596950ae-cd4d-4a29-8684-2d4c3934f941', 'bf8ddb0b-a769-4d3b-b8db-c16c3250ad11', '988a0648-723d-4bda-ad4f-c48d2bb1b8c5', 'e669077b-18b8-40e3-a0ab-bd2e04a16adc', 'a1ac65e0-2e20-49b7-aa69-063df75cfffe', 'e0eb54e7-f463-415a-9061-cf77c2ee6767', '2025-06-01', '2026-06-01', 850000, 1700000, 5, 25000, 'RWF', 'ACTIVE', 'Commercial lease agreement with options for extension.', NULL, '2026-09-04 14:49:04.922249', '2026-09-04 14:49:04.922251')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: maintenance_requests (2 records)
INSERT INTO maintenance_requests (id, request_number, tenant_id, landlord_id, property_id, unit_id, tenancy_id, title, description, category, priority, status, assigned_to, assigned_worker_id, scheduled_date, scheduled_time, estimated_cost, actual_cost, currency, tenant_notes, landlord_notes, acknowledged_at, scheduled_at, resolved_at, closed_at, expense_id, created_at, updated_at) VALUES
    ('85e53929-f371-4fb9-a920-2988708f324a', 'MR-2026-001', '95f0a97c-0aec-4eab-b95d-f29cca175849', 'c07af1fb-0ced-4166-9052-df6203fb366c', '1c09de3a-bbb0-4d45-a498-959e6c83020b', 'e597e6f9-a954-45c5-9caf-bbec295d8d34', '58c15264-94e5-41fa-a8e8-ed975bf941de', 'Water pressure drop in Suite 101 restroom', 'The water pressure in executive restroom sink has dropped significantly over the past 2 days.', 'PLUMBING', 'MEDIUM', 'IN_PROGRESS', 'Kigali Plumbing Solutions', NULL, NULL, NULL, 35000.0, 0.0, 'RWF', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-04 14:49:05.000864', '2026-09-04 14:49:05.000876'),
    ('0d121e8a-a216-4588-b6f6-03bf165c09d5', 'MR-2026-002', 'adc3fb45-f484-44d3-a710-dad74d8c8c71', 'c07af1fb-0ced-4166-9052-df6203fb366c', '1c09de3a-bbb0-4d45-a498-959e6c83020b', '853f7e0f-9d3b-4a26-81c7-0f4dd5f0e07f', 'fa72d077-64c1-4546-b557-5b841d8e6fe3', 'HVAC Air Conditioning Filter Cleaning', 'Routine air conditioning unit filter cleaning and coil servicing for ground retail boutique.', 'HEATING_COOLING', 'LOW', 'RESOLVED', 'CoolAir Tech Rwanda', NULL, NULL, NULL, 25000.0, 25000.0, 'RWF', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-04 14:49:05.010003', '2026-09-04 14:49:05.010008')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: invoices (3 records)
INSERT INTO invoices (id, invoice_number, landlord_id, tenant_id, property_id, unit_id, tenancy_id, lease_id, invoice_type, billing_period_start, billing_period_end, issue_date, due_date, subtotal, discount, late_fee, total_amount, amount_paid, balance_due, currency, status, created_at, updated_at) VALUES
    ('a6ad6b81-5dbe-4b35-8107-175802360e44', 'INV-2026-0901', 'c07af1fb-0ced-4166-9052-df6203fb366c', '95f0a97c-0aec-4eab-b95d-f29cca175849', '1c09de3a-bbb0-4d45-a498-959e6c83020b', 'e597e6f9-a954-45c5-9caf-bbec295d8d34', '58c15264-94e5-41fa-a8e8-ed975bf941de', 'd4e0b010-a30b-4e3d-9f66-4fd1d3a4823c', 'RENT', '2026-09-01', '2026-09-30', '2026-09-01', '2026-09-05', 1500000, 0, 0, 1500000, 1500000, 0, 'RWF', 'PAID', '2026-09-04 14:49:04.927994', '2026-09-04 14:49:04.927998'),
    ('255cbcbf-5a57-4c31-8f15-1bab15ed3323', 'INV-2026-0902', 'c07af1fb-0ced-4166-9052-df6203fb366c', 'adc3fb45-f484-44d3-a710-dad74d8c8c71', '1c09de3a-bbb0-4d45-a498-959e6c83020b', '853f7e0f-9d3b-4a26-81c7-0f4dd5f0e07f', 'fa72d077-64c1-4546-b557-5b841d8e6fe3', '5f4d4ab2-9413-4192-ba00-5ca54155d949', 'RENT', '2026-09-01', '2026-09-30', '2026-09-01', '2026-09-01', 1200000, 0, 0, 1200000, 1200000, 0, 'RWF', 'PAID', '2026-09-04 14:49:04.928000', '2026-09-04 14:49:04.928001'),
    ('f7602f74-200d-48f9-9b7e-5184780b21ad', 'INV-2026-0903', '988a0648-723d-4bda-ad4f-c48d2bb1b8c5', 'e669077b-18b8-40e3-a0ab-bd2e04a16adc', 'a1ac65e0-2e20-49b7-aa69-063df75cfffe', 'e0eb54e7-f463-415a-9061-cf77c2ee6767', 'bf8ddb0b-a769-4d3b-b8db-c16c3250ad11', '596950ae-cd4d-4a29-8684-2d4c3934f941', 'RENT', '2026-09-01', '2026-09-30', '2026-09-01', '2026-09-05', 850000, 0, 0, 850000, 0, 850000, 'RWF', 'ISSUED', '2026-09-04 14:49:04.928002', '2026-09-04 14:49:04.928003')
ON CONFLICT (id) DO NOTHING;


-- Seed Data: messages (2 records)
INSERT INTO messages (id, sender_id, recipient_id, sender_role, property_id, unit_id, tenancy_id, message_type, content, attachment_url, attachment_name, attachment_size, maintenance_request_id, is_read, read_at, created_at, updated_at) VALUES
    ('c00fedd2-c194-4cf0-822f-017aaeeaec2f', '89302b08-b7f7-4808-87ef-ebb8a3437816', '42944a92-b7dd-4cf1-a920-4a4982a5e754', 'TENANT', '1c09de3a-bbb0-4d45-a498-959e6c83020b', NULL, NULL, 'GENERAL', 'Hello Jean-Paul, I have completed the rent payment for Suite 101 via MTN MoMo. Please confirm receipt. Thank you!', NULL, NULL, 0, NULL, TRUE, NULL, '2026-09-04 14:49:05.018200', '2026-09-04 14:49:05.018209'),
    ('4af3d64f-26c5-4bd1-8090-2b886c1b3723', '42944a92-b7dd-4cf1-a920-4a4982a5e754', '89302b08-b7f7-4808-87ef-ebb8a3437816', 'LANDLORD', '1c09de3a-bbb0-4d45-a498-959e6c83020b', NULL, NULL, 'GENERAL', 'Hello Emmanuel, thank you for your prompt payment! The receipt REC-2026-0901 has been automatically generated in your portal.', NULL, NULL, 0, NULL, TRUE, '2026-09-04 14:58:08.840365', '2026-09-04 14:49:05.018216', '2026-09-04 14:58:08.841771')
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


-- Seed Notification Templates
INSERT INTO notification_templates (id, code, category, title_template, body_template, action_label, action_url_template, default_priority, created_at) VALUES
    ('10000000-0000-0000-0000-000000000001', 'RENT_DUE_REMINDER', 'PAYMENT', 'Rent Payment Due', 'Hello {tenant_name}, your rent of {amount} {currency} for unit {unit_number} is due on {due_date}.', 'View Invoice', '/tenant/invoices/{invoice_id}', 'HIGH', NOW()),
    ('10000000-0000-0000-0000-000000000002', 'RENT_OVERDUE_NOTICE', 'PAYMENT', 'Urgent: Rent Payment Overdue', 'Hello {tenant_name}, your rent invoice {invoice_number} is overdue. Please settle immediately.', 'Pay Now', '/tenant/invoices/{invoice_id}', 'CRITICAL', NOW()),
    ('10000000-0000-0000-0000-000000000003', 'PAYMENT_RECEIVED', 'PAYMENT', 'Payment Received & Verified', 'Thank you! Your payment of {amount} {currency} for invoice {invoice_number} has been confirmed.', 'View Receipt', '/tenant/payments/{payment_id}', 'MEDIUM', NOW()),
    ('10000000-0000-0000-0000-000000000004', 'MAINTENANCE_STATUS_UPDATE', 'MAINTENANCE', 'Maintenance Request Update', 'Your maintenance ticket #{request_number} ({title}) status is now: {status}.', 'View Ticket', '/tenant/maintenance/{request_id}', 'MEDIUM', NOW()),
    ('10000000-0000-0000-0000-000000000005', 'LEASE_EXPIRY_30D', 'LEASE_EXPIRY', 'Lease Expiring in 30 Days', 'Your lease for unit {unit_number} expires on {end_date}. Please contact your landlord regarding renewal.', 'Review Lease', '/tenant/leases/{lease_id}', 'HIGH', NOW())
ON CONFLICT (id) DO NOTHING;

-- Seed Bank Accounts for Landlords
INSERT INTO bank_accounts (id, landlord_id, bank_name, account_name, account_number, currency, is_primary, created_at, updated_at) VALUES
    ('20000000-0000-0000-0000-000000000001', 'c07af1fb-0ced-4166-9052-df6203fb366c', 'Bank of Kigali (BK)', 'Jean Mugisha Real Estate', '00040-06945821-35', 'RWF', TRUE, NOW(), NOW()),
    ('20000000-0000-0000-0000-000000000002', '988a0648-723d-4bda-ad4f-c48d2bb1b8c5', 'I&M Bank Rwanda', 'Kigali Living Properties Ltd', '20015-89241002-88', 'RWF', TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Seed Maintenance Workers for Landlords
INSERT INTO maintenance_workers (id, landlord_id, name, phone, specialization, status, notes, created_at) VALUES
    ('30000000-0000-0000-0000-000000000001', 'c07af1fb-0ced-4166-9052-df6203fb366c', 'Alexis Hakizimana', '+250788111222', 'PLUMBER', 'AVAILABLE', 'Certified master plumber for Kigali area', NOW()),
    ('30000000-0000-0000-0000-000000000002', 'c07af1fb-0ced-4166-9052-df6203fb366c', 'Claude Bizimana', '+250788333444', 'ELECTRICIAN', 'AVAILABLE', 'Licensed electrical technician', NOW())
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- STEP 8: VERIFICATION QUERY
-- =============================================================================
SELECT table_name, (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
FROM (
  SELECT table_name, 
         query_to_xml(format('SELECT count(*) as cnt FROM %I', table_name), false, true, '') as xml_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
) counts
ORDER BY table_name;
