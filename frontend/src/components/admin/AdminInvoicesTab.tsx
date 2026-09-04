import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Building,
  Home,
  UserCheck,
  DollarSign,
  Calendar,
  Eye,
  CreditCard,
  X,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { adminService } from '../../services/adminService';

interface AdminInvoicesTabProps {
  invoices?: any[];
  leases?: any[];
  onRefresh: () => void;
  onNavigateToPayment?: (invoiceId: string) => void;
}

export const AdminInvoicesTab: React.FC<AdminInvoicesTabProps> = ({
  invoices = [],
  leases = [],
  onRefresh,
  onNavigateToPayment,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE'>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Invoice Form
  const [selectedLeaseId, setSelectedLeaseId] = useState(leases?.[0]?.id || '');
  const [amount, setAmount] = useState(300000);
  const [dueDate, setDueDate] = useState('2026-08-31');
  const [billingPeriod, setBillingPeriod] = useState('August 2026');

  const filtered = (invoices || []).filter((inv) => {
    const matchesSearch =
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.property_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.unit_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.billing_period?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaseId) return;

    adminService.createInvoice({
      lease_id: selectedLeaseId,
      amount: Number(amount),
      due_date: dueDate,
      billing_period: billingPeriod,
    });

    setShowAddModal(false);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-[#331A6F]" />
            <span>Platform Billing & Invoices Ledger</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            All issued rent obligations, settlement receipts, payment reconciliations and balance tracking
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#331A6F] text-white text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Generate Invoice</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by invoice #, tenant, unit, period..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Status:</span>
          {(['ALL', 'PAID', 'PARTIAL', 'UNPAID', 'OVERDUE'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg border-2 border-black transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#331A6F] text-white shadow-[0.5px_0.5px_0_#000]'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#331A6F] text-white font-extrabold uppercase tracking-wider border-b-2 border-black">
                <th className="p-3.5">Invoice # / Period</th>
                <th className="p-3.5">Tenant & Contact</th>
                <th className="p-3.5">Property & Unit</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Billed Amount</th>
                <th className="p-3.5 text-right">Amount Paid</th>
                <th className="p-3.5 text-right">Balance Due</th>
                <th className="p-3.5 text-center">Due Date</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                    No invoices matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-purple-50/40 font-medium transition-colors">
                    <td className="p-3.5">
                      <div className="font-extrabold text-slate-900 text-xs">{inv.invoice_number || inv.id}</div>
                      <div className="text-[10px] text-[#331A6F] font-bold">{inv.billing_period}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-extrabold text-slate-900">{inv.tenant_name}</div>
                      <div className="text-[10px] text-slate-400">{inv.tenant_email}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{inv.property_name}</div>
                      <div className="text-[10px] text-purple-700 font-bold">Unit {inv.unit_number}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : inv.status === 'PARTIAL'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : inv.status === 'OVERDUE'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-slate-900">
                      RWF {(inv.amount || 0).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-emerald-600">
                      RWF {(inv.paid_amount || 0).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-extrabold">
                      {(inv.balance || 0) > 0 ? (
                        <span className="text-rose-600">RWF {(inv.balance || 0).toLocaleString()}</span>
                      ) : (
                        <span className="text-emerald-700">RWF 0</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center text-slate-600 text-[11px] font-semibold">
                      {inv.due_date}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#331A6F] font-extrabold text-[11px] rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INVOICE DETAIL MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <div>
                <h3 className="font-extrabold text-base">Invoice {selectedInvoice.invoice_number || selectedInvoice.id}</h3>
                <div className="text-xs text-purple-200">Period: {selectedInvoice.billing_period}</div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Billed</div>
                  <div className="font-black text-slate-900 text-sm">
                    RWF {(selectedInvoice.amount || 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Paid</div>
                  <div className="font-black text-emerald-600 text-sm">
                    RWF {(selectedInvoice.paid_amount || 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Remaining</div>
                  <div className="font-black text-rose-600 text-sm">
                    RWF {(selectedInvoice.balance || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Tenant Name:</span>
                  <span className="font-bold text-slate-900">{selectedInvoice.tenant_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Property & Unit:</span>
                  <span className="font-bold text-[#331A6F]">
                    {selectedInvoice.property_name} (Unit {selectedInvoice.unit_number})
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Due Date:</span>
                  <span className="font-bold text-slate-900">{selectedInvoice.due_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Invoice Status:</span>
                  <span className="font-black text-slate-900">{selectedInvoice.status}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 bg-white text-slate-800 font-bold rounded-xl border-2 border-black cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE INVOICE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <h3 className="font-extrabold text-base">Generate Rent Invoice</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Lease Contract *</label>
                <select
                  required
                  value={selectedLeaseId}
                  onChange={(e) => setSelectedLeaseId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                >
                  {leases.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.tenant_name} • Unit {l.unit_number} ({l.property_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Billing Period *</label>
                <input
                  type="text"
                  required
                  value={billingPeriod}
                  onChange={(e) => setBillingPeriod(e.target.value)}
                  placeholder="e.g. August 2026"
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (RWF) *</label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl border-2 border-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#331A6F] text-white font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] cursor-pointer"
                >
                  Issue Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
