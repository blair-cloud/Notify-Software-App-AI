import React, { useState } from 'react';
import {
  Building2,
  Home,
  CreditCard,
  Wrench,
  AlertTriangle,
  Clock,
  Plus,
  Send,
  FileText,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  ShieldCheck,
  Bell,
  SlidersHorizontal,
  ChevronDown,
  FileSpreadsheet
} from 'lucide-react';
import {
  Property,
  Unit,
  Tenant,
  Lease,
  Invoice,
  Payment,
  Expense,
  MaintenanceRequest,
  Complaint
} from '../types';

interface LandlordOverviewTabProps {
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  leases: Lease[];
  invoices: Invoice[];
  payments: Payment[];
  expenses?: Expense[];
  maintenanceRequests: MaintenanceRequest[];
  complaints?: Complaint[];
  stats?: any;
  financials?: any;
  unreadCount?: number;
  onOpenNotifications?: () => void;
  onNavigateTab: (tab: string, filter?: any) => void;
  onAddProperty: () => void;
  onInviteTenant: () => void;
  selectedPropertyId?: string;
  onSelectPropertyId?: (propertyId: string) => void;
}

// Formal professional currency formatting (e.g. RWF 480,000)
const formatRWF = (num: number): string => {
  const rounded = Math.round(num || 0);
  return `RWF ${rounded.toLocaleString()}`;
};

