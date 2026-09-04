import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Lock,
  Bell,
  Globe,
  LogOut,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  MessageSquare,
  KeyRound,
  FileText,
  Clock,
  Save,
  Check,
  Eye,
  EyeOff,
  Camera,
  Building,
  Key,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { NotificationPreference, Lease } from '../types';

interface TenantProfileSettingsTabProps {
  activeTenancy: any;
  activeLease: Lease | null;
  onLogout: () => void;
}

export const TenantProfileSettingsTab: React.FC<TenantProfileSettingsTabProps> = ({
  activeTenancy,
  activeLease,
  onLogout,
}) => {
  const { user, updateUserProfile, changePassword } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [activeSection, setActiveSection] = useState<'profile' | 'security' | 'notifications' | 'language'>('profile');

  // Profile Form state
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [nationalId, setNationalId] = useState(user?.tenant_profile?.national_id || '');
  const [occupation, setOccupation] = useState(user?.tenant_profile?.occupation || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Security Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Notifications state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreference>({
    lease_expiry_in_app: true,
    lease_expiry_email: true,
    lease_expiry_sms: true,
    lease_expiry_whatsapp: false,
    payment_in_app: true,
    payment_email: true,
    payment_sms: true,
    payment_whatsapp: true,
    maintenance_in_app: true,
    maintenance_email: true,
    maintenance_sms: true,
    maintenance_whatsapp: true,
    complaints_in_app: true,
    complaints_email: true,
    complaints_sms: false,
    complaints_whatsapp: false,
    system_in_app: true,
    system_email: true,
    system_sms: false,
    system_whatsapp: false,
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone || '');
      setNationalId(user.tenant_profile?.national_id || '');
      setOccupation(user.tenant_profile?.occupation || '');
    }
  }, [user]);

  // Load notifications preferences
  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await api.notifications.getPreferences();
        if (res && typeof res === 'object') {
          setNotifPrefs((prev) => ({ ...prev, ...res }));
        }
      } catch (err) {
        // Fallback to default state
      }
    };
    fetchPrefs();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      await updateUserProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        tenant_profile: {
          national_id: nationalId.trim(),
          occupation: occupation.trim(),
        },
      });

      setProfileSuccess('Your profile details have been saved successfully.');
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile information.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      setPasswordSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      setPasswordSaving(false);
      return;
    }

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setPasswordSuccess('Your password has been changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password. Please verify current password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setNotifSaving(true);
    setNotifSuccess(false);
    try {
      await api.notifications.updatePreferences(notifPrefs);
      setNotifSuccess(true);
      setTimeout(() => setNotifSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setNotifSaving(false);
    }
  };

  const handleLanguageSelect = (lang: 'en' | 'rw' | 'fr') => {
    setLanguage(lang);
    // Also sync to user profile if logged in
    if (user) {
      updateUserProfile({ language: lang }).catch(() => {});
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP PROFILE HERO CARD */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="relative group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user?.first_name || 'Tenant'}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-purple-100"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-purple-50 text-[#331A6F] font-bold text-2xl flex items-center justify-center ring-2 ring-purple-100 shrink-0">
                {user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'T'}
              </div>
            )}
            <label
              htmlFor="tenant-avatar-input"
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#331A6F] text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-[#251352] transition-colors shadow-xs"
              title="Change Photo"
            >
              <Camera className="w-3.5 h-3.5" />
              <input
                id="tenant-avatar-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </label>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900">
                {user?.first_name} {user?.last_name}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3" /> {t.verifiedTenant || 'VERIFIED TENANT'}
              </span>
            </div>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5 pt-0.5">
              <Building className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>{activeTenancy?.property?.name || 'Notify Residences'}</span>
              <span className="text-slate-300">•</span>
              <Key className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{t.unitLabel || 'Unit'} #{activeTenancy?.unit?.unit_number || 'A-102'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:self-center">
          <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            {t.activeTenancy || 'Active Tenancy'}
          </span>
        </div>
      </div>

      {/* 2. TABBED SUB-NAVIGATION FOR SETTINGS */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSection('profile')}
          className={`flex-1 min-w-[120px] min-h-[38px] py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSection === 'profile'
              ? 'bg-white text-[#331A6F] shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>{t.profileDetails || 'Profile Details'}</span>
        </button>

        <button
          onClick={() => setActiveSection('security')}
          className={`flex-1 min-w-[120px] min-h-[38px] py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSection === 'security'
              ? 'bg-white text-[#331A6F] shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{t.passwordSecurity || 'Password & Security'}</span>
        </button>

        <button
          onClick={() => setActiveSection('notifications')}
          className={`flex-1 min-w-[120px] min-h-[38px] py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSection === 'notifications'
              ? 'bg-white text-[#331A6F] shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>{t.notificationChannels || 'Notifications'}</span>
        </button>

        <button
          onClick={() => setActiveSection('language')}
          className={`flex-1 min-w-[120px] min-h-[38px] py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSection === 'language'
              ? 'bg-white text-[#331A6F] shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{t.appLanguage || 'Language'}</span>
        </button>
      </div>

      {/* 3. SECTION 1: PROFILE INFORMATION */}
      {activeSection === 'profile' && (
        <form onSubmit={handleSaveProfile} className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.profileDetails || 'Personal Information'}</h3>
              <p className="text-xs text-slate-500">Update your verified tenant contact details and ID records.</p>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
              Synced with Tenancy
            </span>
          </div>

          {profileSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t.profileSavedSuccess || profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.firstName || 'First Name'}</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:bg-white focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F] outline-hidden transition-colors"
                placeholder={t.firstName || 'First Name'}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.lastName || 'Last Name'}</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:bg-white focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F] outline-hidden transition-colors"
                placeholder={t.lastName || 'Last Name'}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.emailAddress || 'Email Address'}</label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-slate-200 bg-slate-100 text-xs font-medium text-slate-500 cursor-not-allowed outline-hidden"
                />
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Managed via system authentication credentials.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.phoneNumber || 'Phone Number'} (MoMo / SMS)</label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:bg-white focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F] outline-hidden transition-colors"
                  placeholder="+250 788 000 000"
                />
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Used for MTN MoMo payment prompts and instant SMS notifications.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.nationalIdPassport || 'National ID / Passport No.'}</label>
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:bg-white focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F] outline-hidden transition-colors"
                placeholder="1 1990 8 0012345 0 12"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.occupationBusiness || 'Occupation / Employer'}</label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:bg-white focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F] outline-hidden transition-colors"
                placeholder="Software Engineer, Business Owner, etc."
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={profileSaving}
              className="min-h-[42px] px-5 py-2 bg-[#331A6F] hover:bg-[#251352] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{profileSaving ? (t.saving || 'Saving Changes...') : (t.saveChanges || 'Save Profile Details')}</span>
            </button>
          </div>
        </form>
      )}

      {/* 4. SECTION 2: PASSWORD & SECURITY */}
      {activeSection === 'security' && (
        <form onSubmit={handleChangePassword} className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.passwordSecurity || 'Password & Authentication Security'}</h3>
              <p className="text-xs text-slate-500">Update your account login password and secure your tenant portal session.</p>
            </div>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Encrypted Session
            </span>
          </div>

          {passwordSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t.passwordSavedSuccess || passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.currentPassword || 'Current Password'}</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:bg-white focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F] outline-hidden transition-colors"
                  placeholder={t.currentPassword || 'Enter current password'}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.newPassword || 'New Password'}</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:bg-white focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F] outline-hidden transition-colors"
                  placeholder={t.newPassword || 'Enter new password (min. 6 characters)'}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.confirmNewPassword || 'Confirm New Password'}</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:bg-white focus:border-[#331A6F] focus:ring-1 focus:ring-[#331A6F] outline-hidden transition-colors"
                  placeholder={t.confirmNewPassword || 'Re-type new password'}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-start">
            <button
              type="submit"
              disabled={passwordSaving}
              className="min-h-[42px] px-5 py-2 bg-[#331A6F] hover:bg-[#251352] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{passwordSaving ? (t.saving || 'Updating Password...') : (t.updatePassword || 'Update Password')}</span>
            </button>
          </div>
        </form>
      )}

      {/* 5. SECTION 3: NOTIFICATION PREFERENCES */}
      {activeSection === 'notifications' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.notificationAlertChannels || 'Notification & Alert Channels'}</h3>
              <p className="text-xs text-slate-500">{t.configureAlertsDesc || 'Configure how and when you receive rent reminders, invoices, and maintenance updates.'}</p>
            </div>
            {notifSuccess && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Preferences Saved
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Rent & Payments */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{t.rentInvoicesReceipts || 'Rent Invoices & Payment Receipts'}</h4>
                  <p className="text-[11px] text-slate-500">{t.rentInvoicesReceiptsDesc || 'Alerts for new monthly invoices, due date reminders, and confirmed receipts.'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={notifPrefs.payment_in_app}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, payment_in_app: e.target.checked })}
                    className="rounded text-[#331A6F] focus:ring-[#331A6F]"
                  />
                  <span>{t.inApp || 'In-App'}</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={notifPrefs.payment_email}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, payment_email: e.target.checked })}
                    className="rounded text-[#331A6F] focus:ring-[#331A6F]"
                  />
                  <span>{t.email || 'Email'}</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={notifPrefs.payment_sms}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, payment_sms: e.target.checked })}
                    className="rounded text-[#331A6F] focus:ring-[#331A6F]"
                  />
                  <span>{t.sms || 'SMS'}</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={notifPrefs.payment_whatsapp}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, payment_whatsapp: e.target.checked })}
                    className="rounded text-[#331A6F] focus:ring-[#331A6F]"
                  />
                  <span>{t.whatsapp || 'WhatsApp'}</span>
                </label>
              </div>
            </div>

            {/* Maintenance & Chat */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{t.maintenanceChat || 'Maintenance & Landlord Chat'}</h4>
                  <p className="text-[11px] text-slate-500">{t.maintenanceChatDesc || 'Live technician scheduling updates, chat replies, and work orders.'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={notifPrefs.maintenance_in_app}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, maintenance_in_app: e.target.checked })}
                    className="rounded text-[#331A6F] focus:ring-[#331A6F]"
                  />
                  <span>{t.inApp || 'In-App'}</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={notifPrefs.maintenance_email}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, maintenance_email: e.target.checked })}
                    className="rounded text-[#331A6F] focus:ring-[#331A6F]"
                  />
                  <span>{t.email || 'Email'}</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={notifPrefs.maintenance_sms}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, maintenance_sms: e.target.checked })}
                    className="rounded text-[#331A6F] focus:ring-[#331A6F]"
                  />
                  <span>{t.sms || 'SMS'}</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={notifPrefs.maintenance_whatsapp}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, maintenance_whatsapp: e.target.checked })}
                    className="rounded text-[#331A6F] focus:ring-[#331A6F]"
                  />
                  <span>{t.whatsapp || 'WhatsApp'}</span>
                </label>
              </div>
            </div>

            {/* Lease Renewal & Expiring */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{t.leaseTermsExpiry || 'Lease Terms & Expiry Warnings'}</h4>
                  <p className="text-[11px] text-slate-500">{t.leaseTermsExpiryDesc || '60-day, 30-day, and 14-day automated contract milestone alerts.'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={notifPrefs.lease_expiry_in_app}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, lease_expiry_in_app: e.target.checked })}
                    className="rounded text-[#331A6F] focus:ring-[#331A6F]"
                  />
                  <span>{t.inApp || 'In-App'}</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={notifPrefs.lease_expiry_email}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, lease_expiry_email: e.target.checked })}
                    className="rounded text-[#331A6F] focus:ring-[#331A6F]"
                  />
                  <span>{t.email || 'Email'}</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={notifPrefs.lease_expiry_sms}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, lease_expiry_sms: e.target.checked })}
                    className="rounded text-[#331A6F] focus:ring-[#331A6F]"
                  />
                  <span>{t.sms || 'SMS'}</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={notifPrefs.lease_expiry_whatsapp}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, lease_expiry_whatsapp: e.target.checked })}
                    className="rounded text-[#331A6F] focus:ring-[#331A6F]"
                  />
                  <span>{t.whatsapp || 'WhatsApp'}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSaveNotifications}
              disabled={notifSaving}
              className="min-h-[42px] px-5 py-2 bg-[#331A6F] hover:bg-[#251352] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{notifSaving ? (t.saving || 'Saving...') : (t.saveNotificationPrefs || 'Save Notification Preferences')}</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. SECTION 4: LANGUAGE PREFERENCES */}
      {activeSection === 'language' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">{t.appLanguagePref || 'App Language Preference'}</h3>
            <p className="text-xs text-slate-500">
              {t.appLanguagePrefDesc || 'Select your preferred language. All tenant portal views, messages, and invoices will adapt automatically.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* English */}
            <button
              onClick={() => handleLanguageSelect('en')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[100px] ${
                language === 'en'
                  ? 'border-[#331A6F] bg-purple-50/50 ring-2 ring-[#331A6F]/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-bold text-slate-900">{t.english || 'English (EN)'}</span>
                {language === 'en' && (
                  <span className="w-5 h-5 rounded-full bg-[#331A6F] text-white flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">{t.englishDesc || 'Primary commercial and official language'}</p>
            </button>

            {/* Kinyarwanda */}
            <button
              onClick={() => handleLanguageSelect('rw')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[100px] ${
                language === 'rw'
                  ? 'border-[#331A6F] bg-purple-50/50 ring-2 ring-[#331A6F]/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-bold text-slate-900">{t.kinyarwanda || 'Ikinyarwanda (RW)'}</span>
                {language === 'rw' && (
                  <span className="w-5 h-5 rounded-full bg-[#331A6F] text-white flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">{t.kinyarwandaDesc || "Ururimi rw'igihugu n'itumanaho i Kigali"}</p>
            </button>

            {/* French */}
            <button
              onClick={() => handleLanguageSelect('fr')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[100px] ${
                language === 'fr'
                  ? 'border-[#331A6F] bg-purple-50/50 ring-2 ring-[#331A6F]/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-bold text-slate-900">{t.french || 'Français (FR)'}</span>
                {language === 'fr' && (
                  <span className="w-5 h-5 rounded-full bg-[#331A6F] text-white flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">{t.frenchDesc || 'Langue officielle et correspondance'}</p>
            </button>
          </div>
        </div>
      )}

      {/* 7. EMERGENCY & PROPERTY SUPPORT CONTACTS CARD */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">{t.emergencyContacts || 'Emergency & Management Contacts'}</h3>
        <p className="text-xs text-slate-500">{t.emergencyContactsDesc || '24/7 dedicated contact numbers for immediate building assistance.'}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Phone className="w-3.5 h-3.5 text-rose-600" /> {t.securityEmergency || '24/7 Security & Emergency'}
            </div>
            <p className="font-mono text-slate-600 font-semibold">+250 788 111 222</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Phone className="w-3.5 h-3.5 text-amber-600" /> {t.buildingCaretaker || 'Building Caretaker & Maintenance'}
            </div>
            <p className="font-mono text-slate-600 font-semibold">+250 788 333 444</p>
          </div>
        </div>
      </div>

      {/* 8. CLEAN, CLEARLY VISIBLE LOG OUT DANGER ACTION AT THE BOTTOM */}
      <div className="p-6 rounded-2xl bg-rose-50/60 border border-rose-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-rose-950">{t.signOutTenant || 'Sign Out of Tenant Account'}</h4>
          <p className="text-xs text-rose-800/80">
            {t.signOutTenantDesc || 'Terminate your active tenant portal session on this device. You will need your login credentials to sign back in.'}
          </p>
        </div>

        <button
          onClick={onLogout}
          className="min-h-[44px] px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>{t.logOut || 'Log Out'}</span>
        </button>
      </div>
    </div>
  );
};
