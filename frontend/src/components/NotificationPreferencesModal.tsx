import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Shield,
  Check,
  AlertCircle,
  Clock,
  Send,
  Sparkles,
  RefreshCw,
  FileText,
  ListFilter,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import {
  NotificationPreference,
  NotificationDeliveryLog,
  NotificationTemplate,
  ProcessRemindersResult
} from '../types';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRemindersProcessed?: () => void;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  onRemindersProcessed,
}) => {
  const [activeTab, setActiveTab] = useState<'PREFERENCES' | 'AUTOMATION' | 'LOGS' | 'TEMPLATES'>('PREFERENCES');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<NotificationPreference>({
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

    complaints_in_app: true,
    complaints_email: true,
    complaints_sms: false,
    complaints_whatsapp: false,

    system_in_app: true,
    system_email: false,
    system_sms: false,
    system_whatsapp: false,
  });

  const [logs, setLogs] = useState<NotificationDeliveryLog[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  
  // Test email state
  const [testEmail, setTestEmail] = useState<string>('landlord@notify.test');
  const [testMilestone, setTestMilestone] = useState<number>(7);
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Automation state
  const [processing, setProcessing] = useState<boolean>(false);
  const [automationResult, setAutomationResult] = useState<ProcessRemindersResult | null>(null);
  const [automationError, setAutomationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prefRes, logsRes, tmplRes] = await Promise.all([
        api.notifications.getPreferences().catch(() => null),
        api.notifications.getDeliveryLogs().catch(() => []),
        api.notifications.getTemplates().catch(() => []),
      ]);
      if (prefRes) setPreferences(prefRes);
      if (logsRes) setLogs(logsRes);
      if (tmplRes) setTemplates(tmplRes);
    } catch (err) {
      console.error('Failed to load notification settings', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSavePreferences = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      await api.notifications.updatePreferences(preferences);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save preferences', err);
      setSaveError(err?.message || 'Failed to save preferences. Please try again.');
      setTimeout(() => setSaveError(null), 6000);
    } finally {
      setSaving(false);
    }
  };

  const handleRunReminders = async () => {
    setProcessing(true);
    setAutomationResult(null);
    setAutomationError(null);
    try {
      const res = await api.notifications.processReminders();
      setAutomationResult(res);
      if (onRemindersProcessed) onRemindersProcessed();
      // Reload logs
      const updatedLogs = await api.notifications.getDeliveryLogs();
      setLogs(updatedLogs);
    } catch (err: any) {
      console.error('Failed to run reminders', err);
      setAutomationError(err?.message || 'Failed to run the reminder cycle. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      await api.notifications.sendTestEmail({
        email: testEmail,
        days_remaining: testMilestone,
      });
      setTestResult({
        success: true,
        message: `Test email dispatched to ${testEmail} with ${testMilestone}-day expiry template.`,
      });
      const updatedLogs = await api.notifications.getDeliveryLogs();
      setLogs(updatedLogs);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to dispatch test notification',
      });
    } finally {
      setSendingTest(false);
    }
  };

  const categories = [
    {
      key: 'lease_expiry',
      title: 'Lease Expirations',
      desc: '30, 14, 7, 3, 2, 1 days & expiry day milestones',
      in_app: preferences.lease_expiry_in_app,
      email: preferences.lease_expiry_email,
      sms: preferences.lease_expiry_sms,
      whatsapp: preferences.lease_expiry_whatsapp,
    },
    {
      key: 'payment',
      title: 'Payments & Invoicing',
      desc: 'Rent invoice issues, payments received & receipts',
      in_app: preferences.payment_in_app,
      email: preferences.payment_email,
      sms: preferences.payment_sms,
      whatsapp: preferences.payment_whatsapp,
    },
    {
      key: 'maintenance',
      title: 'Maintenance Requests',
      desc: 'Technician schedules, status updates & resolutions',
      in_app: preferences.maintenance_in_app,
      email: preferences.maintenance_email,
      sms: preferences.maintenance_sms,
      whatsapp: preferences.maintenance_whatsapp,
    },
    {
      key: 'complaints',
      title: 'Complaints & Inquiries',
      desc: 'New submissions, landlord replies & resolutions',
      in_app: preferences.complaints_in_app,
      email: preferences.complaints_email,
      sms: preferences.complaints_sms,
      whatsapp: preferences.complaints_whatsapp,
    },
    {
      key: 'system',
      title: 'System & Security',
      desc: 'Audit events, invitations and password alerts',
      in_app: preferences.system_in_app,
      email: preferences.system_email,
      sms: preferences.system_sms,
      whatsapp: preferences.system_whatsapp,
    },
  ];

  const updateChannel = (categoryKey: string, channel: 'in_app' | 'email' | 'sms' | 'whatsapp', val: boolean) => {
    const fieldName = `${categoryKey}_${channel}` as keyof NotificationPreference;
    setPreferences((prev) => ({
      ...prev,
      [fieldName]: val,
    }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-poppins"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#331A6F] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-300/30">
              <Bell className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight font-poppins">Notification Management</h3>
              <p className="text-xs text-purple-200 font-medium">Phase 5 automated lease reminders, channels & logs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('PREFERENCES')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'PREFERENCES'
                ? 'border-[#331A6F] text-[#331A6F]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Channel Preferences
          </button>
          <button
            onClick={() => setActiveTab('AUTOMATION')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'AUTOMATION'
                ? 'border-[#331A6F] text-[#331A6F]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Automated Reminder Engine
          </button>
          <button
            onClick={() => setActiveTab('LOGS')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'LOGS'
                ? 'border-[#331A6F] text-[#331A6F]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            Delivery Logs ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('TEMPLATES')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'TEMPLATES'
                ? 'border-[#331A6F] text-[#331A6F]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Milestone Templates
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* 1. CHANNEL PREFERENCES TAB */}
          {activeTab === 'PREFERENCES' && (
            <div className="space-y-5">
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-[#331A6F] shrink-0 mt-0.5" />
                <div className="text-xs text-purple-950 leading-relaxed">
                  <span className="font-bold">Multichannel Notification Routing:</span> Choose which channels receive automated alerts. Email notifications include full lease details, recommended landlord actions, and direct links.
                </div>
              </div>

              <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="py-3 px-4">Event Category</th>
                      <th className="py-3 px-3 text-center">In-App</th>
                      <th className="py-3 px-3 text-center">Email</th>
                      <th className="py-3 px-3 text-center">SMS</th>
                      <th className="py-3 px-3 text-center">WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categories.map((cat) => (
                      <tr key={cat.key} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{cat.title}</div>
                          <div className="text-[11px] text-slate-500">{cat.desc}</div>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(cat.in_app)}
                            onChange={(e) => updateChannel(cat.key, 'in_app', e.target.checked)}
                            className="w-4 h-4 text-[#331A6F] rounded border-slate-300 focus:ring-[#331A6F] cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(cat.email)}
                            onChange={(e) => updateChannel(cat.key, 'email', e.target.checked)}
                            className="w-4 h-4 text-[#331A6F] rounded border-slate-300 focus:ring-[#331A6F] cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(cat.sms)}
                            onChange={(e) => updateChannel(cat.key, 'sms', e.target.checked)}
                            className="w-4 h-4 text-[#331A6F] rounded border-slate-300 focus:ring-[#331A6F] cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(cat.whatsapp)}
                            onChange={(e) => updateChannel(cat.key, 'whatsapp', e.target.checked)}
                            className="w-4 h-4 text-[#331A6F] rounded border-slate-300 focus:ring-[#331A6F] cursor-pointer"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                {saveSuccess ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4" /> Preferences saved successfully!
                  </span>
                ) : saveError ? (
                  <span className="text-xs font-bold text-rose-600 flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4" /> {saveError}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Changes apply to all future automated cycles</span>
                )}
                <button
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#331A6F] hover:bg-[#251352] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. AUTOMATION TAB */}
          {activeTab === 'AUTOMATION' && (
            <div className="space-y-6">
              {/* Engine Description */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900 to-[#331A6F] text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <h4 className="font-bold text-base">Lease Expiry Automated Dispatcher</h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-300/30">
                    ENGINE ACTIVE
                  </span>
                </div>
                <p className="text-xs text-purple-100 leading-relaxed">
                  The automated reminder service iterates through all active leases, calculates remaining calendar days until expiration, and triggers notifications at key milestones: <span className="font-bold text-amber-300">30d, 14d, 7d, 3d, 2d, 1d, and Today</span>.
                </p>
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={handleRunReminders}
                    disabled={processing}
                    className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-60"
                  >
                    <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
                    <span>{processing ? 'Processing All Leases...' : 'Execute Reminder Cycle Now'}</span>
                  </button>
                </div>
              </div>

              {/* Automation Error */}
              {automationError && (
                <div className="p-4 border border-rose-200 bg-rose-50 rounded-2xl flex items-center gap-2 text-xs font-bold text-rose-800 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{automationError}</span>
                </div>
              )}

              {/* Automation Results Card */}
              {automationResult && (
                <div className="p-5 border border-emerald-200 bg-emerald-50/70 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Reminder Execution Summary
                    </span>
                    <span className="text-[11px] text-emerald-700 font-mono">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-white border border-emerald-200 rounded-xl text-center">
                      <div className="text-xl font-extrabold text-slate-900">{automationResult.checked_leases}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Checked Leases</div>
                    </div>
                    <div className="p-3 bg-white border border-emerald-200 rounded-xl text-center">
                      <div className="text-xl font-extrabold text-purple-700">{automationResult.reminders_created}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Reminders Created</div>
                    </div>
                    <div className="p-3 bg-white border border-emerald-200 rounded-xl text-center">
                      <div className="text-xl font-extrabold text-blue-700">{automationResult.emails_sent}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Emails Dispatched</div>
                    </div>
                    <div className="p-3 bg-white border border-emerald-200 rounded-xl text-center">
                      <div className="text-xl font-extrabold text-amber-700">{automationResult.expired_leases_updated}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Statuses Updated</div>
                    </div>
                  </div>

                  {automationResult.details && automationResult.details.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-emerald-200/60 space-y-1.5 max-h-40 overflow-y-auto">
                      <div className="text-[11px] font-bold text-emerald-900">Milestone Triggers:</div>
                      {automationResult.details.map((d, idx) => (
                        <div key={idx} className="text-[11px] text-emerald-800 bg-white/80 p-2 rounded-lg border border-emerald-100 flex items-center justify-between">
                          <span>
                            <span className="font-bold">{d.tenant_name || 'Lease'} ({d.unit || 'Unit'})</span>: {d.days_remaining} day(s) remaining ({d.milestone})
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                            {d.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Test Email Dispatcher */}
              <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#331A6F]" />
                  <h4 className="font-bold text-sm text-slate-900">Test Notification & Email Delivery</h4>
                </div>
                <p className="text-xs text-slate-500">
                  Send a sample branded lease expiry notification to verify HTML email delivery and layout formatting.
                </p>

                <form onSubmit={handleSendTestEmail} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Recipient Email</label>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="landlord@notify.test"
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#331A6F] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Milestone</label>
                    <select
                      value={testMilestone}
                      onChange={(e) => setTestMilestone(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#331A6F] focus:outline-none"
                    >
                      <option value={30}>30 Days Out</option>
                      <option value={14}>14 Days Out</option>
                      <option value={7}>7 Days Out (Urgent)</option>
                      <option value={3}>3 Days Out (Critical)</option>
                      <option value={2}>2 Days Out (Critical)</option>
                      <option value={1}>1 Day Out (Tomorrow)</option>
                      <option value={0}>Expiry Day (Today)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3 flex items-center justify-between pt-1">
                    <button
                      type="submit"
                      disabled={sendingTest}
                      className="px-4 py-2 bg-[#331A6F] hover:bg-[#251352] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{sendingTest ? 'Dispatching...' : 'Send Test Notification'}</span>
                    </button>
                  </div>
                </form>

                {testResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. DELIVERY LOGS TAB */}
          {activeTab === 'LOGS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Audit Trail of Dispatched Notifications</span>
                <button
                  onClick={loadData}
                  className="text-xs font-bold text-[#331A6F] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh Logs
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                {logs.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">No delivery logs recorded yet.</div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto">
                    {logs.map((log) => (
                      <div key={log.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900">{log.subject || 'Notification Dispatch'}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              {log.channel}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              log.status === 'SENT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {log.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>To: <span className="font-mono">{log.recipient}</span></span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. TEMPLATES TAB */}
          {activeTab === 'TEMPLATES' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                Standardized templates configured for Kigali lease reminders. Variables like <code className="text-purple-700 font-mono">{'{{tenant_name}}'}</code>, <code className="text-purple-700 font-mono">{'{{property_name}}'}</code>, and <code className="text-purple-700 font-mono">{'{{expiry_date}}'}</code> are dynamically injected.
              </div>

              <div className="space-y-3">
                {templates.map((tmpl) => (
                  <div key={tmpl.code} className="p-4 border border-slate-200 rounded-xl bg-white shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {tmpl.code}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        tmpl.default_priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                        tmpl.default_priority === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-800'
                      }`}>
                        {tmpl.default_priority} PRIORITY
                      </span>
                    </div>
                    <div className="font-bold text-xs text-slate-800">{tmpl.title_template}</div>
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-sans">
                      {tmpl.body_template}
                    </div>
                    {tmpl.action_label && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span>Action CTA:</span>
                        <span className="font-bold text-[#331A6F]">{tmpl.action_label}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
