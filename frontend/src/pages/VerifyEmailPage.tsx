import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, ArrowRight, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
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
 * Confirms the session via Supabase URL fragment or OTP tokens, then navigates
 * the authenticated user directly to their respective role dashboard.
 */
export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ onGoToDashboard, onGoToSignIn, onGoHome }) => {
  const { resendVerification, user } = useAuth();
  const [state, setState] = useState<State>('CHECKING');
  const [message, setMessage] = useState<string>('');
  const [resendEmail, setResendEmail] = useState<string>(user?.email || '');
  const [resendNote, setResendNote] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [targetRole, setTargetRole] = useState<string>('LANDLORD');
  const [countdown, setCountdown] = useState<number>(2);

  useEffect(() => {
    let active = true;

    // Check for error in hash or query params
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

      // 1. Process OTP token_hash or PKCE code if present
      const tokenHash = searchParams.get('token_hash');
      const otpType = (searchParams.get('type') as any) || 'email';
      const code = searchParams.get('code');

      try {
        if (tokenHash) {
          const { error: otpErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });
          if (otpErr) throw otpErr;
        } else if (code) {
          const { error: codeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (codeErr) throw codeErr;
        }
      } catch (err: any) {
        if (!active) return;
        setMessage(err?.message || 'The verification link is invalid or has expired.');
        setState('FAILED');
        return;
      }

      // 2. Fetch the session established by Supabase
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      if (data.session) {
        const sbUser = data.session.user;
        const role =
          (sbUser?.app_metadata?.role as string) ||
          (sbUser?.user_metadata?.requested_role as string) ||
          (sbUser?.user_metadata?.role as string) ||
          user?.role ||
          'LANDLORD';

        setTargetRole(role);
        setMessage('Your email address has been confirmed! Navigating to your dashboard...');
        setState('CONFIRMED');

        // Automatically navigate after 2 seconds
        const timer = setTimeout(() => {
          if (active) {
            onGoToDashboard(role);
          }
        }, 2000);

        return () => clearTimeout(timer);
      }

      // No session and no error usually means the page was opened directly.
      setMessage(
        'Open the confirmation link from your email to finish setting up your account, ' +
          'or request a new one below.'
      );
      setState('FAILED');
    })();

    return () => {
      active = false;
    };
  }, [onGoToDashboard, user?.role]);

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

      <div className="w-full max-w-md bg-white rounded-[20px] border-2 border-black shadow-[2px_2px_0_#000000] p-6 sm:p-8">
        {state === 'CHECKING' && (
          <div className="text-center">
            <RefreshCw className="w-10 h-10 text-[#331A6F] animate-spin mx-auto mb-4" />
            <h1 className="text-lg font-black uppercase tracking-wide">Confirming your email</h1>
            <p className="text-sm font-semibold text-slate-600 mt-2">One moment please.</p>
          </div>
        )}

        {state === 'CONFIRMED' && (
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h1 className="text-lg font-black uppercase tracking-wide">Email confirmed</h1>
            <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">{message}</p>
            <button
              onClick={() => onGoToDashboard(targetRole)}
              className="mt-6 w-full py-3 px-6 rounded-[16px] bg-[#331A6F] text-white font-black text-sm uppercase tracking-wider border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {state === 'FAILED' && (
          <div>
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
              <h1 className="text-lg font-black uppercase tracking-wide">Confirmation link needed</h1>
              <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">{message}</p>
            </div>

            <form onSubmit={handleResend} className="mt-6 space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-black">
                Send a new link to
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
                className="w-full py-3 px-6 rounded-[16px] bg-[#331A6F] text-white font-black text-sm uppercase tracking-wider border-2 border-black shadow-[0.5px_0.5px_0_#000000] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {resending ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                <span>{resending ? 'Sending...' : 'Send a new link'}</span>
              </button>
              {resendNote && (
                <p className="text-xs font-semibold text-slate-600 leading-relaxed text-center">
                  {resendNote}
                </p>
              )}
            </form>

            <button
              onClick={onGoToSignIn}
              className="mt-5 w-full text-sm font-black text-[#331A6F] underline hover:text-black transition-colors cursor-pointer"
            >
              Return to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
