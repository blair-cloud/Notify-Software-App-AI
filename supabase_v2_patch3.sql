-- =============================================================================
-- NOTIFY - SUPABASE v2 PATCH 3
-- =============================================================================
-- Safe and idempotent. Adds pending-tenant support: a landlord's invitation now
-- creates a real tenant_profiles row immediately, before the invited person has
-- any Supabase Auth account, so they show up in the Tenants list right away and
-- can already have a lease created against them.
--
-- Nothing here drops or renames a column, and no existing row's meaning changes:
-- every tenant_profiles row that exists today already has a user_id, and this
-- only relaxes that column from required to optional for *new* rows.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. tenant_profiles: user_id becomes optional, plus the invited-name display
--    fields shown only while it is still NULL.
-- -----------------------------------------------------------------------------
ALTER TABLE public.tenant_profiles ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.tenant_profiles ADD COLUMN IF NOT EXISTS pending_first_name VARCHAR(100);
ALTER TABLE public.tenant_profiles ADD COLUMN IF NOT EXISTS pending_last_name  VARCHAR(100);
ALTER TABLE public.tenant_profiles ADD COLUMN IF NOT EXISTS pending_email      VARCHAR(255);
ALTER TABLE public.tenant_profiles ADD COLUMN IF NOT EXISTS pending_phone      VARCHAR(50);

-- -----------------------------------------------------------------------------
-- 2. invitations: an optional name captured at invite time, and the FK back to
--    the shell tenant_profiles row this invitation owns.
-- -----------------------------------------------------------------------------
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS tenant_name VARCHAR(200);

ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS tenant_profile_id UUID;

DO $$
BEGIN
    ALTER TABLE public.invitations
        ADD CONSTRAINT invitations_tenant_profile_id_fkey
        FOREIGN KEY (tenant_profile_id) REFERENCES public.tenant_profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS ix_invitations_tenant_profile_id ON public.invitations (tenant_profile_id);

-- -----------------------------------------------------------------------------
-- 3. RLS: give the landlord read access to a tenant_profiles row the moment
--    they have a tenancy with it - pending or not. Without this, a pending row
--    (user_id IS NULL) matches no existing policy and is invisible to anyone
--    but service_role, which is fine for the backend (it connects as
--    service_role) but wrong as a matter of defense in depth for any future
--    direct PostgREST access.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_profiles_landlord_read" ON public.tenant_profiles;
CREATE POLICY "tenant_profiles_landlord_read" ON public.tenant_profiles
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.tenancies t
            WHERE t.tenant_id = tenant_profiles.id
              AND t.landlord_id = public.current_landlord_id()
        )
        OR public.is_admin()
    );

-- -----------------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------------
SELECT column_name, is_nullable
FROM   information_schema.columns
WHERE  table_schema = 'public' AND table_name = 'tenant_profiles'
AND    column_name IN ('user_id', 'pending_first_name', 'pending_last_name', 'pending_email', 'pending_phone')
ORDER BY column_name;

SELECT column_name
FROM   information_schema.columns
WHERE  table_schema = 'public' AND table_name = 'invitations'
AND    column_name IN ('tenant_name', 'tenant_profile_id');
