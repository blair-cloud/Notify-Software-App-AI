import React, { useState } from 'react';
import { Tenant, Invoice, Payment, Receipt, Lease } from '../types';
import {
  X,
  User,
  Building2,
  Home,
  Phone,
  Mail,
  CreditCard,
  Receipt as ReceiptIcon,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  Download,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  ShieldCheck
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface TenantLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  invoices: Invoice[];
  payments: Payment[];
  receipts: Receipt[];
  lease?: Lease | null;
  onRecordPayment: (tenantId: string, invoiceId?: string) => void;
  onSendReminder: (tenant: Tenant, invoice?: Invoice) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onViewReceipt: (receipt: Receipt) => void;
}

export const TenantLedgerModal: React.FC<TenantLedgerModalProps> = ({
  isOpen,
  onClose,
  tenant,
  invoices = [],
  payments = [],
  receipts = [],
  lease,
  onRecordPayment,
  onSendReminder,
  onViewInvoice,
  onViewReceipt,
}) => {
  const { t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'LEDGER' | 'INVOICES' | 'PAYMENTS' | 'RECEIPTS'>('LEDGER');

  if (!isOpen || !tenant) return null;

  // Filter records for this tenant
  const tenantInvoices = (invoices || []).filter(
    (i) => i.tenant_id === tenant.id || i.tenant_name?.toLowerCase() === `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim().toLowerCase()
  );

  const tenantPayments = (payments || []).filter(
    (p) => p.tenant_id === tenant.id || p.tenant_name?.toLowerCase() === `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim().toLowerCase()
  );

  const tenantReceipts = (receipts || []).filter(
    (r) => r.tenant_id === tenant.id || r.tenant_name?.toLowerCase() === `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim().toLowerCase()
  );

  // Financial calculations
  const totalInvoiced = tenantInvoices.reduce((acc, i) => acc + (i.total_amount || 0), 0);
  const totalPaid = tenantInvoices.reduce((acc, i) => acc + (i.amount_paid || 0), 0);
  const balanceDue = tenantInvoices.reduce((acc, i) => acc + (i.balance_due || 0), 0);
  const overdueAmount = tenantInvoices
    .filter((i) => i.status === 'OVERDUE')
    .reduce((acc, i) => acc + (i.balance_due || 0), 0);

  const activeInvoice = tenantInvoices.find((i) => i.balance_due > 0) || tenantInvoices?.[0];

  // Build combined chronological ledger
  interface LedgerEntry {
    id: string;
    date: string;
    type: 'INVOICE' | 'PAYMENT' | 'LATE_FEE';
    reference: string;
    description: string;
    debit: number; // charges
    credit: number; // payments
    status: string;
    rawItem: any;
  }

  const ledgerEntries: LedgerEntry[] = [];

  tenantInvoices.forEach((inv) => {
    ledgerEntries.push({
      id: `ledg-inv-${inv.id}`,
      date: inv.issue_date || inv.created_at || '2026-08-01',
      type: 'INVOICE',
      reference: inv.invoice_number,
      description: `${t.monthlyRentInvoice || 'Monthly Rent Invoice'} (${inv.billing_period_start} → ${inv.billing_period_end})`,
      debit: inv.total_amount,
      credit: 0,
      status: inv.status,
      rawItem: inv,
    });
  });

  tenantPayments.forEach((pay) => {
    ledgerEntries.push({
      id: `ledg-pay-${pay.id}`,
      date: pay.paid_at ? pay.paid_at.split('T')[0] : (pay.created_at ? pay.created_at.split('T')[0] : '2026-08-05'),
      type: 'PAYMENT',
      reference: pay.payment_reference,
      description: `${t.paymentVia || 'Payment via'} ${pay.payment_method.replace('_', ' ')} (${pay.transaction_reference || 'N/A'})`,
      debit: 0,
      credit: pay.amount,
      status: pay.status,
      rawItem: pay,
    });
  });

  // Sort by date ascending to calculate running balance
  ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;
  const ledgerWithBalance = ledgerEntries.map((entry) => {
    runningBalance += entry.debit - entry.credit;
    return {
      ...entry,
      balanceAfter: runningBalance,
    };
  });

  // Sort descending for display
  ledgerWithBalance.reverse();

  // Export CSV statement
  const handleExportStatement = () => {
    const headers = [t.date || 'Date', t.type || 'Type', t.reference || 'Reference', t.itemDescription || 'Description', `${t.debitCharge || 'Debit'} (RWF)`, `${t.creditPayment || 'Credit'} (RWF)`, `${t.balanceDue || 'Balance'} (RWF)`, t.status || 'Status'];
    const rows = ledgerWithBalance.map((e) => [
      e.date,
      e.type,
      e.reference,
      `"${e.description.replace(/"/g, '""')}"`,
      e.debit,
      e.credit,
      e.balanceAfter,
      e.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tenant_Statement_${tenant.first_name}_${tenant.last_name}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#331A6F] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-400 text-slate-950 font-black text-lg flex items-center justify-center border border-black shadow-[0.5px_0.5px_0_#000]">
              {(tenant.first_name || 'T')?.[0] || 'T'}{(tenant.last_name || '')?.[0] || ''}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">
                  {tenant.first_name} {tenant.last_name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-purple-100 uppercase tracking-wider">
                  {t.tenantLedger || 'Tenant Ledger'}
                </span>
              </div>
              <p className="text-xs text-purple-200 flex items-center gap-2 mt-0.5">
                <span>{tenant.property_name || 'Notify Heights'} • {t.unitLabel || 'Unit'} {tenant.unit_number || 'A-102'}</span>
                <span>•</span>
                <span>{tenant.phone}</span>
                <span>•</span>
                <span>{tenant.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportStatement}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/20"
              title="Download Statement as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportCsv || 'Export CSV'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">{t.totalInvoiced || 'Total Invoiced'}</span>
              <div className="text-lg font-extrabold text-slate-900 mt-1">
                RWF {totalInvoiced.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500">{tenantInvoices.length} {t.invoicesGenerated || 'invoices generated'}</span>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-100">
              <span className="text-emerald-700 font-bold text-[10px] uppercase tracking-wider">{t.amountPaid || 'Total Paid'}</span>
              <div className="text-lg font-extrabold text-emerald-800 mt-1">
                RWF {totalPaid.toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-600">{tenantPayments.length} {t.verifiedTransactions || 'verified transactions'}</span>
            </div>

            <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-100">
              <span className="text-[#331A6F] font-bold text-[10px] uppercase tracking-wider">{t.currentBalanceDue || 'Current Balance Due'}</span>
              <div className="text-lg font-extrabold text-[#331A6F] mt-1">
                RWF {balanceDue.toLocaleString()}
              </div>
              <span className="text-[11px] text-purple-700">
                {balanceDue === 0 ? (t.allSettled || 'All settled') : (t.paymentPending || 'Payment pending')}
              </span>
            </div>

            <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-100">
              <span className="text-rose-700 font-bold text-[10px] uppercase tracking-wider">{t.overdueBalance || 'Overdue Balance'}</span>
              <div className="text-lg font-extrabold text-rose-800 mt-1">
                RWF {overdueAmount.toLocaleString()}
              </div>
              <span className="text-[11px] text-rose-600">
                {overdueAmount > 0 ? (t.requiresImmediateAction || 'Requires immediate action') : (t.noOverdueCharges || 'No overdue charges')}
              </span>
            </div>
          </div>

          {/* Quick Action Bar for this Tenant */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">{t.quickActions || 'Quick Actions'}:</span>
              {balanceDue > 0 && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {t.outstanding || 'Outstanding'}: RWF {balanceDue.toLocaleString()}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onSendReminder(tenant, activeInvoice)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t.sendRentReminder || 'Send Rent Reminder'}</span>
              </button>

              <button
                onClick={() => onRecordPayment(tenant.id, activeInvoice?.id)}
                className="px-3.5 py-1.5 bg-[#331A6F] hover:bg-[#251352] text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.recordPayment || 'Record Payment'}</span>
              </button>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="border-b border-slate-200 flex gap-4">
            <button
              onClick={() => setActiveSubTab('LEDGER')}
              className={`pb-2.5 font-bold text-xs border-b-2 transition-colors cursor-pointer ${
                activeSubTab === 'LEDGER'
                  ? 'border-[#331A6F] text-[#331A6F]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.chronologicalLedger || 'Chronological Ledger'} ({ledgerWithBalance.length})
            </button>

            <button
              onClick={() => setActiveSubTab('INVOICES')}
              className={`pb-2.5 font-bold text-xs border-b-2 transition-colors cursor-pointer ${
                activeSubTab === 'INVOICES'
                  ? 'border-[#331A6F] text-[#331A6F]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.invoicesAndCharges || 'Invoices & Charges'} ({tenantInvoices.length})
            </button>

            <button
              onClick={() => setActiveSubTab('PAYMENTS')}
              className={`pb-2.5 font-bold text-xs border-b-2 transition-colors cursor-pointer ${
                activeSubTab === 'PAYMENTS'
                  ? 'border-[#331A6F] text-[#331A6F]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.paymentsAndSlips || 'Payments & Slips'} ({tenantPayments.length})
            </button>

            <button
              onClick={() => setActiveSubTab('RECEIPTS')}
              className={`pb-2.5 font-bold text-xs border-b-2 transition-colors cursor-pointer ${
                activeSubTab === 'RECEIPTS'
                  ? 'border-[#331A6F] text-[#331A6F]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.officialReceipts || 'Official Receipts'} ({tenantReceipts.length})
            </button>
          </div>

          {/* TAB 1: FULL LEDGER */}
          {activeSubTab === 'LEDGER' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">{t.date || 'Date'}</th>
                      <th className="py-3 px-4">{t.type || 'Type'}</th>
                      <th className="py-3 px-4">{t.reference || 'Reference'}</th>
                      <th className="py-3 px-4">{t.itemDescription || 'Description'}</th>
                      <th className="py-3 px-4 text-right">{t.debitCharge || 'Debit (Charge)'}</th>
                      <th className="py-3 px-4 text-right">{t.creditPayment || 'Credit (Payment)'}</th>
                      <th className="py-3 px-4 text-right">{t.balanceDue || 'Balance Due'}</th>
                      <th className="py-3 px-4 text-center">{t.status || 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerWithBalance.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">{item.date}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              item.type === 'INVOICE'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {item.type === 'INVOICE' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {item.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{item.reference}</td>
                        <td className="py-3.5 px-4 text-slate-700">{item.description}</td>
                        <td className="py-3.5 px-4 text-right font-semibold text-rose-700">
                          {item.debit > 0 ? `RWF ${item.debit.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-emerald-700">
                          {item.credit > 0 ? `RWF ${item.credit.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                          RWF {item.balanceAfter.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              item.status === 'PAID' || item.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'PARTIALLY_PAID'
                                ? 'bg-blue-100 text-blue-800'
                                : item.status === 'OVERDUE'
                                ? 'bg-rose-100 text-rose-800'
                                : item.status === 'AWAITING_VERIFICATION'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {ledgerWithBalance.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                          {t.noLedgerRecordsFound || 'No financial ledger records found for this tenant.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: INVOICES */}
          {activeSubTab === 'INVOICES' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">{t.invoiceNumber || 'Invoice #'}</th>
                      <th className="py-3 px-4">{t.billingPeriod || 'Billing Period'}</th>
                      <th className="py-3 px-4">{t.dueDate || 'Due Date'}</th>
                      <th className="py-3 px-4">{t.totalAmount || 'Total Amount'}</th>
                      <th className="py-3 px-4">{t.amountPaid || 'Amount Paid'}</th>
                      <th className="py-3 px-4">{t.balanceDue || 'Balance Due'}</th>
                      <th className="py-3 px-4">{t.status || 'Status'}</th>
                      <th className="py-3 px-4 text-right">{t.actions || 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenantInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#331A6F]">{inv.invoice_number}</td>
                        <td className="py-3.5 px-4 text-slate-600">{inv.billing_period_start} → {inv.billing_period_end}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">{inv.due_date}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">RWF {(inv.total_amount || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-700">RWF {(inv.amount_paid || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-4 font-extrabold text-rose-700">RWF {(inv.balance_due || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'PARTIALLY_PAID'
                                ? 'bg-blue-100 text-blue-800'
                                : inv.status === 'OVERDUE'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => onViewInvoice(inv)}
                            className="px-2.5 py-1 border border-slate-300 hover:bg-slate-100 rounded-lg text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                          >
                            {t.viewInvoice || 'View'}
                          </button>
                          {inv.balance_due > 0 && (
                            <button
                              onClick={() => onRecordPayment(tenant.id, inv.id)}
                              className="px-2.5 py-1 bg-[#331A6F] hover:bg-[#251352] text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              {t.payNow || 'Pay'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENTS */}
          {activeSubTab === 'PAYMENTS' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">{t.paymentRef || 'Payment Ref'}</th>
                      <th className="py-3 px-4">{t.transactionRef || 'Transaction Ref'}</th>
                      <th className="py-3 px-4">{t.date || 'Date'}</th>
                      <th className="py-3 px-4">{t.method || 'Method'}</th>
                      <th className="py-3 px-4">{t.amount || 'Amount'}</th>
                      <th className="py-3 px-4">{t.status || 'Status'}</th>
                      <th className="py-3 px-4">{t.tenantNotes || 'Notes'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenantPayments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{pay.payment_reference}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">{pay.transaction_reference || 'N/A'}</td>
                        <td className="py-3.5 px-4 text-slate-600">{pay.paid_at ? pay.paid_at.split('T')[0] : '2026-08-05'}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{pay.payment_method.replace('_', ' ')}</td>
                        <td className="py-3.5 px-4 font-bold text-emerald-700">RWF {(pay.amount || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              pay.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : pay.status === 'AWAITING_VERIFICATION'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {pay.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{pay.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: RECEIPTS */}
          {activeSubTab === 'RECEIPTS' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">{t.receiptNumber || 'Receipt #'}</th>
                      <th className="py-3 px-4">{t.issueDate || 'Issue Date'}</th>
                      <th className="py-3 px-4">{t.propertyUnit || 'Property & Unit'}</th>
                      <th className="py-3 px-4">{t.paymentMethod || 'Payment Method'}</th>
                      <th className="py-3 px-4">{t.amountPaid || 'Amount Paid'}</th>
                      <th className="py-3 px-4 text-right">{t.actions || 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenantReceipts.map((rct) => (
                      <tr key={rct.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#331A6F]">{rct.receipt_number}</td>
                        <td className="py-3.5 px-4 text-slate-600">{rct.issued_at ? rct.issued_at.split('T')[0] : '2026-08-05'}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">{rct.property_name} ({rct.unit_number})</td>
                        <td className="py-3.5 px-4 text-slate-700">{rct.payment_method?.replace('_', ' ') || 'Mobile Money'}</td>
                        <td className="py-3.5 px-4 font-bold text-emerald-800">RWF {(rct.amount || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => onViewReceipt(rct)}
                            className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-[11px] transition-colors flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <ReceiptIcon className="w-3.5 h-3.5 text-[#331A6F]" />
                            <span>{t.viewAndPrint || 'View & Print'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {tenantReceipts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                          {t.noReceiptsGenerated || 'No receipts generated yet for this tenant.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Tenant ID: <span className="font-mono">{tenant.id}</span> • {t.tenantTenancy || 'Lease Status'}: <span className="font-bold text-slate-800">{lease?.status || 'ACTIVE'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            {t.closeLedger || 'Close Ledger'}
          </button>
        </div>
      </div>
    </div>
  );
};
