import React, { useState } from 'react';
import {
  Wrench,
  Search,
  Plus,
  Building,
  Home,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  X,
  Edit,
  DollarSign,
  UserCheck,
  Filter,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

interface AdminMaintenanceTabProps {
  requests?: any[];
  properties?: any[];
  tenants?: any[];
  onRefresh: () => void;
}

export const AdminMaintenanceTab: React.FC<AdminMaintenanceTabProps> = ({
  requests = [],
  properties = [],
  tenants = [],
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'SCHEDULED' | 'RESOLVED' | 'CLOSED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form State
  const [propertyId, setPropertyId] = useState(properties?.[0]?.id || '');
  const [unitId, setUnitId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [category, setCategory] = useState('PLUMBING');

  // Action Form States inside Modal
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveCost, setResolveCost] = useState<string>('');

  // Selected property's units
  const currentProperty = properties.find((p) => p.id === propertyId);
  const currentUnits = currentProperty?.units || [];

  const filtered = (requests || []).filter((r) => {
    const matchesSearch =
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.property_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.unit_number?.toLowerCase().includes(search.toLowerCase()) ||
      r.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.request_number?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || r.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Calculate live metrics
  const totalCount = requests.length;
  const inProgressCount = requests.filter(r => r.status === 'IN_PROGRESS' || r.status === 'SCHEDULED').length;
  const urgentCount = requests.filter(r => (r.priority === 'URGENT' || r.priority === 'HIGH') && r.status !== 'RESOLVED' && r.status !== 'CLOSED').length;
  const resolvedCount = requests.filter(r => r.status === 'RESOLVED' || r.status === 'CLOSED').length;

  const handleAcknowledge = async (reqId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await api.maintenance.acknowledgeRequest(reqId);
      if (selectedReq && selectedReq.id === reqId) {
        setSelectedReq({ ...selectedReq, status: 'ACKNOWLEDGED' });
      }
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to acknowledge maintenance request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkInProgress = async (reqId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await api.maintenance.markInProgress(reqId);
      if (selectedReq && selectedReq.id === reqId) {
        setSelectedReq({ ...selectedReq, status: 'IN_PROGRESS' });
      }
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update to in progress');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (reqId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const cost = resolveCost ? parseFloat(resolveCost) : undefined;
      await api.maintenance.resolveRequest(reqId, {
        landlord_notes: resolveNotes || 'Resolved by System Administrator',
        actual_cost: cost,
      });
      if (selectedReq && selectedReq.id === reqId) {
        setSelectedReq({ ...selectedReq, status: 'RESOLVED', actual_cost: cost || selectedReq.actual_cost });
      }
      setResolveNotes('');
      setResolveCost('');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to resolve maintenance ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !title) return;

    setActionLoading(true);
    setActionError(null);
    try {
      await api.maintenance.createRequest({
        property_id: propertyId,
        unit_id: unitId || undefined,
        title,
        description,
        priority,
        category,
      });

      setTitle('');
      setDescription('');
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create work order');
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
            <Wrench className="w-6 h-6 text-indigo-600" />
            <span>Platform Maintenance & Work Order Management</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Repair requests, technician dispatches, emergency repairs, and property preservation
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
          <span>New Work Order</span>
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tickets</span>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalCount}</div>
          <div className="text-[11px] font-bold text-slate-400 mt-0.5">Across all properties</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Progress</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">{inProgressCount}</div>
          <div className="text-[11px] font-bold text-amber-600 mt-0.5">Dispatched or active</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Urgent / High</span>
            <div className="p-2 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 mt-2">{urgentCount}</div>
          <div className="text-[11px] font-bold text-rose-500 mt-0.5">Requires immediate attention</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resolved</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{resolvedCount}</div>
          <div className="text-[11px] font-bold text-emerald-600 mt-0.5">Successfully closed</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tickets by title, property, unit, tenant, or request number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <span className="text-xs font-bold text-slate-500">Status:</span>
          {(['ALL', 'SUBMITTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg border-2 border-black transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-[0.5px_0.5px_0_#000]'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Maintenance Table */}
      <div className="rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#331A6F] text-white font-extrabold uppercase tracking-wider border-b-2 border-black">
                <th className="p-3.5">Ticket # / Category</th>
                <th className="p-3.5">Property & Unit</th>
                <th className="p-3.5">Tenant</th>
                <th className="p-3.5">Reported Issue</th>
                <th className="p-3.5 text-center">Priority</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No maintenance tickets found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-indigo-50/40 font-medium transition-colors">
                    <td className="p-3.5">
                      <div className="font-black text-slate-900 text-xs">{r.request_number || r.id?.slice(0, 8)}</div>
                      <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {r.category || 'GENERAL'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{r.property_name || 'Property'}</div>
                      <div className="text-[10px] text-purple-700 font-bold">Unit {r.unit_number || 'N/A'}</div>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700">
                      {r.tenant_name || 'Tenant'}
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <div className="font-bold text-slate-900 truncate">{r.title}</div>
                      <div className="text-[11px] text-slate-500 truncate">{r.description}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          r.priority === 'URGENT'
                            ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                            : r.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-blue-100 text-blue-800 border-blue-300'
                        }`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          r.status === 'RESOLVED' || r.status === 'CLOSED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : r.status === 'IN_PROGRESS' || r.status === 'SCHEDULED'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {r.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 text-[11px]">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => {
                          setSelectedReq(r);
                          setActionError(null);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#331A6F] font-extrabold text-[11px] rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedReq && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <div>
                <h3 className="font-extrabold text-base">Work Order {selectedReq.request_number || selectedReq.id?.slice(0, 8)}</h3>
                <div className="text-xs text-purple-200">
                  {selectedReq.property_name} (Unit {selectedReq.unit_number || 'N/A'})
                </div>
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-sm">{selectedReq.title}</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded border border-slate-300 bg-white">
                    {selectedReq.category}
                  </span>
                </div>
                <div className="text-slate-600">{selectedReq.description}</div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-500 text-[11px]">
                  <span>Tenant: <b>{selectedReq.tenant_name || 'N/A'}</b></span>
                  <span>Status: <b className="text-indigo-700">{selectedReq.status}</b></span>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="space-y-3">
                <label className="block font-bold text-slate-700">Quick Workflow Actions</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={actionLoading || selectedReq.status === 'ACKNOWLEDGED' || selectedReq.status === 'IN_PROGRESS' || selectedReq.status === 'RESOLVED' || selectedReq.status === 'CLOSED'}
                    onClick={() => handleAcknowledge(selectedReq.id)}
                    className="p-2.5 rounded-xl border-2 border-black font-extrabold text-xs transition-all bg-indigo-50 hover:bg-indigo-100 text-indigo-900 disabled:opacity-40 cursor-pointer"
                  >
                    1. Acknowledge
                  </button>
                  <button
                    disabled={actionLoading || selectedReq.status === 'IN_PROGRESS' || selectedReq.status === 'RESOLVED' || selectedReq.status === 'CLOSED'}
                    onClick={() => handleMarkInProgress(selectedReq.id)}
                    className="p-2.5 rounded-xl border-2 border-black font-extrabold text-xs transition-all bg-amber-50 hover:bg-amber-100 text-amber-900 disabled:opacity-40 cursor-pointer"
                  >
                    2. Mark In Progress
                  </button>
                </div>
              </div>

              {/* Resolve Section */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800">Resolve Work Order</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Actual cost (RWF)"
                    value={resolveCost}
                    onChange={(e) => setResolveCost(e.target.value)}
                    className="p-2 bg-white border border-slate-300 rounded-lg text-xs outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Resolution notes"
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    className="p-2 bg-white border border-slate-300 rounded-lg text-xs outline-none"
                  />
                </div>
                <button
                  disabled={actionLoading || selectedReq.status === 'RESOLVED' || selectedReq.status === 'CLOSED'}
                  onClick={() => handleResolve(selectedReq.id)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] disabled:opacity-40 cursor-pointer transition-all"
                >
                  {actionLoading ? 'Processing...' : 'Mark as Resolved'}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedReq(null)}
                  className="px-4 py-2 bg-white text-slate-800 font-bold rounded-xl border-2 border-black cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE WORK ORDER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <h3 className="font-extrabold text-base">Create Maintenance Work Order</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4 text-xs">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Property *</label>
                  <select
                    required
                    value={propertyId}
                    onChange={(e) => {
                      setPropertyId(e.target.value);
                      setUnitId('');
                    }}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  >
                    <option value="">Select Property</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.district || p.city || 'Property'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit (Optional)</label>
                  <select
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  >
                    <option value="">All / Common Area</option>
                    {currentUnits.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        Unit {u.unit_number}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Work Order Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Water heater leakage in bathroom"
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  >
                    <option value="PLUMBING">Plumbing</option>
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="HVAC">HVAC / Air Con</option>
                    <option value="STRUCTURAL">Structural / Roofing</option>
                    <option value="APPLIANCE">Appliance</option>
                    <option value="GENERAL">General Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority Level *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent (Emergency)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Detailed Description *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide complete repair instructions, contractor dispatch details..."
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
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#331A6F] text-white font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Creating...' : 'Create Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
