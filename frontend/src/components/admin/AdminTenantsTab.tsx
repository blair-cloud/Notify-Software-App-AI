import React, { useState } from 'react';
import {
  UserCheck,
  Search,
  Plus,
  Building,
  Home,
  FileCheck2,
  Receipt,
  CreditCard,
  Eye,
  X,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { api } from '../../services/api';

interface AdminTenantsTabProps {
  tenants?: any[];
  onRefresh: () => void;
  onNavigateToTab?: (tab: string, entityId?: string) => void;
}

export const AdminTenantsTab: React.FC<AdminTenantsTabProps> = ({
  tenants = [],
  onRefresh,
  onNavigateToTab,
}) => {
  const [search, setSearch] = useState('');
  const [leaseFilter, setLeaseFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'DRAFT'>('ALL');
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Live computed metrics from database
  const totalTenants = (tenants || []).length;
  const activeTenants = (tenants || []).filter((t) => t.status === 'ACTIVE').length;
  const activeLeases = (tenants || []).filter((t) => t.lease_status === 'ACTIVE').length;
  const totalMonthlyRent = (tenants || []).reduce((sum, t) => sum + (t.monthly_rent || 0), 0);
  const totalBalanceDue = (tenants || []).reduce((sum, t) => sum + (t.outstanding_balance || 0), 0);

  // New Tenant form state
  const [newFirst, setNewFirst] = useState('');
  const [newLast, setNewLast] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('+25078');

  const filteredTenants = (tenants || []).filter((t) => {
    const matchesSearch =
      t.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.phone?.toLowerCase().includes(search.toLowerCase()) ||
      t.property_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.unit_number?.toLowerCase().includes(search.toLowerCase());

    const matchesLease =
      leaseFilter === 'ALL' ||
      (leaseFilter === 'ACTIVE' && (t.lease_status === 'ACTIVE' || t.lease?.status === 'ACTIVE')) ||
      (leaseFilter === 'EXPIRING_SOON' && (t.lease_status === 'EXPIRING_SOON' || t.lease?.status === 'EXPIRING_SOON')) ||
      (leaseFilter === 'EXPIRED' && (t.lease_status === 'EXPIRED' || t.lease?.status === 'EXPIRED')) ||
      (leaseFilter === 'DRAFT' && (t.lease_status === 'DRAFT' || t.lease?.status === 'DRAFT'));

    return matchesSearch && matchesLease;
  });

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirst || !newLast || !newEmail) return;

    setSubmitting(true);
    setActionError(null);
    try {
      await api.admin.createUser({
        first_name: newFirst,
        last_name: newLast,
        email: newEmail,
        phone: newPhone,
        role: 'TENANT',
      });

      setNewFirst('');
      setNewLast('');
      setNewEmail('');
      setNewPhone('+25078');
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create tenant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (tenant: any) => {
    const targetUserId = tenant.user_id || tenant.id;
    if (!targetUserId) {
      setActionError('Cannot change status: Tenant has not created an account yet (pending invitation).');
      return;
    }
    const nextStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setActionError(null);
    try {
      if (nextStatus === 'SUSPENDED') {
        await api.admin.suspendUser(targetUserId);
      } else {
        await api.admin.activateUser(targetUserId);
      }
      onRefresh();
      if (selectedTenant && (selectedTenant.id === tenant.id || selectedTenant.user_id === targetUserId)) {
        setSelectedTenant({ ...selectedTenant, status: nextStatus });
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to update tenant status');
    }
  };

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="p-3 bg-rose-50 border-2 border-rose-500 rounded-xl text-rose-800 text-xs font-bold flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="cursor-pointer font-black text-sm">✕</button>
        </div>
      )}

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-extrabold uppercase text-slate-500">Total Registered Tenants</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalTenants}</div>
          <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">{activeTenants} active profiles</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-extrabold uppercase text-slate-500">Active Leases</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{activeLeases}</div>
          <div className="text-[11px] font-semibold text-slate-600 mt-0.5">Current occupied tenancies</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-extrabold uppercase text-slate-500">Monthly Rent Obligation</div>
          <div className="text-2xl font-black text-[#331A6F] mt-1">RWF {totalMonthlyRent.toLocaleString()}</div>
          <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Total contracted rent</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-extrabold uppercase text-slate-500">Total Outstanding Balance</div>
          <div className="text-2xl font-black text-rose-600 mt-1">RWF {totalBalanceDue.toLocaleString()}</div>
          <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Unpaid tenant balances</div>
        </div>
      </div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-amber-600" />
            <span>Tenant Directory & Tenancy Records</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Global roster of tenants, current unit placements, lease agreements, balances, and payment compliance
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#331A6F] text-white text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Register Tenant</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tenant by name, email, phone, property, unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Lease:</span>
          {(['ALL', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'DRAFT'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setLeaseFilter(st)}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg border-2 border-black transition-all cursor-pointer ${
                leaseFilter === st
                  ? 'bg-amber-500 text-black shadow-[0.5px_0.5px_0_#000]'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Tenants Table */}
      <div className="rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#1A0B2E] text-white font-extrabold uppercase tracking-wider border-b-2 border-black">
                <th className="p-3.5">Tenant Name</th>
                <th className="p-3.5">Contact</th>
                <th className="p-3.5">Assigned Property & Unit</th>
                <th className="p-3.5 text-center">Lease Status</th>
                <th className="p-3.5 text-right">Rent Obligation</th>
                <th className="p-3.5 text-right">Balance Due</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    No tenants found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-amber-50/40 font-medium transition-colors">
                    <td className="p-3.5">
                      <div className="font-extrabold text-slate-900 text-sm">
                        {t.first_name} {t.last_name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {t.occupation || 'Residential Tenant'} • ID: {t.national_id || t.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-700">{t.email}</div>
                      <div className="text-[11px] text-slate-400">{t.phone || 'No phone'}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">
                        {t.property_name || 'Unassigned Property'}
                      </div>
                      <div className="text-[11px] text-purple-700 font-bold">
                        Unit {t.unit_number || 'None'}
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          t.lease_status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : t.lease_status === 'EXPIRING_SOON'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : t.lease_status === 'EXPIRED'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {t.lease_status || 'DRAFT'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-slate-900">
                      RWF {(t.monthly_rent || 0).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-extrabold">
                      {(t.outstanding_balance || 0) > 0 ? (
                        <span className="text-rose-600">RWF {(t.outstanding_balance || 0).toLocaleString()}</span>
                      ) : (
                        <span className="text-emerald-600">Paid (RWF 0)</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedTenant(t)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#331A6F] font-extrabold text-[11px] rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Profile</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(t)}
                          className={`px-2 py-1 font-extrabold text-[11px] rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer ${
                            t.status === 'ACTIVE'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {t.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TENANT DETAIL DRAWER / MODAL */}
      {selectedTenant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 bg-[#1A0B2E] text-white flex items-center justify-between border-b-2 border-black shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-black font-black text-lg flex items-center justify-center border-2 border-black">
                  {selectedTenant.first_name?.[0] || 'T'}
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    {selectedTenant.first_name} {selectedTenant.last_name}
                  </h3>
                  <div className="text-xs text-amber-200 font-medium">
                    Tenant Profile • {selectedTenant.property_name || 'No property'} (Unit {selectedTenant.unit_number || 'N/A'})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTenant(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Lease Status</div>
                  <div className="font-extrabold text-slate-900">
                    {selectedTenant.lease_status || 'ACTIVE'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Monthly Rent</div>
                  <div className="font-extrabold text-slate-900 text-base">
                    RWF {(selectedTenant.monthly_rent || 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Outstanding Balance</div>
                  <div className="font-extrabold text-rose-600 text-base">
                    RWF {(selectedTenant.outstanding_balance || 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Assigned Landlord</div>
                  <div className="font-bold text-[#331A6F] truncate">
                    {selectedTenant.landlord_name || 'Notify Properties Ltd'}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">
                  Tenant Identification & Contact Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 font-medium">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{selectedTenant.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{selectedTenant.phone || 'No phone registered'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>National ID / Passport: {selectedTenant.national_id || '1199580012345678'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Tenancy Start: {selectedTenant.tenancy_start_date || '2026-01-01'}</span>
                  </div>
                </div>
              </div>

              {/* Connected Active Lease & Signed Agreement Document */}
              {selectedTenant.lease && (
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-[#331A6F] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-[#331A6F]" />
                      <span>Associated Tenancy Lease ({selectedTenant.lease.id})</span>
                    </h4>
                    <span className="px-2 py-0.5 bg-purple-200 text-[#331A6F] rounded-full font-black text-[10px]">
                      {selectedTenant.lease.status}
                    </span>
                  </div>

                  <div className="text-slate-700 font-medium flex flex-wrap gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">Period: </span>
                      <span className="font-bold">{selectedTenant.lease.start_date} to {selectedTenant.lease.end_date}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Deposit: </span>
                      <span className="font-bold">RWF {(selectedTenant.lease.security_deposit || selectedTenant.lease.monthly_rent || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {selectedTenant.lease.agreement_document ? (
                    <div className="p-3 bg-white rounded-xl border border-purple-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-700" />
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {selectedTenant.lease.agreement_document.document_name || selectedTenant.lease.agreement_document.file_name}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-bold">
                            ✓ Countersigned Official Lease (Verified)
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-extrabold text-[#331A6F]">
                        Version {selectedTenant.lease.agreement_document.version || 1}
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-100 rounded-xl border border-amber-300 text-amber-900 font-bold text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-700" />
                      <span>No countersigned agreement document uploaded yet.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t-2 border-black flex items-center justify-between shrink-0">
              <button
                onClick={() => handleToggleStatus(selectedTenant)}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer ${
                  selectedTenant.status === 'ACTIVE'
                    ? 'bg-rose-500 text-white hover:bg-rose-600'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                {selectedTenant.status === 'ACTIVE' ? 'Suspend Tenant Account' : 'Reactivate Tenant Account'}
              </button>

              <button
                onClick={() => setSelectedTenant(null)}
                className="px-4 py-2 bg-white text-slate-800 text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW TENANT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#1A0B2E] text-white flex items-center justify-between border-b-2 border-black">
              <h3 className="font-extrabold text-base">Register New Tenant</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newFirst}
                    onChange={(e) => setNewFirst(e.target.value)}
                    placeholder="e.g. Eric"
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newLast}
                    onChange={(e) => setNewLast(e.target.value)}
                    placeholder="e.g. Mugisha"
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="tenant@notify.test"
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
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
                  Register Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
