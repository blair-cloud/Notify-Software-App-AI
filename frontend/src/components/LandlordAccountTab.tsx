import React, { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Lock,
  Bell,
  Globe,
  LogOut,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Mail,
  MessageSquare,
  KeyRound,
  FileText,
  Clock,
  Sparkles,
  Save,
  Check,
  ExternalLink,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { Property, Unit, NotificationPreference } from '../types';

interface LandlordAccountTabProps {
  properties: Property[];
  units: Unit[];
  onLogout: () => void;
}

export const LandlordAccountTab: React.FC<LandlordAccountTabProps> = ({
  properties,
  units,
  onLogout,
}) => {
  const { user, updateUserProfile, changePassword } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [activeSection, setActiveSection] = useState<'profile' | 'security' | 'notifications' | 'preferences'>('profile');

  // Profile Form state
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [businessType, setBusinessType] = useState(user?.landlord_profile?.business_type || 'INDIVIDUAL');
  const [businessName, setBusinessName] = useState(user?.landlord_profile?.business_name || '');
  const [taxIdentifier, setTaxIdentifier] = useState((user?.landlord_profile as any)?.tax_identifier || '');
  const [address, setAddress] = useState(user?.landlord_profile?.address || '');
  const [district, setDistrict] = useState(user?.landlord_profile?.district || 'Nyarugenge');
  const [city, setCity] = useState(user?.landlord_profile?.city || 'Kigali');

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Security Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Notifications state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreference>({
    lease_expiry_in_app: true,
    lease_expiry_email: true,
    lease_expiry_sms: false,
    lease_expiry_whatsapp: false,
    payment_in_app: true,
    payment_email: true,
    payment_sms: true,
    payment_whatsapp: false,
    maintenance_in_app: true,
    maintenance_email: true,
    maintenance_sms: false,
    maintenance_whatsapp: false,
    reminder_30d: true,
    reminder_14d: true,
    reminder_7d: true,
    reminder_3d: true,
    reminder_1d: true,
    reminder_0d: true,
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone || '');
      if (user.landlord_profile) {
        setBusinessType(user.landlord_profile.business_type || 'INDIVIDUAL');
        setBusinessName(user.landlord_profile.business_name || '');
        setTaxIdentifier((user.landlord_profile as any).tax_identifier || '');
        setAddress(user.landlord_profile.address || '');
        setDistrict(user.landlord_profile.district || 'Nyarugenge');
        setCity(user.landlord_profile.city || 'Kigali');
      }
    }

    // Load notification preferences
    api.notifications
      .getPreferences()
      .then((prefs) => {
        if (prefs) setNotifPrefs(prefs);
      })
      .catch((err) => console.log('Using default notif prefs', err));
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      await updateUserProfile({
        first_name: firstName,
        last_name: lastName,
        phone,
        business_type: businessType,
        business_name: businessName,
        tax_identifier: taxIdentifier,
        address,
        district,
        city,
      });
      setProfileSuccess('Profile updated successfully.');
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      setPasswordSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      setPasswordSaving(false);
      return;
    }

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleToggleNotif = async (key: keyof NotificationPreference) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    setNotifSaving(true);
    setNotifSuccess(false);

    try {
      await api.notifications.updatePreferences(updated);
      setNotifSuccess(true);
      setTimeout(() => setNotifSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update notification prefs', err);
    } finally {
      setNotifSaving(false);
    }
  };

  const initials = `${firstName ? firstName.charAt(0) : 'L'}${lastName ? lastName.charAt(0) : 'D'}`.toUpperCase();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. TOP HEADER & ACCOUNT HERO */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#331A6F] text-amber-300 font-black text-xl flex items-center justify-center shadow-xs shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  {firstName} {lastName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Landlord
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>{email}</span>
                <span>•</span>
                <span>{phone || '+250 780 000 000'}</span>
              </p>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-600 mt-2">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#331A6F]" />
                  {properties.length} {properties.length === 1 ? 'Property' : 'Properties'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#331A6F]" />
                  {units.length} {units.length === 1 ? 'Unit' : 'Units'}
                </span>
                <span>•</span>
                <span className="text-slate-400">ID: {user?.id ? user.id.slice(0, 8) : 'usr-landlord'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center">
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-t border-slate-100 mt-6 pt-4 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSection('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSection === 'profile'
                ? 'bg-[#331A6F] text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile & Business</span>
          </button>
          <button
            onClick={() => setActiveSection('security')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSection === 'security'
                ? 'bg-[#331A6F] text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Security & Password</span>
          </button>
          <button
            onClick={() => setActiveSection('notifications')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSection === 'notifications'
                ? 'bg-[#331A6F] text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications & Engine</span>
          </button>
          <button
            onClick={() => setActiveSection('preferences')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSection === 'preferences'
                ? 'bg-[#331A6F] text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Language & Region</span>
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT: PROFILE & BUSINESS */}
      {activeSection === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1">Personal & Business Details</h2>
            <p className="text-xs text-slate-500 mb-6">
              Update your landlord profile information displayed across lease agreements and invoices.
            </p>

            {profileSuccess && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 focus:border-[#331A6F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 focus:border-[#331A6F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 bg-slate-50 text-slate-500 rounded-xl cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Managed by authentication security.</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number (Rwanda)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+250 788 123 456"
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 focus:border-[#331A6F]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Company / Organization Entity
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Business Entity Type</label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value as any)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 focus:border-[#331A6F] bg-white"
                    >
                      <option value="INDIVIDUAL">Individual Owner</option>
                      <option value="COMPANY">Registered Company (Ltd)</option>
                      <option value="REAL_ESTATE_AGENCY">Property Management Agency</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Registered Business Name</label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Notify Property Holdings Ltd"
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 focus:border-[#331A6F]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">TIN / Tax Identifier</label>
                    <input
                      type="text"
                      value={taxIdentifier}
                      onChange={(e) => setTaxIdentifier(e.target.value)}
                      placeholder="100234567"
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 focus:border-[#331A6F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">District</label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="Nyarugenge"
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 focus:border-[#331A6F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">City / Province</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Kigali"
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 focus:border-[#331A6F]"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Physical Address / Office</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="KG 125 St, Nyarugenge, Kigali"
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 focus:border-[#331A6F]"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#331A6F] text-white text-xs font-semibold hover:bg-[#251352] transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Side Info Cards */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2.5 text-slate-900 font-bold text-xs mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verification & KYC</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your landlord profile is verified to issue legally binding lease contracts, official digital invoices, and manage direct tenant communications in Rwanda.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Tier:</span>
                <span className="font-semibold text-slate-900">Commercial Landlord Pro</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-5 text-xs text-slate-600 space-y-2">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#331A6F]" />
                <span>Real-Time Portfolio Sync</span>
              </div>
              <p>
                Changes to business names and addresses automatically reflect on all new invoices and PDF documents generated for your tenants.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT: SECURITY & PASSWORD */}
      {activeSection === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1">Password & Authentication</h2>
            <p className="text-xs text-slate-500 mb-6">
              Ensure your account is using a secure password to protect your tenancy and financial data.
            </p>

            {passwordSuccess && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full px-3.5 py-2 pr-10 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 focus:border-[#331A6F]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Minimum 8 characters"
                      className="w-full px-3.5 py-2 pr-10 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 focus:border-[#331A6F]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 focus:border-[#331A6F]"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#331A6F] text-white text-xs font-semibold hover:bg-[#251352] transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{passwordSaving ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs mb-3">
                <Shield className="w-4 h-4 text-[#331A6F]" />
                <span>Security Overview</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Encrypted session tokens using JSON Web Tokens (JWT).</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>PBKDF2 salted hash algorithms for password protection.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Role-based authorization checks across all API endpoints.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
              <div className="text-xs font-bold text-slate-900 mb-2">Active Device Session</div>
              <div className="text-[11px] text-slate-500 space-y-1">
                <p>Location: <span className="text-slate-800 font-medium">Kigali, Rwanda</span></p>
                <p>Status: <span className="text-emerald-700 font-semibold">Active Now</span></p>
                <p>Browser: <span className="text-slate-800 font-medium">Secure Web Client</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB CONTENT: NOTIFICATIONS & REMINDER ENGINE */}
      {activeSection === 'notifications' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Notification & Automated Reminders</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure delivery channels and automated countdown engine intervals for your tenancies.
              </p>
            </div>

            {notifSuccess && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                <Check className="w-3.5 h-3.5" />
                Preferences Saved
              </span>
            )}
          </div>

          {/* Delivery Channels */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Delivery Channels
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                onClick={() => handleToggleNotif('lease_expiry_email')}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  notifPrefs.lease_expiry_email
                    ? 'border-[#331A6F] bg-[#331A6F]/5'
                    : 'border-slate-200 bg-slate-50/50 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-[#331A6F] flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Email Alerts</div>
                    <div className="text-[10px] text-slate-500">{email}</div>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                    notifPrefs.lease_expiry_email ? 'bg-[#331A6F]' : 'bg-slate-300'
                  }`}
                >
                  {notifPrefs.lease_expiry_email ? <Check className="w-3 h-3" /> : null}
                </div>
              </div>

              <div
                onClick={() => handleToggleNotif('lease_expiry_sms')}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  notifPrefs.lease_expiry_sms
                    ? 'border-[#331A6F] bg-[#331A6F]/5'
                    : 'border-slate-200 bg-slate-50/50 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">SMS Alerts</div>
                    <div className="text-[10px] text-slate-500">{phone || '+250 780 000 000'}</div>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                    notifPrefs.lease_expiry_sms ? 'bg-[#331A6F]' : 'bg-slate-300'
                  }`}
                >
                  {notifPrefs.lease_expiry_sms ? <Check className="w-3 h-3" /> : null}
                </div>
              </div>

              <div
                onClick={() => handleToggleNotif('lease_expiry_whatsapp')}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  notifPrefs.lease_expiry_whatsapp
                    ? 'border-[#331A6F] bg-[#331A6F]/5'
                    : 'border-slate-200 bg-slate-50/50 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">WhatsApp Dispatch</div>
                    <div className="text-[10px] text-slate-500">Direct notifications</div>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                    notifPrefs.lease_expiry_whatsapp ? 'bg-[#331A6F]' : 'bg-slate-300'
                  }`}
                >
                  {notifPrefs.lease_expiry_whatsapp ? <Check className="w-3 h-3" /> : null}
                </div>
              </div>
            </div>
          </div>

          {/* Automated Milestones */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Automated Lease Expiry Engine Milestones
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Select which countdown milestones automatically trigger reminders to both you and your tenants.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { key: 'reminder_30d', label: '30 Days', desc: 'Initial Expiry Notice' },
                { key: 'reminder_14d', label: '14 Days', desc: 'Renewal Followup' },
                { key: 'reminder_7d', label: '7 Days', desc: 'Urgent Expiry Alert' },
                { key: 'reminder_3d', label: '3 Days', desc: 'Final Renewal Call' },
                { key: 'reminder_1d', label: '1 Day', desc: '24-Hour Reminder' },
                { key: 'reminder_0d', label: '0 Days', desc: 'Same-day Expiration' },
              ].map((m) => {
                const isChecked = notifPrefs[m.key as keyof NotificationPreference];
                return (
                  <div
                    key={m.key}
                    onClick={() => handleToggleNotif(m.key as keyof NotificationPreference)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isChecked
                        ? 'border-[#331A6F] bg-[#331A6F]/5'
                        : 'border-slate-200 bg-slate-50/50 opacity-60'
                    }`}
                  >
                    <div className="text-sm font-extrabold text-slate-900">{m.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{m.desc}</div>
                    <div
                      className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        isChecked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isChecked ? 'Active' : 'Disabled'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operational Alerts */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Operational & Payment Alerts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => handleToggleNotif('payment_in_app')}
                className="p-4 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">Rent Payment Received & Proof of Payment</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Instant alerts when tenants submit MoMo or Bank slip</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.payment_in_app}
                  onChange={() => {}}
                  className="rounded text-[#331A6F] focus:ring-[#331A6F]"
                />
              </div>

              <div
                onClick={() => handleToggleNotif('maintenance_in_app')}
                className="p-4 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">New Maintenance & Support Tickets</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Immediate notifications for repair requests and urgent issues</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.maintenance_in_app}
                  onChange={() => {}}
                  className="rounded text-[#331A6F] focus:ring-[#331A6F]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT: LANGUAGE & REGION */}
      {activeSection === 'preferences' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Language & Regional Settings</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize your dashboard language and localized currency preferences.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Interface Language
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { code: 'en', flag: '🇬🇧', label: 'English', desc: 'Default system language' },
                  { code: 'rw', flag: '🇷🇼', label: 'Ikinyarwanda', desc: "Ururimi rw'ibanze mu Rwanda" },
                  { code: 'fr', flag: '🇫🇷', label: 'Français', desc: 'Langue officielle' },
                ].map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setLanguage(item.code as any)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      language === item.code
                        ? 'border-[#331A6F] bg-[#331A6F]/5 ring-2 ring-[#331A6F]/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-2xl mb-1">{item.flag}</div>
                    <div className="text-xs font-bold text-slate-900">{item.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                    {language === item.code && (
                      <span className="inline-block mt-2 text-[10px] font-bold text-[#331A6F]">
                        ✓ Currently Selected
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Default Currency</label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 flex items-center justify-between">
                  <span>Rwandan Franc (RWF)</span>
                  <span className="text-[10px] text-slate-500 font-mono">FRW</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Time Zone</label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 flex items-center justify-between">
                  <span>Central Africa Time (CAT)</span>
                  <span className="text-[10px] text-slate-500 font-mono">GMT+2</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
              <div className="text-xs font-bold text-slate-900 mb-2">Account Actions</div>
              <p className="text-xs text-slate-500 mb-4">
                Need to switch accounts or end your active session on this device?
              </p>
              <button
                onClick={onLogout}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Notify Landlord</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
