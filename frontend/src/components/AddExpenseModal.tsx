import React, { useState, useEffect } from 'react';
import { Property, Unit, Expense, ExpenseCategory } from '../types';
import { X, Receipt, Building2, Home, DollarSign, Calendar, Tag, AlertCircle, Wrench, Shield, Zap, Sparkles, User } from 'lucide-react';
import { api } from '../services/api';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseSaved: () => void;
  properties: Property[];
  units: Unit[];
  initialExpense?: Expense | null;
}

const CATEGORY_OPTIONS: { key: ExpenseCategory; label: string; icon: any }[] = [
  { key: 'MAINTENANCE', label: 'Maintenance & Repairs', icon: Wrench },
  { key: 'UTILITIES', label: 'Utilities (Water, Power)', icon: Zap },
  { key: 'SECURITY', label: 'Security Services', icon: Shield },
  { key: 'CLEANING', label: 'Janitorial & Cleaning', icon: Sparkles },
  { key: 'STAFF', label: 'Staff & Contractor Payroll', icon: User },
  { key: 'TAX', label: 'Property Taxes / Levies', icon: Building2 },
  { key: 'INSURANCE', label: 'Property Insurance', icon: Shield },
  { key: 'OTHER', label: 'Other Operational Expenses', icon: Tag },
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseSaved,
  properties,
  units,
  initialExpense,
}) => {
  if (!isOpen) return null;

  const [propertyId, setPropertyId] = useState<string>(
    initialExpense?.property_id || properties[0]?.id || ''
  );
  const [unitId, setUnitId] = useState<string>(initialExpense?.unit_id || '');
  const [category, setCategory] = useState<ExpenseCategory>(
    initialExpense?.category || 'MAINTENANCE'
  );
  const [amount, setAmount] = useState<number>(initialExpense?.amount || 50000);
  const [expenseDate, setExpenseDate] = useState<string>(
    initialExpense?.expense_date || new Date().toISOString().split('T')[0]
  );
  const [vendor, setVendor] = useState<string>(initialExpense?.vendor || '');
  const [reference, setReference] = useState<string>(initialExpense?.reference || '');
  const [description, setDescription] = useState<string>(initialExpense?.description || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const propertyUnits = units.filter((u) => u.property_id === propertyId);

  useEffect(() => {
    if (initialExpense) {
      setPropertyId(initialExpense.property_id);
      setUnitId(initialExpense.unit_id || '');
      setCategory(initialExpense.category);
      setAmount(initialExpense.amount);
      setExpenseDate(initialExpense.expense_date);
      setVendor(initialExpense.vendor || '');
      setReference(initialExpense.reference || '');
      setDescription(initialExpense.description || '');
    }
  }, [initialExpense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!propertyId) {
      setErrorMsg('Please select a property.');
      return;
    }

    if (amount <= 0) {
      setErrorMsg('Expense amount must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        property_id: propertyId,
        unit_id: unitId || undefined,
        category,
        amount: Number(amount),
        currency: 'RWF',
        expense_date: expenseDate,
        vendor: vendor || undefined,
        reference: reference || undefined,
        description: description || `${category} expense`,
      };

      if (initialExpense?.id) {
        await api.expenses.update(initialExpense.id, payload);
      } else {
        await api.expenses.create(payload);
      }

      onExpenseSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save expense.');
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
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#331A6F] to-[#452295] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <Receipt className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {initialExpense ? 'Edit Property Expense' : 'Record New Expense'}
              </h3>
              <p className="text-xs text-purple-200">
                Track operational costs, repairs, and vendor invoices
              </p>
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
          {/* Category Selector */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">Expense Category *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = category === cat.key;
                const IconComponent = cat.icon;
                return (
                  <button
                    type="button"
                    key={cat.key}
                    onClick={() => setCategory(cat.key)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col items-start gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#331A6F] bg-purple-50 text-[#331A6F] font-bold shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isSelected ? 'text-[#331A6F]' : 'text-slate-400'}`} />
                    <span className="text-[11px] leading-tight">{cat.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Property & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Property *</label>
              <select
                value={propertyId}
                onChange={(e) => {
                  setPropertyId(e.target.value);
                  setUnitId('');
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 font-medium"
                required
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Target Unit (Optional)</label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20"
              >
                <option value="">-- Entire Property (Common Area) --</option>
                {propertyUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    Unit {u.unit_number} (Floor {u.floor})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Amount (RWF) *</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full pl-3 pr-14 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20"
                  placeholder="50,000"
                />
                <span className="absolute right-3 top-2 text-slate-400 font-bold text-[11px]">RWF</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Expense Date *</label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20"
              />
            </div>
          </div>

          {/* Vendor & Receipt Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Vendor / Payee</label>
              <input
                type="text"
                placeholder="e.g. Kigali Plumbers, WASAC, ISCO"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Receipt / Invoice Ref #</label>
              <input
                type="text"
                placeholder="e.g. REC-8823, BILL-09"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Description / Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Replaced faulty water pressure valve in main utility room."
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
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#331A6F] text-white rounded-xl font-bold hover:bg-[#251352] transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-900/10"
            >
              <Receipt className="w-4 h-4 text-amber-300" />
              <span>{isSubmitting ? 'Saving...' : initialExpense ? 'Update Expense' : 'Record Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
