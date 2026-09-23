import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, ArrowRight, Mail, Sparkles, Building, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { api } from '../services/api';
import { BRAND_IMAGES, BrandPicture } from '../constants/brandImages';

type State = 'CHECKING' | 'CONFIRMED' | 'FAILED';

interface VerifyEmailPageProps {
  onGoToDashboard: (role?: string) => void;
  onGoToSignIn: () => void;
  onGoHome: () => void;
}

/**
 * Where the confirmation link in the sign-up email lands.
 *
 * Confirms the session via Supabase URL fragment, OTP tokens, or PKCE codes,
 * ensures the backend profile is bootstrapped, and smoothly navigates the user
 * directly into their role-specific dashboard.
 */
export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({
  onGoToDashboard,
  onGoToSignIn,
  onGoHome,
}) => {
  const { resendVerification, refreshUser, user } = useAuth();
  const [state, setState] = useState<State>('CHECKING');
  const [message, setMessage] = useState<string>('Verifying your email and activating your account...');
  const [targetRole, setTargetRole] = useState<string>('LANDLORD');
  const [resendEmail, setResendEmail] = useState<string>(user?.email || '');
  const [resendNote, setResendNote] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(2);
  const navigatedRef = useRef(false);

  useEffect(() => {
    let active = true;

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const searchParams = new URLSearchParams(window.location.search);

    const linkError =
      hashParams.get('error_description') ||
      hashParams.get('error') ||
      searchParams.get('error_description') ||
      searchParams.get('error');

    (async () => {
      if (linkError) {
        if (!active) return;
        setMessage(decodeURIComponent(linkError.replace(/\+/g, ' ')));
        setState('FAILED');
        return;
      }

      // 1. Process OTP token_hash or PKCE code if present in the URL
      const tokenHash = searchParams.get('token_hash');
      const otpType = (searchParams.get('type') as any) || 'signup';
      const code = searchParams.get('code');

      try {
        if (tokenHash) {
          const { error: otpErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });
          if (otpErr && otpType === 'signup') {
            await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'email',
            });
          }
        } else if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      } catch (err: any) {
        console.warn('Token exchange notice:', err);
      }

      // 2. Retrieve session, allowing a short window for detectSessionInUrl to complete
      let session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        for (let i = 0; i < 6; i++) {
          await new Promise((r) => setTimeout(r, 350));
          if (!active) return;
          session = (await supabase.auth.getSession()).data.session;
          if (session) break;
        }
      }

      if (!active) return;

      if (session) {
        // 3. Ensure backend profile is bootstrapped (creates LandlordProfile or TenantProfile in DB)
        let resolvedRole = 'LANDLORD';
        try {
          const sessionInfo = await api.auth.getSession();
          if (sessionInfo?.needs_bootstrap) {
            await api.auth.bootstrap({});
          }
          if (sessionInfo?.role) {
            resolvedRole = sessionInfo.role;
          }
        } catch (bootstrapErr) {
          console.warn('Bootstrap during email verification:', bootstrapErr);
        }

        // 4. Refresh full user profile in AuthContext
        const profile = await refreshUser();
        const finalRole =
          profile?.role ||
          resolvedRole ||
          (session.user?.app_metadata?.role as string) ||
          (session.user?.user_metadata?.requested_role as string) ||
          (session.user?.user_metadata?.role as string) ||
          'LANDLORD';

        if (!active) return;
        setTargetRole(finalRole);
        setMessage('Your email address has been verified successfully!');
        setState('CONFIRMED');

        // Countdown timer: 2s -> 1s -> redirect
        const countdownTimer = setInterval(() => {
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              clearInterval(countdownTimer);
              if (active && !navigatedRef.current) {
                navigatedRef.current = true;
                onGoToDashboard(finalRole);
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(countdownTimer);
      }

      // No session and no error usually means page was visited without token
      setMessage(
        'Open the confirmation link from your email to finish setting up your account, ' +
          'or request a new one below.'
      );
      setState('FAILED');
    })();

    return () => {
      active = false;
    };
  }, [onGoToDashboard, refreshUser]);

  const handleManualRedirect = () => {
    if (!navigatedRef.current) {
      navigatedRef.current = true;
      onGoToDashboard(targetRole);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resending || !resendEmail.trim()) return;
    setResending(true);
    setResendNote(null);
    try {
      const res = await resendVerification(resendEmail.trim());
      setResendNote(res.message);
    } catch (err: any) {
      setResendNote(err?.message || 'Could not send a new link. Please try again shortly.');
    } finally {
      setResending(false);
    }
  };

  const roleLabel =
    targetRole === 'LANDLORD'
      ? 'Landlord Dashboard'
      : targetRole === 'TENANT'
      ? 'Tenant Portal'
      : targetRole === 'SYSTEM_ADMIN'
      ? 'System Admin Portal'
      : 'Dashboard';

  return (
    <div className="min-h-screen bg-notify-grid text-black font-montserrat flex flex-col items-center justify-center px-4 py-10">
      <button onClick={onGoHome} className="mb-6 cursor-pointer" aria-label="Notify home">
        <BrandPicture
          webp={BRAND_IMAGES.logo}
          png={BRAND_IMAGES.logoPng}
          alt="Notify"
          className="h-10 w-auto object-contain"
          loading="eager"
          fetchPriority="high"
        />
      </button>

      <div className="w-full max-w-md bg-white rounded-[24px] border-2 border-black shadow-[4px_4px_0_#000000] p-6 sm:p-8 transition-all">
        {state === 'CHECKING' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-[#331A6F]/10 border-2 border-[#331A6F] flex items-center justify-center mx-auto mb-5 shadow-[2px_2px_0_#331A6F]">
              <RefreshCw className="w-8 h-8 text-[#331A6F] animate-spin" />
            </div>
            <h1 className="text-xl font-black uppercase tracking-wide text-[#331A6F]">
              Confirming Your Email
            </h1>
            <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
              Setting up your session and preparing your workspace...
            </p>
          </div>
        )}

        {state === 'CONFIRMED' && (
          <div className="text-center py-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0_#059669]">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#331A6F]/10 text-[#331A6F] text-xs font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{roleLabel}</span>
            </div>
            <h1 className="text-xl font-black uppercase tracking-wide text-slate-900">
              Email Confirmed!
            </h1>
            <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
              {message}
            </p>
            <p className="text-xs font-bold text-slate-400 mt-1">
              Redirecting automatically in {secondsLeft} second{secondsLeft !== 1 ? 's' : ''}...
            </p>

            <button
              onClick={handleManualRedirect}
              className="mt-6 w-full py-3.5 px-6 rounded-[16px] bg-[#331A6F] text-white font-black text-sm uppercase tracking-wider border-2 border-black shadow-[3px_3px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <span>Go to {roleLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {state === 'FAILED' && (
          <div className="animate-in fade-in duration-200">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-amber-100 border-2 border-amber-600 flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0_#D97706]">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h1 className="text-lg font-black uppercase tracking-wide">
                Confirmation Link Needed
              </h1>
              <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
                {message}
              </p>
            </div>

            <form onSubmit={handleResend} className="mt-6 space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-black">
                Send a new confirmation link
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={resending}
                  className="w-full px-4 py-3 rounded-[14px] bg-white text-black font-bold text-sm border-2 border-black placeholder:text-slate-400 focus:outline-none focus:bg-amber-50 shadow-[0.5px_0.5px_0_#000000] disabled:bg-slate-100 transition-all"
                />
                <Mail className="absolute right-4 top-3.5 w-5 h-5 text-slate-500 pointer-events-none" />
              </div>
              <button
                type="submit"
                disabled={resending}
                className="w-full py-3 px-6 rounded-[16px] bg-[#331A6F] text-white font-black text-sm uppercase tracking-wider border-2 border-black shadow-[2px_2px_0_#000000] disabled:opacity-50 disabled:pointer-events-none hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000000] transition-all cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {resending ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                <span>{resending ? 'Sending Link...' : 'Send New Confirmation Link'}</span>
              </button>
              {resendNote && (
                <p className="text-xs font-semibold text-slate-600 leading-relaxed text-center mt-2">
                  {resendNote}
                </p>
              )}
            </form>

            <button
              onClick={onGoToSignIn}
              className="mt-5 w-full text-sm font-black text-[#331A6F] underline hover:text-black transition-colors cursor-pointer text-center block"
            >
              Return to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
