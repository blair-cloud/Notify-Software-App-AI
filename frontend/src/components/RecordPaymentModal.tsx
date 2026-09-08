import React, { useState, useEffect } from 'react';
import { Invoice, PaymentMethod, PaymentChannel, Tenant, Property, Unit } from '../types';
import { api } from '../services/api';
import {
  X,
  Smartphone,
  CreditCard,
  Landmark,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Receipt as ReceiptIcon,
  Calendar,
  User,
  Building2,
  Home
} from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (receipt: any) => void;
  invoices: Invoice[];
  tenants: Tenant[];
  properties: Property[];
  units: Unit[];
  initialInvoiceId?: string;
  initialTenantId?: string;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  invoices,
  tenants,
  properties,
  units,
  initialInvoiceId,
  initialTenantId,
}) => {
  const invoiceList = invoices || [];

  // Selected Invoice or Tenant
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    initialInvoiceId || (invoiceList.find((i) => i.balance_due > 0)?.id || invoiceList[0]?.id || '')
  );

  const selectedInvoice = invoiceList.find((i) => i.id === selectedInvoiceId) || invoiceList[0];

  const [paymentAmount, setPaymentAmount] = useState<number>(
    selectedInvoice ? selectedInvoice.balance_due : 350000
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MOBILE_MONEY');
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>('ONLINE');
  const [txReference, setTxReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [autoVerify, setAutoVerify] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedResult, setCompletedResult] = useState<any | null>(null);

  // When selected invoice changes, update suggested amount
  useEffect(() => {
    if (selectedInvoice) {
      setPaymentAmount(selectedInvoice.balance_due > 0 ? selectedInvoice.balance_due : selectedInvoice.total_amount);
    }
  }, [selectedInvoiceId]);

  // Set initial if provided
  useEffect(() => {
    if (initialInvoiceId) {
      setSelectedInvoiceId(initialInvoiceId);
    } else if (initialTenantId) {
      const tenantInv = invoiceList.find((i) => (i.tenant_id === initialTenantId || i.tenant_name?.includes(initialTenantId)) && i.balance_due > 0);
      if (tenantInv) {
        setSelectedInvoiceId(tenantInv.id);
      }
    }
  }, [initialInvoiceId, initialTenantId, invoices]);

  if (!isOpen) return null;

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedInvoice) {
      setErrorMessage('Please select a valid invoice.');
      return;
    }

    if (paymentAmount <= 0) {
      setErrorMessage('Payment amount must be greater than zero.');
      return;
    }

    if (paymentAmount > selectedInvoice.balance_due && selectedInvoice.balance_due > 0) {
      setErrorMessage(`Amount cannot exceed the balance due of RWF ${selectedInvoice.balance_due.toLocaleString()}.`);
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate quick processing
      await new Promise((resolve) => setTimeout(resolve, 800));

      const generatedRef = txReference || (
        paymentMethod === 'MOBILE_MONEY'
          ? `MOMO-${Math.floor(10000000 + Math.random() * 90000000)}`
          : paymentMethod === 'BANK'
          ? `BK-${Math.floor(1000000 + Math.random() * 9000000)}`
          : paymentMethod === 'CASH'
          ? `CSH-${Math.floor(100000 + Math.random() * 900000)}`
          : `TXN-${Date.now()}`
      );

      const response = await api.payments.processPayment({
        invoice_id: selectedInvoice.id,
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        payment_channel: paymentChannel,
        transaction_reference: generatedRef,
        notes: notes || `Recorded by Landlord on ${paymentDate}`,
        auto_verify: autoVerify,
      });

      setCompletedResult(response);
      if (response.receipt) {
        onPaymentSuccess(response.receipt);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record payment. Please check invoice details.');
    } finally {
      setIsProcessing(false);
    }
  };

  const remainingBalanceAfter = selectedInvoice
    ? Math.max(0, selectedInvoice.balance_due - Number(paymentAmount || 0))
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#331A6F] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-400 text-slate-950 font-black flex items-center justify-center border border-black text-sm">
              <Banknote className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold">Record Tenant Payment</h3>
              <p className="text-xs text-purple-200">Log cash, bank transfer, or mobile money payment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {completedResult ? (
          /* Success Screen */
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-900">Payment Successfully Recorded!</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Payment of <span className="font-bold text-slate-800">RWF {Number(paymentAmount).toLocaleString()}</span> has been applied to {selectedInvoice?.invoice_number}.
                {autoVerify ? ' Official receipt generated & tenant notified.' : ' Stored awaiting verification.'}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-2.5 max-w-md mx-auto text-left">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Payment Reference:</span>
                <span className="font-mono font-bold text-slate-900">{completedResult.payment?.payment_reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Tx Reference / Slip:</span>
                <span className="font-mono font-semibold text-slate-800">{completedResult.payment?.transaction_reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Tenant / Unit:</span>
                <span className="font-bold text-slate-900">{selectedInvoice?.tenant_name} ({selectedInvoice?.unit_number})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Remaining Balance:</span>
                <span className="font-bold text-amber-600">RWF {remainingBalanceAfter.toLocaleString()}</span>
              </div>
              {completedResult.receipt && (
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-500 font-bold">Receipt #:</span>
                  <span className="font-mono font-black text-[#331A6F]">{completedResult.receipt.receipt_number}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
              {completedResult.receipt && (
                <button
                  onClick={() => {
                    onPaymentSuccess(completedResult.receipt);
                  }}
                  className="flex-1 py-2.5 px-4 bg-[#331A6F] hover:bg-[#251352] text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ReceiptIcon className="w-4 h-4" />
                  <span>View Official Receipt</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Payment Form */
          <form onSubmit={handleRecordPayment} className="p-6 space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Target Invoice Selection */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Select Invoice / Tenant Balance *
              </label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30"
              >
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} — {inv.tenant_name || 'Tenant'} ({inv.property_name} {inv.unit_number}) — Due: RWF {inv.balance_due.toLocaleString()} ({inv.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Invoice Summary Banner */}
            {selectedInvoice && (
              <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">
                    {selectedInvoice.tenant_name} • Unit {selectedInvoice.unit_number}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {selectedInvoice.property_name} • Period: {selectedInvoice.billing_period_start} to {selectedInvoice.billing_period_end}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Balance Due</div>
                  <div className="text-base font-extrabold text-[#331A6F]">
                    RWF {selectedInvoice.balance_due.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Payment Method *</label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('MOBILE_MONEY');
                    setPaymentChannel('ONLINE');
                  }}
                  className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'MOBILE_MONEY'
                      ? 'border-[#331A6F] bg-[#331A6F]/10 text-[#331A6F] ring-1 ring-[#331A6F]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-amber-500" />
                  <span>MoMo / Airtel</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('BANK');
                    setPaymentChannel('OFFLINE');
                  }}
                  className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'BANK'
                      ? 'border-[#331A6F] bg-[#331A6F]/10 text-[#331A6F] ring-1 ring-[#331A6F]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Landmark className="w-4 h-4 text-blue-600" />
                  <span>Bank Slip</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('CASH');
                    setPaymentChannel('OFFLINE');
                  }}
                  className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'CASH'
                      ? 'border-[#331A6F] bg-[#331A6F]/10 text-[#331A6F] ring-1 ring-[#331A6F]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('CARD');
                    setPaymentChannel('ONLINE');
                  }}
                  className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'CARD'
                      ? 'border-[#331A6F] bg-[#331A6F]/10 text-[#331A6F] ring-1 ring-[#331A6F]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span>Card</span>
                </button>
              </div>
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Payment Amount (RWF) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={selectedInvoice?.balance_due || undefined}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30"
                />
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Remaining:</span>
                  <span className="font-bold text-amber-700">RWF {remainingBalanceAfter.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30"
                />
              </div>
            </div>

            {/* Reference Number & Slip Details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Transaction Ref / Slip #</label>
                <input
                  type="text"
                  placeholder="e.g. MOMO-992019 or BK-55291"
                  value={txReference}
                  onChange={(e) => setTxReference(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Notes / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Paid in cash at management office"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30"
                />
              </div>
            </div>

            {/* Auto Verify & Generate Receipt Toggle */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-800">Auto-Verify & Issue Receipt Immediately</div>
                <div className="text-[11px] text-slate-500">
                  Updates invoice status immediately and notifies tenant via SMS / In-App
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoVerify}
                onChange={(e) => setAutoVerify(e.target.checked)}
                className="w-4 h-4 accent-[#331A6F] cursor-pointer"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2.5 bg-[#331A6F] hover:bg-[#251352] text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Recording Payment...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirm & Record RWF {Number(paymentAmount).toLocaleString()}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
