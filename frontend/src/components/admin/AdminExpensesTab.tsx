import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  Search,
  Plus,
  Building,
  DollarSign,
  Tag,
  Calendar,
  Trash2,
  X,
  FileText,
  AlertCircle,
  Loader2,
  Wrench,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../services/api';

interface AdminExpensesTabProps {
  expenses?: any[];
  properties?: any[];
  onRefresh: () => void;
}

export const AdminExpensesTab: React.FC<AdminExpensesTabProps> = ({
  expenses = [],
  properties = [],
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [propertyFilter, setPropertyFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form State
  const [propertyId, setPropertyId] = useState(properties?.[0]?.id || '');
  const [category, setCategory] = useState('MAINTENANCE');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(45000);
  const [vendor, setVendor] = useState('');
  const [reference, setReference] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Fast property lookup
  const propertyMap = useMemo(() => {
    const map = new Map<string, string>();
    properties.forEach((p) => {
      if (p.id) map.set(p.id, p.name || 'Property');
    });
    return map;
  }, [properties]);

  // Enriched expenses
  const enrichedExpenses = useMemo(() => {
    return (expenses || []).map((e) => {
      const propName = e.property_name || propertyMap.get(e.property_id) || 'Estate Property';
      return {
        ...e,
        property_name: propName,
      };
    });
  }, [expenses, propertyMap]);

  // Metrics
  const totalAmount = useMemo(() => {
    return enrichedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [enrichedExpenses]);

  const maintenanceTotal = useMemo(() => {
    return enrichedExpenses
      .filter((e) => e.category === 'MAINTENANCE')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [enrichedExpenses]);

  const utilitiesTotal = useMemo(() => {
    return enrichedExpenses
      .filter((e) => e.category === 'UTILITIES')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [enrichedExpenses]);

  const filtered = useMemo(() => {
    return enrichedExpenses.filter((e) => {
      const matchesSearch =
        (e.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.property_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.vendor || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.category || '').toLowerCase().includes(search.toLowerCase());

      const matchesCategory = categoryFilter === 'ALL' || e.category === categoryFilter;
      const matchesProp = propertyFilter === 'ALL' || e.property_id === propertyFilter;

      return matchesSearch && matchesCategory && matchesProp;
    });
  }, [enrichedExpenses, search, categoryFilter, propertyFilter]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !description) {
      setActionError('Please select a property and provide a description.');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);
      await api.expenses.create({
        property_id: propertyId,
        category,
        description,
        amount: Number(amount),
        expense_date: expenseDate,
        vendor: vendor || undefined,
        reference: reference || undefined,
      });

      setDescription('');
      setVendor('');
      setReference('');
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record expense');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense record?')) {
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);
      await api.expenses.delete(id);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete expense');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <TrendingDown className="w-6 h-6 text-rose-600" />
            <span>Platform Expenses & Operational Outlays</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Record maintenance repairs, utility charges, security, cleaning and operating costs across all platform estates
          </p>
        </div>

        <button
          onClick={() => {
            if (properties.length > 0 && !propertyId) setPropertyId(properties[0].id);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#331A6F] text-white text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="cursor-pointer p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Financial Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Expenses</span>
            <div className="p-2 rounded-xl bg-purple-50 text-[#331A6F] border border-purple-200">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{expenses.length}</div>
            <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Logged expense items</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Total Outlays</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700">RWF {totalAmount.toLocaleString()}</div>
            <div className="text-[11px] font-semibold text-rose-600 mt-0.5">Total platform operating spend</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Maintenance</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-700">RWF {maintenanceTotal.toLocaleString()}</div>
            <div className="text-[11px] font-semibold text-amber-600 mt-0.5">Repairs & work orders</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Utilities</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-blue-700">RWF {utilitiesTotal.toLocaleString()}</div>
            <div className="text-[11px] font-semibold text-blue-600 mt-0.5">Water, power & services</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by description, property, vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="px-3 py-1 text-xs font-bold bg-slate-50 border-2 border-black rounded-lg outline-none cursor-pointer"
          >
            <option value="ALL">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1 text-xs font-bold bg-slate-50 border-2 border-black rounded-lg outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="UTILITIES">Utilities</option>
            <option value="TAX">Taxes</option>
            <option value="INSURANCE">Insurance</option>
            <option value="MANAGEMENT_FEE">Management Fee</option>
            <option value="LEGAL">Legal</option>
            <option value="ADVERTISING">Advertising</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#331A6F] text-white font-extrabold uppercase tracking-wider border-b-2 border-black">
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Property</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Description & Vendor</th>
                <th className="p-3.5 text-right">Amount (RWF)</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    No expense records matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-rose-50/30 font-medium transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      {e.expense_date || e.created_at?.slice(0, 10) || 'Recent'}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">{e.property_name}</td>
                    <td className="p-3.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-800 border border-slate-300">
                        {e.category?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{e.description}</div>
                      {e.vendor && (
                        <div className="text-[10px] text-slate-500 font-medium">Vendor: {e.vendor}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-black text-rose-700 text-sm">
                      RWF {(Number(e.amount) || 0).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        disabled={actionLoading}
                        onClick={() => handleDeleteExpense(e.id)}
                        className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 rounded-lg border border-slate-300 hover:border-rose-400 cursor-pointer disabled:opacity-50"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <h3 className="font-extrabold text-base">Record Estate Expense</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Property *</label>
                <select
                  required
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.address})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  >
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="UTILITIES">Utilities</option>
                    <option value="TAX">Taxes</option>
                    <option value="INSURANCE">Insurance</option>
                    <option value="MANAGEMENT_FEE">Management Fee</option>
                    <option value="LEGAL">Legal</option>
                    <option value="ADVERTISING">Advertising</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Generator diesel refill & quarterly service"
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (RWF) *</label>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vendor / Payee</label>
                  <input
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="e.g. REG Rwanda"
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Receipt / Voucher Reference</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. REC-2026-081"
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
                  disabled={actionLoading || properties.length === 0}
                  className="px-4 py-2 bg-[#331A6F] text-white font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Expense</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
