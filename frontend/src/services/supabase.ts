import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The browser's Supabase client.
 *
 * This owns the session: sign up, sign in, sign out, password reset, token
 * refresh and persistence across reloads. The application no longer stores
 * tokens itself - `supabase.auth` keeps them in localStorage under its own key
 * and refreshes them before they expire.
 *
 * Only the anon key is used here. It is publishable by design and is worthless
 * without a session, because Row Level Security denies `anon` everything. The
 * service-role key must never reach this file.
 */
const url = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const anonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // Loud, because nothing involving sign-in can work without it.
  console.error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
      'in frontend/.env, then restart the dev server.'
  );
}

export const supabase: SupabaseClient = createClient(url ?? '', anonKey ?? '', {
  auth: {
    // Keep the session across reloads and refresh it in the background: this is
    // what makes "still signed in after F5" work without any code of our own.
    persistSession: true,
    autoRefreshToken: true,
    // Password-reset and confirmation links come back with the session in the
    // URL fragment; let the client pick it up.
    detectSessionInUrl: true,
    storageKey: 'notify-auth',
  },
});

/** The current access token, or null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Where Supabase should send the user back to after an emailed link. */
export function authRedirectTo(path: string): string {
  return `${window.location.origin}${path}`;
}
