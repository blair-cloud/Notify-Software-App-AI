import React, { useState } from 'react';
import { Payment, Receipt, Property, Tenant, Invoice } from '../types';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
  Plus,
  Receipt as ReceiptIcon,
  ShieldCheck,
  Building2,
  User,
  AlertCircle,
  Eye,
  FileCheck,
  Smartphone,
  Banknote,
  Send
} from 'lucide-react';
import { api } from '../services/api';

interface LandlordPaymentsTabProps {
  payments: Payment[];
  receipts: Receipt[];
  properties: Property[];
  tenants: Tenant[];
  invoices: Invoice[];
  onOpenRecordPayment: () => void;
  onViewReceipt: (receipt: Receipt) => void;
  onRefreshData: () => void;
}

export const LandlordPaymentsTab: React.FC<LandlordPaymentsTabProps> = ({
  payments,
  receipts,
  properties,
  tenants,
  invoices,
  onOpenRecordPayment,
  onViewReceipt,
  onRefreshData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'VERIFY_QUEUE' | 'ALL_PAYMENTS' | 'RECEIPTS'>('VERIFY_QUEUE');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [propertyFilter, setPropertyFilter] = useState<string>('ALL');
  
  // Verification action states
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [rejectModalPayment, setRejectModalPayment] = useState<Payment | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  const pendingPayments = payments.filter(
    (p) => p.status === 'AWAITING_VERIFICATION' || p.status === 'PENDING'
  );
  const verifiedPayments = payments.filter((p) => p.status === 'COMPLETED');
  const rejectedPayments = payments.filter((p) => p.status === 'FAILED' || p.status === 'CANCELLED');

  const totalCollected = verifiedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Handle Verify
  const handleVerify = async (paymentId: string) => {
    setVerifyingId(paymentId);
    setActionErrorMsg(null);
    try {
      await api.payments.verifyPayment(paymentId, true, 'Payment verified by Landlord');
      setActionSuccessMsg('Payment verified successfully! Invoice balance updated and official receipt generated.');
      onRefreshData();
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to verify payment. Please try again.');
      setTimeout(() => setActionErrorMsg(null), 6000);
    } finally {
      setVerifyingId(null);
    }
  };

  // Handle Reject
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalPayment) return;

    setVerifyingId(rejectModalPayment.id);
    setActionErrorMsg(null);
    try {
      await api.payments.verifyPayment(
        rejectModalPayment.id,
        false,
        rejectionReason || 'Payment proof could not be verified'
      );
      setActionSuccessMsg('Payment marked as rejected. Tenant has been notified with the reason.');
      setRejectModalPayment(null);
      setRejectionReason('');
      onRefreshData();
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to reject payment. Please try again.');
      setTimeout(() => setActionErrorMsg(null), 6000);
    } finally {
      setVerifyingId(null);
    }
  };

  // Filter payment list
  const filteredPayments = payments.filter((p) => {
    if (activeSubTab === 'VERIFY_QUEUE') {
      if (p.status !== 'AWAITING_VERIFICATION' && p.status !== 'PENDING') return false;
    }
    if (propertyFilter !== 'ALL' && p.property_id !== propertyFilter) return false;
    if (methodFilter !== 'ALL' && p.payment_method !== methodFilter) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchRef = p.payment_reference?.toLowerCase().includes(q) || p.transaction_reference?.toLowerCase().includes(q);
      const matchTenant = p.tenant_name?.toLowerCase().includes(q);
      const matchProp = p.property_name?.toLowerCase().includes(q);
      const matchInv = p.invoice_number?.toLowerCase().includes(q);
      if (!matchRef && !matchTenant && !matchProp && !matchInv) return false;
    }
    return true;
  });

  // Filter receipts list
  const filteredReceipts = receipts.filter((r) => {
    if (propertyFilter !== 'ALL' && r.property_id !== propertyFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchRct = r.receipt_number?.toLowerCase().includes(q);
      const matchTenant = r.tenant_name?.toLowerCase().includes(q);
      const matchProp = r.property_name?.toLowerCase().includes(q);
      if (!matchRct && !matchTenant && !matchProp) return false;
    }
    return true;
  });

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'MOBILE_MONEY':
        return <Smartphone className="w-4 h-4 text-amber-600" />;
      case 'BANK':
        return <Building2 className="w-4 h-4 text-blue-600" />;
      case 'CASH':
        return <Banknote className="w-4 h-4 text-emerald-600" />;
      default:
        return <CreditCard className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs font-bold shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}
      {actionErrorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center justify-between text-xs font-bold shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{actionErrorMsg}</span>
          </div>
          <button onClick={() => setActionErrorMsg(null)} className="text-rose-700 hover:text-rose-900 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pending Verifications */}
        <div
          onClick={() => setActiveSubTab('VERIFY_QUEUE')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeSubTab === 'VERIFY_QUEUE'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">Awaiting Verification</span>
            <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full font-black text-xs">
              {pendingPayments.length}
            </span>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">
            RWF {totalPendingAmount.toLocaleString()}
          </div>
          <p className="text-[11px] text-amber-800 mt-1 font-medium">Bank slips & manual offline proofs</p>
        </div>

        {/* Verified Payments */}
        <div
          onClick={() => setActiveSubTab('ALL_PAYMENTS')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeSubTab === 'ALL_PAYMENTS'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Verified Collections</span>
            <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full font-black text-xs">
              {verifiedPayments.length}
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            RWF {totalCollected.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-800 mt-1 font-medium">Recorded & credited to tenant leases</p>
        </div>

        {/* Issued Receipts */}
        <div
          onClick={() => setActiveSubTab('RECEIPTS')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeSubTab === 'RECEIPTS'
              ? 'bg-purple-50/70 border-[#331A6F] ring-2 ring-purple-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#331A6F]">Official Receipts</span>
            <span className="px-2 py-0.5 bg-purple-200 text-[#331A6F] rounded-full font-black text-xs">
              {receipts.length}
            </span>
          </div>
          <div className="text-2xl font-black text-[#331A6F] mt-2">{receipts.length} Issued</div>
          <p className="text-[11px] text-purple-900 mt-1 font-medium">Downloadable & verifiable receipts</p>
        </div>
      </div>

      {/* Sub-Navigation & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Sub-Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start">
            <button
              onClick={() => setActiveSubTab('VERIFY_QUEUE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'VERIFY_QUEUE'
                  ? 'bg-white text-[#331A6F] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Verification Queue</span>
              {pendingPayments.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-black">
                  {pendingPayments.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('ALL_PAYMENTS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'ALL_PAYMENTS'
                  ? 'bg-white text-[#331A6F] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>All Payment Logs</span>
            </button>

            <button
              onClick={() => setActiveSubTab('RECEIPTS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'RECEIPTS'
                  ? 'bg-white text-[#331A6F] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ReceiptIcon className="w-3.5 h-3.5" />
              <span>Receipts Directory</span>
            </button>
          </div>

          {/* Record Manual Payment Button */}
          <button
            onClick={onOpenRecordPayment}
            className="px-4 py-2 bg-[#331A6F] text-white rounded-xl text-xs font-bold hover:bg-[#251352] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>Record Direct Payment</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reference, tenant, invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold shrink-0">Property:</span>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {activeSubTab !== 'RECEIPTS' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold shrink-0">Method:</span>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Payment Methods</option>
                <option value="MOBILE_MONEY">Mobile Money (MTN / Airtel)</option>
                <option value="BANK">Bank Transfer / Slip</option>
                <option value="CASH">Direct Cash</option>
                <option value="CARD">Credit / Debit Card</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'RECEIPTS' ? (
        /* Receipts Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Receipt #</th>
                  <th className="px-4 py-3">Tenant & Unit</th>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Issue Date</th>
                  <th className="px-4 py-3 text-right">Amount Paid</th>
                  <th className="px-4 py-3 text-center">Payment Method</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      <ReceiptIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-sm text-slate-600">No receipts found</p>
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((rct) => (
                    <tr key={rct.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-extrabold text-[#331A6F]">
                        {rct.receipt_number}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{rct.tenant_name || 'Tenant'}</div>
                        <div className="text-[11px] text-slate-500">Unit {rct.unit_number || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">{rct.property_name}</td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {rct.issued_at ? new Date(rct.issued_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-emerald-700">
                        RWF {(rct.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 rounded-full text-[11px] font-bold text-slate-700">
                          {getMethodIcon(rct.payment_method)}
                          <span>{rct.payment_method?.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => onViewReceipt(rct)}
                          className="px-3 py-1.5 bg-[#331A6F] text-white rounded-lg text-xs font-bold hover:bg-[#251352] transition-colors flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Payments Table (Verification Queue or All Logs) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Reference & Method</th>
                  <th className="px-4 py-3">Tenant & Property</th>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Date Submitted</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Verification Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      <FileCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-sm text-slate-600">
                        {activeSubTab === 'VERIFY_QUEUE'
                          ? 'Verification queue is clear! All payments are processed.'
                          : 'No payment records match your filters.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const isPending = p.status === 'AWAITING_VERIFICATION' || p.status === 'PENDING';
                    const isCompleted = p.status === 'COMPLETED';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Reference & Method */}
                        <td className="px-5 py-3.5">
                          <div className="font-extrabold text-[#331A6F]">{p.payment_reference}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {getMethodIcon(p.payment_method)}
                            <span className="text-[11px] text-slate-600 font-bold">
                              {p.transaction_reference || p.payment_method?.replace('_', ' ')}
                            </span>
                          </div>
                        </td>

                        {/* Tenant & Property */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{p.tenant_name || 'Tenant'}</div>
                          <div className="text-[11px] text-slate-500">
                            {p.property_name} &bull; Unit {p.unit_number || 'N/A'}
                          </div>
                        </td>

                        {/* Invoice */}
                        <td className="px-4 py-3.5 font-bold text-slate-700">
                          {p.invoice_number || 'Rent Invoice'}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 text-slate-600">
                          <div>{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : 'Today'}</div>
                          {p.notes && (
                            <div className="text-[10px] text-slate-400 italic truncate max-w-xs" title={p.notes}>
                              {p.notes}
                            </div>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3.5 text-right font-black text-slate-900">
                          RWF {(p.amount || 0).toLocaleString()}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Verified
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                              <Clock className="w-3 h-3" />
                              Pending Verification
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleVerify(p.id)}
                                disabled={verifyingId === p.id}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{verifyingId === p.id ? 'Verifying...' : 'Verify'}</span>
                              </button>

                              <button
                                onClick={() => {
                                  setRejectModalPayment(p);
                                  setRejectionReason('');
                                }}
                                disabled={verifyingId === p.id}
                                className="px-2.5 py-1.5 border border-rose-200 text-rose-700 bg-rose-50 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : isCompleted ? (
                            <div className="text-[11px] text-emerald-700 font-bold flex items-center justify-end gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Receipt Issued</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-rose-600 font-medium">Proof Rejected</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Payment Confirmation Modal */}
      {rejectModalPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setRejectModalPayment(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Reject Payment Proof</h3>
            </div>

            <p className="text-slate-600 leading-relaxed">
              You are about to reject the payment submission of{' '}
              <strong className="text-slate-900 font-bold">RWF {(rejectModalPayment.amount || 0).toLocaleString()}</strong> by{' '}
              <strong className="text-slate-900 font-bold">{rejectModalPayment.tenant_name || 'Tenant'}</strong>.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Rejection Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Transaction ID could not be matched with MTN MoMo statement, or bank slip is illegible."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalPayment(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyingId === rejectModalPayment.id}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {verifyingId === rejectModalPayment.id ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
