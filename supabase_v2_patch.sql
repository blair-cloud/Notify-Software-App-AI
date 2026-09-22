-- =============================================================================
-- NOTIFY - SUPABASE v2 PATCH 1
-- =============================================================================
-- Safe and idempotent. Apply to a database that already ran
-- supabase_v2_migration.sql. It adds no tables and touches no rows except to
-- correct roles that were defaulted.
--
-- Fixes two things found by running the migration for real:
--
-- 1. created_at / updated_at were NOT NULL with no database default. The ORM
--    fills them in from Python, so SQLAlchemy inserts worked - but anything
--    else (PostgREST, the SQL editor, the seed script, psql) failed with
--    "null value in column created_at". Timestamps now default in the database,
--    which is where they belong.
--
-- 2. New sign-ups always came out as TENANT even when app_metadata asked for
--    LANDLORD. GoTrue inserts the auth.users row first and applies
--    app_metadata in a follow-up UPDATE, so the role simply was not there yet
--    when the INSERT trigger ran. The role is now also synced on UPDATE.
--    app_metadata stays writable only by the service role, so this is still not
--    something a client can set for itself.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Database-side timestamp defaults
-- -----------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT c.table_name, c.column_name
        FROM   information_schema.columns c
        JOIN   pg_tables t ON t.tablename = c.table_name AND t.schemaname = 'public'
        WHERE  c.table_schema = 'public'
        AND    c.column_name IN ('created_at', 'updated_at')
        AND    c.column_default IS NULL
    LOOP
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT now()',
                       r.table_name, r.column_name);
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Keep the profile role in step with app_metadata
-- -----------------------------------------------------------------------------
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
           -- Only the service role can write app_metadata, so trusting it here
           -- does not let a client choose its own role. When it carries no
           -- role, whatever the profile already has is left alone.
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

-- -----------------------------------------------------------------------------
-- 3. Correct any profile whose role was defaulted before this patch
-- -----------------------------------------------------------------------------
UPDATE public.profiles p
   SET role = (u.raw_app_meta_data ->> 'role')::userrole,
       updated_at = now()
  FROM auth.users u
 WHERE u.id = p.id
   AND u.raw_app_meta_data ->> 'role' IN ('SYSTEM_ADMIN', 'LANDLORD', 'TENANT')
   AND p.role::text IS DISTINCT FROM u.raw_app_meta_data ->> 'role';

-- -----------------------------------------------------------------------------
-- Verification - should report no columns missing a default.
-- -----------------------------------------------------------------------------
SELECT table_name, column_name
FROM   information_schema.columns
WHERE  table_schema = 'public'
AND    column_name IN ('created_at', 'updated_at')
AND    column_default IS NULL;

-- -----------------------------------------------------------------------------
-- 4. Make the privilege guard target clients only
-- -----------------------------------------------------------------------------
-- The first version allowed only `service_role` through, which broke the role
-- sync above: GoTrue's own connection runs as `supabase_auth_admin`, so the
-- trigger raised "role cannot be changed from the client" and admin user
-- creation failed with a 500.
--
-- The point of this guard is to stop a *client* escalating itself, and a client
-- always arrives through PostgREST as `authenticated` or `anon`. Enforcing it
-- for exactly those two keeps that protection while letting the auth server,
-- the backend and internal SECURITY DEFINER triggers do their job.
CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
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

-- -----------------------------------------------------------------------------
-- 5. Column defaults that only existed in Python
-- -----------------------------------------------------------------------------
-- The ORM declares these with SQLAlchemy's `default=`, which is applied in the
-- client, not the database. The generated schema therefore had NOT NULL columns
-- with no default, and any insert that did not go through SQLAlchemy failed -
-- PostgREST, the SQL editor, psql, the seed script. Section 1 fixed the
-- timestamps; this covers the rest (statuses, currencies, enums, counters and
-- the uuid primary keys).
--
-- profiles.id is deliberately absent: it must come from auth.users, never be
-- generated here.
-- -----------------------------------------------------------------------------

