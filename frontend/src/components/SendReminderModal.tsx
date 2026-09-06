import React, { useState } from 'react';
import { Tenant, Invoice } from '../types';
import { api } from '../services/api';
import {
  X,
  Send,
  Bell,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Loader2,
  Calendar,
  DollarSign
} from 'lucide-react';

interface SendReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  invoice?: Invoice | null;
  onSuccess: (msg: string) => void;
}

export const SendReminderModal: React.FC<SendReminderModalProps> = ({
  isOpen,
  onClose,
  tenant,
  invoice,
  onSuccess,
}) => {
  if (!isOpen || !tenant) return null;

  const dueAmount = invoice?.balance_due || tenant.monthly_rent || 350000;
  const dueDate = invoice?.due_date || '2026-08-05';
  const invoiceNum = invoice?.invoice_number || 'INV-2026-000001';

  const [reminderType, setReminderType] = useState<string>('RENT_DUE_SOON');
  const [sendInApp, setSendInApp] = useState(true);
  const [sendSms, setSendSms] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [customNote, setCustomNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getTemplateText = () => {
    switch (reminderType) {
      case 'RENT_DUE_7D':
        return `Dear ${tenant.first_name}, this is a friendly reminder from Notify Kigali that your monthly rent of RWF ${dueAmount.toLocaleString()} for Unit ${tenant.unit_number || 'A-102'} (${tenant.property_name || 'Notify Heights'}) is due in 7 days on ${dueDate}. Payment via MoMo / Bank slip is accepted in your portal.`;
      case 'RENT_DUE_3D':
        return `Hello ${tenant.first_name}, rent for Unit ${tenant.unit_number || 'A-102'} (RWF ${dueAmount.toLocaleString()}) is due in 3 days on ${dueDate}. Please ensure timely settlement. Thank you!`;
      case 'RENT_DUE_1D':
        return `Urgent Notice: Dear ${tenant.first_name}, your rent payment of RWF ${dueAmount.toLocaleString()} is due tomorrow (${dueDate}). Please submit your payment verification in the Notify portal.`;
      case 'RENT_DUE_TODAY':
        return `Action Required: Dear ${tenant.first_name}, rent payment of RWF ${dueAmount.toLocaleString()} is due today (${dueDate}). Please complete payment to avoid late fees.`;
      case 'RENT_OVERDUE_1D':
        return `Overdue Notice: Dear ${tenant.first_name}, your rent of RWF ${dueAmount.toLocaleString()} for ${tenant.property_name} ${tenant.unit_number} is 1 day overdue. Please settle immediately.`;
      case 'RENT_OVERDUE_3D':
        return `Final Notice: Rent payment for Unit ${tenant.unit_number} is 3 days overdue (Balance: RWF ${dueAmount.toLocaleString()}). Please contact property management or pay via portal today.`;
      case 'RENT_OVERDUE_7D':
        return `Critical Notice: Rent payment is 7 days overdue. A late fee may be assessed if payment of RWF ${dueAmount.toLocaleString()} is not cleared within 24 hours.`;
      default:
        return `Dear ${tenant.first_name}, this is a reminder regarding your outstanding rent balance of RWF ${dueAmount.toLocaleString()} for Unit ${tenant.unit_number || 'A-102'}. ${customNote}`;
    }
  };

  const handleSendReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setErrorMsg(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 700));

      const messageContent = getTemplateText();

      await api.notifications.create({
        user_id: tenant.id,
        type: reminderType as any,
        title: `Rent Payment Reminder: ${invoiceNum}`,
        message: messageContent,
        channel: 'IN_APP',
        priority: reminderType.includes('OVERDUE') ? 'CRITICAL' : 'HIGH',
        category: 'RENT_DUE',
        entity_type: 'INVOICE',
        entity_id: invoice?.id || 'inv-manual-001',
        action_url: '/tenant/payments',
        action_label: 'Pay Rent Now',
      });

      const channelsUsed = [];
      if (sendInApp) channelsUsed.push('In-App');
      if (sendSms) channelsUsed.push(`SMS (${tenant.phone})`);
      if (sendEmail) channelsUsed.push(`Email (${tenant.email})`);

      onSuccess(`Reminder sent successfully to ${tenant.first_name} ${tenant.last_name} via ${channelsUsed.join(', ') || 'the selected channels'}.`);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to send reminder. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#331A6F] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-400 text-slate-950 font-black flex items-center justify-center border border-black text-sm">
              <Send className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold">Send Rent Payment Reminder</h3>
              <p className="text-xs text-purple-200">
                To {tenant.first_name} {tenant.last_name} ({tenant.unit_number})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSendReminder} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Target details */}
          <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900">{tenant.first_name} {tenant.last_name}</div>
              <div className="text-[11px] text-slate-500">{tenant.phone} • {tenant.email}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Outstanding</span>
              <span className="text-sm font-extrabold text-[#331A6F]">RWF {dueAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Reminder Milestone Template */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Select Reminder Type / Milestone *</label>
            <select
              value={reminderType}
              onChange={(e) => setReminderType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30"
            >
              <optgroup label="Pre-Due Milestones">
                <option value="RENT_DUE_7D">7 Days Before Due (Friendly Notice)</option>
                <option value="RENT_DUE_3D">3 Days Before Due (Upcoming Due Date)</option>
                <option value="RENT_DUE_1D">1 Day Before Due (Tomorrow)</option>
                <option value="RENT_DUE_TODAY">Due Today (Urgent Settlement)</option>
              </optgroup>
              <optgroup label="Overdue Milestones">
                <option value="RENT_OVERDUE_1D">1 Day Overdue Notice</option>
                <option value="RENT_OVERDUE_3D">3 Days Overdue (Final Notice)</option>
                <option value="RENT_OVERDUE_7D">7 Days Overdue (Late Fee Assessment)</option>
              </optgroup>
              <optgroup label="Custom">
                <option value="CUSTOM">Custom Personalized Reminder</option>
              </optgroup>
            </select>
          </div>

          {/* Delivery Channels */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">Delivery Channels</label>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={sendInApp}
                  onChange={(e) => setSendInApp(e.target.checked)}
                  className="w-4 h-4 accent-[#331A6F]"
                />
                <Bell className="w-3.5 h-3.5 text-[#331A6F]" />
                <span className="font-bold text-slate-700">In-App</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={sendSms}
                  onChange={(e) => setSendSms(e.target.checked)}
                  className="w-4 h-4 accent-[#331A6F]"
                />
                <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-bold text-slate-700">SMS</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="w-4 h-4 accent-[#331A6F]"
                />
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-bold text-slate-700">Email</span>
              </label>
            </div>
          </div>

          {/* Message Preview */}
          <div>
            <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
              <span>Message Preview</span>
              <span className="text-[11px] text-slate-400 font-normal">Auto-formatted with tenant data</span>
            </label>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs leading-relaxed font-mono">
              {getTemplateText()}
            </div>
          </div>

          {/* Custom Note input if needed */}
          {reminderType === 'CUSTOM' && (
            <div>
              <label className="block text-slate-700 font-bold mb-1">Additional Note</label>
              <textarea
                rows={2}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Type your custom instructions or bank payment details..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30 text-xs"
              />
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2.5 bg-[#331A6F] hover:bg-[#251352] text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Dispatching...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Immediate Reminder</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
