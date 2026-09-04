import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Building,
  Home,
  FileCheck2,
  DollarSign,
  CheckCircle,
  XCircle,
  ExternalLink,
  Shield,
  Eye,
  Edit,
  X,
  Phone,
  Mail,
  Calendar,
} from 'lucide-react';
import { adminService } from '../../services/adminService';

interface AdminLandlordsTabProps {
  landlords?: any[];
  onRefresh: () => void;
  onNavigateToProperty?: (propertyId: string) => void;
}

export const AdminLandlordsTab: React.FC<AdminLandlordsTabProps> = ({
  landlords = [],
  onRefresh,
  onNavigateToProperty,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [selectedLandlord, setSelectedLandlord] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Landlord form state
  const [newFirst, setNewFirst] = useState('');
  const [newLast, setNewLast] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('+25078');
  const [newBusiness, setNewBusiness] = useState('');

  const filteredLandlords = (landlords || []).filter((l) => {
    const matchesSearch =
      l.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.toLowerCase().includes(search.toLowerCase()) ||
      l.business_name?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && l.status === 'ACTIVE') ||
      (statusFilter === 'SUSPENDED' && (l.status === 'SUSPENDED' || !l.is_active));

    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = (landlord: any) => {
    const nextStatus = landlord.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    adminService.updateUserStatus(landlord.id, nextStatus);
    onRefresh();
    if (selectedLandlord && selectedLandlord.id === landlord.id) {
      setSelectedLandlord({ ...selectedLandlord, status: nextStatus });
    }
  };

  const handleCreateLandlord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirst || !newLast || !newEmail) return;

    adminService.createUser({
      first_name: newFirst,
      last_name: newLast,
      email: newEmail,
      phone: newPhone,
      role: 'LANDLORD',
      business_name: newBusiness || `${newLast} Real Estate Ltd`,
    });

    setNewFirst('');
    setNewLast('');
    setNewEmail('');
    setNewPhone('+25078');
    setNewBusiness('');
    setShowAddModal(false);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header & Metric Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#331A6F]" />
            <span>Landlord Portfolio Administration</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Platform-wide visibility over landlord organizations, owned properties, units, and rent roll
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#331A6F] text-white text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Register Landlord</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search landlord by name, email, phone, business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Status:</span>
          {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((st) => (
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

      {/* Landlords Table */}
      <div className="rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#331A6F] text-white font-extrabold uppercase tracking-wider border-b-2 border-black">
                <th className="p-3.5">Landlord / Entity</th>
                <th className="p-3.5">Contact</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Properties</th>
                <th className="p-3.5 text-center">Units</th>
                <th className="p-3.5 text-right">Expected Rent</th>
                <th className="p-3.5 text-right">Outstanding</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredLandlords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No landlords found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLandlords.map((l) => (
                  <tr key={l.id} className="hover:bg-purple-50/50 font-medium transition-colors">
                    <td className="p-3.5">
                      <div className="font-extrabold text-slate-900 text-sm">
                        {l.first_name} {l.last_name}
                      </div>
                      <div className="text-[11px] text-purple-700 font-bold">
                        {l.business_name || 'Individual Landlord'}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-700">{l.email}</div>
                      <div className="text-[11px] text-slate-400">{l.phone || 'No phone'}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          l.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        {l.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-900">
                      {l.properties_count || 0}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="font-bold text-slate-900">{l.units_count || 0}</span>
                      <span className="text-[10px] text-slate-400 ml-1">({l.occupied_units || 0} occ)</span>
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-slate-900">
                      RWF {(l.expected_monthly_rent || 0).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-rose-600">
                      RWF {(l.outstanding_rent || 0).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedLandlord(l)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#331A6F] font-extrabold text-[11px] rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(l)}
                          className={`px-2 py-1 font-extrabold text-[11px] rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer ${
                            l.status === 'ACTIVE'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {l.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
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

      {/* LANDLORD DETAIL MODAL */}
      {selectedLandlord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-400 text-black font-black text-lg flex items-center justify-center border-2 border-black">
                  {selectedLandlord.first_name?.[0] || 'L'}
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    {selectedLandlord.first_name} {selectedLandlord.last_name}
                  </h3>
                  <div className="text-xs text-purple-200 font-medium">
                    {selectedLandlord.business_name || 'Real Estate Landlord'} • ID: {selectedLandlord.id}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedLandlord(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Quick info cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Account Status</div>
                  <div className="font-extrabold text-slate-900 flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        selectedLandlord.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                    <span>{selectedLandlord.status || 'ACTIVE'}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Properties Owned</div>
                  <div className="font-extrabold text-[#331A6F] text-base">
                    {selectedLandlord.properties_count || 0}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Total Units</div>
                  <div className="font-extrabold text-slate-900 text-base">
                    {selectedLandlord.units_count || 0}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Expected Monthly</div>
                  <div className="font-extrabold text-emerald-600 text-base">
                    RWF {(selectedLandlord.expected_monthly_rent || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">
                  Landlord Credentials & Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 font-medium">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{selectedLandlord.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{selectedLandlord.phone || 'No phone registered'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Joined: {new Date(selectedLandlord.created_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Connected Properties List */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Properties in Portfolio</span>
                  <span className="text-slate-500">{(selectedLandlord.properties_list || []).length} registered</span>
                </h4>

                <div className="space-y-2">
                  {(selectedLandlord.properties_list || []).length === 0 ? (
                    <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl">
                      No properties assigned to this landlord yet.
                    </div>
                  ) : (
                    selectedLandlord.properties_list.map((prop: any) => (
                      <div
                        key={prop.id}
                        className="p-3 rounded-xl bg-white border-2 border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{prop.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {prop.address}, {prop.district} • {prop.total_units || 0} units ({prop.occupied_units || 0} occupied)
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-[#331A6F]">
                            RWF {(prop.expected_monthly_rent || 0).toLocaleString()} /mo
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t-2 border-black flex items-center justify-between shrink-0">
              <button
                onClick={() => handleToggleStatus(selectedLandlord)}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer ${
                  selectedLandlord.status === 'ACTIVE'
                    ? 'bg-rose-500 text-white hover:bg-rose-600'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                {selectedLandlord.status === 'ACTIVE' ? 'Suspend Landlord Account' : 'Reactivate Landlord Account'}
              </button>

              <button
                onClick={() => setSelectedLandlord(null)}
                className="px-4 py-2 bg-white text-slate-800 text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW LANDLORD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <h3 className="font-extrabold text-base">Register New Landlord</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLandlord} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newFirst}
                    onChange={(e) => setNewFirst(e.target.value)}
                    placeholder="e.g. Jean"
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
                    placeholder="e.g. Habimana"
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
                  placeholder="landlord@company.rw"
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

              <div>
                <label className="block font-bold text-slate-700 mb-1">Business / Company Name</label>
                <input
                  type="text"
                  value={newBusiness}
                  onChange={(e) => setNewBusiness(e.target.value)}
                  placeholder="e.g. Kigali Heights Properties Ltd"
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
                  Create Landlord Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
