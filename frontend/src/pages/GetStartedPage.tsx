import React, { useState } from 'react';
import {
  Building2,
  User,
  LogIn,
  ArrowRight,
  ArrowLeft,
  X,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Check,
  Globe2,
  Sparkles,
  Building,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { isMockAuthDisabled } from '../utils/mockAuth';
import { BRAND_IMAGES, BrandPicture } from '../constants/brandImages';

interface GetStartedPageProps {
  onGoHome: () => void;
  onAcceptInviteClick?: () => void;
}

type SelectedRole = 'LANDLORD' | 'TENANT' | 'LOGIN' | null;

export const GetStartedPage: React.FC<GetStartedPageProps> = ({
  onGoHome,
  onAcceptInviteClick,
}) => {
  const { t, language, setLanguage } = useLanguage();
  const { login, registerLandlord, error: authError, clearError } = useAuth();

  // Selected flow role
  const [selectedRole, setSelectedRole] = useState<SelectedRole>(null);

  // Current active step number (1-based)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Loading & error handling
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Landlord Step 2 (Account Creation)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+250 788 000 000');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Landlord Step 3 (Profile Details)
  const [businessType, setBusinessType] = useState<'INDIVIDUAL' | 'COMPANY'>('INDIVIDUAL');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('Nyarugenge');
  const [city, setCity] = useState('Kigali');

  // Tenant Step 2 (Invitation Token)
  const [inviteTokenInput, setInviteTokenInput] = useState('');

  // Determine total steps for current flow
  const getTotalSteps = (): number => {
    if (selectedRole === 'LANDLORD') return 4;
    if (selectedRole === 'TENANT') return 3;
    if (selectedRole === 'LOGIN') return 2;
    return 1; // Step 1: Role selection
  };

  const totalSteps = getTotalSteps();
  const progressPercentage = Math.round((currentStep / totalSteps) * 100);

  // Step Title / Subtitle Helper
  const getStepHeader = () => {
    if (currentStep === 1) {
      return {
        title: 'Choose your role to get started',
        subtitle: 'Select how you will be using Notify to tailor your onboarding experience.',
      };
    }

    if (selectedRole === 'LANDLORD') {
      if (currentStep === 2) {
        return {
          title: 'Account & Security Details',
          subtitle: 'Enter your name, email, and a secure password for your landlord portal.',
        };
      }
      if (currentStep === 3) {
        return {
          title: 'Property & Business Profile',
          subtitle: 'Provide your physical address and business details to customize unit management.',
        };
      }
      if (currentStep === 4) {
        return {
          title: 'Language & Final Confirmation',
          subtitle: 'Choose your preferred dashboard language and review your information before completing.',
        };
      }
    }

    if (selectedRole === 'TENANT') {
      if (currentStep === 2) {
        return {
          title: 'Tenant Invitation & Access',
          subtitle: 'Notify tenant accounts are linked to properties registered by your landlord.',
        };
      }
      if (currentStep === 3) {
        return {
          title: 'Complete Tenant Connection',
          subtitle: 'Verify your invitation token or access your existing tenant credentials.',
        };
      }
    }

    if (selectedRole === 'LOGIN') {
      return {
        title: 'Sign In to Your Account',
        subtitle: 'Enter your credentials to access your Landlord, Tenant, or System Admin dashboard.',
      };
    }

    return {
      title: 'Notify Onboarding',
      subtitle: 'Complete setup to launch your rental property management portal.',
    };
  };

  const stepHeaderInfo = getStepHeader();

  // Navigation handlers
  const handleSelectRole = (role: SelectedRole) => {
    clearError();
    setFormError(null);
    setSelectedRole(role);
  };

  const handleNextStep1 = () => {
    if (!selectedRole) {
      setFormError('Please select a role to continue.');
      return;
    }
    clearError();
    setFormError(null);
    setCurrentStep(2);
  };

  const handleBack = () => {
    clearError();
    setFormError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      setSelectedRole(null);
    }
  };

  // Landlord Step 2 Submit
  const handleLandlordStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify both password fields.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    setCurrentStep(3);
  };

  // Landlord Step 3 Submit
  const handleLandlordStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (businessType === 'COMPANY' && !businessName.trim()) {
      setFormError('Please enter your company or firm name.');
      return;
    }
    if (!address.trim()) {
      setFormError('Please enter your office or physical address.');
      return;
    }

    setCurrentStep(4);
  };

  // Landlord Step 4 (Final Submit)
  const handleLandlordFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);

    try {
      await registerLandlord({
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
        language,
      });

      setLoading(false);
      // AuthContext will update user state and App.tsx will automatically transition to LandlordDashboardPage!
    } catch (err: any) {
      setLoading(false);
      setFormError(err.message || 'Registration failed. Please try again.');
    }
  };

  // Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);

    try {
      await login(loginEmail, loginPassword);
      setLoading(false);
      // AuthContext will update user state and App.tsx will automatically transition to dashboard!
    } catch (err: any) {
      setLoading(false);
      setFormError(err.message || 'Invalid email or password. Please verify your credentials.');
    }
  };

  // Tenant Token Submit
  const handleTenantTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteTokenInput.trim()) {
      setFormError('Please enter a valid invitation token.');
      return;
    }
    if (onAcceptInviteClick) onAcceptInviteClick();
    window.location.href = `/accept-invitation?token=${encodeURIComponent(inviteTokenInput.trim())}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-[#331A6F] selection:text-white">
      {/* 1. Header & Consistent Progress Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <button
            onClick={onGoHome}
            className="flex items-center gap-3 group text-left cursor-pointer focus:outline-none"
            aria-label="Return Home"
          >
            <BrandPicture
              webp={BRAND_IMAGES.logo}
              png={BRAND_IMAGES.logoPng}
              alt="Notify"
              className="h-12 sm:h-14 w-auto object-contain transition-transform duration-150 group-hover:scale-105"
              loading="eager"
              fetchPriority="high"
            />
          </button>

          {/* Progress Indicator & Bar */}
          <div className="flex-1 max-w-xs sm:max-w-md mx-4 flex flex-col items-center">
            <div className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <span>
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-[#331A6F] font-bold">{progressPercentage}% Completed</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#331A6F] h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Close / Exit Button */}
          <button
            onClick={onGoHome}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <span>Exit</span>
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </header>

      {/* 2. Main Full-Page Onboarding Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 flex flex-col justify-between">
        <div>
          {/* Step Header */}
          <div className="mb-8 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {stepHeaderInfo.title}
            </h1>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              {stepHeaderInfo.subtitle}
            </p>
          </div>

          {/* Error Alert Box */}
          {(formError || authError) && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <div>{formError || authError}</div>
            </div>
          )}

          {/* STEP 1: ROLE SELECTION */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* Option 1: Landlord */}
              <div
                onClick={() => handleSelectRole('LANDLORD')}
                className={`p-6 rounded-2xl border transition-all cursor-pointer flex items-start gap-5 ${selectedRole === 'LANDLORD'
                  ? 'border-[#331A6F] bg-white ring-2 ring-[#331A6F]/20 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${selectedRole === 'LANDLORD'
                    ? 'bg-[#331A6F] text-white'
                    : 'bg-slate-100 text-slate-700'
                    }`}
                >
                  <Building2 className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">
                      Landlord or Property Manager
                    </h3>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedRole === 'LANDLORD'
                        ? 'border-[#331A6F] bg-[#331A6F] text-white'
                        : 'border-slate-300 bg-white'
                        }`}
                    >
                      {selectedRole === 'LANDLORD' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                    Manage commercial units, track rental contracts, record tenant payments, and send direct SMS or email notifications.
                  </p>
                </div>
              </div>

              {/* Option 2: Tenant */}
              <div
                onClick={() => handleSelectRole('TENANT')}
                className={`p-6 rounded-2xl border transition-all cursor-pointer flex items-start gap-5 ${selectedRole === 'TENANT'
                  ? 'border-[#331A6F] bg-white ring-2 ring-[#331A6F]/20 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${selectedRole === 'TENANT'
                    ? 'bg-[#331A6F] text-white'
                    : 'bg-slate-100 text-slate-700'
                    }`}
                >
                  <User className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">
                      Tenant
                    </h3>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedRole === 'TENANT'
                        ? 'border-[#331A6F] bg-[#331A6F] text-white'
                        : 'border-slate-300 bg-white'
                        }`}
                    >
                      {selectedRole === 'TENANT' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                    Access your leased unit details, view rent payment schedules, and receive official notices from your landlord.
                  </p>
                </div>
              </div>

              {/* Option 3: Existing User (Login) */}
              <div
                onClick={() => handleSelectRole('LOGIN')}
                className={`p-6 rounded-2xl border transition-all cursor-pointer flex items-start gap-5 ${selectedRole === 'LOGIN'
                  ? 'border-[#331A6F] bg-white ring-2 ring-[#331A6F]/20 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${selectedRole === 'LOGIN'
                    ? 'bg-[#331A6F] text-white'
                    : 'bg-slate-100 text-slate-700'
                    }`}
                >
                  <LogIn className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">
                      I already have an account
                    </h3>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedRole === 'LOGIN'
                        ? 'border-[#331A6F] bg-[#331A6F] text-white'
                        : 'border-slate-300 bg-white'
                        }`}
                    >
                      {selectedRole === 'LOGIN' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                    Sign in with your email address and password to access your existing Landlord, Tenant, or Admin portal.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* LANDLORD FLOW: STEP 2 - Account Credentials */}
          {selectedRole === 'LANDLORD' && currentStep === 2 && (
            <form id="landlord-step2-form" onSubmit={handleLandlordStep2Submit} className="space-y-5 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jean"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nkurunziza"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="jean@landlord.rw"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="+250 788 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F]"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* LANDLORD FLOW: STEP 3 - Business Profile */}
          {selectedRole === 'LANDLORD' && currentStep === 3 && (
            <form id="landlord-step3-form" onSubmit={handleLandlordStep3Submit} className="space-y-5 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Account Category
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBusinessType('INDIVIDUAL')}
                    className={`p-3.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${businessType === 'INDIVIDUAL'
                      ? 'bg-[#331A6F] text-white border-[#331A6F] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                  >
                    Individual Landlord
                  </button>
                  <button
                    type="button"
                    onClick={() => setBusinessType('COMPANY')}
                    className={`p-3.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${businessType === 'COMPANY'
                      ? 'bg-[#331A6F] text-white border-[#331A6F] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                  >
                    Company / Property Firm
                  </button>
                </div>
              </div>

              {businessType === 'COMPANY' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Company / Business Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kigali Commercial Holdings Ltd"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Office / Physical Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KN 4 Ave, Building #12"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    District
                  </label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F]"
                  />
                </div>
              </div>
            </form>
          )}

          {/* LANDLORD FLOW: STEP 4 - Language & Confirmation */}
          {selectedRole === 'LANDLORD' && currentStep === 4 && (
            <form id="landlord-step4-form" onSubmit={handleLandlordFinalSubmit} className="space-y-6">
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-[#331A6F]" />
                    <span>Preferred Dashboard Language</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setLanguage('rw')}
                      className={`py-3 px-4 text-xs font-bold rounded-xl border transition-all cursor-pointer ${language === 'rw'
                        ? 'bg-[#331A6F] text-white border-[#331A6F] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                    >
                      Kinyarwanda
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      className={`py-3 px-4 text-xs font-bold rounded-xl border transition-all cursor-pointer ${language === 'en'
                        ? 'bg-[#331A6F] text-white border-[#331A6F] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('fr')}
                      className={`py-3 px-4 text-xs font-bold rounded-xl border transition-all cursor-pointer ${language === 'fr'
                        ? 'bg-[#331A6F] text-white border-[#331A6F] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                    >
                      Français
                    </button>
                  </div>
                </div>

                {/* Account Summary Review */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Summary Review
                  </h4>
                  <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-2 text-slate-700">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-500">Name:</span>
                      <span className="font-bold text-slate-900">{firstName} {lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-500">Email:</span>
                      <span className="font-bold text-slate-900">{email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-500">Phone:</span>
                      <span className="font-bold text-slate-900">{phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-500">Category:</span>
                      <span className="font-bold text-slate-900">
                        {businessType === 'COMPANY' ? `Company (${businessName})` : 'Individual Landlord'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-500">Location:</span>
                      <span className="font-bold text-slate-900">{address}, {district}, {city}</span>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* TENANT FLOW: STEP 2 - Token & Invitation */}
          {selectedRole === 'TENANT' && currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                  <ShieldCheck className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold">Have an Invitation Code or Token?</h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      If your commercial property landlord sent you an invitation token or link, enter it below to accept your tenancy.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleTenantTokenSubmit} className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Invitation Token
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. inv_98a7b6c5"
                      value={inviteTokenInput}
                      onChange={(e) => setInviteTokenInput(e.target.value)}
                      className="flex-1 text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-[#331A6F]"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#331A6F] text-white font-bold text-xs hover:bg-[#281458] transition-colors cursor-pointer"
                    >
                      Verify Token
                    </button>
                  </div>
                </form>

                <div className="pt-4 border-t border-slate-200 text-center">
                  <p className="text-xs text-slate-600 mb-3">
                    Already accepted your invitation or created your account?
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('LOGIN');
                      setCurrentStep(2);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 text-slate-800 font-semibold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <Lock className="w-4 h-4 stroke-[2]" />
                    <span>Sign In with Existing Tenant Credentials</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TENANT FLOW: STEP 3 - Confirmation */}
          {selectedRole === 'TENANT' && currentStep === 3 && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Ready to Connect</h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Click below to launch the tenant portal login or invitation acceptance workspace.
              </p>
              <button
                onClick={() => {
                  if (inviteTokenInput.trim()) {
                    window.location.href = `/accept-invitation?token=${encodeURIComponent(inviteTokenInput.trim())}`;
                  } else {
                    setSelectedRole('LOGIN');
                    setCurrentStep(2);
                  }
                }}
                className="px-8 py-3 rounded-xl bg-[#331A6F] text-white font-semibold text-sm hover:bg-[#281458] transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <span>Proceed to Tenant Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* LOGIN FLOW: STEP 2 - Sign In */}
          {selectedRole === 'LOGIN' && currentStep === 2 && (
            <div className="space-y-6">
              {/* Dev Mock Auth Quick Login Box */}
              {!isMockAuthDisabled() && (
                <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-400/50 text-slate-900 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        Development Mock Login (1-Click)
                      </h4>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Click any role below to test Phase 1 dashboards instantly without backend DB setup.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {/* demo mode removed */}}
                      className="p-3 rounded-xl bg-black text-white text-xs font-black border-2 border-black hover:bg-slate-800 transition-all flex flex-col items-center gap-1 cursor-pointer shadow-xs group"
                    >
                      <ShieldCheck className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
                      <span>System Admin</span>
                      <span className="text-[10px] text-slate-300 font-normal">admin@notify.test</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {/* demo mode removed */}}
                      className="p-3 rounded-xl bg-[#331A6F] text-white text-xs font-black border-2 border-[#331A6F] hover:bg-[#281458] transition-all flex flex-col items-center gap-1 cursor-pointer shadow-xs group"
                    >
                      <Building className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
                      <span>Landlord</span>
                      <span className="text-[10px] text-purple-200 font-normal">landlord@notify.test</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {/* demo mode removed */}}
                      className="p-3 rounded-xl bg-emerald-700 text-white text-xs font-black border-2 border-emerald-800 hover:bg-emerald-800 transition-all flex flex-col items-center gap-1 cursor-pointer shadow-xs group"
                    >
                      <User className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
                      <span>Tenant</span>
                      <span className="text-[10px] text-emerald-100 font-normal">tenant@notify.test</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Standard Login Form */}
              <form id="login-form" onSubmit={handleLoginSubmit} className="space-y-5 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="user@notify.rw"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F]"
                    />
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* 3. Bottom Step Navigation Controls */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between gap-4">
          {/* Back Button */}
          <button
            type="button"
            onClick={currentStep === 1 ? onGoHome : handleBack}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2]" />
            <span>{currentStep === 1 ? 'Back to Home' : 'Back'}</span>
          </button>

          {/* Forward / Submit Button */}
          {currentStep === 1 && (
            <button
              type="button"
              onClick={handleNextStep1}
              disabled={!selectedRole}
              className="px-7 py-3 rounded-xl bg-[#331A6F] text-white font-semibold text-xs hover:bg-[#281458] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4 stroke-[2]" />
            </button>
          )}

          {selectedRole === 'LANDLORD' && currentStep === 2 && (
            <button
              type="submit"
              form="landlord-step2-form"
              className="px-7 py-3 rounded-xl bg-[#331A6F] text-white font-semibold text-xs hover:bg-[#281458] transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Next: Property Details</span>
              <ArrowRight className="w-4 h-4 stroke-[2]" />
            </button>
          )}

          {selectedRole === 'LANDLORD' && currentStep === 3 && (
            <button
              type="submit"
              form="landlord-step3-form"
              className="px-7 py-3 rounded-xl bg-[#331A6F] text-white font-semibold text-xs hover:bg-[#281458] transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Next: Preferences</span>
              <ArrowRight className="w-4 h-4 stroke-[2]" />
            </button>
          )}

          {selectedRole === 'LANDLORD' && currentStep === 4 && (
            <button
              type="submit"
              form="landlord-step4-form"
              disabled={loading}
              className="px-7 py-3 rounded-xl bg-[#331A6F] text-white font-semibold text-xs hover:bg-[#281458] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {loading ? 'Completing Setup...' : 'Complete & Launch Dashboard'}
            </button>
          )}

          {selectedRole === 'TENANT' && currentStep === 2 && (
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-7 py-3 rounded-xl bg-[#331A6F] text-white font-semibold text-xs hover:bg-[#281458] transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4 stroke-[2]" />
            </button>
          )}

          {selectedRole === 'LOGIN' && currentStep === 2 && (
            <button
              type="submit"
              form="login-form"
              disabled={loading}
              className="px-7 py-3 rounded-xl bg-[#331A6F] text-white font-semibold text-xs hover:bg-[#281458] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
};
