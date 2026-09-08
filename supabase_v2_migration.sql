-- =============================================================================
-- NOTIFY - SUPABASE MIGRATION v2
-- Supabase Auth owns identity; Supabase PostgreSQL is the only database.
-- =============================================================================
-- HOW TO RUN
--   Supabase dashboard -> SQL Editor -> New query -> paste this file -> RUN
--
-- WHAT CHANGES FROM v1
--   * public.users is replaced by public.profiles, whose primary key IS
--     auth.users.id. Supabase Auth owns credentials, sessions, email
--     confirmation and password resets.
--   * password_hash is gone. Passwords never touch application tables.
--   * The sessions and auth_tokens tables are gone - Supabase Auth owns both.
--   * RLS is deny-by-default per role, replacing the v1 policies which granted
--     `anon` SELECT on every table.
--
-- THIS SCRIPT IS DESTRUCTIVE: it drops the existing public tables and their
-- data, then recreates them.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 0. Clean slate
-- -----------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', t);
    END LOOP;
END $$;

DO $$
DECLARE ty text;
BEGIN
    FOR ty IN
        SELECT t.typname FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typtype = 'e'
    LOOP
        EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', ty);
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 1. Enum types
-- -----------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE userrole AS ENUM ('SYSTEM_ADMIN', 'LANDLORD', 'TENANT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE userlanguage AS ENUM ('EN', 'RW', 'FR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE userstatus AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED', 'DEACTIVATED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE businesstype AS ENUM ('INDIVIDUAL', 'COMPANY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE verificationstatus AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notificationchannel AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WHATSAPP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notificationstatus AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ', 'SKIPPED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE workerspecialization AS ENUM ('PLUMBER', 'ELECTRICIAN', 'CARPENTER', 'CLEANER', 'SECURITY', 'HVAC', 'PAINTER', 'LOCKSMITH', 'GENERAL', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE propertytype AS ENUM ('APARTMENT', 'HOUSE', 'COMMERCIAL', 'OFFICE', 'MIXED_USE', 'ROOM', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE propertystatus AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED', 'MAINTENANCE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE unitstatus AS ENUM ('VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED', 'INACTIVE', 'UNDER_REPAIR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE invitationstatus AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tenancystatus AS ENUM ('INVITED', 'PENDING', 'ACTIVE', 'ENDED', 'TERMINATED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE complaintcategory AS ENUM ('NOISE', 'NEIGHBOR', 'PROPERTY_CONDITION', 'LANDLORD_SERVICE', 'SECURITY', 'UTILITY', 'PAYMENT', 'LEASE', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE complaintpriority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE complaintstatus AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE leasestatus AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'TERMINATED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE maintenancecategory AS ENUM ('PLUMBING', 'ELECTRICAL', 'WATER', 'HEATING_COOLING', 'STRUCTURAL', 'APPLIANCE', 'SECURITY', 'CLEANING', 'INTERNET', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE maintenancepriority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE maintenancestatus AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'SCHEDULED', 'RESOLVED', 'REOPENED', 'CLOSED', 'REJECTED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE expensecategory AS ENUM ('MAINTENANCE', 'UTILITIES', 'TAX', 'INSURANCE', 'SECURITY', 'CLEANING', 'STAFF', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE expensestatus AS ENUM ('RECORDED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE invoicetype AS ENUM ('RENT', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE invoicestatus AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE rentschedulefrequency AS ENUM ('MONTHLY', 'WEEKLY', 'QUARTERLY', 'YEARLY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE rentschedulestatus AS ENUM ('ACTIVE', 'INACTIVE', 'PAUSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE paymentmethod AS ENUM ('MOBILE_MONEY', 'BANK', 'CARD', 'CASH', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE paymentchannel AS ENUM ('ONLINE', 'OFFLINE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE paymentstatus AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED', 'AWAITING_VERIFICATION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 2. Tables
--    Generated from the SQLAlchemy models, so the schema and the ORM cannot
--    drift. `profiles` is the one hand-edited table: its primary key is also a
--    foreign key onto auth.users.
-- -----------------------------------------------------------------------------
CREATE TABLE notification_templates (
	id UUID NOT NULL, 
	code VARCHAR(100) NOT NULL, 
	category VARCHAR(50) NOT NULL, 
	title_template VARCHAR(255) NOT NULL, 
	body_template TEXT NOT NULL, 
	action_label VARCHAR(100), 
	action_url_template VARCHAR(255), 
	default_priority VARCHAR(50) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id)
);

CREATE TABLE profiles (
	id UUID NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	phone VARCHAR(50) NOT NULL, 
	first_name VARCHAR(100) NOT NULL, 
	last_name VARCHAR(100) NOT NULL, 
	avatar_url VARCHAR(500), 
	role userrole NOT NULL, 
	language userlanguage NOT NULL, 
	status userstatus NOT NULL, 
	email_verified BOOLEAN NOT NULL, 
	phone_verified BOOLEAN NOT NULL, 
	last_login_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id),
	-- Identity lives in Supabase Auth. Deleting the auth user removes the profile.
	CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE audit_logs (
	id UUID NOT NULL, 
	user_id UUID, 
	action VARCHAR(100) NOT NULL, 
	entity_type VARCHAR(100) NOT NULL, 
	entity_id UUID, 
	old_values JSON, 
	new_values JSON, 
	ip_address VARCHAR(45), 
	user_agent VARCHAR(255), 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES profiles (id) ON DELETE SET NULL
);

CREATE TABLE landlord_profiles (
	id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	business_type businesstype NOT NULL, 
	business_name VARCHAR(255), 
	tax_identifier VARCHAR(100), 
	address VARCHAR(255), 
	district VARCHAR(100), 
	city VARCHAR(100), 
	country VARCHAR(100), 
	verification_status verificationstatus NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (user_id), 
	FOREIGN KEY(user_id) REFERENCES profiles (id) ON DELETE CASCADE
);

CREATE TABLE notification_preferences (
	id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	lease_expiry_in_app BOOLEAN NOT NULL, 
	lease_expiry_email BOOLEAN NOT NULL, 
	lease_expiry_sms BOOLEAN NOT NULL, 
	lease_expiry_whatsapp BOOLEAN NOT NULL, 
	payment_in_app BOOLEAN NOT NULL, 
	payment_email BOOLEAN NOT NULL, 
	payment_sms BOOLEAN NOT NULL, 
	payment_whatsapp BOOLEAN NOT NULL, 
	maintenance_in_app BOOLEAN NOT NULL, 
	maintenance_email BOOLEAN NOT NULL, 
	maintenance_sms BOOLEAN NOT NULL, 
	maintenance_whatsapp BOOLEAN NOT NULL, 
	complaints_in_app BOOLEAN NOT NULL, 
	complaints_email BOOLEAN NOT NULL, 
	complaints_sms BOOLEAN NOT NULL, 
	complaints_whatsapp BOOLEAN NOT NULL, 
	system_in_app BOOLEAN NOT NULL, 
	system_email BOOLEAN NOT NULL, 
	system_sms BOOLEAN NOT NULL, 
	system_whatsapp BOOLEAN NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES profiles (id) ON DELETE CASCADE
);

CREATE TABLE notifications (
	id UUID NOT NULL, 
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
	is_read BOOLEAN NOT NULL, 
	read_at TIMESTAMP WITH TIME ZONE, 
	sent_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES profiles (id) ON DELETE CASCADE
);

CREATE TABLE tenant_profiles (
	id UUID NOT NULL, 
	user_id UUID, 
	national_id VARCHAR(50), 
	occupation VARCHAR(100), 
	emergency_name VARCHAR(100), 
	emergency_phone VARCHAR(50), 
	pending_first_name VARCHAR(100), 
	pending_last_name VARCHAR(100), 
	pending_email VARCHAR(255), 
	pending_phone VARCHAR(50), 
	verification_status verificationstatus NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (user_id), 
	FOREIGN KEY(user_id) REFERENCES profiles (id) ON DELETE CASCADE
);

CREATE TABLE bank_accounts (
	id UUID NOT NULL, 
	landlord_id UUID NOT NULL, 
	bank_name VARCHAR(100) NOT NULL, 
	account_name VARCHAR(150) NOT NULL, 
	account_number VARCHAR(50) NOT NULL, 
	currency VARCHAR(10) NOT NULL, 
	is_primary BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(landlord_id) REFERENCES landlord_profiles (id) ON DELETE CASCADE
);

CREATE TABLE maintenance_workers (
	id UUID NOT NULL, 
	landlord_id UUID NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	phone VARCHAR(50) NOT NULL, 
	specialization workerspecialization NOT NULL, 
	status VARCHAR(50) NOT NULL, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(landlord_id) REFERENCES landlord_profiles (id) ON DELETE CASCADE
);

CREATE TABLE notification_delivery_logs (
	id UUID NOT NULL, 
	notification_id UUID, 
	user_id UUID NOT NULL, 
	channel VARCHAR(50) NOT NULL, 
	recipient VARCHAR(255) NOT NULL, 
	subject VARCHAR(255), 
	status VARCHAR(50) NOT NULL, 
	error_message TEXT, 
	metadata_info TEXT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(notification_id) REFERENCES notifications (id) ON DELETE SET NULL, 
	FOREIGN KEY(user_id) REFERENCES profiles (id) ON DELETE CASCADE
);

CREATE TABLE properties (
	id UUID NOT NULL, 
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
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(landlord_id) REFERENCES landlord_profiles (id) ON DELETE CASCADE
);

CREATE TABLE bank_statements (
	id UUID NOT NULL, 
	landlord_id UUID NOT NULL, 
	property_id UUID, 
	bank_account_id UUID, 
	file_name VARCHAR(255) NOT NULL, 
	file_type VARCHAR(50) NOT NULL, 
	file_size INTEGER NOT NULL, 
	period_start DATE, 
	period_end DATE, 
	total_transactions_count INTEGER NOT NULL, 
	matched_count INTEGER NOT NULL, 
	unmatched_count INTEGER NOT NULL, 
	duplicate_count INTEGER NOT NULL, 
	total_incoming_amount NUMERIC(14, 2) NOT NULL, 
	matched_amount NUMERIC(14, 2) NOT NULL, 
	status VARCHAR(50) NOT NULL, 
	notes TEXT, 
	uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(landlord_id) REFERENCES landlord_profiles (id) ON DELETE CASCADE, 
	FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE SET NULL, 
	FOREIGN KEY(bank_account_id) REFERENCES bank_accounts (id) ON DELETE SET NULL
);

CREATE TABLE units (
	id UUID NOT NULL, 
	property_id UUID NOT NULL, 
	landlord_id UUID NOT NULL, 
	unit_number VARCHAR(50) NOT NULL, 
	floor INTEGER NOT NULL, 
	unit_type VARCHAR(100) NOT NULL, 
	rooms INTEGER, 
	bathrooms INTEGER, 
	square_meters NUMERIC(10, 2), 
	monthly_rent NUMERIC(12, 2) NOT NULL, 
	currency VARCHAR(10) NOT NULL, 
	status unitstatus NOT NULL, 
	description TEXT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE CASCADE, 
	FOREIGN KEY(landlord_id) REFERENCES landlord_profiles (id) ON DELETE CASCADE
);

CREATE TABLE invitations (
	id UUID NOT NULL, 
	landlord_id UUID NOT NULL, 
	tenant_email VARCHAR(255), 
	tenant_phone VARCHAR(50) NOT NULL, 
	tenant_name VARCHAR(200), 
	property_id UUID NOT NULL, 
	unit_id UUID NOT NULL, 
	tenant_profile_id UUID, 
	token_hash VARCHAR(255) NOT NULL, 
	status invitationstatus NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	accepted_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(landlord_id) REFERENCES landlord_profiles (id) ON DELETE CASCADE, 
	FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE CASCADE, 
	FOREIGN KEY(unit_id) REFERENCES units (id) ON DELETE CASCADE, 
	FOREIGN KEY(tenant_profile_id) REFERENCES tenant_profiles (id) ON DELETE SET NULL
);

CREATE TABLE tenancies (
	id UUID NOT NULL, 
	tenant_id UUID NOT NULL, 
	landlord_id UUID NOT NULL, 
	property_id UUID NOT NULL, 
	unit_id UUID NOT NULL, 
	status tenancystatus NOT NULL, 
	start_date DATE NOT NULL, 
	end_date DATE, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenant_profiles (id) ON DELETE RESTRICT, 
	FOREIGN KEY(landlord_id) REFERENCES landlord_profiles (id) ON DELETE RESTRICT, 
	FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE RESTRICT, 
	FOREIGN KEY(unit_id) REFERENCES units (id) ON DELETE RESTRICT
);

CREATE TABLE complaints (
	id UUID NOT NULL, 
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
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenant_profiles (id) ON DELETE CASCADE, 
	FOREIGN KEY(landlord_id) REFERENCES landlord_profiles (id) ON DELETE CASCADE, 
	FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE CASCADE, 
	FOREIGN KEY(unit_id) REFERENCES units (id) ON DELETE CASCADE, 
	FOREIGN KEY(tenancy_id) REFERENCES tenancies (id) ON DELETE CASCADE
);

CREATE TABLE leases (
	id UUID NOT NULL, 
	tenancy_id UUID NOT NULL, 
	landlord_id UUID NOT NULL, 
	tenant_id UUID NOT NULL, 
	property_id UUID NOT NULL, 
	unit_id UUID NOT NULL, 
	start_date DATE NOT NULL, 
	end_date DATE NOT NULL, 
	monthly_rent NUMERIC(12, 2) NOT NULL, 
	security_deposit NUMERIC(12, 2) NOT NULL, 
	payment_due_day INTEGER NOT NULL, 
	late_fee NUMERIC(12, 2) NOT NULL, 
	currency VARCHAR(10) NOT NULL, 
	status leasestatus NOT NULL, 
	notes VARCHAR(500), 
	document_id UUID, 
	tenant_signed_at TIMESTAMP WITH TIME ZONE, 
	tenant_signature_name VARCHAR(255), 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenancy_id) REFERENCES tenancies (id) ON DELETE RESTRICT, 
	FOREIGN KEY(landlord_id) REFERENCES landlord_profiles (id) ON DELETE RESTRICT, 
	FOREIGN KEY(tenant_id) REFERENCES tenant_profiles (id) ON DELETE RESTRICT, 
	FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE RESTRICT, 
	FOREIGN KEY(unit_id) REFERENCES units (id) ON DELETE RESTRICT
);

CREATE TABLE maintenance_requests (
	id UUID NOT NULL, 
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
	estimated_cost FLOAT NOT NULL, 
	actual_cost FLOAT NOT NULL, 
	currency VARCHAR(10) NOT NULL, 
	tenant_notes TEXT, 
	landlord_notes TEXT, 
	acknowledged_at TIMESTAMP WITH TIME ZONE, 
	scheduled_at TIMESTAMP WITH TIME ZONE, 
	resolved_at TIMESTAMP WITH TIME ZONE, 
	closed_at TIMESTAMP WITH TIME ZONE, 
	expense_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenant_profiles (id) ON DELETE CASCADE, 
	FOREIGN KEY(landlord_id) REFERENCES landlord_profiles (id) ON DELETE CASCADE, 
	FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE CASCADE, 
	FOREIGN KEY(unit_id) REFERENCES units (id) ON DELETE CASCADE, 
	FOREIGN KEY(tenancy_id) REFERENCES tenancies (id) ON DELETE CASCADE
);

CREATE TABLE complaint_comments (
	id UUID NOT NULL, 
	complaint_id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	author_name VARCHAR(255), 
	author_role VARCHAR(50), 
	message TEXT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(complaint_id) REFERENCES complaints (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES profiles (id) ON DELETE CASCADE
);

CREATE TABLE expenses (
	id UUID NOT NULL, 
	landlord_id UUID NOT NULL, 
	property_id UUID NOT NULL, 
	unit_id UUID, 
	category expensecategory NOT NULL, 
	description TEXT NOT NULL, 
	amount NUMERIC(12, 2) NOT NULL, 
	currency VARCHAR(10) NOT NULL, 
	expense_date DATE NOT NULL, 
	vendor VARCHAR(255), 
	reference VARCHAR(100), 
	status expensestatus NOT NULL, 
	maintenance_request_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(landlord_id) REFERENCES landlord_profiles (id) ON DELETE RESTRICT, 
	FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE RESTRICT, 
	FOREIGN KEY(unit_id) REFERENCES units (id) ON DELETE SET NULL, 
	FOREIGN KEY(maintenance_request_id) REFERENCES maintenance_requests (id) ON DELETE SET NULL
);

CREATE TABLE invoices (
	id UUID NOT NULL, 
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
	subtotal NUMERIC(12, 2) NOT NULL, 
	discount NUMERIC(12, 2) NOT NULL, 
	late_fee NUMERIC(12, 2) NOT NULL, 
	total_amount NUMERIC(12, 2) NOT NULL, 
	amount_paid NUMERIC(12, 2) NOT NULL, 
	balance_due NUMERIC(12, 2) NOT NULL, 
	currency VARCHAR(10) NOT NULL, 
	status invoicestatus NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	CONSTRAINT uq_invoice_lease_period UNIQUE (lease_id, billing_period_start, billing_period_end), 
	FOREIGN KEY(landlord_id) REFERENCES landlord_profiles (id) ON DELETE RESTRICT, 
	FOREIGN KEY(tenant_id) REFERENCES tenant_profiles (id) ON DELETE RESTRICT, 
	FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE RESTRICT, 
	FOREIGN KEY(unit_id) REFERENCES units (id) ON DELETE RESTRICT, 
	FOREIGN KEY(tenancy_id) REFERENCES tenancies (id) ON DELETE CASCADE, 
	FOREIGN KEY(lease_id) REFERENCES leases (id) ON DELETE CASCADE
);

CREATE TABLE lease_documents (
	id UUID NOT NULL, 
	lease_id UUID NOT NULL, 
	document_name VARCHAR(255) NOT NULL, 
	file_name VARCHAR(255) NOT NULL, 
	file_type VARCHAR(100) NOT NULL, 
	file_size INTEGER NOT NULL, 
	file_data TEXT, 
	version INTEGER NOT NULL, 
	version_notes VARCHAR(500), 
	uploaded_by VARCHAR(255), 
	uploaded_by_role VARCHAR(50), 
	status VARCHAR(20) NOT NULL, 
	is_verified BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(lease_id) REFERENCES leases (id) ON DELETE CASCADE
);

CREATE TABLE maintenance_attachments (
	id UUID NOT NULL, 
	maintenance_request_id UUID NOT NULL, 
	file_path VARCHAR(500) NOT NULL, 
	file_name VARCHAR(255) NOT NULL, 
	mime_type VARCHAR(100) NOT NULL, 
	size INTEGER NOT NULL, 
	uploaded_by UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(maintenance_request_id) REFERENCES maintenance_requests (id) ON DELETE CASCADE
);

CREATE TABLE maintenance_comments (
	id UUID NOT NULL, 
	maintenance_request_id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	author_name VARCHAR(255), 
	author_role VARCHAR(50), 
	message TEXT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(maintenance_request_id) REFERENCES maintenance_requests (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES profiles (id) ON DELETE CASCADE
);

CREATE TABLE messages (
	id UUID NOT NULL, 
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
	is_read BOOLEAN NOT NULL, 
	read_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(sender_id) REFERENCES profiles (id) ON DELETE CASCADE, 
	FOREIGN KEY(recipient_id) REFERENCES profiles (id) ON DELETE CASCADE, 
	FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE SET NULL, 
	FOREIGN KEY(unit_id) REFERENCES units (id) ON DELETE SET NULL, 
	FOREIGN KEY(tenancy_id) REFERENCES tenancies (id) ON DELETE SET NULL, 
	FOREIGN KEY(maintenance_request_id) REFERENCES maintenance_requests (id) ON DELETE SET NULL
);

CREATE TABLE reminder_histories (
	id UUID NOT NULL, 
	lease_id UUID NOT NULL, 
	milestone VARCHAR(50) NOT NULL, 
	target_date DATE NOT NULL, 
	notification_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(lease_id) REFERENCES leases (id) ON DELETE CASCADE, 
	FOREIGN KEY(notification_id) REFERENCES notifications (id) ON DELETE SET NULL
);

CREATE TABLE rent_schedules (
	id UUID NOT NULL, 
	tenancy_id UUID NOT NULL, 
	lease_id UUID NOT NULL, 
	landlord_id UUID NOT NULL, 
	tenant_id UUID NOT NULL, 
	property_id UUID NOT NULL, 
	unit_id UUID NOT NULL, 
	amount NUMERIC(12, 2) NOT NULL, 
	currency VARCHAR(10) NOT NULL, 
	frequency rentschedulefrequency NOT NULL, 
	due_day INTEGER NOT NULL, 
	effective_from DATE NOT NULL, 
	effective_to DATE, 
	status rentschedulestatus NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenancy_id) REFERENCES tenancies (id) ON DELETE CASCADE, 
	FOREIGN KEY(lease_id) REFERENCES leases (id) ON DELETE CASCADE, 
	FOREIGN KEY(landlord_id) REFERENCES landlord_profiles (id) ON DELETE RESTRICT, 
	FOREIGN KEY(tenant_id) REFERENCES tenant_profiles (id) ON DELETE RESTRICT, 
	FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE RESTRICT, 
	FOREIGN KEY(unit_id) REFERENCES units (id) ON DELETE RESTRICT
);

CREATE TABLE payments (
	id UUID NOT NULL, 
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
	currency VARCHAR(10) NOT NULL, 
	payment_method paymentmethod NOT NULL, 
	payment_channel paymentchannel NOT NULL, 
	status paymentstatus NOT NULL, 
	paid_at TIMESTAMP WITH TIME ZONE, 
	verified_at TIMESTAMP WITH TIME ZONE, 
	verified_by UUID, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(invoice_id) REFERENCES invoices (id) ON DELETE RESTRICT, 
	FOREIGN KEY(tenancy_id) REFERENCES tenancies (id) ON DELETE RESTRICT, 
	FOREIGN KEY(lease_id) REFERENCES leases (id) ON DELETE RESTRICT, 
	FOREIGN KEY(landlord_id) REFERENCES landlord_profiles (id) ON DELETE RESTRICT, 
	FOREIGN KEY(tenant_id) REFERENCES tenant_profiles (id) ON DELETE RESTRICT, 
	FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE RESTRICT, 
	FOREIGN KEY(unit_id) REFERENCES units (id) ON DELETE RESTRICT
);

CREATE TABLE bank_transactions (
	id UUID NOT NULL, 
	statement_id UUID NOT NULL, 
	landlord_id UUID NOT NULL, 
	transaction_reference VARCHAR(120), 
	transaction_date DATE NOT NULL, 
	transaction_time VARCHAR(30), 
	amount NUMERIC(14, 2) NOT NULL, 
	currency VARCHAR(10) NOT NULL, 
	is_credit BOOLEAN NOT NULL, 
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
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(statement_id) REFERENCES bank_statements (id) ON DELETE CASCADE, 
	FOREIGN KEY(landlord_id) REFERENCES landlord_profiles (id) ON DELETE CASCADE, 
	FOREIGN KEY(matched_tenant_id) REFERENCES tenant_profiles (id) ON DELETE SET NULL, 
	FOREIGN KEY(matched_invoice_id) REFERENCES invoices (id) ON DELETE SET NULL, 
	FOREIGN KEY(matched_payment_id) REFERENCES payments (id) ON DELETE SET NULL
);

CREATE TABLE receipts (
	id UUID NOT NULL, 
	receipt_number VARCHAR(50) NOT NULL, 
	payment_id UUID NOT NULL, 
	invoice_id UUID NOT NULL, 
	tenant_id UUID NOT NULL, 
	landlord_id UUID NOT NULL, 
	property_id UUID NOT NULL, 
	unit_id UUID NOT NULL, 
	amount NUMERIC(12, 2) NOT NULL, 
	currency VARCHAR(10) NOT NULL, 
	issued_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(payment_id) REFERENCES payments (id) ON DELETE RESTRICT, 
	FOREIGN KEY(invoice_id) REFERENCES invoices (id) ON DELETE RESTRICT, 
	FOREIGN KEY(tenant_id) REFERENCES tenant_profiles (id) ON DELETE RESTRICT, 
	FOREIGN KEY(landlord_id) REFERENCES landlord_profiles (id) ON DELETE RESTRICT, 
	FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE RESTRICT, 
	FOREIGN KEY(unit_id) REFERENCES units (id) ON DELETE RESTRICT
);

CREATE TABLE payment_matches (
	id UUID NOT NULL, 
	transaction_id UUID NOT NULL, 
	statement_id UUID NOT NULL, 
	landlord_id UUID NOT NULL, 
	tenant_id UUID NOT NULL, 
	invoice_id UUID NOT NULL, 
	payment_id UUID, 
	matched_amount NUMERIC(14, 2) NOT NULL, 
	confidence VARCHAR(20) NOT NULL, 
	confidence_score FLOAT NOT NULL, 
	matching_signals TEXT, 
	review_status VARCHAR(30) NOT NULL, 
	confirmed_by UUID, 
	confirmed_at TIMESTAMP WITH TIME ZONE, 
	rejection_reason TEXT, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(transaction_id) REFERENCES bank_transactions (id) ON DELETE CASCADE, 
	FOREIGN KEY(statement_id) REFERENCES bank_statements (id) ON DELETE CASCADE, 
	FOREIGN KEY(landlord_id) REFERENCES landlord_profiles (id) ON DELETE CASCADE, 
	FOREIGN KEY(tenant_id) REFERENCES tenant_profiles (id) ON DELETE CASCADE, 
	FOREIGN KEY(invoice_id) REFERENCES invoices (id) ON DELETE CASCADE, 
	FOREIGN KEY(payment_id) REFERENCES payments (id) ON DELETE SET NULL
);


-- -----------------------------------------------------------------------------
-- 3. Indexes
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX ix_notification_templates_code ON notification_templates (code);
CREATE UNIQUE INDEX ix_profiles_email ON profiles (email);
CREATE UNIQUE INDEX ix_profiles_phone ON profiles (phone);
CREATE INDEX ix_audit_logs_entity_id ON audit_logs (entity_id);
CREATE INDEX ix_audit_logs_user_id ON audit_logs (user_id);
CREATE UNIQUE INDEX ix_notification_preferences_user_id ON notification_preferences (user_id);
CREATE INDEX ix_notifications_user_id ON notifications (user_id);
CREATE INDEX ix_bank_accounts_landlord_id ON bank_accounts (landlord_id);
CREATE INDEX ix_maintenance_workers_landlord_id ON maintenance_workers (landlord_id);
CREATE INDEX ix_properties_landlord_id ON properties (landlord_id);
CREATE INDEX ix_bank_statements_property_id ON bank_statements (property_id);
CREATE INDEX ix_bank_statements_landlord_id ON bank_statements (landlord_id);
CREATE INDEX ix_units_property_id ON units (property_id);
CREATE INDEX ix_units_landlord_id ON units (landlord_id);
CREATE INDEX ix_invitations_landlord_id ON invitations (landlord_id);
CREATE UNIQUE INDEX ix_invitations_token_hash ON invitations (token_hash);
CREATE INDEX ix_invitations_tenant_profile_id ON invitations (tenant_profile_id);
CREATE INDEX ix_invitations_status ON invitations (status);
CREATE INDEX ix_tenancies_unit_id ON tenancies (unit_id);
CREATE INDEX ix_tenancies_landlord_id ON tenancies (landlord_id);
CREATE INDEX ix_tenancies_tenant_id ON tenancies (tenant_id);
CREATE INDEX ix_complaints_tenant_id ON complaints (tenant_id);
CREATE INDEX ix_complaints_tenancy_id ON complaints (tenancy_id);
CREATE INDEX ix_complaints_unit_id ON complaints (unit_id);
CREATE UNIQUE INDEX ix_complaints_complaint_number ON complaints (complaint_number);
CREATE INDEX ix_complaints_property_id ON complaints (property_id);
CREATE INDEX ix_complaints_landlord_id ON complaints (landlord_id);
CREATE INDEX ix_leases_tenant_id ON leases (tenant_id);
CREATE INDEX ix_leases_tenancy_id ON leases (tenancy_id);
CREATE INDEX ix_leases_unit_id ON leases (unit_id);
CREATE INDEX ix_leases_landlord_id ON leases (landlord_id);
CREATE UNIQUE INDEX ix_maintenance_requests_request_number ON maintenance_requests (request_number);
CREATE INDEX ix_maintenance_requests_tenancy_id ON maintenance_requests (tenancy_id);
CREATE INDEX ix_maintenance_requests_unit_id ON maintenance_requests (unit_id);
CREATE INDEX ix_maintenance_requests_property_id ON maintenance_requests (property_id);
CREATE INDEX ix_maintenance_requests_landlord_id ON maintenance_requests (landlord_id);
CREATE INDEX ix_maintenance_requests_tenant_id ON maintenance_requests (tenant_id);
CREATE INDEX ix_complaint_comments_complaint_id ON complaint_comments (complaint_id);
CREATE INDEX ix_expenses_unit_id ON expenses (unit_id);
CREATE INDEX ix_expenses_maintenance_request_id ON expenses (maintenance_request_id);
CREATE INDEX ix_expenses_property_id ON expenses (property_id);
CREATE INDEX ix_expenses_landlord_id ON expenses (landlord_id);
CREATE INDEX ix_invoices_landlord_id ON invoices (landlord_id);
CREATE UNIQUE INDEX ix_invoices_invoice_number ON invoices (invoice_number);
CREATE INDEX ix_invoices_lease_id ON invoices (lease_id);
CREATE INDEX ix_invoices_tenancy_id ON invoices (tenancy_id);
CREATE INDEX ix_invoices_unit_id ON invoices (unit_id);
CREATE INDEX ix_invoices_property_id ON invoices (property_id);
CREATE INDEX ix_invoices_tenant_id ON invoices (tenant_id);
CREATE INDEX ix_lease_documents_lease_id ON lease_documents (lease_id);
CREATE INDEX ix_maintenance_attachments_maintenance_request_id ON maintenance_attachments (maintenance_request_id);
CREATE INDEX ix_maintenance_comments_maintenance_request_id ON maintenance_comments (maintenance_request_id);
CREATE INDEX ix_messages_recipient_id ON messages (recipient_id);
CREATE INDEX ix_messages_property_id ON messages (property_id);
CREATE INDEX ix_messages_sender_id ON messages (sender_id);
CREATE INDEX ix_messages_maintenance_request_id ON messages (maintenance_request_id);
CREATE INDEX ix_messages_tenancy_id ON messages (tenancy_id);
CREATE INDEX ix_messages_unit_id ON messages (unit_id);
CREATE INDEX ix_reminder_histories_lease_id ON reminder_histories (lease_id);
CREATE INDEX ix_rent_schedules_tenancy_id ON rent_schedules (tenancy_id);
CREATE INDEX ix_rent_schedules_lease_id ON rent_schedules (lease_id);
CREATE INDEX ix_rent_schedules_tenant_id ON rent_schedules (tenant_id);
CREATE INDEX ix_rent_schedules_landlord_id ON rent_schedules (landlord_id);
CREATE INDEX ix_rent_schedules_unit_id ON rent_schedules (unit_id);
CREATE INDEX ix_payments_invoice_id ON payments (invoice_id);
CREATE INDEX ix_payments_property_id ON payments (property_id);
CREATE INDEX ix_payments_unit_id ON payments (unit_id);
CREATE UNIQUE INDEX ix_payments_payment_reference ON payments (payment_reference);
CREATE INDEX ix_payments_tenant_id ON payments (tenant_id);
CREATE INDEX ix_payments_landlord_id ON payments (landlord_id);
CREATE INDEX ix_payments_lease_id ON payments (lease_id);
CREATE INDEX ix_payments_tenancy_id ON payments (tenancy_id);
CREATE INDEX ix_bank_transactions_matched_invoice_id ON bank_transactions (matched_invoice_id);
CREATE INDEX ix_bank_transactions_matched_tenant_id ON bank_transactions (matched_tenant_id);
CREATE INDEX ix_bank_transactions_statement_id ON bank_transactions (statement_id);
CREATE INDEX ix_bank_txn_dedup ON bank_transactions (landlord_id, transaction_reference, transaction_date, amount);
CREATE INDEX ix_bank_transactions_transaction_date ON bank_transactions (transaction_date);
CREATE INDEX ix_bank_transactions_landlord_id ON bank_transactions (landlord_id);
CREATE INDEX ix_bank_transactions_transaction_reference ON bank_transactions (transaction_reference);
CREATE INDEX ix_receipts_landlord_id ON receipts (landlord_id);
CREATE INDEX ix_receipts_tenant_id ON receipts (tenant_id);
CREATE INDEX ix_receipts_invoice_id ON receipts (invoice_id);
CREATE UNIQUE INDEX ix_receipts_payment_id ON receipts (payment_id);
CREATE INDEX ix_receipts_unit_id ON receipts (unit_id);
CREATE UNIQUE INDEX ix_receipts_receipt_number ON receipts (receipt_number);
CREATE INDEX ix_receipts_property_id ON receipts (property_id);
CREATE INDEX ix_payment_matches_statement_id ON payment_matches (statement_id);
CREATE INDEX ix_payment_matches_invoice_id ON payment_matches (invoice_id);
CREATE INDEX ix_payment_matches_landlord_id ON payment_matches (landlord_id);
CREATE INDEX ix_payment_matches_tenant_id ON payment_matches (tenant_id);
CREATE INDEX ix_payment_matches_transaction_id ON payment_matches (transaction_id);

-- -----------------------------------------------------------------------------
-- 4. Timestamps
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END $$;

-- -----------------------------------------------------------------------------
-- 5. Identity: keep public.profiles in step with auth.users
-- -----------------------------------------------------------------------------

-- Creates the application profile whenever Supabase Auth creates a user.
--
-- The role is deliberately NOT read from user_metadata: that is writable by the
-- client, so a sign-up form could otherwise ask for SYSTEM_ADMIN and be given
-- it. It comes from app_metadata, which only the service role can set, and
-- defaults to TENANT.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    granted   text := NEW.raw_app_meta_data  ->> 'role';           -- service role only
    requested text := NEW.raw_user_meta_data ->> 'requested_role';  -- client supplied
    resolved  userrole := 'TENANT';
BEGIN
    -- With email confirmation on, signUp() returns no session, so the browser
    -- cannot call the backend to record the role it was asked for. The form
    -- therefore puts its choice in user_metadata.requested_role and it is read
    -- here. That field IS client-writable, so it is clamped to the two roles
    -- anyone may pick for themselves; SYSTEM_ADMIN only ever comes from
    -- app_metadata, which needs the service key.
    IF granted IN ('SYSTEM_ADMIN', 'LANDLORD', 'TENANT') THEN
        resolved := granted::userrole;
    ELSIF requested IN ('LANDLORD', 'TENANT') THEN
        resolved := requested::userrole;
    END IF;

    INSERT INTO public.profiles (
        id, email, phone, first_name, last_name, role, language, status,
        email_verified, phone_verified, created_at, updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NULLIF(NEW.phone, ''), NEW.raw_user_meta_data ->> 'phone',
                 'pending-' || left(NEW.id::text, 8)),
        COALESCE(NEW.raw_user_meta_data ->> 'first_name',
                 split_part(COALESCE(NEW.email, 'New User'), '@', 1)),
        COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
        resolved,
        COALESCE((NEW.raw_user_meta_data ->> 'language')::userlanguage, 'EN'),
        'ACTIVE',
        NEW.email_confirmed_at IS NOT NULL,
        NEW.phone_confirmed_at IS NOT NULL,
        now(), now()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Mirrors confirmation and sign-in changes back onto the profile, so the app
-- never has to read the auth schema.
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    requested text := NEW.raw_app_meta_data ->> 'role';
BEGIN
    UPDATE public.profiles p
       SET email_verified = NEW.email_confirmed_at IS NOT NULL,
           phone_verified = NEW.phone_confirmed_at IS NOT NULL,
           email          = COALESCE(NEW.email, p.email),
           last_login_at  = COALESCE(NEW.last_sign_in_at, p.last_login_at),
           -- GoTrue inserts the auth.users row first and applies app_metadata
           -- in a follow-up UPDATE, so the role is not yet present when the
           -- INSERT trigger runs. Syncing it here is what makes a landlord
           -- sign-up actually come out as a landlord.
           role           = CASE
                                WHEN requested IN ('SYSTEM_ADMIN', 'LANDLORD', 'TENANT')
                                THEN requested::userrole
                                ELSE p.role
                            END,
           updated_at     = now()
     WHERE p.id = NEW.id;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user_to_profile();

-- A signed-in user must not be able to promote themselves. Only the service
-- role (the FastAPI backend) may change a role or an account status.
CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    -- A client always reaches the database through PostgREST as `authenticated`
    -- or `anon`; enforcing the rule for exactly those two blocks self-promotion
    -- while letting the auth server, the backend and internal SECURITY DEFINER
    -- triggers do their work. (Allowing only `service_role` broke GoTrue, which
    -- connects as `supabase_auth_admin`.)
    IF COALESCE(auth.role(), '') NOT IN ('authenticated', 'anon') THEN
        RETURN NEW;
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'role cannot be changed from the client';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'status cannot be changed from the client';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_guard_privileges ON public.profiles;
CREATE TRIGGER profiles_guard_privileges
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileges();

-- -----------------------------------------------------------------------------
-- 6. RLS helper functions
--    SECURITY DEFINER, so reading the caller's own role does not re-enter the
--    policies that depend on it.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(
        (SELECT role = 'SYSTEM_ADMIN' FROM public.profiles WHERE id = auth.uid()),
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.current_landlord_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT id FROM public.landlord_profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT id FROM public.tenant_profiles WHERE user_id = auth.uid();
$$;

-- Timestamp trigger on every table that has updated_at.
DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER profiles_touch_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS landlord_profiles_touch_updated_at ON public.landlord_profiles;
CREATE TRIGGER landlord_profiles_touch_updated_at BEFORE UPDATE ON public.landlord_profiles
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS notification_preferences_touch_updated_at ON public.notification_preferences;
CREATE TRIGGER notification_preferences_touch_updated_at BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS tenant_profiles_touch_updated_at ON public.tenant_profiles;
CREATE TRIGGER tenant_profiles_touch_updated_at BEFORE UPDATE ON public.tenant_profiles
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS bank_accounts_touch_updated_at ON public.bank_accounts;
CREATE TRIGGER bank_accounts_touch_updated_at BEFORE UPDATE ON public.bank_accounts
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS properties_touch_updated_at ON public.properties;
CREATE TRIGGER properties_touch_updated_at BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS bank_statements_touch_updated_at ON public.bank_statements;
CREATE TRIGGER bank_statements_touch_updated_at BEFORE UPDATE ON public.bank_statements
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS units_touch_updated_at ON public.units;
CREATE TRIGGER units_touch_updated_at BEFORE UPDATE ON public.units
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS tenancies_touch_updated_at ON public.tenancies;
CREATE TRIGGER tenancies_touch_updated_at BEFORE UPDATE ON public.tenancies
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS complaints_touch_updated_at ON public.complaints;
CREATE TRIGGER complaints_touch_updated_at BEFORE UPDATE ON public.complaints
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS leases_touch_updated_at ON public.leases;
CREATE TRIGGER leases_touch_updated_at BEFORE UPDATE ON public.leases
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS maintenance_requests_touch_updated_at ON public.maintenance_requests;
CREATE TRIGGER maintenance_requests_touch_updated_at BEFORE UPDATE ON public.maintenance_requests
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS expenses_touch_updated_at ON public.expenses;
CREATE TRIGGER expenses_touch_updated_at BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS invoices_touch_updated_at ON public.invoices;
CREATE TRIGGER invoices_touch_updated_at BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS messages_touch_updated_at ON public.messages;
CREATE TRIGGER messages_touch_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS rent_schedules_touch_updated_at ON public.rent_schedules;
CREATE TRIGGER rent_schedules_touch_updated_at BEFORE UPDATE ON public.rent_schedules
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS payments_touch_updated_at ON public.payments;
CREATE TRIGGER payments_touch_updated_at BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS bank_transactions_touch_updated_at ON public.bank_transactions;
CREATE TRIGGER bank_transactions_touch_updated_at BEFORE UPDATE ON public.bank_transactions
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS payment_matches_touch_updated_at ON public.payment_matches;
CREATE TRIGGER payment_matches_touch_updated_at BEFORE UPDATE ON public.payment_matches
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- 7. Row Level Security
--
--    Deny by default. `anon` gets nothing at all: the browser never queries
--    PostgREST directly, and the anon key is public. `authenticated` reaches
--    only its own rows, and `service_role` (the FastAPI backend) has full
--    access because it enforces the same rules in application code.
--
--    FORCE ROW LEVEL SECURITY is set so that even the table owner is subject
--    to the policies.
-- -----------------------------------------------------------------------------

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

-- notification_templates
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notification_templates_service_role" ON public.notification_templates;
CREATE POLICY "notification_templates_service_role" ON public.notification_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "notification_templates_admin_only" ON public.notification_templates;
CREATE POLICY "notification_templates_admin_only" ON public.notification_templates FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_service_role" ON public.profiles;
CREATE POLICY "profiles_service_role" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());

-- audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_service_role" ON public.audit_logs;
CREATE POLICY "audit_logs_service_role" ON public.audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "audit_logs_admin_only" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_only" ON public.audit_logs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- landlord_profiles
ALTER TABLE public.landlord_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "landlord_profiles_service_role" ON public.landlord_profiles;
CREATE POLICY "landlord_profiles_service_role" ON public.landlord_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "landlord_profiles_self" ON public.landlord_profiles;
CREATE POLICY "landlord_profiles_self" ON public.landlord_profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "landlord_profiles_self_update" ON public.landlord_profiles;
CREATE POLICY "landlord_profiles_self_update" ON public.landlord_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notification_preferences_service_role" ON public.notification_preferences;
CREATE POLICY "notification_preferences_service_role" ON public.notification_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "notification_preferences_own" ON public.notification_preferences;
CREATE POLICY "notification_preferences_own" ON public.notification_preferences FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_service_role" ON public.notifications;
CREATE POLICY "notifications_service_role" ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
CREATE POLICY "notifications_own" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- tenant_profiles
ALTER TABLE public.tenant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_profiles_service_role" ON public.tenant_profiles;
CREATE POLICY "tenant_profiles_service_role" ON public.tenant_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_profiles_self" ON public.tenant_profiles;
CREATE POLICY "tenant_profiles_self" ON public.tenant_profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "tenant_profiles_self_update" ON public.tenant_profiles;
CREATE POLICY "tenant_profiles_self_update" ON public.tenant_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "tenant_profiles_landlord_read" ON public.tenant_profiles;
CREATE POLICY "tenant_profiles_landlord_read" ON public.tenant_profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.tenancies t WHERE t.tenant_id = tenant_profiles.id AND t.landlord_id = public.current_landlord_id()) OR public.is_admin());

-- bank_accounts
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bank_accounts_service_role" ON public.bank_accounts;
CREATE POLICY "bank_accounts_service_role" ON public.bank_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "bank_accounts_read" ON public.bank_accounts;
CREATE POLICY "bank_accounts_read" ON public.bank_accounts FOR SELECT TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin());
DROP POLICY IF EXISTS "bank_accounts_landlord_write" ON public.bank_accounts;
CREATE POLICY "bank_accounts_landlord_write" ON public.bank_accounts FOR ALL TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin()) WITH CHECK ((landlord_id = public.current_landlord_id()) OR public.is_admin());

-- maintenance_workers
ALTER TABLE public.maintenance_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_workers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maintenance_workers_service_role" ON public.maintenance_workers;
CREATE POLICY "maintenance_workers_service_role" ON public.maintenance_workers FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "maintenance_workers_read" ON public.maintenance_workers;
CREATE POLICY "maintenance_workers_read" ON public.maintenance_workers FOR SELECT TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin());
DROP POLICY IF EXISTS "maintenance_workers_landlord_write" ON public.maintenance_workers;
CREATE POLICY "maintenance_workers_landlord_write" ON public.maintenance_workers FOR ALL TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin()) WITH CHECK ((landlord_id = public.current_landlord_id()) OR public.is_admin());

-- notification_delivery_logs
ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notification_delivery_logs_service_role" ON public.notification_delivery_logs;
CREATE POLICY "notification_delivery_logs_service_role" ON public.notification_delivery_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "notification_delivery_logs_read" ON public.notification_delivery_logs;
CREATE POLICY "notification_delivery_logs_read" ON public.notification_delivery_logs FOR SELECT TO authenticated USING ((EXISTS (SELECT 1 FROM public.notifications n WHERE n.id = notification_delivery_logs.notification_id AND n.user_id = auth.uid())) OR public.is_admin());

-- properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "properties_service_role" ON public.properties;
CREATE POLICY "properties_service_role" ON public.properties FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "properties_read" ON public.properties;
CREATE POLICY "properties_read" ON public.properties FOR SELECT TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin());
DROP POLICY IF EXISTS "properties_landlord_write" ON public.properties;
CREATE POLICY "properties_landlord_write" ON public.properties FOR ALL TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin()) WITH CHECK ((landlord_id = public.current_landlord_id()) OR public.is_admin());

