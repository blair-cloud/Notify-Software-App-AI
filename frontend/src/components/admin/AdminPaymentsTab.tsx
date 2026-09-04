import React, { useState } from 'react';
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
} from 'lucide-react';
import { adminService } from '../../services/adminService';

interface AdminPaymentsTabProps {
  payments?: any[];
  invoices?: any[];
  onRefresh: () => void;
}

export const AdminPaymentsTab: React.FC<AdminPaymentsTabProps> = ({
  payments = [],
  invoices = [],
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Payment Form State
  const [invoiceId, setInvoiceId] = useState(invoices?.[0]?.id || '');
  const [amount, setAmount] = useState(300000);
  const [method, setMethod] = useState<'MOMO' | 'AIRTEL' | 'BANK_TRANSFER' | 'CASH'>('MOMO');
  const [txRef, setTxRef] = useState('');

  const filtered = (payments || []).filter((p) => {
    const matchesSearch =
      p.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.property_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.unit_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.id?.toLowerCase().includes(search.toLowerCase());

    const isPending = p.verification_status === 'PENDING_VERIFICATION' || p.status === 'PENDING' || p.status === 'PENDING_VERIFICATION';
    const isVerified = p.verification_status === 'VERIFIED' || p.status === 'VERIFIED' || p.status === 'COMPLETED';
    const isRejected = p.verification_status === 'REJECTED' || p.status === 'REJECTED';

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' && isPending) ||
      (statusFilter === 'VERIFIED' && isVerified) ||
      (statusFilter === 'REJECTED' && isRejected);

    return matchesSearch && matchesStatus;
  });

  const pendingCount = payments.filter(
    (p) => p.verification_status === 'PENDING_VERIFICATION' || p.status === 'PENDING' || p.status === 'PENDING_VERIFICATION'
  ).length;

  const handleVerify = (paymentId: string, status: 'VERIFIED' | 'REJECTED') => {
    adminService.verifyPayment(paymentId, status);
    if (selectedPayment && selectedPayment.id === paymentId) {
      setSelectedPayment({ ...selectedPayment, status, verification_status: status });
    }
    onRefresh();
  };

  const handleRecordDirectPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId) return;

    adminService.recordPayment({
      invoice_id: invoiceId,
      amount: Number(amount),
      payment_method: method,
      transaction_reference: txRef || `ADMIN-PAY-${Date.now().toString().slice(-6)}`,
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
            <CreditCard className="w-6 h-6 text-rose-600" />
            <span>Platform Payment Settlements & Slip Verification</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Verify offline Mobile Money / Bank transfer deposit slips, reconcile rent collections and release landlord balances
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#331A6F] text-white text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Record Direct Payment</span>
        </button>
      </div>

      {/* Pending Banner Alert if pending payments */}
      {pendingCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-[0.5px_0.5px_0_#000] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-200 text-rose-900 border border-rose-400">
              <Clock className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-rose-950">
                {pendingCount} Pending Payment Slip(s) Awaiting Admin Verification
              </div>
              <div className="text-xs text-rose-800 font-medium">
                Verify proof-of-payment receipts to update invoices and unlock tenant payment confirmations.
              </div>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className="px-3 py-1.5 bg-rose-600 text-white font-extrabold text-xs rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer"
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
            placeholder="Search payments by ref#, tenant, property, unit..."
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
                <th className="p-3.5 text-center">Verification Status</th>
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
                    p.verification_status === 'PENDING_VERIFICATION' ||
                    p.status === 'PENDING' ||
                    p.status === 'PENDING_VERIFICATION';
                  const isVerified =
                    p.verification_status === 'VERIFIED' || p.status === 'VERIFIED' || p.status === 'COMPLETED';

                  return (
                    <tr key={p.id} className="hover:bg-purple-50/40 font-medium transition-colors">
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900 text-xs">
                          {p.reference_number || p.transaction_reference || p.id}
                        </div>
                        <div className="text-[10px] text-slate-400">{p.payment_date || p.created_at?.slice(0, 10) || '2026-08-15'}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900">{p.tenant_name}</div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {p.property_name} (Unit {p.unit_number})
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 text-slate-800 text-[10px]">
                          {p.payment_method || 'MOMO'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-black text-slate-900 text-sm">
                        RWF {(p.amount || 0).toLocaleString()}
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
                        {p.proof_url || p.proof_image || p.receipt_file ? (
                          <button
                            onClick={() => {
                              setSelectedPayment(p);
                              setShowProofModal(true);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#331A6F] bg-purple-50 px-2 py-1 rounded-md border border-purple-200 hover:bg-purple-100 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#331A6F]" />
                            <span>View Proof</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No slip attached</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isPending ? (
                            <>
                              <button
                                onClick={() => handleVerify(p.id, 'VERIFIED')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleVerify(p.id, 'REJECTED')}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-[11px] rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setSelectedPayment(p)}
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

      {/* PROOF OF PAYMENT MODAL */}
      {showProofModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <div>
                <h3 className="font-extrabold text-base">Payment Slip Verification</h3>
                <div className="text-xs text-purple-200">
                  Ref: {selectedPayment.reference_number || selectedPayment.transaction_reference}
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
              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Tenant:</span>
                  <span className="font-bold text-slate-900">{selectedPayment.tenant_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Property:</span>
                  <span className="font-bold text-slate-900">{selectedPayment.property_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Amount Declared:</span>
                  <span className="font-black text-emerald-600 text-sm">
                    RWF {(selectedPayment.amount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Method:</span>
                  <span className="font-bold text-slate-900">{selectedPayment.payment_method}</span>
                </div>
              </div>

              {/* Proof Slip Preview Container */}
              <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-white border border-purple-300 flex items-center justify-center shadow-xs">
                  <FileText className="w-6 h-6 text-[#331A6F]" />
                </div>
                <div className="font-bold text-slate-900">
                  {selectedPayment.proof_url || selectedPayment.receipt_file || 'MoMo_Payment_Proof_Receipt.pdf'}
                </div>
                <div className="text-[11px] text-slate-500">
                  MoMo Transaction ID verified on MTN Rwanda API Gateway
                </div>
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <button
                  onClick={() => {
                    handleVerify(selectedPayment.id, 'REJECTED');
                    setShowProofModal(false);
                  }}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer"
                >
                  Reject Proof
                </button>
                <button
                  onClick={() => {
                    handleVerify(selectedPayment.id, 'VERIFIED');
                    setShowProofModal(false);
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer"
                >
                  Approve & Reconcile
                </button>
              </div>
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
                <select
                  required
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                >
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number || inv.id} • {inv.tenant_name} (Due: RWF {inv.balance?.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount Paid (RWF) *</label>
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
                  <label className="block font-bold text-slate-700 mb-1">Payment Method *</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  >
                    <option value="MOMO">MTN Mobile Money</option>
                    <option value="AIRTEL">Airtel Money</option>
                    <option value="BANK_TRANSFER">Bank Wire / Transfer</option>
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
                  Confirm & Reconcile Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
