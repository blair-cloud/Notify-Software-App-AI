import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../services/api';
import { supabase, authRedirectTo, clearAccessTokenCache } from '../services/supabase';

export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  username?: string;
  role: 'SYSTEM_ADMIN' | 'LANDLORD' | 'TENANT';
  language: 'rw' | 'en' | 'fr';
  status: 'ACTIVE' | 'SUSPENDED';
  email_verified?: boolean;
  phone_verified?: boolean;
  invitation_token?: string;
  landlord_profile?: {
    id: string;
    business_type: string;
    business_name?: string;
    address?: string;
    district?: string;
    city?: string;
    tax_identifier?: string;
  };
  tenant_profile?: {
    id: string;
    national_id?: string;
    occupation?: string;
    property_name?: string;
    unit_number?: string;
    monthly_rent?: number;
  };
}

export type SignUpResult =
  | { status: 'CONFIRM_EMAIL'; email: string; role: 'LANDLORD' | 'TENANT' }
  | { status: 'SIGNED_IN'; email: string; role: string; profile: UserProfile };

export interface SignUpData {
  email: string;
  password: string;
  role: 'LANDLORD' | 'TENANT';
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  invitation_token?: string;
  business_name?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: UserProfile | null;
  role: 'SYSTEM_ADMIN' | 'LANDLORD' | 'TENANT' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  signUp: (data: SignUpData) => Promise<SignUpResult>;
  registerLandlord: (data: any) => Promise<SignUpResult>;
  registerTenant: (data: any) => Promise<SignUpResult>;
  updateUserProfile: (data: any) => Promise<UserProfile>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  /** Used on the page the reset link lands on - the session comes from the link. */
  setNewPassword: (newPassword: string) => Promise<{ message: string }>;
  resendVerification: (email: string) => Promise<{ message: string }>;
  changePassword: (data: { current_password?: string; new_password: string }) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<UserProfile | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Turns anything thrown into something worth showing a person. */
function readableError(err: any, fallback: string): string {
  const raw = typeof err?.message === 'string' ? err.message : '';

  // Supabase Auth messages, mapped to something a tenant or landlord can act on.
  if (/invalid login credentials/i.test(raw)) {
    return 'The email or password you entered is incorrect.';
  }
  if (/email not confirmed/i.test(raw)) {
    return 'Please confirm your email address first. Check your inbox for the link.';
  }
  if (/user already registered|already been registered/i.test(raw)) {
    return 'An account with this email already exists. Try signing in, or reset your password.';
  }
  if (/password should be at least/i.test(raw)) {
    return 'Please choose a longer password (at least 8 characters).';
  }
  // Supabase has two very different throttles, and calling both "too many
  // attempts" sent people off looking for the wrong problem.
  // Supabase could not hand the message to its mail server. This is a project
  // configuration problem, not something the person signing up can fix, so say
  // so plainly instead of showing them a raw server error.
  if (/error sending (confirmation|recovery|magic link|invite) email/i.test(raw)) {
    // The person signing up gets a plain apology; whoever is running the app
    // gets the actual lead, because the fix is in the Supabase dashboard.
    console.error(
      'Supabase could not send the email. Check Authentication -> Emails -> SMTP ' +
        'Settings, and read the exact SMTP rejection in Dashboard -> Logs -> Auth Logs. ' +
        'See SUPABASE_SETUP.md.',
      err
    );
    return (
      'Your account could not be created because the confirmation email could not ' +
      'be sent. This is a mail server setting on our side, not a problem with your ' +
      'details. Please try again shortly, or contact support if it keeps happening.'
    );
  }

  const code = typeof err?.code === 'string' ? err.code : '';

  // 1. The email service quota. Supabase's built-in mailer allows only a
  //    couple of messages an hour and is meant for testing, so this is hit
  //    during ordinary development. No account is created when it fires.
  if (code === 'over_email_send_rate_limit' || /email rate limit/i.test(raw)) {
    return (
      'Supabase could not send the confirmation email: its built-in mail service ' +
      'has a strict hourly limit. No account was created, so nothing is half-done. ' +
      'Either wait an hour and try again, or configure your own SMTP server in the ' +
      'Supabase dashboard (Authentication -> Emails -> SMTP Settings) to lift the limit.'
    );
  }

  // 2. The short per-request throttle, which does tell you how long to wait.
  const seconds = raw.match(/after (\d+) seconds?/i)?.[1];
  if (seconds) {
    return `Please wait ${seconds} seconds before trying again.`;
  }
  if (code === 'over_request_rate_limit' || /for security purposes|rate limit|too many/i.test(raw)) {
    return 'Too many attempts in a short time. Please wait a minute and try again.';
  }
  if (err instanceof ApiError) {
    if (err.status === 0) return 'Cannot reach the server. Check your connection and try again.';
    if (err.status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
  }
  if (raw && !raw.startsWith('HTTP Error')) return raw;
  if (typeof err?.data?.detail === 'string') return err.data.detail;
  if (err instanceof TypeError) return 'Cannot reach the server. Check your connection and try again.';
  return fallback;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Stops a double click firing two sign-ups or two resets.
  const inFlight = useRef<Set<string>>(new Set());

  const clearError = useCallback(() => setError(null), []);

  const runOnce = useCallback(
    async <T,>(key: string, fallbackMessage: string, fn: () => Promise<T>): Promise<T> => {
      if (inFlight.current.has(key)) {
        throw new Error('That request is already being processed. Please wait a moment.');
      }
      inFlight.current.add(key);
      setError(null);
      setIsSubmitting(true);
      try {
        return await fn();
      } catch (err: any) {
        const message = readableError(err, fallbackMessage);
        setError(message);
        throw new Error(message);
      } finally {
        inFlight.current.delete(key);
        setIsSubmitting(false);
      }
    },
    []
  );

  /**
   * Loads the application profile for whoever Supabase says is signed in.
   *
   * The role comes from this call - the database - and never from the browser,
   * so the dashboard a user lands on reflects what they actually are.
   */
  const loadProfile = useCallback(async (session: Session | null): Promise<UserProfile | null> => {
    if (!session) {
      setUser(null);
      return null;
    }
    try {
      const me = await api.auth.getMe();
      setUser(me);
      return me;
    } catch (err: any) {
      const status = err instanceof ApiError ? err.status : null;
      if (status === 401 || status === 403) {
        setUser(null);
      } else {
        // A network blip must not look like a sign-out.
        console.warn('Could not load the Notify profile for this session.', err);
        setUser(null);
      }
      return null;
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<UserProfile | null> => {
    const { data } = await supabase.auth.getSession();
    return loadProfile(data.session);
  }, [loadProfile]);

  // Supabase restores the session from storage on load and tells us about every
  // later change (refresh, sign-out in another tab, a link-borne session). This
  // single subscription is what makes the session survive a page refresh.
  useEffect(() => {
    let active = true;
    const bootstrapped = { current: false };

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      await loadProfile(data.session);
      bootstrapped.current = true;
      if (active) setIsLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;
      if (event === 'SIGNED_OUT') {
        setUser(null);
        return;
      }
      if (event === 'PASSWORD_RECOVERY') {
        // Supabase's own redirect_to is only honoured when the exact URL is
        // on the project's Redirect URLs allow-list; anything else falls back
        // to the bare Site URL, which drops "/reset-password" entirely and
        // strands the recovery session on whatever page happens to load
        // first. Rather than depend on that dashboard setting being right,
        // send the user to the reset form the moment this event fires,
        // wherever they actually landed.
        navigate('/reset-password', { replace: true });
        return;
      }
      if (event === 'TOKEN_REFRESHED' && user) {
        return; // same user, nothing to reload
      }
      // getSession() above already loaded the profile; skip the duplicate
      // INITIAL_SESSION that Supabase fires on every cold boot.
      if (bootstrapped.current && event === 'INITIAL_SESSION') {
        return;
      }
      await loadProfile(session);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // `user` is deliberately not a dependency: re-subscribing on every profile
    // change would tear down and rebuild the listener constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadProfile]);

  const login = (email: string, password: string) =>
    runOnce('login', 'Sign in failed. Please try again.', async () => {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) throw signInError;

      let profile = await loadProfile(data.session);
      if (!profile) {
        throw new Error(
          'Signed in, but your Notify profile could not be loaded. Please try again.'
        );
      }

      // Someone who confirmed by email has a profile (with the right role) but
      // no landlord/tenant record yet, because sign-up had no session to call
      // the backend with. Finish that now. The role is deliberately not sent:
      // the server keeps the one already on the account.
      try {
        const session = await api.auth.getSession();
        if (session?.needs_bootstrap) {
          await api.auth.bootstrap({});
          profile = (await refreshUser()) ?? profile;
        }
      } catch (err) {
        // Never block a valid sign-in on this; the banner will prompt instead.
        console.warn('Could not finish setting up this account.', err);
      }

      return profile;
    });

  /**
   * Sign up.
   *
   * Supabase Auth creates the account (and hashes the password); the backend
   * then completes the application profile. The role is sent as a *request*:
   * the server decides what it is actually allowed to be.
   */
  const signUp = (data: SignUpData) =>
    runOnce('signup', 'Registration could not be completed.', async (): Promise<SignUpResult> => {
      const email = data.email.trim().toLowerCase();
      const { data: signUpResult, error: signUpError } = await supabase.auth.signUp({
        email,
        password: data.password,
        options: {
          emailRedirectTo: authRedirectTo('/verify-email'),
          data: {
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone,
            // The role the person picked on the form.
            //
            // With email confirmation on, signUp() returns no session, so there
            // is no way to call the backend right now - which is exactly how
            // every sign-up used to end up as a tenant. Carrying the choice in
            // user_metadata lets the database trigger apply it immediately.
            // It is only a *request*: the trigger clamps it to LANDLORD or
            // TENANT, so this cannot be used to become an administrator.
            requested_role: data.role,
            // Kept so the profile can be completed after confirmation.
            invitation_token: data.invitation_token,
            business_name: data.business_name,
          },
        },
      });
      if (signUpError) throw signUpError;

      // No session means Supabase is waiting for the emailed confirmation link.
      // That is a normal outcome, not an error - the caller shows the
      // "check your email" screen.
      if (!signUpResult.session) {
        return { status: 'CONFIRM_EMAIL', email, role: data.role };
      }

      // Confirmation is switched off, so the account is usable straight away.
      await api.auth.bootstrap({
        role: data.role,
        full_name: data.full_name,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        invitation_token: data.invitation_token,
        business_name: data.business_name,
      });

      const profile = await refreshUser();
      if (!profile) {
        throw new Error('Account created, but your profile could not be loaded. Please sign in.');
      }
      return { status: 'SIGNED_IN', email, role: profile.role, profile };
    });

  // Kept so existing call sites do not have to change.
  const registerLandlord = (data: any) => signUp({ ...data, role: 'LANDLORD' });
  const registerTenant = (data: any) => signUp({ ...data, role: 'TENANT' });

  const forgotPassword = (email: string) =>
    runOnce('forgot-password', 'Could not send the reset email. Please try again.', async () => {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: authRedirectTo('/reset-password') }
      );
      if (resetError) throw resetError;
      return {
        message:
          'If that email address has a Notify account, a password reset link is on its way. ' +
          'Please check your inbox, including the spam folder.',
      };
    });

  /**
   * Completes a reset. The link puts a short-lived recovery session in place,
   * so this is just an update on the signed-in user.
   */
  const setNewPassword = (newPassword: string) =>
    runOnce('reset-password', 'Could not reset your password. Please request a new link.', async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        throw new Error(
          'This reset link has expired or was already used. Please request a new one.'
        );
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      // Updating the password does not end this session - it simply becomes
      // the user's normal one, which is what lets the caller continue
      // straight to the dashboard instead of asking for another sign-in.
      return { message: 'Your password has been updated.' };
    });

  const resendVerification = (email: string) =>
    runOnce('resend-verification', 'Could not send a new confirmation link.', async () => {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: authRedirectTo('/verify-email') },
      });
      if (resendError) throw resendError;
      return { message: 'If that email address needs confirming, a new link is on its way.' };
    });

  const changePassword = (data: { current_password?: string; new_password: string }) =>
    runOnce('change-password', 'Failed to update password.', async () => {
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.new_password,
      });
      if (updateError) throw updateError;
      return { status: 'success', message: 'Password updated successfully' };
    });

  const updateUserProfile = (data: any) =>
    runOnce('update-profile', 'Failed to update profile.', async () => {
      const updated = await api.auth.updateProfile(data);
      setUser((prev) => (prev ? { ...prev, ...updated } : updated));
      return updated;
    });

  const logout = async () => {
    try {
      clearAccessTokenCache();
      await supabase.auth.signOut();
    } catch {
      /* already gone, or offline - clearing locally is still right */
    }
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isAuthenticated: !!user,
        isLoading,
        isSubmitting,
        error,
        login,
        signUp,
        registerLandlord,
        registerTenant,
        forgotPassword,
        setNewPassword,
        resendVerification,
        updateUserProfile,
        changePassword,
        logout,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