-- bank_statements
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bank_statements_service_role" ON public.bank_statements;
CREATE POLICY "bank_statements_service_role" ON public.bank_statements FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "bank_statements_read" ON public.bank_statements;
CREATE POLICY "bank_statements_read" ON public.bank_statements FOR SELECT TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin());
DROP POLICY IF EXISTS "bank_statements_landlord_write" ON public.bank_statements;
CREATE POLICY "bank_statements_landlord_write" ON public.bank_statements FOR ALL TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin()) WITH CHECK ((landlord_id = public.current_landlord_id()) OR public.is_admin());

-- units
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "units_service_role" ON public.units;
CREATE POLICY "units_service_role" ON public.units FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "units_read" ON public.units;
CREATE POLICY "units_read" ON public.units FOR SELECT TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin());
DROP POLICY IF EXISTS "units_landlord_write" ON public.units;
CREATE POLICY "units_landlord_write" ON public.units FOR ALL TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin()) WITH CHECK ((landlord_id = public.current_landlord_id()) OR public.is_admin());

-- invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invitations_service_role" ON public.invitations;
CREATE POLICY "invitations_service_role" ON public.invitations FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "invitations_read" ON public.invitations;
CREATE POLICY "invitations_read" ON public.invitations FOR SELECT TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin());
DROP POLICY IF EXISTS "invitations_landlord_write" ON public.invitations;
CREATE POLICY "invitations_landlord_write" ON public.invitations FOR ALL TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin()) WITH CHECK ((landlord_id = public.current_landlord_id()) OR public.is_admin());

