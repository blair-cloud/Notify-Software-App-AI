-- Patch 4: lease-expiry reminders now also go out over WhatsApp (to both the
-- landlord and the tenant), and lease_expiry_whatsapp now defaults to true
-- for newly-created preference rows since tenants have no settings screen to
-- opt in from. This backfills existing rows created before that default
-- changed, so accounts that already exist pick up the new channel too.
-- Idempotent: safe to run more than once.

ALTER TABLE public.notification_preferences
    ALTER COLUMN lease_expiry_whatsapp SET DEFAULT true;

UPDATE public.notification_preferences
SET lease_expiry_whatsapp = true
WHERE lease_expiry_whatsapp = false;
