import React, { useState } from 'react';
import { X, Building2, User, ArrowRight, Lock, Mail, Phone, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface GetStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessRole?: (role: 'LANDLORD' | 'TENANT' | 'SYSTEM_ADMIN') => void;
  onAcceptInviteClick?: () => void;
}

type ModalView =
  | 'role_selection'
  | 'landlord_step1'
  | 'landlord_step2'
  | 'tenant_options'
  | 'login';

export const GetStartedModal: React.FC<GetStartedModalProps> = ({
  isOpen,
  onClose,
  onSuccessRole,
  onAcceptInviteClick,
}) => {
  const { t, language, setLanguage } = useLanguage();
  const { login, registerLandlord, error: authError, clearError } = useAuth();

  const [view, setView] = useState<ModalView>('role_selection');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Landlord Step 1 (Account Creation)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+250 788 000 000');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Landlord Step 2 (Profile Details)
  const [businessType, setBusinessType] = useState<'INDIVIDUAL' | 'COMPANY'>('INDIVIDUAL');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('Nyarugenge');
  const [city, setCity] = useState('Kigali');

  // Tenant Invite Token
  const [inviteTokenInput, setInviteTokenInput] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    clearError();
    setFormError(null);
    setView('role_selection');
    onClose();
  };

  const handleSelectRole = (role: 'LANDLORD' | 'TENANT') => {
    setFormError(null);
    if (role === 'LANDLORD') {
      setView('landlord_step1');
    } else {
      setView('tenant_options');
    }
  };

  const handleLandlordStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    setView('landlord_step2');
  };

  const handleLandlordStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);

    try {
      const user = await registerLandlord({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        password,
        business_type: businessType,
        business_name: businessType === 'COMPANY' ? businessName : undefined,
        address,
        district,
        city,
        language: language,
      });

      setLoading(false);
      handleClose();
      if (onSuccessRole) onSuccessRole(user.role);
    } catch (err: any) {
      setLoading(false);
      setFormError(err.message || 'Registration failed');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);

    try {
      const user = await login(loginEmail, loginPassword);
      setLoading(false);
      handleClose();
      if (onSuccessRole) onSuccessRole(user.role);
    } catch (err: any) {
      setLoading(false);
      setFormError(err.message || 'Invalid credentials');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-[22px] shadow-[0.5px_0.5px_0_#000000] border-2 border-black overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-[12px] border-2 border-black bg-white shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] text-black font-bold z-10 cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-[10px] bg-[#331A6F] text-white font-extrabold text-sm flex items-center justify-center border-2 border-black shadow-[0.5px_0.5px_0_#000000]">
              N
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#331A6F]">
              Notify Rental Management
            </span>
          </div>

          {(formError || authError) && (
            <div className="mb-4 p-3 rounded-[12px] bg-red-100 border-2 border-red-500 text-red-900 text-xs font-bold">
              {formError || authError}
            </div>
          )}

          {/* VIEW 1: ROLE SELECTION */}
          {view === 'role_selection' && (
            <div>
              <h3 className="text-2xl font-bold text-black mb-1">
                Welcome to Notify
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 font-normal mb-6">
                Manage your rental relationship simply.
              </p>

              <div className="space-y-4 mb-6">
                {/* I'm a Landlord */}
                <button
                  onClick={() => handleSelectRole('LANDLORD')}
                  className="w-full text-left p-4 rounded-[18px] bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[0.5px_0.5px_0_#000000] transition-all cursor-pointer group flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-[14px] bg-[#331A6F] text-white flex items-center justify-center border-2 border-black shadow-[0.5px_0.5px_0_#000000] shrink-0">
                    <Building2 className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="font-extrabold text-base text-black flex items-center gap-2 group-hover:text-[#331A6F]">
                      <span>I'm a Landlord</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Manage properties, commercial units, and tenants
                    </p>
                  </div>
                </button>

                {/* I'm a Tenant */}
                <button
                  onClick={() => handleSelectRole('TENANT')}
                  className="w-full text-left p-4 rounded-[18px] bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[0.5px_0.5px_0_#000000] transition-all cursor-pointer group flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-[14px] bg-amber-400 text-black flex items-center justify-center border-2 border-black shadow-[0.5px_0.5px_0_#000000] shrink-0">
                    <User className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="font-extrabold text-base text-black flex items-center gap-2 group-hover:text-[#331A6F]">
                      <span>I'm a Tenant</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Access my tenancy, lease agreements, and unit details
                    </p>
                  </div>
                </button>
              </div>

              <div className="pt-4 border-t-2 border-slate-200 text-center">
                <span className="text-xs text-slate-600 font-medium mr-2">
                  Already have an account?
                </span>
                <button
                  onClick={() => setView('login')}
                  className="text-xs font-bold text-[#331A6F] hover:underline cursor-pointer uppercase tracking-wider"
                >
                  Log In
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: LANDLORD STEP 1 */}
          {view === 'landlord_step1' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-black">
                  Landlord Registration (1/2)
                </h3>
                <span className="text-xs font-bold text-white bg-[#331A6F] px-2.5 py-1 rounded-[8px] border-2 border-black shadow-[0.5px_0.5px_0_#000]">
                  Account Info
                </span>
              </div>

              <form onSubmit={handleLandlordStep1Submit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-black uppercase mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Jean"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2 text-black font-semibold shadow-[0.5px_0.5px_0_#000]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black uppercase mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nkurunziza"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2 text-black font-semibold shadow-[0.5px_0.5px_0_#000]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="jean@landlord.rw"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2 text-black font-semibold shadow-[0.5px_0.5px_0_#000]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-black uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+250 788 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2 text-black font-semibold shadow-[0.5px_0.5px_0_#000]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-black uppercase mb-1">
                      Password
                    </label>
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
                    <label className="block text-xs font-bold text-black uppercase mb-1">
                      Confirm Password
                    </label>
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

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setView('role_selection')}
                    className="w-1/3 py-3 rounded-[14px] bg-slate-200 text-black font-bold text-sm border-2 border-black shadow-[0.5px_0.5px_0_#000]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-3 rounded-[14px] bg-[#331A6F] text-white font-extrabold text-sm border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Next: Business Profile</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW 3: LANDLORD STEP 2 */}
          {view === 'landlord_step2' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-black">
                  Landlord Business Profile (2/2)
                </h3>
                <span className="text-xs font-bold text-white bg-[#331A6F] px-2.5 py-1 rounded-[8px] border-2 border-black shadow-[0.5px_0.5px_0_#000]">
                  Portfolio Details
                </span>
              </div>

              <form onSubmit={handleLandlordStep2Submit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-black uppercase mb-1">
                    Account Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBusinessType('INDIVIDUAL')}
                      className={`p-2.5 text-xs font-bold rounded-[12px] border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer ${
                        businessType === 'INDIVIDUAL'
                          ? 'bg-[#331A6F] text-white'
                          : 'bg-white text-black'
                      }`}
                    >
                      Individual Landlord
                    </button>
                    <button
                      type="button"
                      onClick={() => setBusinessType('COMPANY')}
                      className={`p-2.5 text-xs font-bold rounded-[12px] border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer ${
                        businessType === 'COMPANY'
                          ? 'bg-[#331A6F] text-white'
                          : 'bg-white text-black'
                      }`}
                    >
                      Company / Property Firm
                    </button>
                  </div>
                </div>

                {businessType === 'COMPANY' && (
                  <div>
                    <label className="block text-xs font-bold text-black uppercase mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Kigali Commercial Investments Ltd"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2 text-black font-semibold shadow-[0.5px_0.5px_0_#000]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-black uppercase mb-1">
                    Office / Physical Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="KN 4 Ave, Building #12"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2 text-black font-semibold shadow-[0.5px_0.5px_0_#000]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-black uppercase mb-1">
                      District
                    </label>
                    <input
                      type="text"
                      required
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2 text-black font-semibold shadow-[0.5px_0.5px_0_#000]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black uppercase mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2 text-black font-semibold shadow-[0.5px_0.5px_0_#000]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black uppercase mb-1">
                    Preferred Dashboard Language
                  </label>
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

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setView('landlord_step1')}
                    className="w-1/3 py-3 rounded-[14px] bg-slate-200 text-black font-bold text-sm border-2 border-black shadow-[0.5px_0.5px_0_#000]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 py-3 rounded-[14px] bg-[#331A6F] text-white font-extrabold text-sm border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Registering...' : 'Complete Landlord Registration'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW 4: TENANT OPTIONS */}
          {view === 'tenant_options' && (
            <div>
              <h3 className="text-xl font-bold text-black mb-1">
                Tenant Portal Access
              </h3>
              <p className="text-xs text-slate-700 font-normal mb-5">
                Tenants access Notify via invitation from their commercial property landlord.
              </p>

              <div className="p-4 rounded-[16px] bg-amber-50 border-2 border-black shadow-[0.5px_0.5px_0_#000] mb-5">
                <div className="font-bold text-sm text-black mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-700 stroke-[2.5]" />
                  <span>Have an Invitation Code or Link?</span>
                </div>
                <p className="text-xs text-slate-700 mb-3">
                  If your landlord sent you a Notify invitation link, open that link directly or enter your code below.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter invitation token"
                    value={inviteTokenInput}
                    onChange={(e) => setInviteTokenInput(e.target.value)}
                    className="flex-1 text-xs bg-white border-2 border-black rounded-[10px] px-3 py-2 text-black font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (inviteTokenInput.trim()) {
                        handleClose();
                        if (onAcceptInviteClick) onAcceptInviteClick();
                        window.location.href = `/accept-invitation?token=${inviteTokenInput.trim()}`;
                      }
                    }}
                    className="px-3 py-2 rounded-[10px] bg-black text-white font-extrabold text-xs border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer"
                  >
                    Open
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="w-full py-3.5 px-4 rounded-[14px] bg-[#331A6F] text-white font-extrabold text-sm border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4 stroke-[2.5]" />
                  <span>Log In to Existing Tenant Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => setView('role_selection')}
                  className="w-full py-2.5 rounded-[12px] bg-slate-100 text-black font-bold text-xs border-2 border-black"
                >
                  Back to Role Selection
                </button>
              </div>
            </div>
          )}

          {/* VIEW 5: LOGIN */}
          {view === 'login' && (
            <div>
              <h3 className="text-xl font-bold text-black mb-1">
                Log In to Notify
              </h3>
              <p className="text-xs text-slate-700 font-normal mb-5">
                Access your Landlord, Tenant, or System Admin portal.
              </p>

              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-black uppercase mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-black stroke-[2] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="user@notify.rw"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[12px] pl-9 pr-3 py-2.5 text-black font-semibold shadow-[0.5px_0.5px_0_#000]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black uppercase mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-black stroke-[2] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[12px] pl-9 pr-3 py-2.5 text-black font-semibold shadow-[0.5px_0.5px_0_#000]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setView('role_selection')}
                    className="w-1/3 py-3 rounded-[14px] bg-slate-200 text-black font-bold text-sm border-2 border-black shadow-[0.5px_0.5px_0_#000]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 py-3 rounded-[14px] bg-[#331A6F] text-white font-extrabold text-sm border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Authenticating...' : 'Sign In'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
