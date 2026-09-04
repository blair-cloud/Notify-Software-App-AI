import React, { useState } from 'react';
import {
  FileCheck2,
  Search,
  Plus,
  Building,
  Home,
  UserCheck,
  FileText,
  Calendar,
  AlertTriangle,
  Eye,
  X,
  CheckCircle,
  FileWarning,
} from 'lucide-react';
import { adminService } from '../../services/adminService';

interface AdminLeasesTabProps {
  leases?: any[];
  properties?: any[];
  units?: any[];
  tenants?: any[];
  landlords?: any[];
  onRefresh: () => void;
}

export const AdminLeasesTab: React.FC<AdminLeasesTabProps> = ({
  leases = [],
  properties = [],
  units = [],
  tenants = [],
  landlords = [],
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'TERMINATED' | 'DRAFT'>('ALL');
  const [selectedLease, setSelectedLease] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State for Create Lease
  const [tenantId, setTenantId] = useState(tenants?.[0]?.id || '');
  const [unitId, setUnitId] = useState(units?.[0]?.id || '');
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2027-07-31');
  const [monthlyRent, setMonthlyRent] = useState(300000);
  const [deposit, setDeposit] = useState(300000);

  const filtered = (leases || []).filter((l) => {
    const matchesSearch =
      l.id?.toLowerCase().includes(search.toLowerCase()) ||
      l.property_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.landlord_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.unit_number?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreateLease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !unitId) return;

    adminService.createLease({
      tenant_id: tenantId,
      unit_id: unitId,
      start_date: startDate,
      end_date: endDate,
      monthly_rent: Number(monthlyRent),
      security_deposit: Number(deposit),
    });

    setShowAddModal(false);
    onRefresh();
  };

  const handleTerminateLease = (leaseId: string) => {
    if (confirm('Are you sure you want to terminate this lease? The unit will become vacant.')) {
      adminService.terminateLease(leaseId);
      if (selectedLease && selectedLease.id === leaseId) {
        setSelectedLease(null);
      }
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileCheck2 className="w-6 h-6 text-emerald-600" />
            <span>Platform Leases & Tenancy Contracts</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Active and archived lease agreements, term compliance, security deposits, and countersigned legal files
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#331A6F] text-white text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Issue New Lease</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leases by tenant, landlord, property, unit, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Status:</span>
          {(['ALL', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'TERMINATED', 'DRAFT'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg border-2 border-black transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-[0.5px_0.5px_0_#000]'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Leases Table */}
      <div className="rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#331A6F] text-white font-extrabold uppercase tracking-wider border-b-2 border-black">
                <th className="p-3.5">Lease Contract</th>
                <th className="p-3.5">Property & Unit</th>
                <th className="p-3.5">Tenant & Landlord</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Term Period</th>
                <th className="p-3.5 text-right">Rent / Deposit</th>
                <th className="p-3.5 text-center">Agreement File</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No lease contracts matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-emerald-50/40 font-medium transition-colors">
                    <td className="p-3.5">
                      <div className="font-extrabold text-slate-900 text-xs">{l.id}</div>
                      <div className="text-[10px] text-slate-400">Created: {l.start_date}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{l.property_name}</div>
                      <div className="text-[11px] text-purple-700 font-bold">Unit {l.unit_number}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-extrabold text-slate-900">{l.tenant_name}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">Landlord: {l.landlord_name}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          l.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : l.status === 'EXPIRING_SOON'
                            ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                            : l.status === 'EXPIRED'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 text-[11px]">
                      <div>{l.start_date}</div>
                      <div className="text-slate-400">to {l.end_date}</div>
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-slate-900">
                      <div>RWF {(l.monthly_rent || 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/mo</span></div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        Deposit: RWF {(l.security_deposit || l.monthly_rent || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      {l.agreement_document ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Signed PDF</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <FileWarning className="w-3 h-3 text-amber-600" />
                          <span>Missing</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedLease(l)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#331A6F] font-extrabold text-[11px] rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                        {l.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleTerminateLease(l.id)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-[11px] rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer"
                          >
                            Terminate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LEASE DETAIL MODAL */}
      {selectedLease && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black shrink-0">
              <div>
                <h3 className="font-extrabold text-base">Lease Agreement {selectedLease.id}</h3>
                <div className="text-xs text-purple-200">
                  {selectedLease.property_name} • Unit {selectedLease.unit_number}
                </div>
              </div>
              <button
                onClick={() => setSelectedLease(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Status</div>
                  <div className="font-extrabold text-slate-900">{selectedLease.status}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Monthly Rent</div>
                  <div className="font-extrabold text-emerald-600 text-sm">
                    RWF {(selectedLease.monthly_rent || 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Security Deposit</div>
                  <div className="font-extrabold text-slate-900 text-sm">
                    RWF {(selectedLease.security_deposit || selectedLease.monthly_rent || 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Tenancy Duration</div>
                  <div className="font-extrabold text-slate-900">12 Months</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Tenant Name:</span>
                  <span className="font-bold text-slate-900">{selectedLease.tenant_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Landlord / Owner:</span>
                  <span className="font-bold text-[#331A6F]">{selectedLease.landlord_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Lease Start Date:</span>
                  <span className="font-bold text-slate-900">{selectedLease.start_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Lease Expiry Date:</span>
                  <span className="font-bold text-slate-900">{selectedLease.end_date}</span>
                </div>
              </div>

              {/* Agreement Document Section */}
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-2">
                <h4 className="font-extrabold text-[#331A6F] uppercase tracking-wider text-[11px]">
                  Countersigned Legal Document
                </h4>
                {selectedLease.agreement_document ? (
                  <div className="p-3 bg-white rounded-xl border border-purple-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#331A6F]" />
                      <div>
                        <div className="font-bold text-slate-900">
                          {selectedLease.agreement_document.document_name || selectedLease.agreement_document.file_name}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-bold">
                          ✓ Signed & Digitally Verified (Version {selectedLease.agreement_document.version || 1})
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-black rounded-lg text-[10px]">
                      Compliant
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-100 rounded-xl border border-amber-300 text-amber-900 font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>No countersigned agreement file uploaded for this lease.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t-2 border-black flex justify-between shrink-0">
              {selectedLease.status === 'ACTIVE' && (
                <button
                  onClick={() => handleTerminateLease(selectedLease.id)}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer"
                >
                  Terminate Lease Contract
                </button>
              )}
              <button
                onClick={() => setSelectedLease(null)}
                className="px-4 py-2 bg-white text-slate-800 font-bold text-xs rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE LEASE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <h3 className="font-extrabold text-base">Issue New Tenancy Lease</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLease} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Tenant *</label>
                <select
                  required
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign Unit *</label>
                <select
                  required
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      Unit {u.unit_number} - {u.property_name} ({u.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lease Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lease End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monthly Rent (RWF) *</label>
                  <input
                    type="number"
                    min={10000}
                    step={10000}
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Security Deposit (RWF)</label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={deposit}
                    onChange={(e) => setDeposit(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  />
                </div>
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
                  Create & Activate Lease
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