ALTER TABLE public.notification_templates ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.notification_templates ALTER COLUMN default_priority SET DEFAULT 'MEDIUM';
ALTER TABLE public.notification_templates ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'TENANT';
ALTER TABLE public.profiles ALTER COLUMN language SET DEFAULT 'EN';
ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'ACTIVE';
ALTER TABLE public.profiles ALTER COLUMN email_verified SET DEFAULT false;
ALTER TABLE public.profiles ALTER COLUMN phone_verified SET DEFAULT false;
ALTER TABLE public.profiles ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.profiles ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.audit_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.audit_logs ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.landlord_profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.landlord_profiles ALTER COLUMN business_type SET DEFAULT 'INDIVIDUAL';
ALTER TABLE public.landlord_profiles ALTER COLUMN city SET DEFAULT 'Kigali';
ALTER TABLE public.landlord_profiles ALTER COLUMN country SET DEFAULT 'Rwanda';
ALTER TABLE public.landlord_profiles ALTER COLUMN verification_status SET DEFAULT 'VERIFIED';
ALTER TABLE public.landlord_profiles ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.landlord_profiles ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.notification_preferences ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.notification_preferences ALTER COLUMN lease_expiry_in_app SET DEFAULT true;
ALTER TABLE public.notification_preferences ALTER COLUMN lease_expiry_email SET DEFAULT true;
ALTER TABLE public.notification_preferences ALTER COLUMN lease_expiry_sms SET DEFAULT false;
ALTER TABLE public.notification_preferences ALTER COLUMN lease_expiry_whatsapp SET DEFAULT false;
ALTER TABLE public.notification_preferences ALTER COLUMN payment_in_app SET DEFAULT true;
ALTER TABLE public.notification_preferences ALTER COLUMN payment_email SET DEFAULT true;
ALTER TABLE public.notification_preferences ALTER COLUMN payment_sms SET DEFAULT true;
ALTER TABLE public.notification_preferences ALTER COLUMN payment_whatsapp SET DEFAULT false;
ALTER TABLE public.notification_preferences ALTER COLUMN maintenance_in_app SET DEFAULT true;
ALTER TABLE public.notification_preferences ALTER COLUMN maintenance_email SET DEFAULT true;
ALTER TABLE public.notification_preferences ALTER COLUMN maintenance_sms SET DEFAULT false;
ALTER TABLE public.notification_preferences ALTER COLUMN maintenance_whatsapp SET DEFAULT false;
ALTER TABLE public.notification_preferences ALTER COLUMN complaints_in_app SET DEFAULT true;
ALTER TABLE public.notification_preferences ALTER COLUMN complaints_email SET DEFAULT true;
ALTER TABLE public.notification_preferences ALTER COLUMN complaints_sms SET DEFAULT false;
ALTER TABLE public.notification_preferences ALTER COLUMN complaints_whatsapp SET DEFAULT false;
ALTER TABLE public.notification_preferences ALTER COLUMN system_in_app SET DEFAULT true;
ALTER TABLE public.notification_preferences ALTER COLUMN system_email SET DEFAULT false;
ALTER TABLE public.notification_preferences ALTER COLUMN system_sms SET DEFAULT false;
ALTER TABLE public.notification_preferences ALTER COLUMN system_whatsapp SET DEFAULT false;
ALTER TABLE public.notification_preferences ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.notifications ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.notifications ALTER COLUMN language SET DEFAULT 'en';
ALTER TABLE public.notifications ALTER COLUMN channel SET DEFAULT 'IN_APP';
ALTER TABLE public.notifications ALTER COLUMN status SET DEFAULT 'PENDING';
ALTER TABLE public.notifications ALTER COLUMN priority SET DEFAULT 'MEDIUM';
ALTER TABLE public.notifications ALTER COLUMN category SET DEFAULT 'SYSTEM';
ALTER TABLE public.notifications ALTER COLUMN is_read SET DEFAULT false;
ALTER TABLE public.notifications ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.tenant_profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.tenant_profiles ALTER COLUMN verification_status SET DEFAULT 'VERIFIED';
ALTER TABLE public.tenant_profiles ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.tenant_profiles ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.bank_accounts ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.bank_accounts ALTER COLUMN currency SET DEFAULT 'RWF';
ALTER TABLE public.bank_accounts ALTER COLUMN is_primary SET DEFAULT true;
ALTER TABLE public.bank_accounts ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.bank_accounts ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.maintenance_workers ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.maintenance_workers ALTER COLUMN specialization SET DEFAULT 'GENERAL';
ALTER TABLE public.maintenance_workers ALTER COLUMN status SET DEFAULT 'ACTIVE';
ALTER TABLE public.maintenance_workers ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.notification_delivery_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.notification_delivery_logs ALTER COLUMN status SET DEFAULT 'SENT';
ALTER TABLE public.notification_delivery_logs ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.properties ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.properties ALTER COLUMN property_type SET DEFAULT 'COMMERCIAL';
ALTER TABLE public.properties ALTER COLUMN district SET DEFAULT 'Nyarugenge';
ALTER TABLE public.properties ALTER COLUMN sector SET DEFAULT 'Nyarugenge';
ALTER TABLE public.properties ALTER COLUMN status SET DEFAULT 'ACTIVE';
ALTER TABLE public.properties ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.properties ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.bank_statements ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.bank_statements ALTER COLUMN file_type SET DEFAULT 'CSV';
ALTER TABLE public.bank_statements ALTER COLUMN file_size SET DEFAULT 0;
ALTER TABLE public.bank_statements ALTER COLUMN total_transactions_count SET DEFAULT 0;
ALTER TABLE public.bank_statements ALTER COLUMN matched_count SET DEFAULT 0;
ALTER TABLE public.bank_statements ALTER COLUMN unmatched_count SET DEFAULT 0;
ALTER TABLE public.bank_statements ALTER COLUMN duplicate_count SET DEFAULT 0;
ALTER TABLE public.bank_statements ALTER COLUMN total_incoming_amount SET DEFAULT 0.0;
ALTER TABLE public.bank_statements ALTER COLUMN matched_amount SET DEFAULT 0.0;
ALTER TABLE public.bank_statements ALTER COLUMN status SET DEFAULT 'COMPLETED';
ALTER TABLE public.bank_statements ALTER COLUMN uploaded_at SET DEFAULT now();
ALTER TABLE public.bank_statements ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.bank_statements ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.units ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.units ALTER COLUMN floor SET DEFAULT 1;
ALTER TABLE public.units ALTER COLUMN unit_type SET DEFAULT 'Retail Shop';
ALTER TABLE public.units ALTER COLUMN currency SET DEFAULT 'RWF';
ALTER TABLE public.units ALTER COLUMN status SET DEFAULT 'VACANT';
ALTER TABLE public.units ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.units ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.invitations ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.invitations ALTER COLUMN status SET DEFAULT 'PENDING';
ALTER TABLE public.invitations ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.tenancies ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.tenancies ALTER COLUMN status SET DEFAULT 'ACTIVE';
ALTER TABLE public.tenancies ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.tenancies ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.complaints ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.complaints ALTER COLUMN category SET DEFAULT 'NOISE';
ALTER TABLE public.complaints ALTER COLUMN priority SET DEFAULT 'MEDIUM';
ALTER TABLE public.complaints ALTER COLUMN status SET DEFAULT 'SUBMITTED';
ALTER TABLE public.complaints ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.complaints ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.leases ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.leases ALTER COLUMN security_deposit SET DEFAULT 0.0;
ALTER TABLE public.leases ALTER COLUMN payment_due_day SET DEFAULT 5;
ALTER TABLE public.leases ALTER COLUMN late_fee SET DEFAULT 0.0;
ALTER TABLE public.leases ALTER COLUMN currency SET DEFAULT 'RWF';
ALTER TABLE public.leases ALTER COLUMN status SET DEFAULT 'ACTIVE';
ALTER TABLE public.leases ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.leases ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.maintenance_requests ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.maintenance_requests ALTER COLUMN category SET DEFAULT 'PLUMBING';
ALTER TABLE public.maintenance_requests ALTER COLUMN priority SET DEFAULT 'MEDIUM';
ALTER TABLE public.maintenance_requests ALTER COLUMN status SET DEFAULT 'SUBMITTED';
ALTER TABLE public.maintenance_requests ALTER COLUMN estimated_cost SET DEFAULT 0.0;
ALTER TABLE public.maintenance_requests ALTER COLUMN actual_cost SET DEFAULT 0.0;
ALTER TABLE public.maintenance_requests ALTER COLUMN currency SET DEFAULT 'RWF';
ALTER TABLE public.maintenance_requests ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.maintenance_requests ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.complaint_comments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.complaint_comments ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.expenses ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.expenses ALTER COLUMN category SET DEFAULT 'MAINTENANCE';
ALTER TABLE public.expenses ALTER COLUMN currency SET DEFAULT 'RWF';
ALTER TABLE public.expenses ALTER COLUMN status SET DEFAULT 'RECORDED';
ALTER TABLE public.expenses ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.expenses ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.invoices ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.invoices ALTER COLUMN invoice_type SET DEFAULT 'RENT';
ALTER TABLE public.invoices ALTER COLUMN discount SET DEFAULT 0.0;
ALTER TABLE public.invoices ALTER COLUMN late_fee SET DEFAULT 0.0;
ALTER TABLE public.invoices ALTER COLUMN amount_paid SET DEFAULT 0.0;
ALTER TABLE public.invoices ALTER COLUMN currency SET DEFAULT 'RWF';
ALTER TABLE public.invoices ALTER COLUMN status SET DEFAULT 'ISSUED';
ALTER TABLE public.invoices ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.invoices ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.lease_documents ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.lease_documents ALTER COLUMN file_type SET DEFAULT 'application/pdf';
ALTER TABLE public.lease_documents ALTER COLUMN file_size SET DEFAULT 0;
ALTER TABLE public.lease_documents ALTER COLUMN version SET DEFAULT 1;
ALTER TABLE public.lease_documents ALTER COLUMN status SET DEFAULT 'ACTIVE';
ALTER TABLE public.lease_documents ALTER COLUMN is_verified SET DEFAULT true;
ALTER TABLE public.lease_documents ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.maintenance_attachments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.maintenance_attachments ALTER COLUMN mime_type SET DEFAULT 'image/jpeg';
ALTER TABLE public.maintenance_attachments ALTER COLUMN size SET DEFAULT 0;
ALTER TABLE public.maintenance_attachments ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.maintenance_comments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.maintenance_comments ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.messages ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.messages ALTER COLUMN message_type SET DEFAULT 'GENERAL';
ALTER TABLE public.messages ALTER COLUMN attachment_size SET DEFAULT 0;
ALTER TABLE public.messages ALTER COLUMN is_read SET DEFAULT false;
ALTER TABLE public.messages ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.messages ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.reminder_histories ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.reminder_histories ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.rent_schedules ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.rent_schedules ALTER COLUMN currency SET DEFAULT 'RWF';
ALTER TABLE public.rent_schedules ALTER COLUMN frequency SET DEFAULT 'MONTHLY';
ALTER TABLE public.rent_schedules ALTER COLUMN due_day SET DEFAULT 5;
ALTER TABLE public.rent_schedules ALTER COLUMN status SET DEFAULT 'ACTIVE';
ALTER TABLE public.rent_schedules ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.rent_schedules ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.payments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.payments ALTER COLUMN currency SET DEFAULT 'RWF';
ALTER TABLE public.payments ALTER COLUMN payment_channel SET DEFAULT 'ONLINE';
ALTER TABLE public.payments ALTER COLUMN status SET DEFAULT 'PENDING';
ALTER TABLE public.payments ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.payments ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.bank_transactions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.bank_transactions ALTER COLUMN currency SET DEFAULT 'RWF';
ALTER TABLE public.bank_transactions ALTER COLUMN is_credit SET DEFAULT true;
ALTER TABLE public.bank_transactions ALTER COLUMN matching_status SET DEFAULT 'UNMATCHED';
ALTER TABLE public.bank_transactions ALTER COLUMN confidence_score SET DEFAULT 0.0;
ALTER TABLE public.bank_transactions ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.bank_transactions ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.receipts ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.receipts ALTER COLUMN currency SET DEFAULT 'RWF';
ALTER TABLE public.receipts ALTER COLUMN issued_at SET DEFAULT now();
ALTER TABLE public.receipts ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.payment_matches ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.payment_matches ALTER COLUMN confidence SET DEFAULT 'HIGH';
ALTER TABLE public.payment_matches ALTER COLUMN confidence_score SET DEFAULT 1.0;
ALTER TABLE public.payment_matches ALTER COLUMN review_status SET DEFAULT 'AUTO_CONFIRMED';
ALTER TABLE public.payment_matches ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.payment_matches ALTER COLUMN updated_at SET DEFAULT now();

