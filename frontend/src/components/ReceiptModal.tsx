import React from 'react';
import { Receipt } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { X, Printer, CheckCircle2, ShieldCheck, Download } from 'lucide-react';

interface ReceiptModalProps {
  receipt: Receipt | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
  if (!receipt) return null;

  const { t } = useLanguage();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-700 text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-200" />
            <div>
              <h3 className="text-lg font-bold font-poppins">{t.officialReceipt || 'Official Payment Receipt'}</h3>
              <p className="text-xs text-emerald-100">{receipt.receipt_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-emerald-100 hover:text-white hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer"
              title={t.downloadReceipt || 'Print Receipt'}
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 space-y-6 text-sm text-slate-700 font-poppins">
          {/* Top Confirmation Badge */}
          <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">{t.paymentVerifiedConfirmed || 'Payment Verified & Confirmed'}</p>
                <p className="text-xs text-emerald-600">{t.issuedOn || 'Issued on'} {new Date(receipt.issued_at).toLocaleString()}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 block">{t.amountPaid || 'AMOUNT PAID'}</span>
              <span className="text-xl font-extrabold text-emerald-700">{receipt.amount?.toLocaleString()} {receipt.currency}</span>
            </div>
          </div>

          {/* Receipt Details Grid */}
          <div className="space-y-3 text-xs border-y border-slate-100 py-4">
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">{t.receiptNumber || 'Receipt Number'}</span>
              <span className="font-mono font-bold text-slate-900">{receipt.receipt_number}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">{t.paymentId || 'Payment ID'}</span>
              <span className="font-mono text-slate-700">{receipt.payment_id}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">{t.tenantName || 'Tenant Name'}</span>
              <span className="font-semibold text-slate-900">{receipt.tenant_name || 'Tenant'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">{t.propertyUnit || 'Property & Unit'}</span>
              <span className="font-semibold text-slate-900">{receipt.property_name} ({receipt.unit_number})</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">{t.paymentMethod || 'Payment Method'}</span>
              <span className="font-semibold text-slate-900">{receipt.payment_method || 'MOBILE_MONEY'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">{t.issuedBy || 'Issued By'}</span>
              <span className="font-semibold text-slate-900">{receipt.landlord_name || 'Notify Dev Properties Ltd'}</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center pt-2">
            <p className="text-[11px] text-slate-400">{t.digitalReceiptDisclaimer || 'This is an officially generated digital receipt from Notify Property Management Kigali.'}</p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            {t.close || 'Close'}
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" /> {t.printSaveReceipt || 'Print / Save PDF Receipt'}
          </button>
        </div>
      </div>
    </div>
  );
};
