import React, { useState } from 'react';
import {
  Settings,
  Save,
  CheckCircle,
  Sliders,
  DollarSign,
  Bell,
  Shield,
  FileCheck2,
  Phone,
  Mail,
} from 'lucide-react';
import { adminService, PlatformSettings } from '../../services/adminService';

interface AdminSettingsTabProps {
  settings?: PlatformSettings;
  onRefresh: () => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({ settings, onRefresh }) => {
  const [form, setForm] = useState<PlatformSettings>(() => settings ? { ...settings } : adminService.getSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    adminService.updateSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-[#331A6F]" />
            <span>Platform Configurations & Global Rules</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Billing automation, SMS notification gateways, grace periods, currency formats and operational policies
          </p>
        </div>

        {savedSuccess && (
          <div className="px-3 py-1.5 bg-emerald-100 border-2 border-emerald-400 text-emerald-900 font-extrabold text-xs rounded-xl shadow-[0.5px_0.5px_0_#000] flex items-center gap-1.5 animate-bounce">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved & Applied</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* GENERAL & REGIONAL SETTINGS */}
        <div className="p-6 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#331A6F]" />
            <span>Platform Identity & Regional Config</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Platform Brand Name</label>
              <input
                type="text"
                value={form.platform_name}
                onChange={(e) => setForm({ ...form, platform_name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Primary Currency</label>
              <input
                type="text"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Rent Payment Grace Period (Days)</label>
              <input
                type="number"
                min={0}
                max={30}
                value={form.grace_period_days}
                onChange={(e) => setForm({ ...form, grace_period_days: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
              />
            </div>
          </div>
        </div>

        {/* BILLING & AUTOMATION POLICIES */}
        <div className="p-6 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Automated Billing & Operational Switches</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-extrabold text-slate-900 text-sm">Automated Monthly Invoicing</div>
                <div className="text-slate-500 font-medium mt-0.5">
                  Automatically generate rent invoices on the 1st of every month
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.auto_invoice_generation}
                onChange={(e) => setForm({ ...form, auto_invoice_generation: e.target.checked })}
                className="w-5 h-5 accent-[#331A6F] cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-extrabold text-slate-900 text-sm">SMS Payment & Due Notifications</div>
                <div className="text-slate-500 font-medium mt-0.5">
                  Send automated MTN/Airtel SMS alerts for payment verification and overdue rent
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.sms_notifications_enabled}
                onChange={(e) => setForm({ ...form, sms_notifications_enabled: e.target.checked })}
                className="w-5 h-5 accent-[#331A6F] cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-extrabold text-slate-900 text-sm">Require Countersigned Leases</div>
                <div className="text-slate-500 font-medium mt-0.5">
                  Flag active tenancies without signed PDF agreements in Compliance Center
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.require_signed_lease}
                onChange={(e) => setForm({ ...form, require_signed_lease: e.target.checked })}
                className="w-5 h-5 accent-[#331A6F] cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-extrabold text-slate-900 text-sm">Maintenance Auto-Triage</div>
                <div className="text-slate-500 font-medium mt-0.5">
                  Automatically dispatch urgent plumbing and electrical tickets to preferred on-call contractors
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.maintenance_auto_assignment}
                onChange={(e) => setForm({ ...form, maintenance_auto_assignment: e.target.checked })}
                className="w-5 h-5 accent-[#331A6F] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* SUPPORT & ESCALATION CONTACTS */}
        <div className="p-6 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Phone className="w-4 h-4 text-purple-600" />
            <span>Administrative Support & Escalation Channels</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Support Email</label>
              <input
                type="email"
                value={form.support_email}
                onChange={(e) => setForm({ ...form, support_email: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Emergency Hotline</label>
              <input
                type="text"
                value={form.support_phone}
                onChange={(e) => setForm({ ...form, support_phone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Platform Tax / VAT Rate (%)</label>
              <input
                type="number"
                min={0}
                max={50}
                value={form.tax_rate_percent}
                onChange={(e) => setForm({ ...form, tax_rate_percent: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-[#331A6F] text-white text-xs font-black rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Platform Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
