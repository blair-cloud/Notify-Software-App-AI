import React, { useState } from 'react';
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
} from 'lucide-react';
import { adminService } from '../../services/adminService';

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

  // Form State
  const [propertyId, setPropertyId] = useState(properties?.[0]?.id || '');
  const [category, setCategory] = useState('MAINTENANCE');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(45000);
  const [expenseDate, setExpenseDate] = useState('2026-08-15');

  const filtered = (expenses || []).filter((e) => {
    const matchesSearch =
      e.description?.toLowerCase().includes(search.toLowerCase()) ||
      e.property_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.category?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || e.category === categoryFilter;
    const matchesProp = propertyFilter === 'ALL' || e.property_id === propertyFilter;

    return matchesSearch && matchesCategory && matchesProp;
  });

  const totalExpenseSum = filtered.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !description) return;

    adminService.createExpense({
      property_id: propertyId,
      category,
      description,
      amount: Number(amount),
      date: expenseDate,
    });

    setDescription('');
    setShowAddModal(false);
    onRefresh();
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('Are you sure you want to delete this expense record?')) {
      adminService.deleteExpense(id);
      onRefresh();
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
            Record maintenance repairs, utility charges, security, cleaning and operating costs across all estates
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-2 bg-rose-50 border-2 border-rose-200 rounded-xl text-rose-900 font-black text-xs">
            Total Displayed: RWF {totalExpenseSum.toLocaleString()}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#331A6F] text-white text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search expense description, property..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Property Dropdown Filter */}
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold bg-slate-100 border-2 border-black rounded-xl outline-none"
          >
            <option value="ALL">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold bg-slate-100 border-2 border-black rounded-xl outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="REPAIRS">Repairs</option>
            <option value="UTILITIES">Utilities</option>
            <option value="SECURITY">Security</option>
            <option value="TAXES">Taxes & Insurance</option>
            <option value="MANAGEMENT">Management</option>
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
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Property & Landlord</th>
                <th className="p-3.5">Expense Description</th>
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
                  <tr key={e.id} className="hover:bg-rose-50/40 font-medium transition-colors">
                    <td className="p-3.5 text-slate-600 font-semibold">{e.date}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
                        {e.category}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{e.property_name}</div>
                      <div className="text-[10px] text-slate-400">Owner: {e.landlord_name}</div>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">{e.description}</td>
                    <td className="p-3.5 text-right font-black text-rose-600 text-sm">
                      RWF {(e.amount || 0).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <h3 className="font-extrabold text-base">Record Operational Expense</h3>
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
                      {p.name} ({p.district})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expense Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  >
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="REPAIRS">Repairs</option>
                    <option value="UTILITIES">Utilities</option>
                    <option value="SECURITY">Security</option>
                    <option value="TAXES">Taxes & Levies</option>
                    <option value="MANAGEMENT">Management</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date Incurred *</label>
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
                <label className="block font-bold text-slate-700 mb-1">Amount (RWF) *</label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Vendor / Item *</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Electrical rewiring, plumbing leak fix in Unit 201"
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
                  className="px-4 py-2 bg-[#331A6F] text-white font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] cursor-pointer"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
