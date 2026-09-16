import React, { useState, useEffect } from 'react';
import { Building2, User, ArrowRight, ShieldCheck, CheckCircle2, Lock, Globe } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface AcceptInvitationPageProps {
  onGoToTenantHome: () => void;
  onGoToLanding: () => void;
}

export const AcceptInvitationPage: React.FC<AcceptInvitationPageProps> = ({
  onGoToTenantHome,
  onGoToLanding,
}) => {
  const { registerTenant } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const [token, setToken] = useState<string>('');
  const [inviteDetails, setInviteDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<'preview' | 'register' | 'success'>('preview');

  // Tenant account form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');

    if (tokenParam) {
      setToken(tokenParam);
      fetchInvitationDetails(tokenParam);
    } else {
      setLoading(false);
      setError('No invitation token provided in URL');
    }
  }, []);

  const fetchInvitationDetails = async (tokenStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const details = await api.invitations.getByToken(tokenStr);
      setInviteDetails(details);
      setEmail(details.tenant_email || '');
      setPhone(details.tenant_phone || '');
    } catch (err: any) {
      setError(err.message || 'Invalid, cancelled, or expired invitation token');
    } finally {
      setLoading(false);
    }
  };

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      fetchInvitationDetails(token.trim());
    }
  };

  const handleRegisterAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Register tenant user
      await registerTenant({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        password,
        language,
      });

      // 2. Accept invitation transaction
      await api.invitations.accept(token);

      setSubmitting(false);
      setStep('success');
    } catch (err: any) {
      setSubmitting(false);
      setError(err.message || 'Failed to complete tenant onboarding');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-black font-montserrat flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg bg-white rounded-[24px] border-2 border-black shadow-[0.5px_0.5px_0_#000] p-6 sm:p-8">
        {/* Header Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[12px] bg-[#331A6F] text-white font-black text-xl flex items-center justify-center border-2 border-black shadow-[0.5px_0.5px_0_#000]">
            N
          </div>
          <div>
            <div className="font-black text-lg uppercase tracking-wide">Notify</div>
            <div className="text-[10px] text-[#331A6F] font-extrabold uppercase">
              Tenant Onboarding
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-[14px] bg-red-100 border-2 border-red-500 text-red-900 text-xs font-bold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center font-bold text-slate-500">
            Validating invitation token...
          </div>
        ) : !inviteDetails ? (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-black">Enter Invitation Token</h2>
            <p className="text-xs text-slate-600 font-medium">
              Please enter the invitation token provided by your landlord to access your unit.
            </p>
            <form onSubmit={handleManualTokenSubmit} className="space-y-3">
              <input
                type="text"
                required
                placeholder="e.g. 32-character invitation token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3.5 py-2.5 text-black font-semibold shadow-[0.5px_0.5px_0_#000]"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onGoToLanding}
                  className="w-1/3 py-2.5 rounded-[12px] bg-slate-200 text-black font-bold text-xs border-2 border-black"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-[12px] bg-[#331A6F] text-white font-extrabold text-xs border-2 border-black shadow-[0.5px_0.5px_0_#000]"
                >
                  Verify Token
                </button>
              </div>
            </form>
          </div>
        ) : step === 'preview' ? (
          <div className="space-y-6">
            <div className="p-5 rounded-[18px] bg-amber-50 border-2 border-black shadow-[0.5px_0.5px_0_#000]">
              <div className="flex items-center gap-2 mb-2 text-[#331A6F] font-extrabold text-sm uppercase">
                <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                <span>You're invited to Notify</span>
              </div>

              <div className="space-y-2 text-xs font-semibold text-black mt-3">
                <div className="flex justify-between py-1 border-b border-black/10">
                  <span className="text-slate-600">{t.tenantLandlord}:</span>
                  <span className="font-extrabold">{inviteDetails.landlord_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-black/10">
                  <span className="text-slate-600">{t.tenantProperty}:</span>
                  <span className="font-extrabold">{inviteDetails.property_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-black/10">
                  <span className="text-slate-600">{t.tenantUnit}:</span>
                  <span className="font-extrabold text-[#331A6F]">Unit #{inviteDetails.unit_number}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Monthly Rent:</span>
                  <span className="font-extrabold">{inviteDetails.monthly_rent?.toLocaleString()} {inviteDetails.currency}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('register')}
              className="w-full py-4 px-6 rounded-[16px] bg-[#331A6F] text-white font-extrabold text-sm border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{t.tenantAcceptInvitation}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        ) : step === 'register' ? (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-black">Create your Notify account</h2>
            <p className="text-xs text-slate-600 font-medium">
              Complete registration to finalize your tenancy for Unit #{inviteDetails.unit_number}.
            </p>

            <form onSubmit={handleRegisterAndAccept} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Eric"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2 text-black font-semibold shadow-[0.5px_0.5px_0_#000]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Mugabo"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2 text-black font-semibold shadow-[0.5px_0.5px_0_#000]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2 text-black font-semibold shadow-[0.5px_0.5px_0_#000]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2 text-black font-semibold shadow-[0.5px_0.5px_0_#000]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2 text-black font-semibold shadow-[0.5px_0.5px_0_#000]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2 text-black font-semibold shadow-[0.5px_0.5px_0_#000]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">Preferred Language</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLanguage('rw')}
                    className={`py-2 text-xs font-bold rounded-[10px] border-2 border-black shadow-[0.5px_0.5px_0_#000] ${
                      language === 'rw' ? 'bg-[#331A6F] text-white' : 'bg-white text-black'
                    }`}
                  >
                    Kinyarwanda
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`py-2 text-xs font-bold rounded-[10px] border-2 border-black shadow-[0.5px_0.5px_0_#000] ${
                      language === 'en' ? 'bg-[#331A6F] text-white' : 'bg-white text-black'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('fr')}
                    className={`py-2 text-xs font-bold rounded-[10px] border-2 border-black shadow-[0.5px_0.5px_0_#000] ${
                      language === 'fr' ? 'bg-[#331A6F] text-white' : 'bg-white text-black'
                    }`}
                  >
                    Français
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('preview')}
                  className="w-1/3 py-3 rounded-[14px] bg-slate-200 text-black font-bold text-xs border-2 border-black"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-3 rounded-[14px] bg-[#331A6F] text-white font-extrabold text-xs border-2 border-black shadow-[0.5px_0.5px_0_#000] disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Creating Account...' : t.tenantCreateAccount}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-[20px] bg-emerald-400 text-black border-2 border-black shadow-[0.5px_0.5px_0_#000] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h2 className="text-2xl font-black text-black">Account Created Successfully</h2>
            <p className="text-sm text-slate-700 font-medium leading-relaxed">
              {t.tenantWelcome}. Your tenancy for Unit #{inviteDetails.unit_number} at {inviteDetails.property_name} is now active.
            </p>

            <button
              onClick={onGoToTenantHome}
              className="w-full py-4 rounded-[16px] bg-[#331A6F] text-white font-extrabold text-sm border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
            >
              {t.tenantGoToMyHome}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
