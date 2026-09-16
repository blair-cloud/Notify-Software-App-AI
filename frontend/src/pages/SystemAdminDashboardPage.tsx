import { TriangularPreloader } from '../components/TriangularPreloader';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { adminService, AdminTabKey } from '../services/adminService';

// Admin Subcomponents
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminHeader } from '../components/admin/AdminHeader';
import { AdminOverviewTab } from '../components/admin/AdminOverviewTab';
import { AdminLandlordsTab } from '../components/admin/AdminLandlordsTab';
import { AdminTenantsTab } from '../components/admin/AdminTenantsTab';
import { AdminUsersRolesTab } from '../components/admin/AdminUsersRolesTab';
import { AdminPropertiesTab } from '../components/admin/AdminPropertiesTab';
import { AdminUnitsTab } from '../components/admin/AdminUnitsTab';
import { AdminLeasesTab } from '../components/admin/AdminLeasesTab';
import { AdminInvoicesTab } from '../components/admin/AdminInvoicesTab';
import { AdminPaymentsTab } from '../components/admin/AdminPaymentsTab';
import { AdminExpensesTab } from '../components/admin/AdminExpensesTab';
import { AdminMaintenanceTab } from '../components/admin/AdminMaintenanceTab';
import { AdminNotificationsTab } from '../components/admin/AdminNotificationsTab';
import { AdminDocumentsTab } from '../components/admin/AdminDocumentsTab';
import { AdminComplianceTab } from '../components/admin/AdminComplianceTab';
import { AdminReportsTab } from '../components/admin/AdminReportsTab';
import { AdminSettingsTab } from '../components/admin/AdminSettingsTab';
import { AdminAuditLogsTab } from '../components/admin/AdminAuditLogsTab';
import { useTabRoute } from '../hooks/useTabRoute';

interface SystemAdminDashboardPageProps {
  onLogout: () => void;
}

const ADMIN_TABS = [
  'overview', 'landlords', 'tenants', 'users_roles', 'properties', 'units',
  'leases', 'invoices', 'payments', 'expenses', 'maintenance', 'notifications',
  'documents', 'compliance', 'reports', 'settings', 'audit_logs',
] as const;