-- tenancies
ALTER TABLE public.tenancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenancies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenancies_service_role" ON public.tenancies;
CREATE POLICY "tenancies_service_role" ON public.tenancies FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tenancies_read" ON public.tenancies;
CREATE POLICY "tenancies_read" ON public.tenancies FOR SELECT TO authenticated USING ((landlord_id = public.current_landlord_id()) OR (tenant_id = public.current_tenant_id()) OR public.is_admin());
DROP POLICY IF EXISTS "tenancies_landlord_write" ON public.tenancies;
CREATE POLICY "tenancies_landlord_write" ON public.tenancies FOR ALL TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin()) WITH CHECK ((landlord_id = public.current_landlord_id()) OR public.is_admin());

-- complaints
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "complaints_service_role" ON public.complaints;
CREATE POLICY "complaints_service_role" ON public.complaints FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "complaints_read" ON public.complaints;
CREATE POLICY "complaints_read" ON public.complaints FOR SELECT TO authenticated USING ((landlord_id = public.current_landlord_id()) OR (tenant_id = public.current_tenant_id()) OR public.is_admin());
DROP POLICY IF EXISTS "complaints_landlord_write" ON public.complaints;
CREATE POLICY "complaints_landlord_write" ON public.complaints FOR ALL TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin()) WITH CHECK ((landlord_id = public.current_landlord_id()) OR public.is_admin());

