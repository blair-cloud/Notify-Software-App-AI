import React, { useState } from 'react';
import {
  History,
  Search,
  ShieldCheck,
  Filter,
  Eye,
  X,
  Clock,
  User,
  Key,
  Database,
} from 'lucide-react';

interface AdminAuditLogsTabProps {
  logs?: any[];
  onRefresh: () => void;
}

export const AdminAuditLogsTab: React.FC<AdminAuditLogsTabProps> = ({ logs = [], onRefresh }) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const filtered = (logs || []).filter((log) => {
    const matchesSearch =
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
      log.performed_by?.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(search.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-[#331A6F]" />
            <span>Platform Security & Operations Audit Trail</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Immutable system logs tracking every administrative action, user modification, payment verification, and contract update
          </p>
        </div>

        <div className="px-3 py-2 bg-purple-50 border-2 border-purple-200 rounded-xl text-[#331A6F] font-black text-xs">
          {logs.length} Recorded Security Events
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit trail by actor, action, entity, details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold bg-slate-100 border-2 border-black rounded-xl outline-none"
          >
            <option value="ALL">All Event Types</option>
            <option value="PAYMENT_VERIFIED">Payment Verification</option>
            <option value="PAYMENT_RECONCILED">Direct Payment</option>
            <option value="LEASE_CREATED">Lease Creation</option>
            <option value="LEASE_TERMINATED">Lease Termination</option>
            <option value="USER_CREATED">User Account Created</option>
            <option value="USER_STATUS_UPDATED">User Status Changed</option>
            <option value="PROPERTY_CREATED">Property Created</option>
            <option value="EXPENSE_RECORDED">Expense Recorded</option>
            <option value="SETTINGS_UPDATED">Platform Settings Saved</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#1A0B2E] text-white font-extrabold uppercase tracking-wider border-b-2 border-black">
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Actor / Admin</th>
                <th className="p-3.5">Action Executed</th>
                <th className="p-3.5">Target Entity</th>
                <th className="p-3.5">Payload Summary</th>
                <th className="p-3.5 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    No audit records matching search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-purple-50/40 font-medium transition-colors">
                    <td className="p-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-bold text-[#331A6F]">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-purple-600" />
                        <span>{log.performed_by || (import.meta as any).env?.VITE_ADMIN_EMAIL || 'blaircloudy@gmail.com'}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-purple-100 text-[#331A6F] border border-purple-300 font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-900">
                      <span className="font-bold">{log.entity_type}</span>{' '}
                      <span className="text-[10px] text-slate-400 font-mono">({log.entity_id?.slice(0, 10)})</span>
                    </td>
                    <td className="p-3.5 text-slate-600 max-w-xs truncate font-mono text-[11px]">
                      {JSON.stringify(log.details || {})}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#331A6F] font-extrabold text-[11px] rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECT LOG MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#1A0B2E] text-white flex items-center justify-between border-b-2 border-black">
              <div>
                <h3 className="font-extrabold text-base">Audit Log Event Details</h3>
                <div className="text-xs text-purple-200">Log ID: {selectedLog.id}</div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Timestamp:</span>
                  <span className="font-bold text-slate-900">{new Date(selectedLog.timestamp).toISOString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Executed By:</span>
                  <span className="font-bold text-[#331A6F]">{selectedLog.performed_by}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Action:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedLog.action}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Target Entity:</span>
                  <span className="font-bold text-slate-900">{selectedLog.entity_type} ({selectedLog.entity_id})</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Raw Payload Details</label>
                <pre className="p-4 bg-slate-900 text-emerald-400 rounded-2xl overflow-x-auto text-[11px] font-mono border-2 border-black">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-white text-slate-800 font-bold rounded-xl border-2 border-black cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