-- -----------------------------------------------------------------------------
-- 6. Honour the role chosen at sign-up
-- -----------------------------------------------------------------------------
-- With email confirmation enabled, supabase.auth.signUp() returns no session,
-- so the browser cannot call the backend to record the chosen role. Every
-- sign-up therefore landed as TENANT - a landlord who signed up as a landlord
-- got a tenant account.
--
-- The role now also has a fallback path: the sign-up form puts its choice in
-- user_metadata.requested_role, and this trigger reads it. user_metadata IS
-- client-writable, so the value is clamped to LANDLORD or TENANT - the two
-- roles anyone may choose for themselves. SYSTEM_ADMIN can never be obtained
-- this way; it only ever comes from app_metadata, which needs the service key.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    granted       text := NEW.raw_app_meta_data  ->> 'role';
    requested     text := NEW.raw_user_meta_data ->> 'requested_role';
    resolved_role userrole := 'TENANT';
    raw_lang      text := UPPER(COALESCE(NEW.raw_user_meta_data ->> 'language', 'EN'));
    resolved_lang userlanguage := 'EN';
    desired_phone text;
    final_phone   text;
    clean_email   text := lower(trim(COALESCE(NEW.email, '')));
    first_n       text;
    last_n        text;
BEGIN
    IF granted IN ('SYSTEM_ADMIN', 'LANDLORD', 'TENANT') THEN
        resolved_role := granted::userrole;
    ELSIF requested IN ('LANDLORD', 'TENANT') THEN
        resolved_role := requested::userrole;
    END IF;

    IF raw_lang IN ('EN', 'RW', 'FR') THEN
        resolved_lang := raw_lang::userlanguage;
    END IF;

    first_n := left(COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'first_name'), ''), split_part(clean_email, '@', 1), 'User'), 100);
    last_n  := left(COALESCE(trim(NEW.raw_user_meta_data ->> 'last_name'), ''), 100);

    desired_phone := NULLIF(trim(COALESCE(NEW.phone, NEW.raw_user_meta_data ->> 'phone', '')), '');
    
    IF desired_phone IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE phone = desired_phone AND id != NEW.id) THEN
        final_phone := 'clash-' || left(NEW.id::text, 8);
    ELSIF desired_phone IS NOT NULL THEN
        final_phone := left(desired_phone, 50);
    ELSE
        final_phone := 'pending-' || left(NEW.id::text, 8);
    END IF;

    BEGIN
        INSERT INTO public.profiles (
            id, email, phone, first_name, last_name, role, language, status,
            email_verified, phone_verified, created_at, updated_at
        )
        VALUES (
            NEW.id,
            clean_email,
            final_phone,
            first_n,
            last_n,
            resolved_role,
            resolved_lang,
            'ACTIVE',
            NEW.email_confirmed_at IS NOT NULL,
            NEW.phone_confirmed_at IS NOT NULL,
            now(),
            now()
        )
        ON CONFLICT (id) DO UPDATE
            SET email = EXCLUDED.email,
                phone = CASE 
                            WHEN profiles.phone LIKE 'pending-%' OR profiles.phone LIKE 'clash-%' 
                            THEN EXCLUDED.phone 
                            ELSE profiles.phone 
                        END,
                first_name = CASE WHEN EXCLUDED.first_name <> '' THEN EXCLUDED.first_name ELSE profiles.first_name END,
                last_name  = CASE WHEN EXCLUDED.last_name <> '' THEN EXCLUDED.last_name ELSE profiles.last_name END,
                role       = EXCLUDED.role,
                updated_at = now();
    EXCEPTION 
        WHEN unique_violation THEN
            BEGIN
                INSERT INTO public.profiles (
                    id, email, phone, first_name, last_name, role, language, status,
                    email_verified, phone_verified, created_at, updated_at
                )
                VALUES (
                    NEW.id,
                    clean_email,
                    'clash-' || left(NEW.id::text, 12),
                    first_n,
                    last_n,
                    resolved_role,
                    resolved_lang,
                    'ACTIVE',
                    NEW.email_confirmed_at IS NOT NULL,
                    NEW.phone_confirmed_at IS NOT NULL,
                    now(),
                    now()
                )
                ON CONFLICT (id) DO NOTHING;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'handle_new_auth_user fallback warning for %: %', NEW.id, SQLERRM;
            END;
        WHEN OTHERS THEN
            RAISE WARNING 'handle_new_auth_user warning for %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
