import React, { useState } from 'react';
import {
  Building,
  Search,
  Plus,
  Home,
  Users,
  MapPin,
  DollarSign,
  Eye,
  Trash2,
  X,
  ExternalLink,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { api } from '../../services/api';

interface AdminPropertiesTabProps {
  properties: any[];
  units?: any[];
  landlords: any[];
  onRefresh: () => void;
  onNavigateToUnits?: (propertyId: string) => void;
}

export const AdminPropertiesTab: React.FC<AdminPropertiesTabProps> = ({
  properties = [],
  units = [],
  landlords = [],
  onRefresh,
  onNavigateToUnits,
}) => {
  const [search, setSearch] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Live computed metrics from database
  const totalProperties = (properties || []).length;
  const totalUnits = (units || []).length;
  const occupiedUnits = (units || []).filter((u) => u.status === 'OCCUPIED').length;
  const vacantUnits = (units || []).filter((u) => u.status === 'VACANT').length;

  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('Gasabo');
  const [landlordId, setLandlordId] = useState(landlords?.[0]?.id || landlords?.[0]?.landlord_id || '');
  const [numUnits, setNumUnits] = useState(4);
  const [baseRent, setBaseRent] = useState(250000);

  const filtered = (properties || []).map((p) => {
    const propUnits = (units || []).filter((u) => u.property_id === p.id);
    const totalU = propUnits.length > 0 ? propUnits.length : (p.total_units || 0);
    const occU = propUnits.length > 0 ? propUnits.filter((u) => u.status === 'OCCUPIED').length : (p.occupied_units || 0);
    const occRate = totalU > 0 ? ((occU / totalU) * 100).toFixed(0) : '0';
    const expRent = propUnits.length > 0 ? propUnits.reduce((sum, u) => sum + (u.monthly_rent || 0), 0) : (p.expected_monthly_rent || 0);
    const ll = (landlords || []).find((l) => l.id === p.landlord_id || l.landlord_id === p.landlord_id);
    const landlordName = p.landlord_name || (ll ? (ll.business_name || `${ll.first_name} ${ll.last_name}`) : 'Managing Landlord');

    return {
      ...p,
      calculated_total_units: totalU,
      calculated_occupied_units: occU,
      calculated_occupancy_rate: occRate,
      calculated_expected_rent: expRent,
      resolved_landlord_name: landlordName,
    };
  }).filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.address?.toLowerCase().includes(search.toLowerCase()) ||
      p.district?.toLowerCase().includes(search.toLowerCase()) ||
      p.resolved_landlord_name?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || !landlordId) return;

    setSubmitting(true);
    setActionError(null);
    try {
      const createdProp = await api.properties.create({
        name,
        address,
        district,
        landlord_id: landlordId,
        property_type: 'COMMERCIAL',
      });

      if (Number(numUnits) > 0) {
        for (let i = 1; i <= Number(numUnits); i++) {
          await api.units.create({
            property_id: createdProp.id,
            unit_number: `Unit ${i}`,
            monthly_rent: Number(baseRent),
            rooms: 2,
            bathrooms: 1,
          });
        }
      }

      setName('');
      setAddress('');
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to register property');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (confirm('Are you sure you want to delete this property and its associated units?')) {
      setActionError(null);
      try {
        await api.properties.delete(propertyId);
        if (selectedProperty && selectedProperty.id === propertyId) {
          setSelectedProperty(null);
        }
        onRefresh();
      } catch (err: any) {
        setActionError(err.message || 'Failed to delete property. Check if there are active tenancies or leases.');
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
          <div className="text-[11px] font-extrabold uppercase text-slate-500">Registered Properties</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalProperties}</div>
          <div className="text-[11px] font-semibold text-blue-600 mt-0.5">Commercial & residential</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-extrabold uppercase text-slate-500">Total Units</div>
          <div className="text-2xl font-black text-[#331A6F] mt-1">{totalUnits}</div>
          <div className="text-[11px] font-semibold text-slate-600 mt-0.5">Across all properties</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-extrabold uppercase text-slate-500">Occupied Units</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{occupiedUnits}</div>
          <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">
            {totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : 0}% occupancy
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-extrabold uppercase text-slate-500">Vacant Units</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{vacantUnits}</div>
          <div className="text-[11px] font-semibold text-amber-700 mt-0.5">Ready for placement</div>
        </div>
      </div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building className="w-6 h-6 text-blue-600" />
            <span>Platform Property Inventory</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Oversee real estate complexes, assigned landlords, unit configurations, occupancy and rent collection
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#331A6F] text-white text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Register Property</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search properties by name, district, address, landlord..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
          />
        </div>
        <div className="text-xs font-extrabold text-slate-600">
          Showing {filtered.length} of {properties.length} properties
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((prop) => (
          <div
            key={prop.id}
            className="rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] p-5 flex flex-col justify-between hover:border-[#331A6F] transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-black text-slate-900 text-base">{prop.name}</h3>
                  <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{prop.address}, {prop.district}</span>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 shrink-0">
                  {prop.district}
                </span>
              </div>

              <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Managing Landlord:</span>
                  <span className="font-bold text-[#331A6F] truncate">{prop.resolved_landlord_name || prop.landlord_name}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Unit Occupancy:</span>
                  <span className="font-bold text-slate-900">
                    {prop.calculated_occupied_units} / {prop.calculated_total_units} ({prop.calculated_occupancy_rate}%)
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Expected Monthly:</span>
                  <span className="font-black text-emerald-700">
                    RWF {prop.calculated_expected_rent.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedProperty(prop)}
                className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer flex items-center justify-center gap-1"
              >
                <Eye className="w-3.5 h-3.5 text-[#331A6F]" />
                <span>Details</span>
              </button>

              {onNavigateToUnits && (
                <button
                  onClick={() => onNavigateToUnits(prop.id)}
                  className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer flex items-center justify-center gap-1"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Units ({prop.calculated_total_units})</span>
                </button>
              )}

              <button
                onClick={() => handleDeleteProperty(prop.id)}
                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer"
                title="Delete Property"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PROPERTY DETAIL MODAL */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <div>
                <h3 className="font-extrabold text-base">{selectedProperty.name}</h3>
                <div className="text-xs text-purple-200">{selectedProperty.address}, {selectedProperty.district}</div>
              </div>
              <button
                onClick={() => setSelectedProperty(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Total Units</div>
                  <div className="font-black text-slate-900 text-base">{selectedProperty.total_units}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Occupied Units</div>
                  <div className="font-black text-emerald-600 text-base">{selectedProperty.occupied_units}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Vacant Units</div>
                  <div className="font-black text-amber-600 text-base">{selectedProperty.vacant_units}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-700">Landlord Organization</div>
                <div className="text-sm font-extrabold text-[#331A6F]">{selectedProperty.landlord_name}</div>
                <div className="text-slate-500 font-mono text-[10px]">Landlord ID: {selectedProperty.landlord_id}</div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedProperty(null)}
                  className="px-4 py-2 bg-white text-slate-800 font-bold rounded-xl border-2 border-black cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER PROPERTY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <h3 className="font-extrabold text-base">Register New Real Estate Property</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Property Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vision City Estate Phase 2"
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">District / City *</label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  >
                    <option value="Gasabo">Gasabo (Kigali)</option>
                    <option value="Kicukiro">Kicukiro (Kigali)</option>
                    <option value="Nyarugenge">Nyarugenge (Kigali)</option>
                    <option value="Musanze">Musanze</option>
                    <option value="Rubavu">Rubavu</option>
                    <option value="Bugesera">Bugesera</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="KG 549 St, Gacuriro"
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign Owning Landlord *</label>
                <select
                  required
                  value={landlordId}
                  onChange={(e) => setLandlordId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                >
                  {landlords.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.first_name} {l.last_name} ({l.business_name || l.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial Units to Provision</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={numUnits}
                    onChange={(e) => setNumUnits(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Base Monthly Rent (RWF)</label>
                  <input
                    type="number"
                    min={10000}
                    step={10000}
                    value={baseRent}
                    onChange={(e) => setBaseRent(Number(e.target.value))}
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
                  Register Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
