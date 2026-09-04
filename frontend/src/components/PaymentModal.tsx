import React, { useState } from 'react';
import { Invoice, PaymentMethod, PaymentChannel } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { X, Smartphone, CreditCard, Landmark, Banknote, ShieldCheck, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onPaymentSuccess: (receipt: any) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ invoice, onClose, onPaymentSuccess }) => {
  if (!invoice) return null;

  const { t } = useLanguage();
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>('ONLINE');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MOBILE_MONEY');
  const [phoneNumber, setPhoneNumber] = useState('+250 788 123 456');
  const [txReference, setTxReference] = useState('');
  const [notes, setNotes] = useState('');
  const [customAmount, setCustomAmount] = useState<number>(invoice.balance_due);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedResult, setCompletedResult] = useState<any | null>(null);

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Backend authoritative check: amount must not exceed balance_due
    if (customAmount <= 0) {
      setErrorMessage(t.invalidAmount || 'Payment amount must be greater than zero.');
      return;
    }
    if (customAmount > invoice.balance_due) {
      setErrorMessage(`${t.amountExceedsBalance || 'Amount cannot exceed invoice balance due of'} RWF ${invoice.balance_due.toLocaleString()}.`);
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate 1.2s gateway latency
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const response = await api.payments.processPayment({
        invoice_id: invoice.id,
        amount: customAmount,
        payment_method: paymentMethod,
        payment_channel: paymentChannel,
        transaction_reference: txReference || (paymentChannel === 'ONLINE' ? `MOMO-${Math.floor(10000000 + Math.random() * 90000000)}` : `SLIP-${Date.now()}`),
        notes: notes || (paymentChannel === 'ONLINE' ? `Mobile Money Pay via ${phoneNumber}` : 'Bank slip copy attached'),
        auto_verify: paymentChannel === 'ONLINE',
      });

      setCompletedResult(response);
      if (response.receipt) {
        onPaymentSuccess(response.receipt);
      }
    } catch (err: any) {
      setErrorMessage(err.message || t.paymentFailed || 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-poppins"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#331A6F] text-white">
          <div>
            <h3 className="text-lg font-bold">{t.payRentOnline || 'Rent Payment Portal'}</h3>
            <p className="text-xs text-slate-200">{t.invoices || 'Invoice'}: {invoice.invoice_number}</p>
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
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-900">
                {paymentChannel === 'ONLINE' ? (t.paymentSuccessful || 'Payment Successful!') : (t.paymentSubmittedVerification || 'Payment Submitted for Verification')}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {paymentChannel === 'ONLINE'
                  ? `${t.paymentConfirmedNotice || 'Your payment of'} RWF ${customAmount.toLocaleString()} ${t.hasBeenConfirmed || 'has been confirmed. Receipt generated.'}`
                  : `${t.offlineSlipSubmittedNotice || 'Your offline payment slip for'} RWF ${customAmount.toLocaleString()} ${t.submittedVerification || 'was submitted. Your landlord will verify and issue your receipt.'}`}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-xs text-slate-700 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">{t.transactionReference || 'Reference'}:</span>
                <span className="font-mono font-bold">{completedResult.payment?.payment_reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t.status || 'Status'}:</span>
                <span className="font-bold text-emerald-600">{completedResult.payment?.status}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                {t.close || 'Close'}
              </button>
              {completedResult.receipt && (
                <button
                  onClick={() => onPaymentSuccess(completedResult.receipt)}
                  className="flex-1 py-2.5 px-4 bg-[#331A6F] hover:bg-[#281458] text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {t.viewReceipt || 'View Official Receipt'}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Payment Form */
          <form onSubmit={handleProcessPayment} className="p-6 space-y-5">
            {/* Balance Card */}
            <div className="flex items-center justify-between p-4 bg-indigo-50/60 rounded-lg border border-indigo-100">
              <div>
                <p className="text-xs font-semibold text-indigo-900">{t.balanceDue || 'Balance Due'}</p>
                <p className="text-xs text-indigo-600">{invoice.property_name} - {t.unitLabel || 'Unit'} {invoice.unit_number}</p>
              </div>
              <p className="text-xl font-extrabold text-[#331A6F]">
                {invoice.balance_due.toLocaleString()} RWF
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Payment Channel Toggle (Online vs Offline) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">{t.paymentMethod || 'Payment Method Type'}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentChannel('ONLINE');
                    setPaymentMethod('MOBILE_MONEY');
                  }}
                  className={`p-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    paymentChannel === 'ONLINE'
                      ? 'border-[#331A6F] bg-[#331A6F]/5 text-[#331A6F] shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4" /> {t.mobileMoney || 'Instant Online Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentChannel('OFFLINE');
                    setPaymentMethod('BANK');
                  }}
                  className={`p-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    paymentChannel === 'OFFLINE'
                      ? 'border-[#331A6F] bg-[#331A6F]/5 text-[#331A6F] shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Landmark className="w-4 h-4" /> {t.bankTransfer || 'Offline / Manual Slip'}
                </button>
              </div>
            </div>

            {/* Specific Provider Selection */}
            {paymentChannel === 'ONLINE' ? (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">{t.selectPaymentMethod || 'Select Provider'}</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('MOBILE_MONEY')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'MOBILE_MONEY'
                        ? 'border-yellow-500 bg-yellow-50 text-slate-900 font-bold ring-2 ring-yellow-400/40'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-yellow-600" />
                    MTN MoMo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('MOBILE_MONEY')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'MOBILE_MONEY'
                        ? 'border-red-500 bg-red-50 text-slate-900 font-bold ring-2 ring-red-400/40'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-red-600" />
                    Airtel Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'CARD'
                        ? 'border-indigo-500 bg-indigo-50 text-slate-900 font-bold ring-2 ring-indigo-400/40'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    {t.creditCard || 'Credit/Debit Card'}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {paymentMethod === 'CARD' ? (t.creditCard || 'Card Number / Holder') : `${t.phoneNumber || 'Phone Number'} (Mobile Money)`}
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#331A6F] focus:outline-none"
                    placeholder="+250 78X XXX XXX"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">{t.offlinePaymentMethod || 'Offline Payment Method'}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('BANK')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethod === 'BANK'
                        ? 'border-[#331A6F] bg-[#331A6F]/5 text-[#331A6F] font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Landmark className="w-4 h-4" /> {t.bankTransfer || 'Bank Deposit / Transfer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethod === 'CASH'
                        ? 'border-[#331A6F] bg-[#331A6F]/5 text-[#331A6F] font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4" /> {t.cash || 'Direct Cash Payment'}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t.transactionReference || 'Bank Slip / Transaction Reference'}</label>
                  <input
                    type="text"
                    value={txReference}
                    onChange={(e) => setTxReference(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#331A6F] focus:outline-none"
                    placeholder="e.g. BK-5529104 or Slip Ref"
                  />
                </div>
              </div>
            )}

            {/* Amount Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{t.amountToPay || 'Amount to Pay (RWF)'}</label>
              <input
                type="number"
                value={customAmount}
                max={invoice.balance_due}
                onChange={(e) => setCustomAmount(Number(e.target.value))}
                required
                className="w-full px-3 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#331A6F] focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">{t.maximumAllowed || 'Maximum allowed'}: RWF {invoice.balance_due.toLocaleString()}</p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                {t.cancel || 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-6 py-2.5 bg-[#331A6F] hover:bg-[#281458] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {t.processingPayment || 'Processing Payment...'}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> {t.confirmAndPay || 'Confirm & Pay'} RWF {customAmount.toLocaleString()}
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
