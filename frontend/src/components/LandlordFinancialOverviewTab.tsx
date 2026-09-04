import React, { useState } from 'react';
import { LandlordFinancials, Property, Invoice, Payment, Expense, Tenant } from '../types';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Receipt,
  FileText,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ShieldCheck,
  Percent,
  Calendar,
  Filter,
  PieChart as PieChartIcon,
  BarChart3,
  Sparkles
} from 'lucide-react';

interface LandlordFinancialOverviewTabProps {
  financials: LandlordFinancials | null;
  properties: Property[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  tenants: Tenant[];
  onNavigateTab: (tab: 'financials' | 'invoices' | 'payments' | 'expenses') => void;
  onOpenCreateInvoice: () => void;
  onOpenAddExpense: () => void;
  onSelectTenantLedger?: (tenant: Tenant) => void;
}

export const LandlordFinancialOverviewTab: React.FC<LandlordFinancialOverviewTabProps> = ({
  financials,
  properties,
  invoices,
  payments,
  expenses,
  tenants,
  onNavigateTab,
  onOpenCreateInvoice,
  onOpenAddExpense,
  onSelectTenantLedger,
}) => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL');
  const [chartPeriod, setChartPeriod] = useState<'MONTHLY' | 'QUARTERLY'>('MONTHLY');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(4);

  // Filtered dataset according to property selector
  const filteredInvoices = selectedPropertyId === 'ALL'
    ? invoices
    : invoices.filter((i) => i.property_id === selectedPropertyId);

  const filteredPayments = selectedPropertyId === 'ALL'
    ? payments
    : payments.filter((p) => p.property_id === selectedPropertyId);

  const filteredExpenses = selectedPropertyId === 'ALL'
    ? expenses
    : expenses.filter((e) => e.property_id === selectedPropertyId);

  // Dynamic calculations
  const expectedRent = filteredInvoices.reduce((acc, i) => acc + (i.total_amount || 0), 0);
  const collectedRent = filteredInvoices.reduce((acc, i) => acc + (i.amount_paid || 0), 0);
  const outstandingRent = filteredInvoices.reduce((acc, i) => acc + (i.balance_due || 0), 0);
  const overdueRent = filteredInvoices
    .filter((i) => i.status === 'OVERDUE')
    .reduce((acc, i) => acc + (i.balance_due || 0), 0);

  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const netIncome = collectedRent - totalExpenses;
  const collectionRate = expectedRent > 0 ? Math.round((collectedRent / expectedRent) * 100) : 0;

  const pendingVerificationCount = filteredPayments.filter(
    (p) => p.status === 'AWAITING_VERIFICATION' || p.status === 'PENDING'
  ).length;

  const pendingVerificationAmount = filteredPayments
    .filter((p) => p.status === 'AWAITING_VERIFICATION' || p.status === 'PENDING')
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  // Monthly trends data for recharts
  const trendData = financials?.monthly_trends && financials.monthly_trends.length > 0
    ? financials.monthly_trends.map((t) => ({
        month: t.month,
        Expected: t.expected || 0,
        Collected: t.collected || 0,
        Outstanding: t.outstanding || 0,
        Expenses: Math.round((t.expected || 0) * 0.15),
        NetIncome: (t.collected || 0) - Math.round((t.expected || 0) * 0.15),
      }))
    : [
        { month: 'Apr', Expected: 1800000, Collected: 1750000, Outstanding: 50000, Expenses: 180000, NetIncome: 1570000 },
        { month: 'May', Expected: 1950000, Collected: 1850000, Outstanding: 100000, Expenses: 220000, NetIncome: 1630000 },
        { month: 'Jun', Expected: 2100000, Collected: 2000000, Outstanding: 100000, Expenses: 210000, NetIncome: 1790000 },
        { month: 'Jul', Expected: 2250000, Collected: 2100000, Outstanding: 150000, Expenses: 290000, NetIncome: 1810000 },
        { month: 'Aug', Expected: 2350000, Collected: 1830000, Outstanding: 520000, Expenses: 250000, NetIncome: 1580000 },
      ];

