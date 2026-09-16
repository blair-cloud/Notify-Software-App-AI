import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Plus,
  ShieldCheck,
  User,
  Users,
  UserCheck,
  Key,
  X,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

interface AdminUsersRolesTabProps {
  users?: any[];
  onRefresh: () => void;
}

export const AdminUsersRolesTab: React.FC<AdminUsersRolesTabProps> = ({ users = [], onRefresh }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SYSTEM_ADMIN' | 'LANDLORD' | 'TENANT'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [targetRole, setTargetRole] = useState<'SYSTEM_ADMIN' | 'LANDLORD' | 'TENANT'>('LANDLORD');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form state
  const [newFirst, setNewFirst] = useState('');
  const [newLast, setNewLast] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('+25078');
  const [newRole, setNewRole] = useState<'SYSTEM_ADMIN' | 'LANDLORD' | 'TENANT'>('LANDLORD');

  const filteredUsers = (users || []).filter((u) => {
    const matchesSearch =
      u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleToggleStatus = async (user: any) => {
    setActionLoading(true);
    setActionError(null);
    try {
      if (user.status === 'ACTIVE' || user.is_active) {
        await api.admin.suspendUser(user.id);
      } else {
        await api.admin.activateUser(user.id);
      }
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirst || !newLast || !newEmail) return;

    setActionLoading(true);
    setActionError(null);
    try {
      await api.admin.createUser({
        first_name: newFirst,
        last_name: newLast,
        email: newEmail,
        phone: newPhone,
        role: newRole,
      });

      setNewFirst('');
      setNewLast('');
      setNewEmail('');
      setNewPhone('+25078');
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create platform user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.admin.updateUserRole(selectedUser.id, targetRole);
      setShowChangeRoleModal(false);
      setSelectedUser(null);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to reassign user role');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-[#331A6F]" />
            <span>Platform User Accounts & Role Permissions</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Manage authenticated accounts, grant administrative rights, enforce account suspensions, and monitor access
          </p>
        </div>

        <button
          onClick={() => {
            setActionError(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#331A6F] text-white text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create Platform User</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Role Distribution Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            System Admins
          </div>
          <div className="text-2xl font-black text-rose-600">
            {users.filter((u) => u.role === 'SYSTEM_ADMIN').length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            Landlords
          </div>
          <div className="text-2xl font-black text-[#331A6F]">
            {users.filter((u) => u.role === 'LANDLORD').length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            Tenants
          </div>
          <div className="text-2xl font-black text-amber-600">
            {users.filter((u) => u.role === 'TENANT').length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            Active Accounts
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {users.filter((u) => u.status === 'ACTIVE' || u.is_active).length}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Role:</span>
          {(['ALL', 'SYSTEM_ADMIN', 'LANDLORD', 'TENANT'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg border-2 border-black transition-all cursor-pointer ${
                roleFilter === r
                  ? 'bg-[#331A6F] text-white shadow-[0.5px_0.5px_0_#000]'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#331A6F] text-white font-extrabold uppercase tracking-wider border-b-2 border-black">
                <th className="p-3.5">User Identity</th>
                <th className="p-3.5">Email & Phone</th>
                <th className="p-3.5 text-center">Assigned Role</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Registered Date</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 font-medium transition-colors">
                    <td className="p-3.5">
                      <div className="font-extrabold text-slate-900 text-sm">
                        {u.first_name} {u.last_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {u.id}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-700">{u.email}</div>
                      <div className="text-[11px] text-slate-400">{u.phone || 'No phone'}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          u.role === 'SYSTEM_ADMIN'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : u.role === 'LANDLORD'
                            ? 'bg-purple-100 text-[#331A6F] border-purple-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          u.status === 'ACTIVE' || u.is_active
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        {u.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center text-slate-500">
                      {new Date(u.created_at || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          disabled={actionLoading}
                          onClick={() => {
                            setSelectedUser(u);
                            setTargetRole(u.role);
                            setActionError(null);
                            setShowChangeRoleModal(true);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#331A6F] font-extrabold text-[11px] rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer disabled:opacity-50"
                        >
                          Change Role
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2 py-1 font-extrabold text-[11px] rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer disabled:opacity-50 ${
                            u.status === 'ACTIVE' || u.is_active
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {u.status === 'ACTIVE' || u.is_active ? 'Suspend' : 'Activate'}
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

      {/* CREATE USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <h3 className="font-extrabold text-base">Create New Platform User</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newFirst}
                    onChange={(e) => setNewFirst(e.target.value)}
                    placeholder="First Name"
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
                    placeholder="Last Name"
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
                  placeholder="user@notify.test"
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Role *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['LANDLORD', 'TENANT', 'SYSTEM_ADMIN'] as const).map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setNewRole(r)}
                      className={`p-2.5 rounded-xl border-2 border-black font-extrabold text-xs transition-all cursor-pointer ${
                        newRole === r
                          ? 'bg-[#331A6F] text-white shadow-[0.5px_0.5px_0_#000]'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {r.replace('_', ' ')}
                    </button>
                  ))}
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
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#331A6F] text-white font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE ROLE MODAL */}
      {showChangeRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <h3 className="font-extrabold text-base">Reassign User Role</h3>
              <button
                onClick={() => setShowChangeRoleModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 text-sm">
                  {selectedUser.first_name} {selectedUser.last_name}
                </div>
                <div className="text-slate-500 font-medium">{selectedUser.email}</div>
                <div className="text-[11px] text-purple-700 font-bold mt-1">
                  Current Role: {selectedUser.role}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-2">Select New Operational Role</label>
                <div className="space-y-2">
                  {(['LANDLORD', 'TENANT', 'SYSTEM_ADMIN'] as const).map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setTargetRole(r)}
                      className={`w-full p-3 rounded-xl border-2 border-black font-extrabold text-xs flex items-center justify-between transition-all cursor-pointer ${
                        targetRole === r
                          ? 'bg-[#331A6F] text-white shadow-[0.5px_0.5px_0_#000]'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{r.replace('_', ' ')}</span>
                      {targetRole === r && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowChangeRoleModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl border-2 border-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleChangeRole}
                  className="px-4 py-2 bg-[#331A6F] text-white font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save New Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