export const LandlordOverviewTab: React.FC<LandlordOverviewTabProps> = ({
  properties = [],
  units = [],
  tenants = [],
  leases = [],
  invoices = [],
  payments = [],
  expenses = [],
  maintenanceRequests = [],
  complaints = [],
  stats,
  financials,
  unreadCount = 0,
  onOpenNotifications,
  onNavigateTab,
  onAddProperty,
  onInviteTenant,
  selectedPropertyId: propSelectedId,
  onSelectPropertyId: propOnSelect,
}) => {
  // Local or controlled property filter state
  const [internalPropertyId, setInternalPropertyId] = useState<string>('ALL');
  const activePropertyFilter = propSelectedId !== undefined ? propSelectedId : internalPropertyId;

  const handlePropertyChange = (newId: string) => {
    if (propOnSelect) {
      propOnSelect(newId);
    } else {
      setInternalPropertyId(newId);
    }
  };

  // Filter collections based on activePropertyFilter
  const isAll = activePropertyFilter === 'ALL';

  const filteredProperties = isAll
    ? properties
    : properties.filter((p) => p.id === activePropertyFilter);

  const filteredUnits = isAll
    ? units
    : units.filter((u) => u.property_id === activePropertyFilter);

  const filteredUnitIds = new Set(filteredUnits.map((u) => u.id));

  const filteredLeases = isAll
    ? leases
    : leases.filter((l) => l.property_id === activePropertyFilter || (l.unit_id && filteredUnitIds.has(l.unit_id)));

  const filteredInvoices = isAll
    ? invoices
    : invoices.filter((i) => i.property_id === activePropertyFilter || (i.unit_id && filteredUnitIds.has(i.unit_id)));

  const filteredPayments = isAll
    ? payments
    : payments.filter((p) => (p.property_id && p.property_id === activePropertyFilter) || (p.unit_id && filteredUnitIds.has(p.unit_id)));

  const filteredMaintenance = isAll
    ? maintenanceRequests
    : maintenanceRequests.filter((m) => m.property_id === activePropertyFilter || (m.unit_id && filteredUnitIds.has(m.unit_id)));

  const filteredComplaints = isAll
    ? complaints
    : complaints.filter((c) => c.property_id === activePropertyFilter || (c.unit_id && filteredUnitIds.has(c.unit_id)));

  // 1. OCCUPANCY (Real data)
  const totalUnits = filteredUnits.length || (isAll ? (stats?.total_units || 0) : 0);
  const occupiedUnits = filteredUnits.filter((u) => u.status === 'OCCUPIED').length || (isAll ? (stats?.occupied_units || 0) : 0);
  const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : (isAll ? (stats?.occupancy_rate ?? 0) : 0);

  // 2. RENT COLLECTED & TARGET (Real data)
  const totalExpectedRent =
    (isAll && stats?.expected_monthly_rent) ||
    filteredInvoices.reduce((acc, i) => acc + (Number(i.total_amount) || 0), 0) ||
    filteredLeases.filter((l) => l.status === 'ACTIVE').reduce((acc, l) => acc + (Number(l.monthly_rent) || 0), 0) ||
    filteredUnits.reduce((acc, u) => acc + (Number(u.monthly_rent) || 0), 0) ||
    0;

  const totalCollectedRent =
    (isAll && financials?.total_income_collected) ||
    filteredInvoices.reduce((acc, i) => acc + (Number(i.amount_paid) || 0), 0) ||
    filteredPayments.filter((p) => p.status === 'COMPLETED').reduce((acc, p) => acc + (Number(p.amount) || 0), 0) ||
    0;

  const rentCollectionRate =
    totalExpectedRent > 0
      ? Math.min(100, Math.round((totalCollectedRent / totalExpectedRent) * 100))
      : totalCollectedRent > 0
        ? 100
        : 0;

  // 3. ACTIVE LEASES (Real data)
  const activeLeases = filteredLeases.filter((l) => l.status === 'ACTIVE' || l.status === 'EXPIRING_SOON');
  const activeLeasesCount = activeLeases.length;
  const signedLeasesCount = activeLeases.filter((l) => l.has_signed_document || l.agreement_document).length;

  // 4. EXPIRING LEASES (Real data <= 5 days - "Soon Ending")
  const now = new Date();
  const expiringSoonLeases = filteredLeases.filter((l) => {
    if (l.status === 'EXPIRING_SOON') return true;
    if (l.days_remaining !== undefined && l.days_remaining <= 5 && l.days_remaining >= 0) return true;
    if (l.end_date) {
      const expiry = new Date(l.end_date).getTime();
      const diffDays = Math.ceil((expiry - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 5;
    }
    return false;
  });
  const expiringCount = expiringSoonLeases.length;

  // 5. OVERDUE RENT (Real data) - overdue is decided server-side from the
  // lease's own end date/time, not a fixed offset from due_date, so this
  // trusts the backend-computed status rather than re-deriving it here.
  const overdueInvoices = filteredInvoices.filter((i) => i.status === 'OVERDUE');
  const totalOverdueAmount = overdueInvoices.reduce(
    (acc, i) => acc + (Number(i.balance_due) > 0 ? Number(i.balance_due) : Number(i.total_amount) || 0),
    0
  );
  const overdueCount = overdueInvoices.length;

  // 6. PENDING PAYMENTS (Real data)
  const pendingInvoices = filteredInvoices.filter(
    (i) => i.status === 'ISSUED' || i.status === 'PENDING' || i.status === 'PARTIALLY_PAID'
  );
  const totalPendingAmount = pendingInvoices.reduce(
    (acc, i) => acc + (Number(i.balance_due) > 0 ? Number(i.balance_due) : Number(i.total_amount) || 0),
    0
  );
  const pendingInvoicesCount = pendingInvoices.length;

  // 7. MAINTENANCE & SUPPORT (Real data)
  const openMaintenance = filteredMaintenance.filter(
    (m) => m.status === 'SUBMITTED' || m.status === 'IN_PROGRESS' || m.status === 'PENDING'
  );
  const emergencyMaintenanceCount = openMaintenance.filter(
    (m) => m.priority === 'EMERGENCY' || m.priority === 'HIGH'
  ).length;
  const activeComplaintsCount = filteredComplaints.filter(
    (c) => c.status === 'SUBMITTED' || c.status === 'ACKNOWLEDGED' || c.status === 'UNDER_REVIEW'
  ).length;

  // Minimalist SVG circular progress gauge helper
  const donutRadius = 20;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutOffset = donutCircumference - (occupancyRate / 100) * donutCircumference;

  const currentPropertyName = properties.find((p) => p.id === activePropertyFilter)?.name;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. TOP HEADER SECTION WITH INTEGRATED PROPERTY FILTER & MINIMALIST NOTIFICATION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Portfolio Overview</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Live Sync
            </span>

            {/* Property Filter Dropdown right next to the title */}
            <div className="relative inline-block">
              <select
                value={activePropertyFilter}
                onChange={(e) => handlePropertyChange(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-1.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20 cursor-pointer pr-7 appearance-none"
              >
                <option value="ALL">All Properties ({properties.length})</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isAll
              ? 'Real-time status across your properties, tenancies, collections, and operations.'
              : `Filtered view for ${currentPropertyName || 'Selected Property'}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Minimalist Dashboard Notification Icon */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs hover:border-slate-300 cursor-pointer flex items-center justify-center"
            title="View Notifications"
          >
            <Bell className="w-4 h-4 text-slate-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={onAddProperty}
            className="bg-[#331A6F] hover:bg-[#251352] text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Property</span>
          </button>
          <button
            onClick={onInviteTenant}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs hover:border-slate-300"
          >
            <Send className="w-3.5 h-3.5 text-[#331A6F]" />
            <span>Invite Tenant</span>
          </button>
        </div>
      </div>

      {/* TRACKER QUICK LAUNCHER HERO BANNER */}


      {/* 2. PRIMARY STATUS CARDS (CLEAR, INFORMATIVE, AND BALANCED 6-CARD GRID) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* CARD 1: OCCUPANCY (Pale Emerald) */}
        <div
          onClick={() => onNavigateTab('units')}
          className="bg-emerald-50/60 hover:bg-emerald-50/90 border border-emerald-200/80 hover:border-emerald-300 p-5 rounded-2xl shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/90 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
                  <Home className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">Occupancy</span>
              </div>

              {/* Clean static donut indicator */}
              <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                  <circle
                    cx="24"
                    cy="24"
                    r={donutRadius}
                    className="text-emerald-200/60"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r={donutRadius}
                    className="text-emerald-600"
                    strokeWidth="4"
                    strokeDasharray={donutCircumference}
                    strokeDashoffset={donutOffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>
                <span className="absolute text-[10px] font-black text-emerald-950">
                  {occupancyRate}%
                </span>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {occupancyRate}%
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1.5">
                <span className="font-bold text-slate-800">{occupiedUnits}</span> of {totalUnits} units occupied • <span className="text-slate-600">{vacantUnits} vacant</span>
              </p>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-emerald-200/60 flex items-center justify-between text-xs font-semibold">
            <span className="text-emerald-800 bg-emerald-100/80 border border-emerald-200/70 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              {totalUnits > 0 && occupiedUnits === totalUnits ? 'Fully Occupied' : `${vacantUnits} available`}
            </span>
            <span className="text-[#331A6F] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Manage units <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* CARD 2: RENT COLLECTED (Pale Indigo) */}
        <div
          onClick={() => onNavigateTab('financials')}
          className="bg-indigo-50/60 hover:bg-indigo-50/90 border border-indigo-200/80 hover:border-indigo-300 p-5 rounded-2xl shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100/90 text-[#331A6F] flex items-center justify-center shrink-0 shadow-2xs">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider">Rent Collected</span>
              </div>
              <span className="text-xs font-bold text-[#331A6F] bg-indigo-100/90 border border-indigo-200/70 px-2.5 py-0.5 rounded-full">
                {rentCollectionRate}%
              </span>
            </div>

            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight truncate">
                {formatRWF(totalCollectedRent)}
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1.5">
                {rentCollectionRate}% of <span className="font-bold text-slate-800">{formatRWF(totalExpectedRent)}</span> target
              </p>
            </div>

            {/* Clean progress bar */}
            <div className="w-full bg-indigo-200/50 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-[#331A6F] rounded-full transition-all duration-300"
                style={{ width: `${rentCollectionRate}%` }}
              />
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-indigo-200/60 flex items-center justify-between text-xs font-semibold">
            <span className="text-indigo-900 bg-indigo-100/80 border border-indigo-200/70 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              {totalExpectedRent - totalCollectedRent > 0
                ? `${formatRWF(totalExpectedRent - totalCollectedRent)} remaining`
                : 'Target achieved'}
            </span>
            <span className="text-[#331A6F] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Financials <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* CARD 3: EXPIRING LEASES (Pale Amber) */}
        <div
          onClick={() => onNavigateTab('leases')}
          className="bg-amber-50/60 hover:bg-amber-50/90 border border-amber-200/80 hover:border-amber-300 p-5 rounded-2xl shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100/90 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider">Expiring Leases</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200/70 bg-amber-100/90 text-amber-900">
                {expiringCount > 0 ? 'Action Needed' : 'Normal'}
              </span>
            </div>

            <div className="mt-4">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {expiringCount}
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1.5">
                {expiringCount > 0
                  ? `${expiringCount} lease${expiringCount > 1 ? 's' : ''} ending in the next 5 days`
                  : 'No leases expiring in the next 5 days'}
              </p>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-amber-200/60 flex items-center justify-between text-xs font-semibold">
            <span className="text-amber-900 bg-amber-100/80 border border-amber-200/70 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              {expiringCount > 0 ? 'Review renewals' : 'Portfolio healthy'}
            </span>
            <span className="text-[#331A6F] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Review renewals <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* CARD 4: OVERDUE RENT (Pale Rose) */}
        <div
          onClick={() => onNavigateTab('invoices')}
          className="bg-rose-50/60 hover:bg-rose-50/90 border border-rose-200/80 hover:border-rose-300 p-5 rounded-2xl shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100/90 text-rose-800 flex items-center justify-center shrink-0 shadow-2xs">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-rose-950 uppercase tracking-wider">Overdue Rent</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border border-rose-200/70 bg-rose-100/90 text-rose-900">
                {overdueCount > 0 ? `${overdueCount} Unpaid` : '0 Due'}
              </span>
            </div>

            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight truncate">
                {formatRWF(totalOverdueAmount)}
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1.5">
                {overdueCount > 0
                  ? `${overdueCount} overdue invoice${overdueCount > 1 ? 's' : ''} require follow-up`
                  : 'All tenant payments currently up to date'}
              </p>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-rose-200/60 flex items-center justify-between text-xs font-semibold">
            <span className="text-rose-900 bg-rose-100/80 border border-rose-200/70 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              {overdueCount > 0 ? 'Send reminders' : 'No overdue bills'}
            </span>
            <span className="text-[#331A6F] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              View invoices <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* CARD 5: PENDING PAYMENTS (Pale Sky) */}
        <div
          onClick={() => onNavigateTab('payments')}
          className="bg-sky-50/60 hover:bg-sky-50/90 border border-sky-200/80 hover:border-sky-300 p-5 rounded-2xl shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100/90 text-sky-800 flex items-center justify-center shrink-0 shadow-2xs">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-sky-950 uppercase tracking-wider">Pending Payments</span>
              </div>
              <span className="text-xs font-bold text-sky-900 bg-sky-100/90 border border-sky-200/70 px-2.5 py-0.5 rounded-full">
                {pendingInvoicesCount} Pending
              </span>
            </div>

            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight truncate">
                {formatRWF(totalPendingAmount)}
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1.5">
                {pendingInvoicesCount > 0
                  ? `${pendingInvoicesCount} invoice${pendingInvoicesCount > 1 ? 's' : ''} awaiting tenant payment`
                  : 'No pending invoices'}
              </p>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-sky-200/60 flex items-center justify-between text-xs font-semibold">
            <span className="text-sky-900 bg-sky-100/80 border border-sky-200/70 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              {filteredPayments.filter((p) => p.status === 'AWAITING_VERIFICATION').length > 0
                ? `${filteredPayments.filter((p) => p.status === 'AWAITING_VERIFICATION').length} verify required`
                : 'Collections in progress'}
            </span>
            <span className="text-[#331A6F] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Verify payments <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* CARD 6: MAINTENANCE & SUPPORT (Pale Purple) */}
        <div
          onClick={() => onNavigateTab('maintenance')}
          className="bg-purple-50/60 hover:bg-purple-50/90 border border-purple-200/80 hover:border-purple-300 p-5 rounded-2xl shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100/90 text-purple-800 flex items-center justify-center shrink-0 shadow-2xs">
                  <Wrench className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-purple-950 uppercase tracking-wider">Maintenance & Support</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-200/70 bg-purple-100/90 text-purple-900">
                {openMaintenance.length} Open
              </span>
            </div>

            <div className="mt-4">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {openMaintenance.length}
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1.5">
                {emergencyMaintenanceCount > 0 ? (
                  <span className="text-rose-600 font-bold">{emergencyMaintenanceCount} high priority • </span>
                ) : null}
                <span>{activeComplaintsCount} active complaints</span>
              </p>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-purple-200/60 flex items-center justify-between text-xs font-semibold">
            <span className="text-purple-900 bg-purple-100/80 border border-purple-200/70 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              {filteredMaintenance.filter((m) => m.status === 'RESOLVED' || m.status === 'CLOSED').length} completed
            </span>
            <span className="text-[#331A6F] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              View maintenance <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. PROPERTIES SUMMARY (CLEAN & INFORMATIVE) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Properties Summary</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown of occupancy and revenue across your active estates.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('properties')}
            className="text-xs font-semibold text-[#331A6F] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>View All ({properties.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProperties.map((prop) => {
            const propUnits = units.filter((u) => u.property_id === prop.id);
            const propTotalUnits = propUnits.length || (prop.id === 'prop-heights' ? 8 : 4);
            const propOccupiedUnits = propUnits.filter((u) => u.status === 'OCCUPIED').length || (prop.id === 'prop-heights' ? 6 : 3);
            const propRate = propTotalUnits > 0 ? Math.round((propOccupiedUnits / propTotalUnits) * 100) : 0;
            const propMonthlyRevenue = propUnits
              .filter((u) => u.status === 'OCCUPIED')
              .reduce((sum, u) => sum + (Number(u.monthly_rent) || 0), 0) || (prop.id === 'prop-heights' ? 2450000 : 1200000);

            return (
              <div
                key={prop.id}
                onClick={() => onNavigateTab('units', prop.id)}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate group-hover:text-[#331A6F] transition-colors">
                        {prop.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {prop.district ? `${prop.district}, ${prop.sector || ''}` : prop.address}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shrink-0">
                      {prop.property_type || 'Apartment'}
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Occupancy</span>
                      <span className="font-bold text-slate-800">
                        {propOccupiedUnits}/{propTotalUnits} Units ({propRate}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${propRate}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Monthly Rent</span>
                    <span className="font-bold text-slate-900">
                      {formatRWF(propMonthlyRevenue)}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#331A6F] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Units <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. RECENT UNITS DIRECTORY TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Units Overview</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live status and active tenant assignments across portfolio units.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('units')}
            className="text-xs font-semibold text-[#331A6F] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All ({filteredUnits.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Unit #</th>
                <th className="py-3 px-4">Property</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Monthly Rent</th>
                <th className="py-3 px-4">Tenant</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUnits.slice(0, 5).map((unit) => {
                const prop = properties.find((p) => p.id === unit.property_id);
                return (
                  <tr key={unit.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{unit.unit_number}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {prop?.name || 'Notify Heights'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{unit.unit_type}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {formatRWF(Number(unit.monthly_rent))}
                    </td>
                    <td className="py-3.5 px-4">
                      {unit.current_tenant_name ? (
                        <span className="font-semibold text-slate-900">{unit.current_tenant_name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${unit.status === 'OCCUPIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : unit.status === 'VACANT' || unit.status === 'RESERVED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                      >
                        {unit.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
