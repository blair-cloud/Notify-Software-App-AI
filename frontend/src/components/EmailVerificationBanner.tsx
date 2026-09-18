import React, { useState } from 'react';
import { MailWarning, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * A slim prompt shown to a signed-in user whose email address is not confirmed
 * yet. Sign-in is not blocked by default (see REQUIRE_EMAIL_VERIFICATION on the
 * server), so this is how an unconfirmed account is handled: visible, dismissible,
 * and one click from a fresh link.
 */
export const EmailVerificationBanner: React.FC = () => {
  const { user, resendVerification } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('notify_hide_verify_banner') === 'true';
    } catch {
      return false;
    }
  });
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (!user || user.email_verified !== false || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('notify_hide_verify_banner', 'true');
    } catch {
      /* private browsing - dismissing for this render is enough */
    }
  };

  const resend = async () => {
    if (sending) return;
    setSending(true);
    setNote(null);
    try {
      const res = await resendVerification(user.email);
      setNote(res.message || 'A new confirmation link is on its way.');
    } catch (err: any) {
      setNote(err?.message || 'Could not send a new link. Please try again shortly.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 border-b-2 border-black px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <MailWarning className="w-4 h-4 text-amber-700 shrink-0" />
        <p className="text-xs sm:text-sm font-bold text-black flex-1 min-w-[200px]">
          {note || (
            <>
              Confirm your email address ({user.email}) to secure your account.
            </>
          )}
        </p>
        {!note && (
          <button
            onClick={resend}
            disabled={sending}
            className="text-xs font-black uppercase tracking-wide text-[#331A6F] underline hover:text-black transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {sending && <RefreshCw className="w-3 h-3 animate-spin" />}
            {sending ? 'Sending' : 'Resend link'}
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="p-1 rounded-full hover:bg-black/10 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5 text-black" />
        </button>
      </div>
    </div>
  );
};
