import React, { useState, useMemo } from 'react';
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
  TrendingUp,
  Clock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';

interface AdminInvoicesTabProps {
  invoices?: any[];
  leases?: any[];
  properties?: any[];
  units?: any[];
  landlords?: any[];
  tenants?: any[];
  onRefresh: () => void;
  onNavigateToPayment?: (invoiceId: string) => void;
}

export const AdminInvoicesTab: React.FC<AdminInvoicesTabProps> = ({
  invoices = [],
  leases = [],
  properties = [],
  units = [],
  landlords = [],
  tenants = [],
  onRefresh,
  onNavigateToPayment,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE'>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // New Invoice Form
  const [selectedLeaseId, setSelectedLeaseId] = useState(leases?.[0]?.id || '');
  const [amount, setAmount] = useState(300000);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  });
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  });

  // Fast lookup maps for related entities
  const tenantMap = useMemo(() => {
    const map = new Map<string, { name: string; email?: string }>();
    tenants.forEach((t) => {
      const name = t.name || t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Tenant';
      if (t.id) map.set(t.id, { name, email: t.email });
    });
    return map;
  }, [tenants]);

  const landlordMap = useMemo(() => {
    const map = new Map<string, string>();
    landlords.forEach((l) => {
      const name = l.name || l.business_name || `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Landlord';
      if (l.id) map.set(l.id, name);
    });
    return map;
  }, [landlords]);

  const propertyMap = useMemo(() => {
    const map = new Map<string, string>();
    properties.forEach((p) => {
      if (p.id) map.set(p.id, p.name || 'Property');
    });
    return map;
  }, [properties]);

  const unitMap = useMemo(() => {
    const map = new Map<string, string>();
    units.forEach((u) => {
      if (u.id) map.set(u.id, u.unit_number || 'Unit');
    });
    return map;
  }, [units]);

  // Enrich invoices with actual relations
  const enrichedInvoices = useMemo(() => {
    return (invoices || []).map((inv) => {
      const tenantInfo = tenantMap.get(inv.tenant_id);
      const tenantName = inv.tenant_name || tenantInfo?.name || 'Tenant';
      const tenantEmail = inv.tenant_email || tenantInfo?.email || 'N/A';
      const landlordName = inv.landlord_name || landlordMap.get(inv.landlord_id) || 'Landlord';
      const propertyName = inv.property_name || propertyMap.get(inv.property_id) || 'Property';
      const unitNumber = inv.unit_number || unitMap.get(inv.unit_id) || 'Unit';

      const billedAmount = Number(inv.total_amount || inv.amount || inv.subtotal || 0);
      const paidAmount = Number(inv.amount_paid || inv.paid_amount || 0);
      const balanceDue = Number(
        inv.balance_due !== undefined
          ? inv.balance_due
          : inv.balance !== undefined
          ? inv.balance
          : Math.max(0, billedAmount - paidAmount)
      );

      // Period label
      let periodLabel = inv.billing_period;
      if (!periodLabel && inv.billing_period_start && inv.billing_period_end) {
        periodLabel = `${inv.billing_period_start} to ${inv.billing_period_end}`;
      } else if (!periodLabel) {
        periodLabel = 'Current Period';
      }

      return {
        ...inv,
        tenant_name: tenantName,
        tenant_email: tenantEmail,
        landlord_name: landlordName,
        property_name: propertyName,
        unit_number: unitNumber,
        billed_amount: billedAmount,
        paid_amount: paidAmount,
        balance_due: balanceDue,
        billing_period: periodLabel,
      };
    });
  }, [invoices, tenantMap, landlordMap, propertyMap, unitMap]);

  // Real KPI Metrics
  const totalBilled = useMemo(() => {
    return enrichedInvoices.reduce((sum, inv) => sum + inv.billed_amount, 0);
  }, [enrichedInvoices]);

  const totalCollected = useMemo(() => {
    return enrichedInvoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
  }, [enrichedInvoices]);

  const totalOutstanding = useMemo(() => {
    return enrichedInvoices.reduce((sum, inv) => sum + inv.balance_due, 0);
  }, [enrichedInvoices]);

  const overdueCount = useMemo(() => {
    return enrichedInvoices.filter(
      (inv) => inv.status === 'OVERDUE' || (inv.balance_due > 0 && inv.due_date && new Date(inv.due_date) < new Date())
    ).length;
  }, [enrichedInvoices]);

  const filtered = useMemo(() => {
    return enrichedInvoices.filter((inv) => {
      const matchesSearch =
        (inv.invoice_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (inv.tenant_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (inv.tenant_email || '').toLowerCase().includes(search.toLowerCase()) ||
        (inv.landlord_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (inv.property_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (inv.unit_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (inv.billing_period || '').toLowerCase().includes(search.toLowerCase()) ||
        (inv.id || '').toLowerCase().includes(search.toLowerCase());

      const isPaid = inv.status === 'PAID' || (inv.balance_due === 0 && inv.paid_amount > 0);
      const isPartial = inv.status === 'PARTIALLY_PAID' || inv.status === 'PARTIAL' || (inv.paid_amount > 0 && inv.balance_due > 0);
      const isOverdue = inv.status === 'OVERDUE' || (inv.balance_due > 0 && inv.due_date && new Date(inv.due_date) < new Date());
      const isUnpaid = inv.status === 'ISSUED' || inv.status === 'PENDING' || (inv.paid_amount === 0 && inv.balance_due > 0);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PAID' && isPaid) ||
        (statusFilter === 'PARTIAL' && isPartial) ||
        (statusFilter === 'OVERDUE' && isOverdue) ||
        (statusFilter === 'UNPAID' && isUnpaid);

      return matchesSearch && matchesStatus;
    });
  }, [enrichedInvoices, search, statusFilter]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaseId) {
      setActionError('Please select a lease contract.');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);
      await api.invoices.create({
        lease_id: selectedLeaseId,
        billing_period_start: periodStart,
        billing_period_end: periodEnd,
        due_date: dueDate,
        amount: Number(amount),
      });

      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAutoGenerateMonthly = async () => {
    if (!confirm('Run automatic monthly invoice generation across all active leases?')) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await api.invoices.generateMonthlyInvoices();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to trigger batch invoice generation');
    } finally {
      setActionLoading(false);
    }
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
            Real rental billing records, settlement tracking, overdue reconciliation, and landlord accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoGenerateMonthly}
            disabled={actionLoading}
            className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-[#331A6F] text-xs font-extrabold rounded-xl border-2 border-purple-300 hover:bg-purple-100 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
            <span>Batch Monthly Run</span>
          </button>
          <button
            onClick={() => {
              if (leases.length > 0 && !selectedLeaseId) {
                setSelectedLeaseId(leases[0].id);
                if (leases[0].monthly_rent) setAmount(leases[0].monthly_rent);
              }
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#331A6F] text-white text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Generate Invoice</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="cursor-pointer p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Real Financial Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invoices</span>
            <div className="p-2 rounded-xl bg-purple-50 text-[#331A6F] border border-purple-200">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{invoices.length}</div>
            <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Platform billing entries</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total Billed</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-300">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">RWF {totalBilled.toLocaleString()}</div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Gross obligations</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Total Collected</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700">RWF {totalCollected.toLocaleString()}</div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">Reconciled payments</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Outstanding Balance</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700">RWF {totalOutstanding.toLocaleString()}</div>
            <div className="text-[11px] font-semibold text-rose-600 mt-0.5">{overdueCount} overdue entries</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by invoice #, tenant, landlord, property, unit, period..."
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
                <th className="p-3.5">Tenant & Landlord</th>
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
                filtered.map((inv) => {
                  const isPaid = inv.status === 'PAID' || (inv.balance_due === 0 && inv.paid_amount > 0);
                  const isPartial = inv.status === 'PARTIALLY_PAID' || inv.status === 'PARTIAL' || (inv.paid_amount > 0 && inv.balance_due > 0);
                  const isOverdue = inv.status === 'OVERDUE' || (inv.balance_due > 0 && inv.due_date && new Date(inv.due_date) < new Date());

                  return (
                    <tr key={inv.id} className="hover:bg-purple-50/40 font-medium transition-colors">
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900 text-xs">{inv.invoice_number || inv.id?.slice(0, 8)}</div>
                        <div className="text-[10px] text-[#331A6F] font-bold">{inv.billing_period}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900">{inv.tenant_name}</div>
                        <div className="text-[10px] text-slate-400">Landlord: {inv.landlord_name}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{inv.property_name}</div>
                        <div className="text-[10px] text-purple-700 font-bold">Unit {inv.unit_number}</div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isPartial
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {isPaid ? 'PAID' : isPartial ? 'PARTIAL' : isOverdue ? 'OVERDUE' : 'ISSUED'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-extrabold text-slate-900">
                        RWF {inv.billed_amount.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-extrabold text-emerald-600">
                        RWF {inv.paid_amount.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-extrabold">
                        {inv.balance_due > 0 ? (
                          <span className="text-rose-600">RWF {inv.balance_due.toLocaleString()}</span>
                        ) : (
                          <span className="text-emerald-700">RWF 0</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center text-slate-600 text-[11px] font-semibold">
                        {inv.due_date || 'N/A'}
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
                  );
                })
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
                <div className="text-xs text-purple-200">Billing Period: {selectedInvoice.billing_period}</div>
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
                    RWF {selectedInvoice.billed_amount?.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Paid</div>
                  <div className="font-black text-emerald-600 text-sm">
                    RWF {selectedInvoice.paid_amount?.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Balance Due</div>
                  <div className="font-black text-rose-600 text-sm">
                    RWF {selectedInvoice.balance_due?.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Tenant Name:</span>
                  <span className="font-bold text-slate-900">{selectedInvoice.tenant_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Landlord:</span>
                  <span className="font-bold text-slate-900">{selectedInvoice.landlord_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Property & Unit:</span>
                  <span className="font-bold text-[#331A6F]">
                    {selectedInvoice.property_name} (Unit {selectedInvoice.unit_number})
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Due Date:</span>
                  <span className="font-bold text-slate-900">{selectedInvoice.due_date || 'N/A'}</span>
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
                {leases.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl font-medium">
                    No lease contracts found on platform.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedLeaseId}
                    onChange={(e) => {
                      setSelectedLeaseId(e.target.value);
                      const l = leases.find((x) => x.id === e.target.value);
                      if (l && l.monthly_rent) {
                        setAmount(l.monthly_rent);
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  >
                    {leases.map((l) => {
                      const tName = l.tenant_name || tenantMap.get(l.tenant_id)?.name || 'Tenant';
                      const uNum = l.unit_number || unitMap.get(l.unit_id) || 'Unit';
                      return (
                        <option key={l.id} value={l.id}>
                          {tName} • Unit {uNum} (Rent: RWF {Number(l.monthly_rent || 0).toLocaleString()})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Period Start</label>
                  <input
                    type="date"
                    required
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Period End</label>
                  <input
                    type="date"
                    required
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (RWF) *</label>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                    required
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
                  disabled={actionLoading || leases.length === 0}
                  className="px-4 py-2 bg-[#331A6F] text-white font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Issue Invoice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