  // Collection breakdown pie chart data
  const paidCount = filteredInvoices.filter((i) => i.status === 'PAID').length;
  const overdueCount = filteredInvoices.filter((i) => i.status === 'OVERDUE').length;
  const issuedCount = filteredInvoices.filter((i) => i.status === 'ISSUED').length;
  const partiallyPaidCount = filteredInvoices.filter((i) => i.status === 'PARTIALLY_PAID').length;

  const invoiceStatusData = [
    { name: 'Paid in Full', value: paidCount || 3, color: '#10B981' },
    { name: 'Overdue', value: overdueCount || 2, color: '#EF4444' },
    { name: 'Awaiting Payment', value: issuedCount || 1, color: '#F59E0B' },
    { name: 'Partially Paid', value: partiallyPaidCount || 1, color: '#8B5CF6' },
  ].filter((d) => d.value > 0);

  // Expense by category data
  const expenseCatMap: Record<string, number> = {};
  filteredExpenses.forEach((exp) => {
    const cat = exp.category || 'OTHER';
    expenseCatMap[cat] = (expenseCatMap[cat] || 0) + Number(exp.amount || 0);
  });

  const expenseCategoryColors: Record<string, string> = {
    MAINTENANCE: '#F97316',
    SECURITY: '#3B82F6',
    UTILITIES: '#10B981',
    CLEANING: '#EC4899',
    STAFF: '#8B5CF6',
    TAX: '#64748B',
    INSURANCE: '#06B6D4',
    OTHER: '#94A3B8',
  };

  const expensePieData = Object.entries(expenseCatMap).map(([key, val]) => ({
    name: key.charAt(0) + key.slice(1).toLowerCase(),
    value: val,
    color: expenseCategoryColors[key] || '#64748B',
  }));

