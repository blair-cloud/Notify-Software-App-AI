import React, { useState } from 'react';
import { Expense, Property, Unit, ExpenseCategory } from '../types';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  Wrench,
  Zap,
  Shield,
  Sparkles,
  User,
  Building2,
  Tag,
  AlertCircle,
  CheckCircle2,
  PieChart as PieChartIcon,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { api } from '../services/api';

interface LandlordExpensesTabProps {
  expenses: Expense[];
  properties: Property[];
  units: Unit[];
  onOpenAddExpense: (expenseToEdit?: Expense) => void;
  onRefreshData: () => void;
}

const CATEGORY_META: Record<ExpenseCategory, { label: string; icon: any; color: string; bg: string }> = {
  MAINTENANCE: { label: 'Maintenance', icon: Wrench, color: '#F97316', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  UTILITIES: { label: 'Utilities', icon: Zap, color: '#10B981', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  SECURITY: { label: 'Security', icon: Shield, color: '#3B82F6', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  CLEANING: { label: 'Cleaning', icon: Sparkles, color: '#EC4899', bg: 'bg-pink-50 text-pink-700 border-pink-200' },
  STAFF: { label: 'Staff Payroll', icon: User, color: '#8B5CF6', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  TAX: { label: 'Taxes & Levies', icon: Building2, color: '#64748B', bg: 'bg-slate-50 text-slate-700 border-slate-200' },
  INSURANCE: { label: 'Insurance', icon: Shield, color: '#06B6D4', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  OTHER: { label: 'Other Ops', icon: Tag, color: '#94A3B8', bg: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export const LandlordExpensesTab: React.FC<LandlordExpensesTabProps> = ({
  expenses,
  properties,
  units,
  onOpenAddExpense,
  onRefreshData,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [propertyFilter, setPropertyFilter] = useState<string>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Aggregations
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const maintenanceExpenses = expenses
    .filter((e) => e.category === 'MAINTENANCE')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const securityExpenses = expenses
    .filter((e) => e.category === 'SECURITY')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const utilityExpenses = expenses
    .filter((e) => e.category === 'UTILITIES')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Filtered expenses
  const filteredExpenses = expenses.filter((e) => {
    if (categoryFilter !== 'ALL' && e.category !== categoryFilter) return false;
    if (propertyFilter !== 'ALL' && e.property_id !== propertyFilter) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchDesc = e.description?.toLowerCase().includes(q);
      const matchVendor = e.vendor?.toLowerCase().includes(q);
      const matchRef = e.reference?.toLowerCase().includes(q);
      const matchProp = e.property_name?.toLowerCase().includes(q);
      if (!matchDesc && !matchVendor && !matchRef && !matchProp) return false;
    }
    return true;
  });

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    setDeletingId(id);
    try {
      await api.expenses.delete(id);
      setActionSuccessMsg('Expense deleted successfully.');
      onRefreshData();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Failed to delete expense: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Category', 'Description', 'Property', 'Unit', 'Vendor', 'Reference', 'Amount (RWF)'];
    const rows = filteredExpenses.map((e) => [
      e.expense_date,
      e.category,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      `"${e.property_name || ''}"`,
      e.unit_number || 'Common Area',
      `"${e.vendor || ''}"`,
      e.reference || '',
      e.amount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Notify_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Recharts category breakdown
  const categorySummaryMap: Record<string, number> = {};
  expenses.forEach((e) => {
    const cat = e.category || 'OTHER';
    categorySummaryMap[cat] = (categorySummaryMap[cat] || 0) + Number(e.amount || 0);
  });

  const chartData = Object.entries(categorySummaryMap).map(([catKey, total]) => ({
    name: CATEGORY_META[catKey as ExpenseCategory]?.label || catKey,
    amount: total,
    color: CATEGORY_META[catKey as ExpenseCategory]?.color || '#64748B',
  }));

  const maxAmount = Math.max(...chartData.map((d) => d.amount), 1);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs font-bold shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Aggregation KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Operating Expenses</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 mt-2">
            RWF {totalExpenses.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">{expenses.length} records logged</p>
        </div>

        {/* Maintenance */}
        <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-xs bg-gradient-to-b from-white to-orange-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-800">Repairs & Maintenance</span>
            <div className="p-2 bg-orange-100 text-orange-700 rounded-xl">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-orange-700 mt-2">
            RWF {maintenanceExpenses.toLocaleString()}
          </div>
          <p className="text-[11px] text-orange-800 mt-1 font-medium">Plumbing, electrical & fixtures</p>
        </div>

        {/* Security */}
        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs bg-gradient-to-b from-white to-blue-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800">Security & Guarding</span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2">
            RWF {securityExpenses.toLocaleString()}
          </div>
          <p className="text-[11px] text-blue-800 mt-1 font-medium">Guarding contracts & surveillance</p>
        </div>

        {/* Utilities */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs bg-gradient-to-b from-white to-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Common Utilities</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            RWF {utilityExpenses.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-800 mt-1 font-medium">Water (WASAC) & power bills</p>
        </div>
      </div>

      {/* Visual Category Breakdown Chart & Quick Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">Expense Breakdown by Category</h3>
              <p className="text-xs text-slate-500">Distribution of expenditures across portfolio</p>
            </div>
            {hoveredBarIndex !== null && chartData[hoveredBarIndex] && (
              <div className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-2">
                <span>{chartData[hoveredBarIndex].name}:</span>
                <span className="text-amber-400">RWF {chartData[hoveredBarIndex].amount.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="h-60 w-full flex items-end gap-2 sm:gap-4 pt-6 pb-2 px-2 border-b border-slate-200">
            {chartData.map((d, index) => {
              const heightPercent = Math.max(8, Math.round((d.amount / maxAmount) * 100));
              return (
                <div
                  key={d.name}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                  onMouseEnter={() => setHoveredBarIndex(index)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                >
                  <div
                    className="w-full rounded-t-lg transition-all duration-200 hover:brightness-110 shadow-xs group-hover:scale-[1.02]"
                    style={{
                      height: `${heightPercent}%`,
                      backgroundColor: d.color,
                    }}
                  />
                  <span className="text-[10px] font-bold text-slate-600 truncate max-w-full mt-2 text-center">
                    {d.name.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Legend & Record Expense Prompt */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 mb-1">Cost Control</h3>
            <p className="text-xs text-slate-500 mb-3">Keep operating expenses below 20% of gross revenue</p>

            <div className="space-y-2.5">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-700 font-medium">{item.name}</span>
                  </div>
                  <strong className="text-slate-900 font-bold">RWF {item.amount.toLocaleString()}</strong>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onOpenAddExpense()}
            className="mt-4 w-full py-2.5 bg-[#331A6F] text-white rounded-xl text-xs font-bold hover:bg-[#251352] transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>Record New Expense</span>
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
              placeholder="Search expenses by vendor, description, or reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 font-medium"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => onOpenAddExpense()}
              className="px-4 py-2 bg-[#331A6F] text-white rounded-xl text-xs font-bold hover:bg-[#251352] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold shrink-0">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {Object.entries(CATEGORY_META).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
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
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Expense Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description & Vendor</th>
                <th className="px-4 py-3">Property & Unit</th>
                <th className="px-4 py-3">Receipt / Ref #</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm text-slate-600">No expense records found</p>
                    <p className="text-xs mt-0.5">Click "Record New Expense" to log bills or maintenance</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const meta = CATEGORY_META[exp.category] || CATEGORY_META.OTHER;
                  const IconComp = meta.icon;

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Date */}
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {exp.expense_date || 'Today'}
                      </td>

                      {/* Category Badge */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${meta.bg}`}>
                          <IconComp className="w-3.5 h-3.5" />
                          <span>{meta.label}</span>
                        </span>
                      </td>

                      {/* Description & Vendor */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{exp.description}</div>
                        {exp.vendor && (
                          <div className="text-[11px] text-slate-500 font-medium">Vendor: {exp.vendor}</div>
                        )}
                      </td>

                      {/* Property & Unit */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{exp.property_name || 'Property'}</div>
                        <div className="text-[11px] text-slate-500">
                          {exp.unit_number ? `Unit ${exp.unit_number}` : 'Common Area'}
                        </div>
                      </td>

                      {/* Reference */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">
                        {exp.reference || '—'}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 text-right font-black text-rose-600">
                        RWF {(Number(exp.amount) || 0).toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onOpenAddExpense(exp)}
                            title="Edit Expense"
                            className="p-1.5 text-slate-500 hover:text-[#331A6F] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            disabled={deletingId === exp.id}
                            title="Delete Expense"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
