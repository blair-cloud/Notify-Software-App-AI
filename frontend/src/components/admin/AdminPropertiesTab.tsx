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

interface AdminPropertiesTabProps {
  properties: any[];
  landlords: any[];
  onRefresh: () => void;
  onNavigateToUnits?: (propertyId: string) => void;
}

export const AdminPropertiesTab: React.FC<AdminPropertiesTabProps> = ({
  properties = [],
  landlords = [],
  onRefresh,
  onNavigateToUnits,
}) => {
  const [search, setSearch] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('Gasabo');
  const [landlordId, setLandlordId] = useState(landlords?.[0]?.id || '');
  const [numUnits, setNumUnits] = useState(4);
  const [baseRent, setBaseRent] = useState(250000);

  const filtered = (properties || []).filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.address?.toLowerCase().includes(search.toLowerCase()) ||
      p.district?.toLowerCase().includes(search.toLowerCase()) ||
      p.landlord_name?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const handleCreateProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || !landlordId) return;

    adminService.createProperty({
      name,
      address,
      district,
      landlord_id: landlordId,
      initial_units_count: Number(numUnits),
      default_rent_per_unit: Number(baseRent),
    });

    setName('');
    setAddress('');
    setShowAddModal(false);
    onRefresh();
  };

  const handleDeleteProperty = (propertyId: string) => {
    if (confirm('Are you sure you want to delete this property and its associated units?')) {
      adminService.deleteProperty(propertyId);
      if (selectedProperty && selectedProperty.id === propertyId) {
        setSelectedProperty(null);
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
                  <span className="font-bold text-[#331A6F] truncate">{prop.landlord_name}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Unit Occupancy:</span>
                  <span className="font-bold text-slate-900">
                    {prop.occupied_units || 0} / {prop.total_units || 0} ({prop.occupancy_rate || 0}%)
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Expected Monthly:</span>
                  <span className="font-black text-emerald-700">
                    RWF {(prop.expected_monthly_rent || 0).toLocaleString()}
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
                  <span>Units ({prop.total_units || 0})</span>
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