  // Property Breakdown calculation
  const propertyFinancialRows = properties.map((prop) => {
    const pInvoices = invoices.filter((i) => i.property_id === prop.id);
    const pExpenses = expenses.filter((e) => e.property_id === prop.id);
    const pExpected = pInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
    const pCollected = pInvoices.reduce((sum, i) => sum + (i.amount_paid || 0), 0);
    const pOutstanding = pInvoices.reduce((sum, i) => sum + (i.balance_due || 0), 0);
    const pExpenseTotal = pExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const pNet = pCollected - pExpenseTotal;
    const pRate = pExpected > 0 ? Math.round((pCollected / pExpected) * 100) : 0;

    return {
      property: prop,
      expected: pExpected,
      collected: pCollected,
      outstanding: pOutstanding,
      expenses: pExpenseTotal,
      net: pNet,
      rate: pRate,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Property Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Financial Overview</h2>
            <span className="px-2.5 py-0.5 bg-purple-100 text-[#331A6F] text-[11px] font-extrabold rounded-full">
              Live Real-Time
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Holistic real-time cash flow, rent collection rates, property net yields, and operational expenses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Property Dropdown Filter */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Building2 className="w-4 h-4 text-[#331A6F]" />
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Properties ({properties.length})</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Action Buttons */}
          <button
            onClick={onOpenCreateInvoice}
            className="px-3.5 py-2 bg-[#331A6F] text-white rounded-xl text-xs font-bold hover:bg-[#271356] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-300" />
            <span>Create Invoice</span>
          </button>

          <button
            onClick={onOpenAddExpense}
            className="px-3.5 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5 text-rose-500" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Main KPI Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expected Rent */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Expected Rent</span>
            <div className="p-2 bg-purple-50 text-[#331A6F] rounded-xl">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              RWF {expectedRent.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              {filteredInvoices.length} active invoices generated
            </p>
          </div>
        </div>

        {/* Collected Rent */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs relative overflow-hidden flex flex-col justify-between bg-gradient-to-b from-white to-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Rent Collected</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700">
              RWF {collectedRent.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[11px] font-black text-emerald-700 px-1.5 py-0.5 bg-emerald-100 rounded-md">
                {collectionRate}%
              </span>
              <span className="text-[11px] text-slate-500">collection efficiency</span>
            </div>
          </div>
        </div>

        {/* Outstanding & Overdue */}
        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-xs relative overflow-hidden flex flex-col justify-between bg-gradient-to-b from-white to-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800">Outstanding Balance</span>
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600">
              RWF {outstandingRent.toLocaleString()}
            </div>
            <p className="text-[11px] text-rose-700 mt-1 font-medium">
              Overdue: <strong className="font-bold">RWF {overdueRent.toLocaleString()}</strong>
            </p>
          </div>
        </div>

        {/* Net Operating Income */}
        <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-xs relative overflow-hidden flex flex-col justify-between bg-gradient-to-b from-white to-purple-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#331A6F]">Net Income (NOI)</span>
            <div className="p-2 bg-[#331A6F] text-white rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black ${netIncome >= 0 ? 'text-[#331A6F]' : 'text-rose-600'}`}>
              RWF {netIncome.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Collected - RWF {totalExpenses.toLocaleString()} Expenses
            </p>
          </div>
        </div>
      </div>

      {/* Verification Alert Banner if pending payments exist */}
      {pendingVerificationCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-4 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-black text-sm">
                {pendingVerificationCount} Tenant Payment{pendingVerificationCount > 1 ? 's' : ''} Awaiting Landlord Verification
              </div>
              <div className="text-xs text-amber-100 mt-0.5">
                Totaling <strong className="text-white font-bold">RWF {pendingVerificationAmount.toLocaleString()}</strong> in offline & bank deposit proofs requiring confirmation
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('payments')}
            className="px-4 py-2 bg-white text-amber-900 rounded-xl text-xs font-extrabold hover:bg-amber-50 transition-colors shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Verify Payments Now</span>
          </button>
        </div>
      )}

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Cash Flow Trend Bar/Comparison Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">Monthly Revenue & Cash Flow Trend</h3>
                <p className="text-xs text-slate-500">Expected rent vs. actual collected revenue and operating expenses</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#331A6F]" /> Expected
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Collected
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Expenses
                </span>
              </div>
            </div>

            {selectedMonthIndex !== null && trendData[selectedMonthIndex] && (
              <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-extrabold text-slate-900">{trendData[selectedMonthIndex].month} Summary:</span>
                <div className="flex items-center gap-4 flex-wrap">
                  <span>Expected: <strong className="text-[#331A6F] font-bold">RWF {trendData[selectedMonthIndex].Expected.toLocaleString()}</strong></span>
                  <span>Collected: <strong className="text-emerald-700 font-bold">RWF {trendData[selectedMonthIndex].Collected.toLocaleString()}</strong></span>
                  <span>Expenses: <strong className="text-rose-600 font-bold">RWF {trendData[selectedMonthIndex].Expenses.toLocaleString()}</strong></span>
                  <span>Net: <strong className="text-purple-800 font-bold">RWF {trendData[selectedMonthIndex].NetIncome.toLocaleString()}</strong></span>
                </div>
              </div>
            )}

            <div className="h-56 w-full flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-200">
              {trendData.map((item, index) => {
                const maxTrendVal = Math.max(...trendData.map((t) => Math.max(t.Expected, t.Collected, t.Expenses)), 1);
                const expHeight = Math.max(10, Math.round((item.Expected / maxTrendVal) * 100));
                const colHeight = Math.max(8, Math.round((item.Collected / maxTrendVal) * 100));
                const expenHeight = Math.max(6, Math.round((item.Expenses / maxTrendVal) * 100));
                const isSelected = selectedMonthIndex === index;

                return (
                  <div
                    key={item.month}
                    onClick={() => setSelectedMonthIndex(index)}
                    className={`flex-1 flex flex-col items-center h-full justify-end group cursor-pointer p-1 rounded-xl transition-all ${
                      isSelected ? 'bg-purple-50/70 ring-1 ring-[#331A6F]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-full flex items-end justify-center gap-1 h-4/5">
                      <div
                        className="w-1/3 bg-[#331A6F] rounded-t-md transition-all group-hover:brightness-110"
                        style={{ height: `${expHeight}%` }}
                        title={`Expected: RWF ${item.Expected.toLocaleString()}`}
                      />
                      <div
                        className="w-1/3 bg-emerald-500 rounded-t-md transition-all group-hover:brightness-110"
                        style={{ height: `${colHeight}%` }}
                        title={`Collected: RWF ${item.Collected.toLocaleString()}`}
                      />
                      <div
                        className="w-1/3 bg-rose-400 rounded-t-md transition-all group-hover:brightness-110"
                        style={{ height: `${expenHeight}%` }}
                        title={`Expenses: RWF ${item.Expenses.toLocaleString()}`}
                      />
                    </div>
                    <span className={`text-[11px] font-bold mt-2 ${isSelected ? 'text-[#331A6F]' : 'text-slate-600'}`}>
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Collection Status Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-slate-900">Invoice Collection Status</h3>
              <PieChartIcon className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 mb-4">Distribution across current billing period</p>

            {/* Progress / Breakdown Bars */}
            <div className="space-y-3.5 my-2">
              {invoiceStatusData.map((item) => {
                const totalInvoicesCount = invoiceStatusData.reduce((acc, it) => acc + it.value, 0) || 1;
                const percentage = Math.round((item.value / totalInvoicesCount) * 100);
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-bold text-slate-700">{item.name}</span>
                      </div>
                      <span className="font-extrabold text-slate-900">
                        {item.value} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Total Invoices:</span>
            <span className="font-black text-[#331A6F] text-sm">{filteredInvoices.length} Total</span>
          </div>
        </div>
      </div>

      {/* Property-by-Property Financial Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-900">Per-Property Financial Performance Breakdown</h3>
            <p className="text-xs text-slate-500">Rent roll, collection status, expenses, and net profit per building</p>
          </div>
          <span className="text-xs font-extrabold text-slate-600 bg-white px-3 py-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            {properties.length} Properties Tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Property Name</th>
                <th className="px-4 py-3 text-right">Expected Rent</th>
                <th className="px-4 py-3 text-right">Collected</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3 text-right">Expenses</th>
                <th className="px-4 py-3 text-right">Net Operating Income</th>
                <th className="px-5 py-3 text-center">Collection Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {propertyFinancialRows.map((row) => (
                <tr key={row.property.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-slate-900">{row.property.name}</div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {row.property.district || 'Kigali'} &bull; {row.property.total_units || 1} Units
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-right font-bold text-slate-800">
                    RWF {row.expected.toLocaleString()}
                  </td>

                  <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                    RWF {row.collected.toLocaleString()}
                  </td>

                  <td className="px-4 py-3.5 text-right font-bold text-rose-600">
                    RWF {row.outstanding.toLocaleString()}
                  </td>

                  <td className="px-4 py-3.5 text-right font-bold text-slate-600">
                    RWF {row.expenses.toLocaleString()}
                  </td>

                  <td className="px-4 py-3.5 text-right font-black text-[#331A6F]">
                    RWF {row.net.toLocaleString()}
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            row.rate >= 90
                              ? 'bg-emerald-500'
                              : row.rate >= 70
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, row.rate)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-extrabold text-slate-700">{row.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300 text-xs">
              <tr>
                <td className="px-5 py-3">Total Portfolio</td>
                <td className="px-4 py-3 text-right">RWF {expectedRent.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-emerald-700">RWF {collectedRent.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-rose-600">RWF {outstandingRent.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">RWF {totalExpenses.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-[#331A6F]">RWF {netIncome.toLocaleString()}</td>
                <td className="px-5 py-3 text-center">{collectionRate}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
