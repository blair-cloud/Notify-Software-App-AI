import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  ShieldCheck,
  Building,
  UserCheck,
  Send,
  Upload,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { adminService } from '../../services/adminService';

interface AdminComplianceTabProps {
  leases?: any[];
  properties?: any[];
  tenants?: any[];
  onRefresh: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const AdminComplianceTab: React.FC<AdminComplianceTabProps> = ({
  leases = [],
  properties = [],
  tenants = [],
  onRefresh,
  onNavigateToTab,
}) => {
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);

  // Find compliance flags
  const missingAgreementLeases = (leases || []).filter((l) => !l.agreement_document && l.status === 'ACTIVE');
  const expiringSoonLeases = (leases || []).filter((l) => l.status === 'EXPIRING_SOON');
  const missingIdTenants = (tenants || []).filter((t) => !t.national_id);

  const totalComplianceIssues =
    missingAgreementLeases.length + expiringSoonLeases.length + missingIdTenants.length - resolvedIds.length;

  const handleResolve = (issueKey: string, leaseId?: string) => {
    setResolvedIds((prev) => [...prev, issueKey]);
    if (leaseId) {
      adminService.uploadDocument({
        document_name: `Countersigned_Lease_${leaseId}.pdf`,
        category: 'LEASE_AGREEMENT',
        entity_type: 'LEASE',
        entity_id: leaseId,
        file_url: `/documents/countersigned_lease_${leaseId}.pdf`,
      });
      onRefresh();
    }
  };

  const handleSendReminder = (tenantName: string) => {
    adminService.sendBroadcastNotification({
      title: 'Compliance Reminder: Action Required',
      message: `Dear ${tenantName}, please complete your KYC and countersign your tenancy agreement on Notify.`,
      target_audience: 'TENANT',
    });
    alert(`Compliance reminder notification dispatched to ${tenantName}.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-amber-600" />
            <span>Platform Regulatory & Tenancy Compliance Center</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Automated compliance auditor for active leases, required legal documentation, identity verification, and tax rules
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-2 rounded-xl font-black text-xs border-2 border-black shadow-[0.5px_0.5px_0_#000] flex items-center gap-2 ${
              totalComplianceIssues === 0
                ? 'bg-emerald-100 text-emerald-900'
                : 'bg-amber-100 text-amber-900'
            }`}
          >
            {totalComplianceIssues === 0 ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Fully Compliant</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>{totalComplianceIssues} Active Compliance Warning(s)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Compliance Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Signed Lease Compliance
            </div>
            <FileWarning className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {leases.length - missingAgreementLeases.length} / {leases.length}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            {missingAgreementLeases.length} active leases missing signed document
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Lease Expiry Tracker
            </div>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">
            {expiringSoonLeases.length}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Leases terminating within the next 5 days
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tenant KYC & National ID
            </div>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {tenants.length - missingIdTenants.length} / {tenants.length}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Tenants with verified identification documents
          </div>
        </div>
      </div>

      {/* Compliance Issues Feed */}
      <div className="p-5 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Actionable Regulatory Items</span>
        </h3>

        <div className="space-y-3">
          {/* Missing Lease Documents */}
          {missingAgreementLeases.map((l) => {
            const isResolved = resolvedIds.includes(`lease-${l.id}`);
            if (isResolved) return null;

            return (
              <div
                key={`missing-lease-${l.id}`}
                className="p-4 rounded-xl bg-rose-50/60 border-2 border-rose-200 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                    <FileWarning className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">
                      Missing Countersigned Agreement for Lease #{l.id}
                    </div>
                    <div className="text-slate-600 mt-0.5 font-medium">
                      Tenant: <span className="font-bold">{l.tenant_name}</span> • Property: <span className="font-bold">{l.property_name} (Unit {l.unit_number})</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSendReminder(l.tenant_name)}
                    className="px-3 py-1.5 bg-white text-slate-800 font-extrabold rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:bg-slate-50 cursor-pointer flex items-center gap-1"
                  >
                    <Send className="w-3 h-3 text-[#331A6F]" />
                    <span>Send Reminder</span>
                  </button>

                  <button
                    onClick={() => handleResolve(`lease-${l.id}`, l.id)}
                    className="px-3 py-1.5 bg-emerald-600 text-white font-extrabold rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:bg-emerald-700 cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>Attach Signed PDF</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Expiring Soon Leases */}
          {expiringSoonLeases.map((l) => (
            <div
              key={`expiring-${l.id}`}
              className="p-4 rounded-xl bg-amber-50/60 border-2 border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">
                    Tenancy Agreement Expiring Soon (Ends {l.end_date})
                  </div>
                  <div className="text-slate-600 mt-0.5 font-medium">
                    Tenant: <span className="font-bold">{l.tenant_name}</span> • Landlord: <span className="font-bold">{l.landlord_name}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSendReminder(l.tenant_name)}
                  className="px-3 py-1.5 bg-[#331A6F] text-white font-extrabold rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:bg-[#251352] cursor-pointer flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Prompt Renewal Notice</span>
                </button>
              </div>
            </div>
          ))}

          {totalComplianceIssues === 0 && (
            <div className="p-8 text-center bg-emerald-50 rounded-xl border border-emerald-200">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="font-extrabold text-emerald-900 text-sm">All Platform Compliance Criteria Met</div>
              <div className="text-xs text-emerald-700 mt-0.5 font-medium">
                Every tenant has a verified signed lease, valid KYC details, and clear rental standing.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
