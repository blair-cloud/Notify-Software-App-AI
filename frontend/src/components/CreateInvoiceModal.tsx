import React, { useState, useEffect } from 'react';
import { Property, Unit, Lease, Tenant } from '../types';
import { X, FileText, Calendar, Building2, User, DollarSign, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../services/api';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreated: () => void;
  properties: Property[];
  units: Unit[];
  leases: Lease[];
  tenants: Tenant[];
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  onInvoiceCreated,
  properties,
  units,
  leases,
  tenants,
}) => {
  const propertyList = properties || [];
  const leaseList = leases || [];
  const unitList = units || [];
  const tenantList = tenants || [];

  const [propertyId, setPropertyId] = useState<string>(propertyList[0]?.id || '');
  const [leaseId, setLeaseId] = useState<string>('');
  const [invoiceType, setInvoiceType] = useState<string>('RENT');
  const [periodStart, setPeriodStart] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [periodEnd, setPeriodEnd] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  );
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
  );
  const [subtotal, setSubtotal] = useState<number>(350000);
  const [discount, setDiscount] = useState<number>(0);
  const [lateFee, setLateFee] = useState<number>(0);
  const [notes, setNotes] = useState<string>('Standard Monthly Rent Invoice');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter leases for the selected property
  const propertyLeases = leaseList.filter(
    (l) => !propertyId || l.property_id === propertyId || l.status === 'ACTIVE' || l.status === 'EXPIRING_SOON'
  );

  useEffect(() => {
    if (propertyLeases.length > 0) {
      const first = propertyLeases[0];
      setLeaseId(first.id);
      setSubtotal(first.monthly_rent || 350000);
    }
  }, [propertyId]);

  if (!isOpen) return null;

  const handleLeaseChange = (selectedLeaseId: string) => {
    setLeaseId(selectedLeaseId);
    const target = leaseList.find((l) => l.id === selectedLeaseId);
    if (target) {
      setSubtotal(target.monthly_rent || 350000);
      if (target.property_id) setPropertyId(target.property_id);
    }
  };

  const totalAmount = Math.max(0, Number(subtotal || 0) - Number(discount || 0) + Number(lateFee || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const selectedLease = leaseList.find((l) => l.id === leaseId);
    const selectedProperty = propertyList.find((p) => p.id === propertyId);
    const selectedUnit = unitList.find((u) => u.id === selectedLease?.unit_id);
    const selectedTenant = tenantList.find(
      (t) => t.id === selectedLease?.tenant_id || `${t.first_name} ${t.last_name}` === selectedLease?.tenant_name
    );

    if (!selectedLease && leases.length > 0) {
      setErrorMsg('Please select an active tenant lease.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.invoices.create({
        lease_id: selectedLease?.id || 'lease-101',
        tenancy_id: selectedLease?.tenancy_id || 'tenancy-101',
        tenant_id: selectedLease?.tenant_id || selectedTenant?.id || 'mock-tenant-001',
        property_id: selectedLease?.property_id || propertyId || 'prop-heights',
        unit_id: selectedLease?.unit_id || 'unit-a102',
        tenant_name: selectedLease?.tenant_name || (selectedTenant ? `${selectedTenant.first_name} ${selectedTenant.last_name}` : 'Tenant'),
        property_name: selectedProperty?.name || selectedLease?.property_name || 'Notify Property',
        unit_number: selectedUnit?.unit_number || selectedLease?.unit_number || 'Unit',
        invoice_type: invoiceType,
        billing_period_start: periodStart,
        billing_period_end: periodEnd,
        issue_date: issueDate,
        due_date: dueDate,
        subtotal: Number(subtotal),
        discount: Number(discount),
        late_fee: Number(lateFee),
        total_amount: totalAmount,
        currency: 'RWF',
        notes: notes,
      });

      onInvoiceCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#331A6F] to-[#452295] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <FileText className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">Create Custom Invoice</h3>
              <p className="text-xs text-purple-200">Issue a new rent or fee invoice for a tenant unit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="m-5 mb-0 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Property & Lease selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Property</label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 font-medium"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Tenant & Lease *</label>
              <select
                value={leaseId}
                onChange={(e) => handleLeaseChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 font-medium"
                required
              >
                <option value="">-- Choose Tenant Lease --</option>
                {propertyLeases.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.tenant_name || 'Tenant'} (Unit {l.unit_number || 'N/A'}) - RWF {(l.monthly_rent || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoice Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Invoice Type</label>
              <select
                value={invoiceType}
                onChange={(e) => {
                  setInvoiceType(e.target.value);
                  if (e.target.value === 'MAINTENANCE') setNotes('Maintenance Repair Cost Recharge');
                  else if (e.target.value === 'UTILITIES') setNotes('Monthly Utilities & Common Area Fee');
                  else if (e.target.value === 'LATE_FEE') setNotes('Late Payment Penalty Fee');
                  else setNotes('Standard Monthly Rent Invoice');
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 font-medium"
              >
                <option value="RENT">Monthly Rent</option>
                <option value="UTILITIES">Utilities / Water / Electricity</option>
                <option value="MAINTENANCE">Maintenance Recharge</option>
                <option value="LATE_FEE">Late Payment Penalty</option>
                <option value="SECURITY_DEPOSIT">Security Deposit</option>
                <option value="OTHER">Other / Miscellaneous</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Due Date *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20"
              />
            </div>
          </div>

          {/* Period Start & End */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Billing Period Start</label>
              <input
                type="date"
                required
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Billing Period End</label>
              <input
                type="date"
                required
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20"
              />
            </div>
          </div>

          {/* Amounts */}
          <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Base Amount (RWF) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={subtotal}
                  onChange={(e) => setSubtotal(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Discount (RWF)</label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none text-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Late Fee (RWF)</label>
                <input
                  type="number"
                  min="0"
                  value={lateFee}
                  onChange={(e) => setLateFee(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none text-slate-700"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between">
              <span className="font-extrabold text-slate-800 text-sm">Total Payable Amount:</span>
              <span className="text-base font-black text-[#331A6F]">
                RWF {totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Invoice Notes / Payment Instructions</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please pay via MTN MoMo Merchant code: 123456 by due date."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !leaseId}
              className="px-5 py-2 bg-[#331A6F] text-white rounded-xl font-bold hover:bg-[#251352] transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-900/10"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isSubmitting ? 'Creating...' : 'Generate & Issue Invoice'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