-- leases
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leases_service_role" ON public.leases;
CREATE POLICY "leases_service_role" ON public.leases FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "leases_read" ON public.leases;
CREATE POLICY "leases_read" ON public.leases FOR SELECT TO authenticated USING ((landlord_id = public.current_landlord_id()) OR (tenant_id = public.current_tenant_id()) OR public.is_admin());
DROP POLICY IF EXISTS "leases_landlord_write" ON public.leases;
CREATE POLICY "leases_landlord_write" ON public.leases FOR ALL TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin()) WITH CHECK ((landlord_id = public.current_landlord_id()) OR public.is_admin());

-- maintenance_requests
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maintenance_requests_service_role" ON public.maintenance_requests;
CREATE POLICY "maintenance_requests_service_role" ON public.maintenance_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "maintenance_requests_read" ON public.maintenance_requests;
CREATE POLICY "maintenance_requests_read" ON public.maintenance_requests FOR SELECT TO authenticated USING ((landlord_id = public.current_landlord_id()) OR (tenant_id = public.current_tenant_id()) OR public.is_admin());
DROP POLICY IF EXISTS "maintenance_requests_landlord_write" ON public.maintenance_requests;
CREATE POLICY "maintenance_requests_landlord_write" ON public.maintenance_requests FOR ALL TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin()) WITH CHECK ((landlord_id = public.current_landlord_id()) OR public.is_admin());

