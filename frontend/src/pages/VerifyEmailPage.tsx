import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, ArrowRight, Mail, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, clearAccessTokenCache } from '../services/supabase';
import { api } from '../services/api';
import { BRAND_IMAGES, BrandPicture } from '../constants/brandImages';

type State = 'CHECKING' | 'CONFIRMED' | 'FAILED';

interface VerifyEmailPageProps {
  onConfirmed: (confirmedEmail?: string) => void;
  onGoToSignIn: () => void;
  onGoHome: () => void;
}

/**
 * Where the confirmation link in the sign-up email lands.
 *
 * 1. Confirms the token/session.
 * 2. Ensures backend profile is bootstrapped.
 * 3. Signs the user OUT so they are NOT automatically logged in.
 * 4. Displays a clear "Email Confirmed Successfully" message.
 * 5. Automatically redirects to the Sign In page ready for credentials.
 */
export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({
  onConfirmed,
  onGoToSignIn,
  onGoHome,
}) => {
  const { resendVerification } = useAuth();
  const [state, setState] = useState<State>('CHECKING');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [confirmedEmail, setConfirmedEmail] = useState<string>('');
  const [resendEmail, setResendEmail] = useState<string>('');
  const [resendNote, setResendNote] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(3);
  const navigatedRef = useRef(false);

  useEffect(() => {
    let active = true;

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const searchParams = new URLSearchParams(window.location.search);

    const rawError =
      hashParams.get('error_description') ||
      hashParams.get('error') ||
      searchParams.get('error_description') ||
      searchParams.get('error');

    (async () => {
      // 1. Handle error flags reported in the URL fragment/query
      if (rawError) {
        if (!active) return;
        const decoded = decodeURIComponent(rawError.replace(/\+/g, ' '));
        let friendly = 'This confirmation link is invalid, has expired, or was already used.';
        if (/expired/i.test(decoded)) {
          friendly = 'This confirmation link has expired. Please request a new link below or try signing in if your account is already confirmed.';
        } else if (/already/i.test(decoded)) {
          friendly = 'This confirmation link has already been used. If your account is confirmed, please proceed to sign in.';
        }
        setErrorMessage(friendly);
        setState('FAILED');
        return;
      }

      // 2. Process OTP token_hash or PKCE code if present
      const tokenHash = searchParams.get('token_hash');
      const otpType = (searchParams.get('type') as any) || 'signup';
      const code = searchParams.get('code');

      try {
        if (tokenHash) {
          const { error: otpErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });
          if (otpErr) {
            // Attempt retry with type 'email' if signup failed
            if (otpType === 'signup') {
              const retry = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: 'email',
              });
              if (retry.error) {
                if (!active) return;
                setErrorMessage('This confirmation link is invalid, has expired, or was already used.');
                setState('FAILED');
                return;
              }
            } else {
              if (!active) return;
              setErrorMessage('This confirmation link is invalid, has expired, or was already used.');
              setState('FAILED');
              return;
            }
          }
        } else if (code) {
          const { error: codeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (codeErr) {
            if (!active) return;
            setErrorMessage('This confirmation link is invalid, has expired, or was already used.');
            setState('FAILED');
            return;
          }
        }
      } catch (err: any) {
        console.warn('Token exchange warning:', err);
      }

      // 3. Retrieve established session (allow short window for detectSessionInUrl)
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
        const verifiedEmail = session.user.email || '';
        setConfirmedEmail(verifiedEmail);
        setResendEmail(verifiedEmail);

        // Bootstrap profile while token is valid so the database entity is ready
        try {
          const sessionInfo = await api.auth.getSession();
          if (sessionInfo?.needs_bootstrap) {
            await api.auth.bootstrap({});
          }
        } catch (bootstrapErr) {
          console.warn('Bootstrap during email verification:', bootstrapErr);
        }

        // CRITICAL REQUIREMENT: Make sure the user is NOT automatically logged in
        await supabase.auth.signOut().catch(() => {});
        clearAccessTokenCache();

        if (!active) return;
        setState('CONFIRMED');

        // Automatically redirect to Sign In page after 3 seconds
        const timer = setInterval(() => {
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              if (active && !navigatedRef.current) {
                navigatedRef.current = true;
                onConfirmed(verifiedEmail);
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(timer);
      }

      // No session and no params
      setErrorMessage(
        'Open the confirmation link from your email to finish setting up your account, or request a new one below.'
      );
      setState('FAILED');
    })();

    return () => {
      active = false;
    };
  }, [onConfirmed]);

  const handleManualSignIn = () => {
    if (!navigatedRef.current) {
      navigatedRef.current = true;
      onConfirmed(confirmedEmail);
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
              Verifying Email
            </h1>
            <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
              Confirming your email address and preparing your account...
            </p>
          </div>
        )}

        {state === 'CONFIRMED' && (
          <div className="text-center py-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0_#059669]">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
              Email Confirmed Successfully
            </h1>
            <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
              Your account has been verified. Please sign in with your credentials to access your dashboard.
            </p>
            {confirmedEmail && (
              <p className="text-xs font-bold text-[#331A6F] bg-[#331A6F]/10 rounded-lg px-3 py-1.5 mt-3 inline-block">
                {confirmedEmail}
              </p>
            )}
            <p className="text-xs font-bold text-slate-400 mt-3">
              Redirecting to Sign In in {secondsLeft} second{secondsLeft !== 1 ? 's' : ''}...
            </p>

            <button
              onClick={handleManualSignIn}
              className="mt-6 w-full py-3.5 px-6 rounded-[16px] bg-[#331A6F] text-white font-black text-sm uppercase tracking-wider border-2 border-black shadow-[3px_3px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Proceed to Sign In</span>
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
              <h1 className="text-lg font-black uppercase tracking-wide text-slate-900">
                Confirmation Link Notice
              </h1>
              <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={onGoToSignIn}
                className="w-full py-3 px-6 rounded-[16px] bg-[#331A6F] text-white font-black text-sm uppercase tracking-wider border-2 border-black shadow-[2px_2px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer inline-flex items-center justify-center gap-2 mb-4"
              >
                <LogIn className="w-4 h-4" />
                <span>Go to Sign In</span>
              </button>
            </div>

            <div className="border-t border-slate-200 pt-4 mt-2">
              <form onSubmit={handleResend} className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-wider text-black">
                  Need a new confirmation link?
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
                  className="w-full py-2.5 px-4 rounded-[14px] bg-white text-[#331A6F] font-black text-xs uppercase tracking-wider border-2 border-black shadow-[1.5px_1.5px_0_#000000] disabled:opacity-50 disabled:pointer-events-none hover:bg-slate-50 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  {resending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{resending ? 'Sending Link...' : 'Send New Confirmation Link'}</span>
                </button>
                {resendNote && (
                  <p className="text-xs font-semibold text-slate-600 leading-relaxed text-center mt-2">
                    {resendNote}
                  </p>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