export const SystemAdminDashboardPage: React.FC<SystemAdminDashboardPageProps> = ({ onLogout }) => {
  const { user } = useAuth();
  // Tab state lives in the URL (/admin/<section>).
  const [activeTab, setActiveTab] = useTabRoute<AdminTabKey>('/admin', 'overview', ADMIN_TABS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Platform Data Repositories
  const [metrics, setMetrics] = useState<any>(adminService.getPlatformMetrics());
  const [landlords, setLandlords] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(adminService.getSettings());
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [loadError, setLoadError] = useState<string | null>(null);

  /**
   * Loads the platform view from the API.
   *
   * This screen used to read from in-memory demo fixtures, so every figure was
   * invented and every create/update vanished on refresh. These now come from
   * the database; a system admin is not scoped to one landlord, so the shared
   * list endpoints return the whole platform.
   *
   * Anything that genuinely has no backing endpoint yet (platform settings,
   * audit log, document register, notification templates) still comes from the
   * local demo service and is labelled as such in its tab.
   */
  const refreshAllData = useCallback(async () => {
    setLoadError(null);

    const results = await Promise.allSettled([
      api.admin.getStats(),
      api.admin.getUsers(),
      api.properties.list(),
      api.units.list(),
      api.leases.list(),
      api.invoices.list(),
      api.payments.list(),
      api.expenses.list(),
      api.maintenance.getAllRequests(),
      api.admin.getLandlords(),
      api.admin.getTenants(),
    ]);

    const [statsR, usersR, propsR, unitsR, leasesR, invoicesR, paymentsR, expensesR, maintR, landlordsR, tenantsR] = results;
    const value = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
      r.status === 'fulfilled' ? r.value : fallback;

    const allUsers = value(usersR, [] as any[]);
    setUsersList(allUsers);
    const realLandlords = value(landlordsR, [] as any[]);
    setLandlords(realLandlords.length > 0 ? realLandlords : allUsers.filter((u: any) => u.role === 'LANDLORD'));
    const realTenants = value(tenantsR, [] as any[]);
    setTenants(realTenants.length > 0 ? realTenants : allUsers.filter((u: any) => u.role === 'TENANT'));
    setProperties(value(propsR, [] as any[]));
    setUnits(value(unitsR, [] as any[]));
    setLeases(value(leasesR, [] as any[]));
    setInvoices(value(invoicesR, [] as any[]));
    setPayments(value(paymentsR, [] as any[]));
    setExpenses(value(expensesR, [] as any[]));
    setMaintenance(value(maintR, [] as any[]));

    const stats = value(statsR, null as any);
    if (stats) setMetrics(stats);

    // Still demo-only - no endpoint exists for these yet.
    setNotifications(adminService.getNotifications());
    setDocuments(adminService.getDocuments());
    setSettings(adminService.getSettings());
    setAuditLogs(adminService.getAuditLogs());

    // Report failures instead of quietly showing an empty dashboard.
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length) {
      const first = (failed[0] as PromiseRejectedResult).reason;
      setLoadError(
        `${failed.length} of ${results.length} data sources failed to load. ` +
          `${first?.message || 'Check that you are signed in as a system admin and the API is running.'}`
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await refreshAllData();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshAllData]);

  // Dynamic Badges for Navigation
  const pendingPaymentsCount = payments.filter(
    (p) => p.verification_status === 'PENDING_VERIFICATION' || p.status === 'PENDING' || p.status === 'PENDING_VERIFICATION'
  ).length;

  const urgentMaintenanceCount = maintenance.filter(
    (m) => (m.priority === 'URGENT' || m.priority === 'HIGH') && m.status !== 'RESOLVED'
  ).length;

  const expiringLeasesCount = leases.filter((l) => {
    if (l.status !== 'ACTIVE') return false;
    const end = new Date(l.end_date).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 5;
  }).length;

  const complianceCount = leases.filter((l) => !l.agreement_document && l.status === 'ACTIVE').length;

  const badges = {
    payments: pendingPaymentsCount,
    pendingPayments: pendingPaymentsCount,
    maintenance: urgentMaintenanceCount,
    openMaintenance: urgentMaintenanceCount,
    compliance: complianceCount,
    complianceIssues: complianceCount,
    expiringLeases: expiringLeasesCount,
    totalLandlords: landlords.length,
    totalTenants: tenants.length,
    totalProperties: properties.length,
  };

  const handleNavigate = (tab: AdminTabKey) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="h-screen w-full bg-[#F4F6F9] text-slate-900 font-sans flex flex-col md:flex-row overflow-hidden select-none">
      {/* 17-Section Admin Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        badges={badges}
        userEmail={user?.email || 'admin@notify.test'}
        onLogout={onLogout}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Global Admin Header */}
        <AdminHeader
          user={user}
          onNavigate={handleNavigate}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onRefresh={refreshAllData}
        />

        {/* Dynamic Admin Workspace Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-subtle max-w-7xl w-full mx-auto">
          {loading ? (
            <TriangularPreloader className="my-12" />
          ) : (
            <div className="pb-12">
              {loadError && (
                <div className="mb-5 p-3.5 rounded-[14px] bg-red-50 border-2 border-red-300 text-sm font-semibold text-red-800">
                  {loadError}
                </div>
              )}
              {activeTab === 'overview' && (
                <AdminOverviewTab
                  metrics={metrics}
                  recentPayments={payments}
                  recentLeases={leases}
                  recentMaintenance={maintenance}
                  onNavigate={handleNavigate}
                />
              )}

              {activeTab === 'landlords' && (
                <AdminLandlordsTab
                  landlords={landlords}
                  properties={properties}
                  units={units}
                  onRefresh={refreshAllData}
                  onNavigateToProperty={() => handleNavigate('properties')}
                />
              )}

              {activeTab === 'tenants' && (
                <AdminTenantsTab
                  tenants={tenants}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'users_roles' && (
                <AdminUsersRolesTab
                  users={usersList}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'properties' && (
                <AdminPropertiesTab
                  properties={properties}
                  units={units}
                  landlords={landlords}
                  onRefresh={refreshAllData}
                  onNavigateToUnits={() => handleNavigate('units')}
                />
              )}

              {activeTab === 'units' && (
                <AdminUnitsTab
                  units={units}
                  properties={properties}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'leases' && (
                <AdminLeasesTab
                  leases={leases}
                  properties={properties}
                  units={units}
                  tenants={tenants}
                  landlords={landlords}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'invoices' && (
                <AdminInvoicesTab
                  invoices={invoices}
                  leases={leases}
                  properties={properties}
                  units={units}
                  landlords={landlords}
                  tenants={tenants}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'payments' && (
                <AdminPaymentsTab
                  payments={payments}
                  invoices={invoices}
                  properties={properties}
                  units={units}
                  tenants={tenants}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'expenses' && (
                <AdminExpensesTab
                  expenses={expenses}
                  properties={properties}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'maintenance' && (
                <AdminMaintenanceTab
                  requests={maintenance}
                  properties={properties}
                  tenants={tenants}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'notifications' && (
                <AdminNotificationsTab
                  notifications={notifications}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'documents' && (
                <AdminDocumentsTab
                  documents={documents}
                  properties={properties}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'compliance' && (
                <AdminComplianceTab
                  leases={leases}
                  properties={properties}
                  tenants={tenants}
                  onRefresh={refreshAllData}
                  onNavigateToTab={handleNavigate}
                />
              )}

              {activeTab === 'reports' && (
                <AdminReportsTab
                  metrics={metrics}
                  properties={properties}
                  landlords={landlords}
                  tenants={tenants}
                  invoices={invoices}
                  expenses={expenses}
                />
              )}

              {activeTab === 'settings' && (
                <AdminSettingsTab
                  settings={settings}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'audit_logs' && (
                <AdminAuditLogsTab
                  logs={auditLogs}
                  onRefresh={refreshAllData}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
