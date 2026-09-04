import React from 'react';
import {
  BarChart3,
  Users,
  UserCheck,
  ShieldAlert,
  Building,
  Home,
  FileCheck2,
  Receipt,
  CreditCard,
  TrendingDown,
  Wrench,
  Bell,
  FolderOpen,
  CheckCircle2,
  FileSpreadsheet,
  Settings,
  History,
  LogOut,
  X,
} from 'lucide-react';
import { AdminTabKey } from '../../services/adminService';
export type { AdminTabKey };

export interface AdminSidebarProps {
  activeTab: AdminTabKey;
  onSelectTab?: (tab: AdminTabKey) => void;
  setActiveTab?: (tab: AdminTabKey) => void;
  onLogout: () => void;
  currentUserEmail?: string;
  userEmail?: string;
  badgeCounts?: {
    pendingPayments?: number;
    openMaintenance?: number;
    expiringLeases?: number;
    complianceIssues?: number;
    totalLandlords?: number;
    totalTenants?: number;
    totalProperties?: number;
    payments?: number;
    maintenance?: number;
    compliance?: number;
  };
  badges?: {
    pendingPayments?: number;
    openMaintenance?: number;
    expiringLeases?: number;
    complianceIssues?: number;
    totalLandlords?: number;
    totalTenants?: number;
    totalProperties?: number;
    payments?: number;
    maintenance?: number;
    compliance?: number;
  };
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

interface SidebarSection {
  title: string;
  items: {
    key: AdminTabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  setActiveTab,
  onLogout,
  currentUserEmail,
  userEmail,
  badgeCounts,
  badges,
  mobileOpen,
  setMobileOpen,
}) => {
  const effectiveEmail = currentUserEmail || userEmail || 'admin@notify.test';
  const effectiveBadges = badgeCounts || badges || {};

  const handleTabClick = (tab: AdminTabKey) => {
    if (onSelectTab) onSelectTab(tab);
    if (setActiveTab) setActiveTab(tab);
    if (setMobileOpen) setMobileOpen(false);
  };

  const sections: SidebarSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        {
          key: 'overview',
          label: 'Platform Overview',
          icon: BarChart3,
        },
      ],
    },
    {
      title: 'PEOPLE',
      items: [
        {
          key: 'landlords',
          label: 'Landlords',
          icon: Users,
          badge: effectiveBadges?.totalLandlords,
        },
        {
          key: 'tenants',
          label: 'Tenants',
          icon: UserCheck,
          badge: effectiveBadges?.totalTenants,
        },
        {
          key: 'users_roles',
          label: 'Users & Roles',
          icon: ShieldAlert,
        },
      ],
    },
    {
      title: 'PROPERTIES',
      items: [
        {
          key: 'properties',
          label: 'Properties',
          icon: Building,
          badge: effectiveBadges?.totalProperties,
        },
        {
          key: 'units',
          label: 'Units',
          icon: Home,
        },
      ],
    },
    {
      title: 'LEASING',
      items: [
        {
          key: 'leases',
          label: 'Leases',
          icon: FileCheck2,
          badge: effectiveBadges?.expiringLeases && effectiveBadges.expiringLeases > 0 ? effectiveBadges.expiringLeases : undefined,
          badgeColor: 'bg-amber-400 text-black',
        },
        {
          key: 'invoices',
          label: 'Invoices',
          icon: Receipt,
        },
      ],
    },
    {
      title: 'FINANCE',
      items: [
        {
          key: 'payments',
          label: 'Payments & Verification',
          icon: CreditCard,
          badge: (effectiveBadges?.pendingPayments ?? effectiveBadges?.payments) && (effectiveBadges?.pendingPayments ?? effectiveBadges?.payments)! > 0
            ? (effectiveBadges?.pendingPayments ?? effectiveBadges?.payments)
            : undefined,
          badgeColor: 'bg-rose-500 text-white animate-pulse',
        },
        {
          key: 'expenses',
          label: 'Expenses',
          icon: TrendingDown,
        },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        {
          key: 'maintenance',
          label: 'Maintenance',
          icon: Wrench,
          badge: (effectiveBadges?.openMaintenance ?? effectiveBadges?.maintenance) && (effectiveBadges?.openMaintenance ?? effectiveBadges?.maintenance)! > 0
            ? (effectiveBadges?.openMaintenance ?? effectiveBadges?.maintenance)
            : undefined,
          badgeColor: 'bg-indigo-400 text-black',
        },
        {
          key: 'notifications',
          label: 'Notifications',
          icon: Bell,
        },
      ],
    },
    {
      title: 'DOCUMENTS & COMPLIANCE',
      items: [
        {
          key: 'documents',
          label: 'Documents',
          icon: FolderOpen,
        },
        {
          key: 'compliance',
          label: 'Compliance',
          icon: CheckCircle2,
          badge: (effectiveBadges?.complianceIssues ?? effectiveBadges?.compliance) && (effectiveBadges?.complianceIssues ?? effectiveBadges?.compliance)! > 0
            ? (effectiveBadges?.complianceIssues ?? effectiveBadges?.compliance)
            : undefined,
          badgeColor: 'bg-amber-400 text-black',
        },
      ],
    },
    {
      title: 'ANALYTICS',
      items: [
        {
          key: 'reports',
          label: 'Reports & Analytics',
          icon: FileSpreadsheet,
        },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        {
          key: 'settings',
          label: 'Platform Settings',
          icon: Settings,
        },
        {
          key: 'audit_logs',
          label: 'Audit Logs',
          icon: History,
        },
      ],
    },
  ];

  const sidebarContent = (
    <div className="w-64 h-full bg-[#1A0B2E] text-slate-100 flex flex-col border-r border-purple-950/40 select-none shrink-0">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-purple-900/40 bg-[#140824] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src="/src/assets/images/white_logo.png" alt="Notify" className="h-9 w-auto object-contain" />
        </div>
        {setMobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 text-purple-300 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin scrollbar-thumb-purple-900 scrollbar-track-transparent">
        {sections.map((sec) => (
          <div key={sec.title} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-extrabold text-purple-300/60 uppercase tracking-wider">
              {sec.title}
            </div>
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleTabClick(item.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#1A0B2E] border-2 border-black shadow-[0.5px_0.5px_0_#000]'
                        : 'text-purple-100/90 hover:bg-white/10 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#331A6F] stroke-[2.5]' : 'text-purple-300'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`ml-2 px-1.5 py-0.5 text-[10px] font-black rounded-full border border-black ${
                          item.badgeColor || (isActive ? 'bg-[#331A6F] text-white' : 'bg-purple-800 text-purple-200')
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-purple-900/40 bg-[#140824] shrink-0 space-y-2">
        <div className="px-2 py-1 flex items-center justify-between text-[11px] text-purple-300">
          <div className="truncate">
            <div className="font-bold text-white text-xs truncate">{effectiveEmail}</div>
            <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
              <span>Full Admin Access</span>
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-500/90 text-white font-extrabold text-xs border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:bg-red-600 hover:shadow-[0.5px_0.5px_0_#000] transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex h-full shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative h-full animate-slideRight">
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={() => setMobileOpen?.(false)} />
        </div>
      )}
    </>
  );
};