-- complaint_comments
ALTER TABLE public.complaint_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_comments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "complaint_comments_service_role" ON public.complaint_comments;
CREATE POLICY "complaint_comments_service_role" ON public.complaint_comments FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "complaint_comments_party" ON public.complaint_comments;
CREATE POLICY "complaint_comments_party" ON public.complaint_comments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.complaints p WHERE p.id = complaint_comments.complaint_id AND (p.landlord_id = public.current_landlord_id() OR p.tenant_id = public.current_tenant_id())) OR public.is_admin()) WITH CHECK (EXISTS (SELECT 1 FROM public.complaints p WHERE p.id = complaint_comments.complaint_id AND (p.landlord_id = public.current_landlord_id() OR p.tenant_id = public.current_tenant_id())) OR public.is_admin());

-- expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expenses_service_role" ON public.expenses;
CREATE POLICY "expenses_service_role" ON public.expenses FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "expenses_read" ON public.expenses;
CREATE POLICY "expenses_read" ON public.expenses FOR SELECT TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin());
DROP POLICY IF EXISTS "expenses_landlord_write" ON public.expenses;
CREATE POLICY "expenses_landlord_write" ON public.expenses FOR ALL TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin()) WITH CHECK ((landlord_id = public.current_landlord_id()) OR public.is_admin());

-- invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_service_role" ON public.invoices;
CREATE POLICY "invoices_service_role" ON public.invoices FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "invoices_read" ON public.invoices;
CREATE POLICY "invoices_read" ON public.invoices FOR SELECT TO authenticated USING ((landlord_id = public.current_landlord_id()) OR (tenant_id = public.current_tenant_id()) OR public.is_admin());
DROP POLICY IF EXISTS "invoices_landlord_write" ON public.invoices;
CREATE POLICY "invoices_landlord_write" ON public.invoices FOR ALL TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin()) WITH CHECK ((landlord_id = public.current_landlord_id()) OR public.is_admin());

-- lease_documents
ALTER TABLE public.lease_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_documents FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lease_documents_service_role" ON public.lease_documents;
CREATE POLICY "lease_documents_service_role" ON public.lease_documents FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "lease_documents_read" ON public.lease_documents;
CREATE POLICY "lease_documents_read" ON public.lease_documents FOR SELECT TO authenticated USING ((EXISTS (SELECT 1 FROM public.leases l WHERE l.id = lease_documents.lease_id AND l.landlord_id = public.current_landlord_id())) OR (EXISTS (SELECT 1 FROM public.leases l WHERE l.id = lease_documents.lease_id AND l.tenant_id = public.current_tenant_id())) OR public.is_admin());
DROP POLICY IF EXISTS "lease_documents_landlord_write" ON public.lease_documents;
CREATE POLICY "lease_documents_landlord_write" ON public.lease_documents FOR ALL TO authenticated USING ((EXISTS (SELECT 1 FROM public.leases l WHERE l.id = lease_documents.lease_id AND l.landlord_id = public.current_landlord_id())) OR public.is_admin()) WITH CHECK ((EXISTS (SELECT 1 FROM public.leases l WHERE l.id = lease_documents.lease_id AND l.landlord_id = public.current_landlord_id())) OR public.is_admin());

