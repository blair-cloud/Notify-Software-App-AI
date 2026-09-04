import React, { useState } from 'react';
import {
  Bell,
  Search,
  Plus,
  Send,
  Users,
  UserCheck,
  Building,
  CheckCircle,
  X,
  Radio,
} from 'lucide-react';
import { adminService } from '../../services/adminService';

interface AdminNotificationsTabProps {
  notifications?: any[];
  onRefresh: () => void;
}

export const AdminNotificationsTab: React.FC<AdminNotificationsTabProps> = ({
  notifications = [],
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('ALL');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'LANDLORD' | 'TENANT' | 'SYSTEM_ADMIN'>('ALL');

  const filtered = (notifications || []).filter((n) => {
    const matchesSearch =
      n.title?.toLowerCase().includes(search.toLowerCase()) ||
      n.message?.toLowerCase().includes(search.toLowerCase()) ||
      n.recipient_name?.toLowerCase().includes(search.toLowerCase());

    const matchesAudience = audienceFilter === 'ALL' || n.target_audience === audienceFilter || n.recipient_role === audienceFilter;

    return matchesSearch && matchesAudience;
  });

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;

    adminService.sendBroadcastNotification({
      title,
      message,
      target_audience: targetAudience,
    });

    setTitle('');
    setMessage('');
    setShowBroadcastModal(false);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-indigo-600" />
            <span>Platform Broadcasts & Push Notifications</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Broadcast emergency alerts, maintenance windows, rent reminders, and policy announcements
          </p>
        </div>

        <button
          onClick={() => setShowBroadcastModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#331A6F] text-white text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Send className="w-4 h-4 stroke-[3]" />
          <span>Broadcast Notice</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Audience:</span>
          {(['ALL', 'LANDLORD', 'TENANT'] as const).map((aud) => (
            <button
              key={aud}
              onClick={() => setAudienceFilter(aud)}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg border-2 border-black transition-all cursor-pointer ${
                audienceFilter === aud
                  ? 'bg-indigo-600 text-white shadow-[0.5px_0.5px_0_#000]'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {aud}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications Table */}
      <div className="rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#331A6F] text-white font-extrabold uppercase tracking-wider border-b-2 border-black">
                <th className="p-3.5">Notice Title</th>
                <th className="p-3.5">Message Content</th>
                <th className="p-3.5 text-center">Target Audience</th>
                <th className="p-3.5">Sent Timestamp</th>
                <th className="p-3.5 text-center">Delivery Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                    No broadcast history matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((n) => (
                  <tr key={n.id} className="hover:bg-indigo-50/40 font-medium transition-colors">
                    <td className="p-3.5">
                      <div className="font-extrabold text-slate-900 text-sm">{n.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {n.id}</div>
                    </td>
                    <td className="p-3.5 text-slate-700 max-w-md">
                      {n.message}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {n.target_audience || n.recipient_role || 'ALL'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 text-[11px]">
                      {n.created_at || '2026-08-16 09:30 AM'}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Delivered</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BROADCAST MODAL */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <h3 className="font-extrabold text-base">Broadcast Platform Notification</h3>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBroadcast} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Audience *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ALL', 'LANDLORD', 'TENANT'] as const).map((aud) => (
                    <button
                      type="button"
                      key={aud}
                      onClick={() => setTargetAudience(aud)}
                      className={`p-2.5 rounded-xl border-2 border-black font-extrabold text-xs transition-all cursor-pointer ${
                        targetAudience === aud
                          ? 'bg-[#331A6F] text-white shadow-[0.5px_0.5px_0_#000]'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {aud === 'ALL' ? 'All Platform' : `${aud}s Only`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Broadcast Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Scheduled System Upgrade / Rent Due Reminder"
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Message Body *</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type the message that will be dispatched to in-app notification centers and mobile alerts..."
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl border-2 border-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#331A6F] text-white font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] cursor-pointer"
                >
                  Dispatch Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
