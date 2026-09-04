import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
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

interface SystemAdminDashboardPageProps {
  onLogout: () => void;
}

export const SystemAdminDashboardPage: React.FC<SystemAdminDashboardPageProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTabKey>('overview');
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

  const refreshAllData = useCallback(() => {
    setMetrics(adminService.getPlatformMetrics());
    setLandlords(adminService.getLandlords());
    setTenants(adminService.getTenants());
    setUsersList(adminService.getUsers());
    setProperties(adminService.getProperties());
    setUnits(adminService.getUnits());
    setLeases(adminService.getLeases());
    setInvoices(adminService.getInvoices());
    setPayments(adminService.getPayments());
    setExpenses(adminService.getExpenses());
    setMaintenance(adminService.getMaintenanceRequests());
    setNotifications(adminService.getNotifications());
    setDocuments(adminService.getDocuments());
    setSettings(adminService.getSettings());
    setAuditLogs(adminService.getAuditLogs());
  }, []);

  useEffect(() => {
    refreshAllData();
    setLoading(false);
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
    const now = new Date('2026-08-17').getTime();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
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
            <div className="p-12 text-center text-slate-500 font-medium">
              Loading Platform Administration Center...
            </div>
          ) : (
            <div className="pb-12">
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
                  onRefresh={refreshAllData}
                  onNavigateToProperties={() => handleNavigate('properties')}
                />
              )}

              {activeTab === 'tenants' && (
                <AdminTenantsTab
                  tenants={tenants}
                  properties={properties}
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
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'payments' && (
                <AdminPaymentsTab
                  payments={payments}
                  invoices={invoices}
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
