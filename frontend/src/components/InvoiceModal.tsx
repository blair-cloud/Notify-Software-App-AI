import React from 'react';
import { Invoice } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { X, Printer, CreditCard, Calendar, FileText, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

interface InvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onPayNow?: (invoice: Invoice) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, onClose, onPayNow }) => {
  if (!invoice) return null;

  const { t } = useLanguage();

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" /> {t.paid || 'Paid'}
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" /> {t.overdue || 'Overdue'}
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> {t.partiallyPaid || 'Partially Paid'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5" /> {t.pending || 'Issued'}
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#331A6F]/10 rounded-lg text-[#331A6F]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-poppins">{t.invoiceDetails || 'Rental Invoice'}</h3>
              <p className="text-xs text-slate-500">{invoice.invoice_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              title={t.downloadInvoice || 'Print Invoice'}
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="p-6 space-y-6 text-sm text-slate-700 font-poppins" id="printable-invoice">
          {/* Logo & Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xl font-extrabold text-[#331A6F] tracking-tight">NOTIFY</span>
              <p className="text-xs text-slate-500 mt-0.5">Commercial & Residential Property Management</p>
              <p className="text-xs text-slate-400">Kigali, Rwanda</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="mb-2">{getStatusBadge(invoice.status)}</div>
              <p className="text-xs font-semibold text-slate-900">{t.issueDate || 'Issue Date'}: {invoice.issue_date}</p>
              <p className="text-xs text-rose-600 font-semibold">{t.dueDate || 'Due Date'}: {invoice.due_date}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-slate-50/80 rounded-lg border border-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{t.billedTo || 'Billed To (Tenant)'}</p>
              <p className="font-bold text-slate-900">{invoice.tenant_name || 'Valued Tenant'}</p>
              <p className="text-xs text-slate-600 mt-1">{t.property || 'Property'}: <span className="font-medium">{invoice.property_name || 'Notify Property'}</span></p>
              <p className="text-xs text-slate-600">{t.unitLabel || 'Unit'}: <span className="font-medium">{invoice.unit_number || 'A-102'}</span></p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{t.billingPeriod || 'Billing Period'}</p>
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#331A6F]" />
                {invoice.billing_period_start} {t.to || 'to'} {invoice.billing_period_end}
              </p>
              <p className="text-xs text-slate-500 mt-2">{t.type || 'Type'}: <span className="font-medium text-slate-700">{invoice.invoice_type}</span></p>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">{t.itemDescription || 'Item Description'}</th>
                  <th className="py-3 px-4 text-right">{t.amount || 'Amount'} ({invoice.currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-800">{t.monthlyRent || 'Monthly Rent'} ({invoice.property_name} - {t.unitLabel || 'Unit'} {invoice.unit_number})</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900">{invoice.subtotal?.toLocaleString()} {invoice.currency}</td>
                </tr>
                {invoice.discount > 0 && (
                  <tr>
                    <td className="py-3 px-4 text-emerald-600">{t.discountApplied || 'Discount Applied'}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-semibold">-{invoice.discount?.toLocaleString()} {invoice.currency}</td>
                  </tr>
                )}
                {invoice.late_fee > 0 && (
                  <tr>
                    <td className="py-3 px-4 text-rose-600">{t.latePaymentFee || 'Late Payment Fee'}</td>
                    <td className="py-3 px-4 text-right text-rose-600 font-semibold">+{invoice.late_fee?.toLocaleString()} {invoice.currency}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-900">
                  <td className="py-3 px-4 text-slate-600">{t.totalAmount || 'Total Amount Invoice'}</td>
                  <td className="py-3 px-4 text-right text-base text-[#331A6F] font-bold">{invoice.total_amount?.toLocaleString()} {invoice.currency}</td>
                </tr>
                <tr className="bg-slate-50 border-t border-slate-100">
                  <td className="py-2 px-4 text-emerald-700">{t.amountPaid || 'Amount Paid'}</td>
                  <td className="py-2 px-4 text-right text-emerald-700 font-bold">{invoice.amount_paid?.toLocaleString()} {invoice.currency}</td>
                </tr>
                <tr className="bg-amber-50/60 border-t border-amber-200">
                  <td className="py-3 px-4 font-bold text-amber-900">{t.balanceDue || 'Balance Due'}</td>
                  <td className="py-3 px-4 text-right text-lg font-extrabold text-amber-900">{invoice.balance_due?.toLocaleString()} {invoice.currency}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            {t.close || 'Close'}
          </button>
          {invoice.balance_due > 0 && onPayNow && (
            <button
              onClick={() => onPayNow(invoice)}
              className="px-5 py-2.5 bg-[#331A6F] hover:bg-[#281458] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" /> {t.payRentNow || 'Pay Rent Now'} ({invoice.balance_due?.toLocaleString()} {invoice.currency})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