-- maintenance_attachments
ALTER TABLE public.maintenance_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_attachments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maintenance_attachments_service_role" ON public.maintenance_attachments;
CREATE POLICY "maintenance_attachments_service_role" ON public.maintenance_attachments FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "maintenance_attachments_party" ON public.maintenance_attachments;
CREATE POLICY "maintenance_attachments_party" ON public.maintenance_attachments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.maintenance_requests p WHERE p.id = maintenance_attachments.maintenance_request_id AND (p.landlord_id = public.current_landlord_id() OR p.tenant_id = public.current_tenant_id())) OR public.is_admin()) WITH CHECK (EXISTS (SELECT 1 FROM public.maintenance_requests p WHERE p.id = maintenance_attachments.maintenance_request_id AND (p.landlord_id = public.current_landlord_id() OR p.tenant_id = public.current_tenant_id())) OR public.is_admin());

-- maintenance_comments
ALTER TABLE public.maintenance_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_comments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maintenance_comments_service_role" ON public.maintenance_comments;
CREATE POLICY "maintenance_comments_service_role" ON public.maintenance_comments FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "maintenance_comments_party" ON public.maintenance_comments;
CREATE POLICY "maintenance_comments_party" ON public.maintenance_comments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.maintenance_requests p WHERE p.id = maintenance_comments.maintenance_request_id AND (p.landlord_id = public.current_landlord_id() OR p.tenant_id = public.current_tenant_id())) OR public.is_admin()) WITH CHECK (EXISTS (SELECT 1 FROM public.maintenance_requests p WHERE p.id = maintenance_comments.maintenance_request_id AND (p.landlord_id = public.current_landlord_id() OR p.tenant_id = public.current_tenant_id())) OR public.is_admin());

-- messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_service_role" ON public.messages;
CREATE POLICY "messages_service_role" ON public.messages FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "messages_participant" ON public.messages;
CREATE POLICY "messages_participant" ON public.messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "messages_send" ON public.messages;
CREATE POLICY "messages_send" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
DROP POLICY IF EXISTS "messages_mark_read" ON public.messages;
CREATE POLICY "messages_mark_read" ON public.messages FOR UPDATE TO authenticated USING (recipient_id = auth.uid() OR public.is_admin()) WITH CHECK (recipient_id = auth.uid() OR public.is_admin());

-- reminder_histories
ALTER TABLE public.reminder_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_histories FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reminder_histories_service_role" ON public.reminder_histories;
CREATE POLICY "reminder_histories_service_role" ON public.reminder_histories FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "reminder_histories_read" ON public.reminder_histories;
CREATE POLICY "reminder_histories_read" ON public.reminder_histories FOR SELECT TO authenticated USING ((EXISTS (SELECT 1 FROM public.leases l WHERE l.id = reminder_histories.lease_id AND l.landlord_id = public.current_landlord_id())) OR (EXISTS (SELECT 1 FROM public.leases l WHERE l.id = reminder_histories.lease_id AND l.tenant_id = public.current_tenant_id())) OR public.is_admin());
DROP POLICY IF EXISTS "reminder_histories_landlord_write" ON public.reminder_histories;
CREATE POLICY "reminder_histories_landlord_write" ON public.reminder_histories FOR ALL TO authenticated USING ((EXISTS (SELECT 1 FROM public.leases l WHERE l.id = reminder_histories.lease_id AND l.landlord_id = public.current_landlord_id())) OR public.is_admin()) WITH CHECK ((EXISTS (SELECT 1 FROM public.leases l WHERE l.id = reminder_histories.lease_id AND l.landlord_id = public.current_landlord_id())) OR public.is_admin());

-- rent_schedules
ALTER TABLE public.rent_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_schedules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rent_schedules_service_role" ON public.rent_schedules;
CREATE POLICY "rent_schedules_service_role" ON public.rent_schedules FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "rent_schedules_read" ON public.rent_schedules;
CREATE POLICY "rent_schedules_read" ON public.rent_schedules FOR SELECT TO authenticated USING ((landlord_id = public.current_landlord_id()) OR (tenant_id = public.current_tenant_id()) OR public.is_admin());
DROP POLICY IF EXISTS "rent_schedules_landlord_write" ON public.rent_schedules;
CREATE POLICY "rent_schedules_landlord_write" ON public.rent_schedules FOR ALL TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin()) WITH CHECK ((landlord_id = public.current_landlord_id()) OR public.is_admin());

-- payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_service_role" ON public.payments;
CREATE POLICY "payments_service_role" ON public.payments FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "payments_read" ON public.payments;
CREATE POLICY "payments_read" ON public.payments FOR SELECT TO authenticated USING ((landlord_id = public.current_landlord_id()) OR (tenant_id = public.current_tenant_id()) OR public.is_admin());
DROP POLICY IF EXISTS "payments_landlord_write" ON public.payments;
CREATE POLICY "payments_landlord_write" ON public.payments FOR ALL TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin()) WITH CHECK ((landlord_id = public.current_landlord_id()) OR public.is_admin());

-- bank_transactions
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bank_transactions_service_role" ON public.bank_transactions;
CREATE POLICY "bank_transactions_service_role" ON public.bank_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "bank_transactions_read" ON public.bank_transactions;
CREATE POLICY "bank_transactions_read" ON public.bank_transactions FOR SELECT TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin());
DROP POLICY IF EXISTS "bank_transactions_landlord_write" ON public.bank_transactions;
CREATE POLICY "bank_transactions_landlord_write" ON public.bank_transactions FOR ALL TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin()) WITH CHECK ((landlord_id = public.current_landlord_id()) OR public.is_admin());

-- receipts
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "receipts_service_role" ON public.receipts;
CREATE POLICY "receipts_service_role" ON public.receipts FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "receipts_read" ON public.receipts;
CREATE POLICY "receipts_read" ON public.receipts FOR SELECT TO authenticated USING ((landlord_id = public.current_landlord_id()) OR (tenant_id = public.current_tenant_id()) OR public.is_admin());

-- payment_matches
ALTER TABLE public.payment_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_matches FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_matches_service_role" ON public.payment_matches;
CREATE POLICY "payment_matches_service_role" ON public.payment_matches FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "payment_matches_read" ON public.payment_matches;
CREATE POLICY "payment_matches_read" ON public.payment_matches FOR SELECT TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin());
DROP POLICY IF EXISTS "payment_matches_landlord_write" ON public.payment_matches;
CREATE POLICY "payment_matches_landlord_write" ON public.payment_matches FOR ALL TO authenticated USING ((landlord_id = public.current_landlord_id()) OR public.is_admin()) WITH CHECK ((landlord_id = public.current_landlord_id()) OR public.is_admin());


-- -----------------------------------------------------------------------------
-- 8. Verification - both queries should return no rows.
-- -----------------------------------------------------------------------------

-- (a) any table in public without RLS:
SELECT relname AS table_without_rls
FROM   pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE  n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false;

-- (b) any policy granting anon access:
SELECT tablename, policyname, roles
FROM   pg_policies
WHERE  schemaname = 'public' AND roles::text[] && ARRAY['anon', 'public'];
