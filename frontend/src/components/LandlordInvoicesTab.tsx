import React, { useState } from 'react';
import { Invoice, Property, Tenant, Lease } from '../types';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Download,
  Send,
  CreditCard,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  Building2,
  Sparkles,
  Calendar,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { api } from '../services/api';

interface LandlordInvoicesTabProps {
  invoices: Invoice[];
  properties: Property[];
  tenants: Tenant[];
  leases: Lease[];
  onOpenCreateInvoice: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onRecordPayment: (tenantId: string, invoiceId?: string) => void;
  onSendReminder: (tenant: Tenant, invoice?: Invoice) => void;
  onRefreshData: () => void;
}

export const LandlordInvoicesTab: React.FC<LandlordInvoicesTabProps> = ({
  invoices,
  properties,
  tenants,
  leases,
  onOpenCreateInvoice,
  onViewInvoice,
  onRecordPayment,
  onSendReminder,
  onRefreshData,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [propertyFilter, setPropertyFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Summary figures
  const totalInvoiced = invoices.reduce((acc, i) => acc + (i.total_amount || 0), 0);
  const totalPaid = invoices.reduce((acc, i) => acc + (i.amount_paid || 0), 0);
  const totalOutstanding = invoices.reduce((acc, i) => acc + (i.balance_due || 0), 0);
  const overdueCount = invoices.filter((i) => i.status === 'OVERDUE').length;

  // Filtered list
  const filteredInvoices = invoices.filter((inv) => {
    // Status
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
    // Property
    if (propertyFilter !== 'ALL' && inv.property_id !== propertyFilter) return false;
    // Type
    if (typeFilter !== 'ALL' && inv.invoice_type !== typeFilter) return false;
    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchInv = inv.invoice_number?.toLowerCase().includes(q);
      const matchTenant = inv.tenant_name?.toLowerCase().includes(q);
      const matchProp = inv.property_name?.toLowerCase().includes(q);
      const matchUnit = inv.unit_number?.toLowerCase().includes(q);
      if (!matchInv && !matchTenant && !matchProp && !matchUnit) return false;
    }
    return true;
  });

  const handleBatchGenerate = async () => {
    setIsGeneratingBatch(true);
    setActionMessage(null);
    try {
      await api.invoices.generateMonthlyInvoices();
      setActionMessage('Successfully generated monthly rent invoices for all active leases.');
      onRefreshData();
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      setActionMessage('Failed to batch generate invoices: ' + (err.message || 'Error'));
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    if (!window.confirm('Are you sure you want to cancel / void this invoice?')) return;
    try {
      await api.invoices.cancel(invoiceId);
      setActionMessage('Invoice cancelled successfully.');
      onRefreshData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert('Failed to cancel invoice: ' + err.message);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Invoice Number', 'Tenant', 'Property', 'Unit', 'Type', 'Issue Date', 'Due Date', 'Total (RWF)', 'Paid (RWF)', 'Balance (RWF)', 'Status'];
    const rows = filteredInvoices.map((i) => [
      i.invoice_number,
      `"${i.tenant_name || ''}"`,
      `"${i.property_name || ''}"`,
      i.unit_number || '',
      i.invoice_type,
      i.issue_date,
      i.due_date,
      i.total_amount,
      i.amount_paid,
      i.balance_due,
      i.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Notify_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            Paid
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 animate-pulse">
            <AlertCircle className="w-3 h-3" />
            Overdue
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
            <Clock className="w-3 h-3" />
            Partially Paid
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
            <Ban className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" />
            Issued
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Toast Notification */}
      {actionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs font-bold shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner & Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500">Total Invoiced</div>
          <div className="text-xl font-black text-slate-900 mt-1">RWF {totalInvoiced.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{invoices.length} invoices generated</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs bg-gradient-to-b from-white to-emerald-50/30">
          <div className="text-xs font-bold text-emerald-800">Total Collected</div>
          <div className="text-xl font-black text-emerald-700 mt-1">RWF {totalPaid.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">
            {totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0}% collected
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs bg-gradient-to-b from-white to-rose-50/30">
          <div className="text-xs font-bold text-rose-800">Outstanding Balance</div>
          <div className="text-xl font-black text-rose-600 mt-1">RWF {totalOutstanding.toLocaleString()}</div>
          <div className="text-[11px] text-rose-600 mt-0.5">{overdueCount} overdue invoices</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-[#331A6F]">Batch Operations</div>
          <button
            onClick={handleBatchGenerate}
            disabled={isGeneratingBatch}
            className="mt-2 w-full py-2 bg-[#331A6F] text-white rounded-xl text-xs font-bold hover:bg-[#261353] transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{isGeneratingBatch ? 'Generating...' : 'Auto-Generate Monthly'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice number, tenant name, or unit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 font-medium"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onOpenCreateInvoice}
              className="px-4 py-2 bg-[#331A6F] text-white rounded-xl text-xs font-bold hover:bg-[#251352] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>New Invoice</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold shrink-0">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ISSUED">Issued / Pending</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid in Full</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Property Filter */}
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

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold shrink-0">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Invoice Types</option>
              <option value="RENT">Rent</option>
              <option value="UTILITIES">Utilities</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="LATE_FEE">Late Fee</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Invoice Details</th>
                <th className="px-4 py-3">Tenant & Property</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance Due</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm text-slate-600">No invoices match your filters</p>
                    <p className="text-xs mt-0.5">Try resetting search keywords or status filter</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const matchedTenant = tenants.find(
                    (t) => t.id === inv.tenant_id || `${t.first_name} ${t.last_name}` === inv.tenant_name
                  );

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Invoice Details */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[#331A6F]">{inv.invoice_number}</span>
                        </div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                          {inv.invoice_type || 'RENT'}
                        </span>
                      </td>

                      {/* Tenant & Property */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{inv.tenant_name || 'Tenant'}</div>
                        <div className="text-[11px] text-slate-500">
                          {inv.property_name} &bull; Unit {inv.unit_number || 'N/A'}
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="px-4 py-3.5">
                        <div className="text-slate-600">
                          Due: <strong className="text-slate-900 font-bold">{inv.due_date}</strong>
                        </div>
                        <div className="text-[11px] text-slate-400">Issued: {inv.issue_date}</div>
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        RWF {(inv.total_amount || 0).toLocaleString()}
                      </td>

                      {/* Paid */}
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                        RWF {(inv.amount_paid || 0).toLocaleString()}
                      </td>

                      {/* Balance Due */}
                      <td className="px-4 py-3.5 text-right font-black text-rose-600">
                        RWF {(inv.balance_due || 0).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        {getStatusBadge(inv.status)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Invoice */}
                          <button
                            onClick={() => onViewInvoice(inv)}
                            title="View Official Invoice PDF/Details"
                            className="p-1.5 text-slate-600 hover:text-[#331A6F] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Record Payment if balance due */}
                          {inv.balance_due > 0 && inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => onRecordPayment(inv.tenant_id, inv.id)}
                              title="Record Tenant Payment"
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}

                          {/* Send Reminder */}
                          {inv.balance_due > 0 && inv.status !== 'CANCELLED' && matchedTenant && (
                            <button
                              onClick={() => onSendReminder(matchedTenant, inv)}
                              title="Send WhatsApp/SMS/Email Rent Reminder"
                              className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancel Invoice */}
                          {inv.status !== 'CANCELLED' && inv.amount_paid === 0 && (
                            <button
                              onClick={() => handleCancelInvoice(inv.id)}
                              title="Cancel / Void Invoice"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Ban className="w-4 h-4" />
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
    </div>
  );
};
