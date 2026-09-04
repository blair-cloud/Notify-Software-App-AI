import React from 'react';
import {
  Users,
  Building,
  CreditCard,
  FileCheck2,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Wrench,
  ShieldCheck,
  TrendingUp,
  FileWarning,
  DollarSign,
  PieChart,
  CheckCircle2,
} from 'lucide-react';
import { AdminTabKey } from '../../services/adminService';

interface AdminOverviewTabProps {
  metrics: any;
  onNavigateTab?: (tab: AdminTabKey) => void;
  onNavigate?: (tab: AdminTabKey) => void;
  onOpenQuickAction?: (actionType: string) => void;
  recentPayments?: any[];
  recentLeases?: any[];
  recentMaintenance?: any[];
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  metrics = {} as any,
  onNavigateTab,
  onNavigate,
  onOpenQuickAction,
}) => {
  const navigateTo = (tab: AdminTabKey) => {
    if (onNavigateTab) onNavigateTab(tab);
    else if (onNavigate) onNavigate(tab);
  };

  const handleQuickAction = (action: string) => {
    if (onOpenQuickAction) {
      onOpenQuickAction(action);
    } else {
      if (action === 'create_user') navigateTo('users_roles');
      else if (action === 'create_property') navigateTo('properties');
      else if (action === 'create_lease') navigateTo('leases');
      else if (action === 'record_payment') navigateTo('payments');
      else if (action === 'record_expense') navigateTo('expenses');
      else if (action === 'broadcast_notification') navigateTo('notifications');
    }
  };
  return (
    <div className="space-y-6">
      {/* Top Banner Alert Bar if pending items */}
      {(metrics.pending_payments > 0 || metrics.expiring_leases > 0 || metrics.missing_docs_count > 0) && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-[0.5px_0.5px_0_#000] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-200 text-amber-900 border border-amber-400">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-slate-900">
                Action Required: Operational Backlog Detected
              </div>
              <div className="text-xs text-slate-700 font-medium">
                {metrics.pending_payments > 0 && (
                  <span className="font-bold text-rose-700 mr-3">
                    • {metrics.pending_payments} payment(s) awaiting verification
                  </span>
                )}
                {metrics.expiring_leases > 0 && (
                  <span className="font-bold text-amber-800 mr-3">
                    • {metrics.expiring_leases} lease(s) expiring soon
                  </span>
                )}
                {metrics.missing_docs_count > 0 && (
                  <span className="font-bold text-slate-800">
                    • {metrics.missing_docs_count} missing signed agreement(s)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {metrics.pending_payments > 0 && (
              <button
                onClick={() => navigateTo('payments')}
                className="px-3 py-1.5 bg-rose-600 text-white font-extrabold text-xs rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:bg-rose-700 cursor-pointer"
              >
                Verify Payments →
              </button>
            )}
            <button
              onClick={() => navigateTo('compliance')}
              className="px-3 py-1.5 bg-white text-slate-900 font-extrabold text-xs rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:bg-slate-50 cursor-pointer"
            >
              Compliance Center →
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: FINANCIAL HEALTH (REVENUE / NET INCOME / COLLECTION RATE) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Platform Financial Summary (August 2026)</span>
          </h3>
          <button
            onClick={() => navigateTo('reports')}
            className="text-xs font-bold text-[#331A6F] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Full Financial Ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Collected Rent
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600">
              RWF {metrics.collected_rent?.toLocaleString() || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between font-medium">
              <span>Collection Rate</span>
              <span className="font-extrabold text-emerald-700">{metrics.collection_rate || 0}%</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Expected Rent
            </div>
            <div className="text-xl sm:text-2xl font-black text-[#331A6F]">
              RWF {metrics.expected_rent?.toLocaleString() || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Outstanding: RWF {metrics.outstanding_rent?.toLocaleString() || 0}
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Total Expenses
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-600">
              RWF {metrics.total_expenses?.toLocaleString() || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Direct Maintenance & Utilities
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#331A6F] text-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
            <div className="text-[11px] font-bold text-purple-200 uppercase tracking-wider mb-1">
              Net Income (Platform)
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-300">
              RWF {metrics.net_income?.toLocaleString() || 0}
            </div>
            <div className="text-[11px] text-purple-200 mt-1 font-medium">
              Collected - Total Expenses
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: PLATFORM OPERATIONS & ASSETS OVERVIEW (GRID) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* PEOPLE CARD */}
        <div className="p-5 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 text-[#331A6F] border border-purple-300">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className="font-extrabold text-sm text-slate-900">People & Roles</h4>
              </div>
              <button
                onClick={() => navigateTo('users_roles')}
                className="text-[11px] font-extrabold text-[#331A6F] hover:underline cursor-pointer"
              >
                Manage →
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 font-medium">
                <span className="text-slate-500">Total Registered Users</span>
                <span className="font-bold text-slate-900">{metrics.total_users || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 font-medium">
                <span className="text-slate-500">Landlords</span>
                <span className="font-bold text-[#331A6F]">{metrics.landlords_count || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 font-medium">
                <span className="text-slate-500">Tenants</span>
                <span className="font-bold text-amber-700">{metrics.tenants_count || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 font-medium">
                <span className="text-slate-500">Account Status</span>
                <span className="font-bold text-emerald-700">{metrics.active_users || 0} Active / {metrics.suspended_users || 0} Suspended</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-2">
            <button
              onClick={() => navigateTo('landlords')}
              className="flex-1 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#331A6F] text-xs font-extrabold rounded-lg border border-purple-300 text-center cursor-pointer"
            >
              Landlords Directory
            </button>
            <button
              onClick={() => navigateTo('tenants')}
              className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-extrabold rounded-lg border border-amber-300 text-center cursor-pointer"
            >
              Tenants Directory
            </button>
          </div>
        </div>

        {/* PROPERTIES & OCCUPANCY CARD */}
        <div className="p-5 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700 border border-blue-300">
                  <Building className="w-4 h-4" />
                </div>
                <h4 className="font-extrabold text-sm text-slate-900">Properties & Units</h4>
              </div>
              <button
                onClick={() => navigateTo('properties')}
                className="text-[11px] font-extrabold text-[#331A6F] hover:underline cursor-pointer"
              >
                Inventory →
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 font-medium">
                <span className="text-slate-500">Total Properties</span>
                <span className="font-bold text-slate-900">{metrics.total_properties || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 font-medium">
                <span className="text-slate-500">Total Units</span>
                <span className="font-bold text-slate-900">{metrics.total_units || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 font-medium">
                <span className="text-slate-500">Occupancy Distribution</span>
                <span className="font-bold text-emerald-700">{metrics.occupied_units || 0} Occ / {metrics.vacant_units || 0} Vac</span>
              </div>
              <div className="flex justify-between py-1.5 font-medium">
                <span className="text-slate-500">Platform Occupancy</span>
                <span className="font-extrabold text-blue-700">{metrics.occupancy_rate || 0}%</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-2">
            <button
              onClick={() => navigateTo('properties')}
              className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-extrabold rounded-lg border border-blue-300 text-center cursor-pointer"
            >
              Properties View
            </button>
            <button
              onClick={() => navigateTo('units')}
              className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-extrabold rounded-lg border border-slate-300 text-center cursor-pointer"
            >
              Units Grid
            </button>
          </div>
        </div>

        {/* LEASING & COMPLIANCE CARD */}
        <div className="p-5 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <h4 className="font-extrabold text-sm text-slate-900">Leasing & Compliance</h4>
              </div>
              <button
                onClick={() => navigateTo('leases')}
                className="text-[11px] font-extrabold text-[#331A6F] hover:underline cursor-pointer"
              >
                Leases →
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 font-medium">
                <span className="text-slate-500">Active Leases</span>
                <span className="font-bold text-emerald-700">{metrics.active_leases || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 font-medium">
                <span className="text-slate-500">Expiring Leases (≤30 Days)</span>
                <span className="font-bold text-amber-700">{metrics.expiring_leases || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 font-medium">
                <span className="text-slate-500">Draft / Expired</span>
                <span className="font-bold text-slate-700">{metrics.draft_leases || 0} Draft / {metrics.expired_leases || 0} Exp</span>
              </div>
              <div className="flex justify-between py-1.5 font-medium">
                <span className="text-slate-500">Document Compliance Rate</span>
                <span className="font-extrabold text-emerald-700">{metrics.compliance_rate || 100}%</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-2">
            <button
              onClick={() => navigateTo('documents')}
              className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-extrabold rounded-lg border border-emerald-300 text-center cursor-pointer"
            >
              Document Vault
            </button>
            <button
              onClick={() => navigateTo('compliance')}
              className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-extrabold rounded-lg border border-amber-300 text-center cursor-pointer"
            >
              Compliance Audit
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: QUICK ACTION SHORTCUTS HUB */}
      <div className="p-5 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#331A6F]" />
            <span>Platform Administration Shortcuts</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">Direct entity drilldown</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            onClick={() => handleQuickAction('create_user')}
            className="p-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#331A6F] border-2 border-black font-extrabold text-xs shadow-[0.5px_0.5px_0_#000] flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer"
          >
            <Users className="w-5 h-5" />
            <span>Add User</span>
          </button>

          <button
            onClick={() => handleQuickAction('create_property')}
            className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border-2 border-black font-extrabold text-xs shadow-[0.5px_0.5px_0_#000] flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer"
          >
            <Building className="w-5 h-5" />
            <span>Add Property</span>
          </button>

          <button
            onClick={() => handleQuickAction('create_lease')}
            className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-2 border-black font-extrabold text-xs shadow-[0.5px_0.5px_0_#000] flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer"
          >
            <FileCheck2 className="w-5 h-5" />
            <span>Create Lease</span>
          </button>

          <button
            onClick={() => navigateTo('payments')}
            className="p-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border-2 border-black font-extrabold text-xs shadow-[0.5px_0.5px_0_#000] flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer"
          >
            <CreditCard className="w-5 h-5" />
            <span>Verify Payments</span>
          </button>

          <button
            onClick={() => navigateTo('maintenance')}
            className="p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-2 border-black font-extrabold text-xs shadow-[0.5px_0.5px_0_#000] flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer"
          >
            <Wrench className="w-5 h-5" />
            <span>Maintenance Hub</span>
          </button>

          <button
            onClick={() => navigateTo('audit_logs')}
            className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 border-2 border-black font-extrabold text-xs shadow-[0.5px_0.5px_0_#000] flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>
    </div>
  );
};
