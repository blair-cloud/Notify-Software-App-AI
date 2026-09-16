import React, { useState } from 'react';
import {
  Home,
  Search,
  Plus,
  Building,
  UserCheck,
  DollarSign,
  Trash2,
  X,
  Edit,
} from 'lucide-react';
import { api } from '../../services/api';

interface AdminUnitsTabProps {
  units: any[];
  properties: any[];
  onRefresh: () => void;
}

export const AdminUnitsTab: React.FC<AdminUnitsTabProps> = ({ units = [], properties = [], onRefresh }) => {
  const [search, setSearch] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OCCUPIED' | 'VACANT'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Live computed metrics
  const totalUnits = (units || []).length;
  const occupiedUnits = (units || []).filter((u) => u.status === 'OCCUPIED').length;
  const vacantUnits = (units || []).filter((u) => u.status === 'VACANT').length;
  const totalRentRoll = (units || []).reduce((sum, u) => sum + (u.monthly_rent || 0), 0);

  // Form State
  const [selectedPropId, setSelectedPropId] = useState(properties?.[0]?.id || '');
  const [unitNumber, setUnitNumber] = useState('');
  const [monthlyRent, setMonthlyRent] = useState(250000);
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);

  const enrichedUnits = (units || []).map((u) => {
    const prop = (properties || []).find((p) => p.id === u.property_id);
    return {
      ...u,
      resolved_property_name: prop ? prop.name : (u.property_name || 'Property'),
      resolved_district: prop ? prop.district : (u.district || 'Kigali'),
    };
  });

  const filtered = enrichedUnits.filter((u) => {
    const matchesSearch =
      u.unit_number?.toLowerCase().includes(search.toLowerCase()) ||
      u.resolved_property_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.landlord_name?.toLowerCase().includes(search.toLowerCase());

    const matchesProp = propertyFilter === 'ALL' || u.property_id === propertyFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

    return matchesSearch && matchesProp && matchesStatus;
  });

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropId || !unitNumber) return;

    setSubmitting(true);
    setActionError(null);
    try {
      await api.units.create({
        property_id: selectedPropId,
        unit_number: unitNumber,
        monthly_rent: Number(monthlyRent),
        rooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
      });

      setUnitNumber('');
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create unit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (confirm('Are you sure you want to delete this unit?')) {
      setActionError(null);
      try {
        await api.units.delete(unitId);
        onRefresh();
      } catch (err: any) {
        setActionError(err.message || 'Cannot delete unit. Check if there are active tenancies or leases.');
      }
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
          <div className="text-[11px] font-extrabold uppercase text-slate-500">Total Units</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalUnits}</div>
          <div className="text-[11px] font-semibold text-slate-600 mt-0.5">Across {properties.length} properties</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-extrabold uppercase text-slate-500">Occupied Units</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{occupiedUnits}</div>
          <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">
            {totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : 0}% occupied
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-extrabold uppercase text-slate-500">Vacant Units</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{vacantUnits}</div>
          <div className="text-[11px] font-semibold text-amber-700 mt-0.5">Available for lease</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-extrabold uppercase text-slate-500">Total Rent Capacity</div>
          <div className="text-2xl font-black text-[#331A6F] mt-1">RWF {totalRentRoll.toLocaleString()}</div>
          <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Sum of unit rents</div>
        </div>
      </div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Home className="w-6 h-6 text-[#331A6F]" />
            <span>Platform Unit Inventory</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Track individual apartments, studios, and suites across all registered properties
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#331A6F] text-white text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Unit</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by unit #, property, tenant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Property Dropdown Filter */}
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold bg-slate-100 border-2 border-black rounded-xl outline-none"
          >
            <option value="ALL">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          {(['ALL', 'OCCUPIED', 'VACANT'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg border-2 border-black transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#331A6F] text-white shadow-[0.5px_0.5px_0_#000]'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Units Table */}
      <div className="rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#331A6F] text-white font-extrabold uppercase tracking-wider border-b-2 border-black">
                <th className="p-3.5">Unit Number</th>
                <th className="p-3.5">Property & District</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Occupant / Tenant</th>
                <th className="p-3.5 text-right">Rent (RWF)</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    No units matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-purple-50/40 font-medium transition-colors">
                    <td className="p-3.5 font-black text-slate-900 text-sm">
                      Unit {u.unit_number}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{u.property_name}</div>
                      <div className="text-[11px] text-slate-400">Landlord: {u.landlord_name}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          u.status === 'OCCUPIED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {u.tenant_name ? (
                        <div className="font-extrabold text-[#331A6F]">{u.tenant_name}</div>
                      ) : (
                        <span className="text-slate-400 italic">No Active Tenant</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-slate-900">
                      RWF {(u.monthly_rent || 0).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleDeleteUnit(u.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer"
                        title="Delete Unit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD UNIT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <h3 className="font-extrabold text-base">Add Unit to Property</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUnit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Property *</label>
                <select
                  required
                  value={selectedPropId}
                  onChange={(e) => setSelectedPropId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.district})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Unit Number / Identifier *</label>
                <input
                  type="text"
                  required
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="e.g. 104, A-2, Penthouse"
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                />
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
                  <label className="block font-bold text-slate-700 mb-1">Bedrooms</label>
                  <input
                    type="number"
                    min={0}
                    value={bedrooms}
                    onChange={(e) => setBedrooms(Number(e.target.value))}
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
                  Add Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
