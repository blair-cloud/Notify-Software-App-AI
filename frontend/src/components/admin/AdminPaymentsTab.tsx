import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  FileText,
  DollarSign,
  X,
  Clock,
  ShieldCheck,
  Receipt,
  TrendingUp,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { api } from '../../services/api';

interface AdminPaymentsTabProps {
  payments?: any[];
  invoices?: any[];
  properties?: any[];
  units?: any[];
  tenants?: any[];
  onRefresh: () => void;
}

export const AdminPaymentsTab: React.FC<AdminPaymentsTabProps> = ({
  payments = [],
  invoices = [],
  properties = [],
  units = [],
  tenants = [],
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // New Payment Form State
  const [invoiceId, setInvoiceId] = useState(invoices?.[0]?.id || '');
  const [amount, setAmount] = useState(300000);
  const [method, setMethod] = useState<'MOBILE_MONEY' | 'BANK' | 'CARD' | 'CASH'>('MOBILE_MONEY');
  const [txRef, setTxRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Lookup maps for instant O(1) enrichment of relational data
  const tenantMap = useMemo(() => {
    const map = new Map<string, string>();
    tenants.forEach((t) => {
      const name = t.name || t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim();
      if (t.id) map.set(t.id, name || 'Tenant');
    });
    return map;
  }, [tenants]);

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

  // Enrich payments with names
  const enrichedPayments = useMemo(() => {
    return (payments || []).map((p) => {
      const tenantName = p.tenant_name || tenantMap.get(p.tenant_id) || 'Tenant';
      const propertyName = p.property_name || propertyMap.get(p.property_id) || 'Property';
      const unitNumber = p.unit_number || unitMap.get(p.unit_id) || 'Unit';
      return {
        ...p,
        tenant_name: tenantName,
        property_name: propertyName,
        unit_number: unitNumber,
      };
    });
  }, [payments, tenantMap, propertyMap, unitMap]);

  // Real KPI Metrics
  const totalVolume = useMemo(() => {
    return (payments || [])
      .filter((p) => p.status === 'COMPLETED' || p.status === 'VERIFIED')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const pendingCount = useMemo(() => {
    return (payments || []).filter(
      (p) =>
        p.status === 'PENDING' ||
        p.status === 'AWAITING_VERIFICATION' ||
        p.verification_status === 'PENDING_VERIFICATION'
    ).length;
  }, [payments]);

  const verifiedCount = useMemo(() => {
    return (payments || []).filter(
      (p) => p.status === 'COMPLETED' || p.status === 'VERIFIED'
    ).length;
  }, [payments]);

  const failedCount = useMemo(() => {
    return (payments || []).filter(
      (p) => p.status === 'FAILED' || p.status === 'REJECTED'
    ).length;
  }, [payments]);

  // Filtered payments list
  const filtered = useMemo(() => {
    return enrichedPayments.filter((p) => {
      const matchesSearch =
        (p.payment_reference || p.reference_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.transaction_reference || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.tenant_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.property_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.unit_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.id || '').toLowerCase().includes(search.toLowerCase());

      const isPending =
        p.status === 'PENDING' ||
        p.status === 'AWAITING_VERIFICATION' ||
        p.verification_status === 'PENDING_VERIFICATION';
      const isVerified =
        p.status === 'COMPLETED' ||
        p.status === 'VERIFIED' ||
        p.verification_status === 'VERIFIED';
      const isRejected =
        p.status === 'FAILED' ||
        p.status === 'REJECTED' ||
        p.verification_status === 'REJECTED';

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && isPending) ||
        (statusFilter === 'VERIFIED' && isVerified) ||
        (statusFilter === 'REJECTED' && isRejected);

      return matchesSearch && matchesStatus;
    });
  }, [enrichedPayments, search, statusFilter]);

  const handleVerify = async (paymentId: string, confirm: boolean, notes?: string) => {
    try {
      setActionLoading(true);
      setActionError(null);
      await api.payments.verifyPayment(paymentId, confirm, notes);
      if (selectedPayment && selectedPayment.id === paymentId) {
        setSelectedPayment({
          ...selectedPayment,
          status: confirm ? 'COMPLETED' : 'FAILED',
          verified_at: new Date().toISOString(),
        });
      }
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to verify payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordDirectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId) {
      setActionError('Please select an invoice to settle.');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);
      await api.payments.processPayment({
        invoice_id: invoiceId,
        amount: Number(amount),
        payment_method: method,
        payment_channel: 'OFFLINE',
        transaction_reference: txRef || `ADMIN-REC-${Date.now().toString().slice(-6)}`,
        notes: paymentNotes || 'Recorded and verified by System Admin',
        auto_verify: true,
      });

      setShowAddModal(false);
      setTxRef('');
      setPaymentNotes('');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record payment');
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
            <CreditCard className="w-6 h-6 text-rose-600" />
            <span>Platform Payment Settlements & Slip Verification</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Verify offline Mobile Money / Bank transfer deposit slips, reconcile rent collections and track real platform transactions
          </p>
        </div>

        <button
          onClick={() => {
            if (invoices.length > 0 && !invoiceId) {
              setInvoiceId(invoices[0].id);
            }
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#331A6F] text-white text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Record Direct Payment</span>
        </button>
      </div>

      {/* Action Error Alert */}
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

      {/* Live Financial Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Settlements</span>
            <div className="p-2 rounded-xl bg-purple-50 text-[#331A6F] border border-purple-200">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{payments.length}</div>
            <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Recorded transactions</div>
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
            <div className="text-2xl font-black text-emerald-700">RWF {totalVolume.toLocaleString()}</div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">{verifiedCount} confirmed payments</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Awaiting Verification</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-700">{pendingCount}</div>
            <div className="text-[11px] font-semibold text-amber-600 mt-0.5">Requires admin / landlord action</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Failed / Rejected</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700">{failedCount}</div>
            <div className="text-[11px] font-semibold text-rose-600 mt-0.5">Unsettled or rejected</div>
          </div>
        </div>
      </div>

      {/* Pending Banner Alert if pending payments */}
      {pendingCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-[0.5px_0.5px_0_#000] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-200 text-amber-900 border border-amber-400">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-amber-950">
                {pendingCount} Pending Payment Slip(s) Awaiting Verification
              </div>
              <div className="text-xs text-amber-800 font-medium">
                Verify proof-of-payment receipts to reconcile invoices and update tenant statements.
              </div>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer"
          >
            Review Pending ({pendingCount})
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search payments by ref#, tenant, property, unit, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Status:</span>
          {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((st) => (
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

      {/* Payments Table */}
      <div className="rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#331A6F] text-white font-extrabold uppercase tracking-wider border-b-2 border-black">
                <th className="p-3.5">Reference # / Date</th>
                <th className="p-3.5">Tenant & Property</th>
                <th className="p-3.5 text-center">Payment Method</th>
                <th className="p-3.5 text-right">Amount (RWF)</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Proof Slip</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    No payment records matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isPending =
                    p.status === 'PENDING' ||
                    p.status === 'AWAITING_VERIFICATION' ||
                    p.verification_status === 'PENDING_VERIFICATION';
                  const isVerified =
                    p.status === 'COMPLETED' ||
                    p.status === 'VERIFIED' ||
                    p.verification_status === 'VERIFIED';

                  return (
                    <tr key={p.id} className="hover:bg-purple-50/40 font-medium transition-colors">
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900 text-xs">
                          {p.payment_reference || p.reference_number || p.transaction_reference || p.id?.slice(0, 8)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : p.created_at?.slice(0, 10) || 'Recent'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900">{p.tenant_name}</div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {p.property_name} (Unit {p.unit_number})
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 text-slate-800 text-[10px]">
                          {p.payment_method?.replace('_', ' ') || 'MOBILE MONEY'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-black text-slate-900 text-sm">
                        RWF {(Number(p.amount) || 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            isVerified
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isPending
                              ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}
                        >
                          {isVerified ? 'VERIFIED' : isPending ? 'PENDING' : 'REJECTED'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {p.proof_url || p.proof_image || p.receipt_file || p.transaction_reference ? (
                          <button
                            onClick={() => {
                              setSelectedPayment(p);
                              setShowProofModal(true);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#331A6F] bg-purple-50 px-2 py-1 rounded-md border border-purple-200 hover:bg-purple-100 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#331A6F]" />
                            <span>View Details</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Direct entry</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isPending ? (
                            <>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleVerify(p.id, true)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleVerify(p.id, false)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-[11px] rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedPayment(p);
                                setShowProofModal(true);
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#331A6F] font-extrabold text-[11px] rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer"
                            >
                              Details
                            </button>
                          )}
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

      {/* PROOF OF PAYMENT / DETAILS MODAL */}
      {showProofModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <div>
                <h3 className="font-extrabold text-base">Payment Slip & Transaction Details</h3>
                <div className="text-xs text-purple-200">
                  Ref: {selectedPayment.payment_reference || selectedPayment.reference_number || selectedPayment.transaction_reference || selectedPayment.id}
                </div>
              </div>
              <button
                onClick={() => setShowProofModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Tenant:</span>
                  <span className="font-bold text-slate-900">{selectedPayment.tenant_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Property:</span>
                  <span className="font-bold text-slate-900">{selectedPayment.property_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Unit:</span>
                  <span className="font-bold text-slate-900">{selectedPayment.unit_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Amount Declared:</span>
                  <span className="font-black text-emerald-600 text-sm">
                    RWF {(Number(selectedPayment.amount) || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Method:</span>
                  <span className="font-bold text-slate-900">{selectedPayment.payment_method?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Channel:</span>
                  <span className="font-bold text-slate-900">{selectedPayment.payment_channel || 'ONLINE'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Transaction Reference:</span>
                  <span className="font-bold text-slate-900">{selectedPayment.transaction_reference || 'N/A'}</span>
                </div>
                {selectedPayment.notes && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-500 font-medium block mb-0.5">Notes:</span>
                    <span className="text-slate-800 italic">{selectedPayment.notes}</span>
                  </div>
                )}
              </div>

              {/* Status & Actions */}
              {(selectedPayment.status === 'PENDING' ||
                selectedPayment.status === 'AWAITING_VERIFICATION' ||
                selectedPayment.verification_status === 'PENDING_VERIFICATION') ? (
                <div className="flex justify-between gap-3 pt-2">
                  <button
                    disabled={actionLoading}
                    onClick={() => {
                      handleVerify(selectedPayment.id, false, 'Rejected by Admin review');
                      setShowProofModal(false);
                    }}
                    className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer disabled:opacity-50"
                  >
                    Reject Slip
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => {
                      handleVerify(selectedPayment.id, true, 'Approved by Admin review');
                      setShowProofModal(false);
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer disabled:opacity-50"
                  >
                    Approve & Reconcile
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl text-center font-bold text-emerald-800 text-xs">
                  This transaction is settled and verified ({selectedPayment.status}).
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECORD DIRECT PAYMENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <h3 className="font-extrabold text-base">Record Payment Reconciliation</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordDirectPayment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Invoice to Settle *</label>
                {invoices.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl font-medium">
                    No open invoices available to reconcile.
                  </div>
                ) : (
                  <select
                    required
                    value={invoiceId}
                    onChange={(e) => {
                      setInvoiceId(e.target.value);
                      const inv = invoices.find((i) => i.id === e.target.value);
                      if (inv && (inv.balance_due || inv.total_amount)) {
                        setAmount(inv.balance_due || inv.total_amount);
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  >
                    {invoices.map((inv) => {
                      const tName = tenantMap.get(inv.tenant_id) || 'Tenant';
                      const bal = inv.balance_due !== undefined ? inv.balance_due : inv.total_amount;
                      return (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number || inv.id?.slice(0, 8)} • {tName} (Due: RWF {Number(bal || 0).toLocaleString()})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount Paid (RWF) *</label>
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
                  <label className="block font-bold text-slate-700 mb-1">Payment Method *</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  >
                    <option value="MOBILE_MONEY">Mobile Money (MoMo / Airtel)</option>
                    <option value="BANK">Bank Wire / Transfer</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="CASH">Cash Deposit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Transaction Ref / Slip Code</label>
                <input
                  type="text"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  placeholder="e.g. TX-MOMO-882319"
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Verification Note</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Verified against bank statement"
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                />
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
                  disabled={actionLoading || invoices.length === 0}
                  className="px-4 py-2 bg-[#331A6F] text-white font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Confirm & Reconcile Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
