-- =============================================================================
-- NOTIFY - SUPABASE RLS HARDENING
-- =============================================================================
-- Run this on an EXISTING Supabase project. It is safe and idempotent: it only
-- changes policies, grants and one bucket flag. It creates and drops no tables
-- and touches no rows.
--
-- Do NOT re-run supabase_migration.sql on a live project to get these changes -
-- that script begins by dropping every table.
--
-- WHY THIS IS NEEDED
-- ------------------
-- The original policy set did this for every table in `public`:
--
--     CREATE POLICY "allow_anon_read"        ... FOR SELECT TO anon          USING (true);
--     CREATE POLICY "allow_authenticated_all"... FOR ALL    TO authenticated USING (true) WITH CHECK (true);
--
-- Row Level Security was enabled, but those policies allowed everything. The
-- `anon` key is publishable by design (it ships in client bundles and is present
-- in backend/.env.example), so anyone holding it could read every row of every
-- table through the PostgREST endpoint - including users.password_hash and
-- sessions.refresh_token_hash.
--
-- Nothing in this application needs those roles. There is no Supabase Auth here
-- and no browser-side Supabase client: the FastAPI backend connects over
-- DATABASE_URL and enforces per-user access itself. So the correct posture is
-- deny-by-default, with only service_role passing.
--
-- HOW TO APPLY
-- ------------
-- 1. Open the SQL editor for your project.
-- 2. Paste this whole file and RUN.
-- 3. Re-run the verification block at the bottom; it should report 0 rows.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Make sure RLS is actually on for every table in `public`.
--    A table with RLS disabled ignores policies entirely.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    END LOOP;
END;
$$;


-- -----------------------------------------------------------------------------
-- 2. Drop the permissive policies and leave only service_role.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        -- The two that made everything world-readable / world-writable.
        EXECUTE format('DROP POLICY IF EXISTS "allow_anon_read" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "allow_authenticated_all" ON public.%I', tbl);

        -- The backend's own access.
        EXECUTE format('DROP POLICY IF EXISTS "service_role_full_access" ON public.%I', tbl);
        EXECUTE format(
            'CREATE POLICY "service_role_full_access" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
            tbl
        );
    END LOOP;
END;
$$;


-- -----------------------------------------------------------------------------
-- 3. Remove the table grants PostgREST depends on, so a table added later
--    without RLS is still not reachable with the anon key.
-- -----------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;


-- -----------------------------------------------------------------------------
-- 4. Storage: lease documents must not be publicly readable.
--    The backend already generates short-lived signed URLs for them, which a
--    public bucket rendered pointless. Avatars and property images stay public
--    because they are displayed openly in the UI.
-- -----------------------------------------------------------------------------
UPDATE storage.buckets SET public = false WHERE id = 'notify-documents';

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read notify-documents" ON storage.objects;
    DROP POLICY IF EXISTS "Service Read notify-documents" ON storage.objects;
    CREATE POLICY "Service Read notify-documents" ON storage.objects
        FOR SELECT TO service_role USING (bucket_id = 'notify-documents');
EXCEPTION WHEN OTHERS THEN
    -- Some projects restrict DDL on storage.objects; the bucket flag above is
    -- the part that matters and has already been applied.
    NULL;
END;
$$;


-- =============================================================================
-- VERIFICATION - both queries should return no rows.
-- =============================================================================

-- (a) Any policy still granting anon or authenticated anything:
SELECT schemaname, tablename, policyname, roles, cmd
FROM   pg_policies
WHERE  schemaname = 'public'
AND    (roles::text[] && ARRAY['anon', 'authenticated', 'public']);

-- (b) Any table in `public` without RLS enabled:
SELECT relname AS table_without_rls
FROM   pg_class c
JOIN   pg_namespace n ON n.oid = c.relnamespace
WHERE  n.nspname = 'public'
AND    c.relkind = 'r'
AND    c.relrowsecurity = false;
