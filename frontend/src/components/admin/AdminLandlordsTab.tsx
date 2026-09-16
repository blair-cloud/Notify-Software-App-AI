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
  Layers,
  UserCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { api } from '../../services/api';

interface AdminLandlordsTabProps {
  landlords?: any[];
  properties?: any[];
  units?: any[];
  onRefresh: () => void;
  onNavigateToProperty?: (propertyId: string) => void;
}

export const AdminLandlordsTab: React.FC<AdminLandlordsTabProps> = ({
  landlords = [],
  properties = [],
  units = [],
  onRefresh,
  onNavigateToProperty,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [selectedLandlord, setSelectedLandlord] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedPropertyIds, setExpandedPropertyIds] = useState<Record<string, boolean>>({});

  // Computed live metrics from real database data
  const totalLandlords = (landlords || []).length;
  const activeLandlords = (landlords || []).filter((l) => l.status === 'ACTIVE').length;
  const totalProperties = (landlords || []).reduce((sum, l) => sum + (l.properties_count || 0), 0);
  const totalUnits = (landlords || []).reduce((sum, l) => sum + (l.units_count || 0), 0);
  const occupiedUnits = (landlords || []).reduce((sum, l) => sum + (l.occupied_units || 0), 0);
  const totalRentRoll = (landlords || []).reduce((sum, l) => sum + (l.expected_monthly_rent || l.monthly_rent_roll || 0), 0);
  const totalOutstanding = (landlords || []).reduce((sum, l) => sum + (l.outstanding_rent || 0), 0);

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

  const handleToggleStatus = async (landlord: any) => {
    const targetUserId = landlord.user_id || landlord.id;
    const nextStatus = landlord.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setActionError(null);
    try {
      if (nextStatus === 'SUSPENDED') {
        await api.admin.suspendUser(targetUserId);
      } else {
        await api.admin.activateUser(targetUserId);
      }
      onRefresh();
      if (selectedLandlord && (selectedLandlord.id === landlord.id || selectedLandlord.user_id === targetUserId)) {
        setSelectedLandlord({ ...selectedLandlord, status: nextStatus });
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to update user status');
    }
  };

  const handleCreateLandlord = async (e: React.FormEvent) => {
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
        role: 'LANDLORD',
        business_name: newBusiness || `${newLast} Properties`,
      });

      setNewFirst('');
      setNewLast('');
      setNewEmail('');
      setNewPhone('+25078');
      setNewBusiness('');
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to register landlord');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePropertyExpanded = (propId: string) => {
    setExpandedPropertyIds((prev) => ({
      ...prev,
      [propId]: prev[propId] === undefined ? false : !prev[propId],
    }));
  };

  // Helper to compute resolved properties and units for the selected landlord
  const getSelectedLandlordPortfolio = () => {
    if (!selectedLandlord) return { ownedProperties: [], totalUnits: 0, totalOcc: 0, totalExpected: 0 };
    const landlordId = selectedLandlord.landlord_id || selectedLandlord.id;

    const rawProps = (
      selectedLandlord.properties_list && selectedLandlord.properties_list.length > 0
        ? selectedLandlord.properties_list
        : (properties || []).filter((p) => p.landlord_id === landlordId)
    );

    const ownedProperties = rawProps.map((p: any) => {
      // Find units for this property
      const propUnits = (
        p.units && p.units.length > 0
          ? p.units
          : (units || []).filter((u) => u.property_id === p.id)
      );

      const occUnits = propUnits.filter((u: any) => u.status === 'OCCUPIED').length;
      const vacUnits = propUnits.filter((u: any) => u.status === 'VACANT').length;
      const propExpected = propUnits.reduce(
        (sum: number, u: any) => sum + (parseFloat(u.monthly_rent) || 0),
        0
      );

      return {
        ...p,
        units: propUnits,
        total_units: propUnits.length,
        occupied_units: occUnits,
        vacant_units: vacUnits,
        expected_monthly_rent: p.expected_monthly_rent || propExpected,
      };
    });

    const totalUnitsCount = ownedProperties.reduce((sum: number, p: any) => sum + (p.total_units || 0), 0);
    const totalOccCount = ownedProperties.reduce((sum: number, p: any) => sum + (p.occupied_units || 0), 0);
    const totalExpectedRent = ownedProperties.reduce(
      (sum: number, p: any) => sum + (p.expected_monthly_rent || 0),
      0
    ) || selectedLandlord.expected_monthly_rent || selectedLandlord.monthly_rent_roll || 0;

    return {
      ownedProperties,
      totalUnits: totalUnitsCount,
      totalOcc: totalOccCount,
      totalExpected: totalExpectedRent,
    };
  };

  const { ownedProperties, totalUnits: modalUnitsCount, totalOcc: modalOccCount, totalExpected: modalExpectedRent } =
    getSelectedLandlordPortfolio();

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
          <div className="text-[11px] font-extrabold uppercase text-slate-500">Registered Landlords</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalLandlords}</div>
          <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">{activeLandlords} active accounts</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-extrabold uppercase text-slate-500">Properties & Units</div>
          <div className="text-2xl font-black text-[#331A6F] mt-1">{totalProperties} <span className="text-sm text-slate-500 font-bold">props</span></div>
          <div className="text-[11px] font-semibold text-slate-600 mt-0.5">{totalUnits} units ({occupiedUnits} occupied)</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-extrabold uppercase text-slate-500">Monthly Rent Roll</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">RWF {totalRentRoll.toLocaleString()}</div>
          <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Active lease total</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-extrabold uppercase text-slate-500">Outstanding Balance</div>
          <div className="text-2xl font-black text-rose-600 mt-1">RWF {totalOutstanding.toLocaleString()}</div>
          <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Unpaid invoice balances</div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#331A6F]" />
            <span>Landlord Portfolio Administration</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Click on any landlord row to inspect their actual properties, registered units, and expected monthly revenue
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
                <th className="p-3.5 text-right">Expected Monthly</th>
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
                  <tr
                    key={l.id}
                    onClick={() => setSelectedLandlord(l)}
                    className="hover:bg-purple-50/70 font-medium transition-colors cursor-pointer"
                  >
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
                    <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedLandlord(l)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#331A6F] font-extrabold text-[11px] rounded-lg border-2 border-black shadow-[0.5px_0.5px_0_#000] cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Portfolio</span>
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

      {/* LANDLORD DETAIL & PORTFOLIO MODAL */}
      {selectedLandlord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-400 text-black font-black text-xl flex items-center justify-center border-2 border-black shadow-[0.5px_0.5px_0_#000]">
                  {selectedLandlord.first_name?.[0] || 'L'}
                </div>
                <div>
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <span>{selectedLandlord.first_name} {selectedLandlord.last_name}</span>
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-white uppercase border border-white/30">
                      {selectedLandlord.status || 'ACTIVE'}
                    </span>
                  </h3>
                  <div className="text-xs text-purple-200 font-medium mt-0.5">
                    {selectedLandlord.business_name || 'Property Owner'} • ID: {selectedLandlord.id}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedLandlord(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Quick KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000]">
                  <div className="text-slate-500 font-bold uppercase text-[10px] mb-0.5">Account Status</div>
                  <div className="font-black text-slate-900 text-sm flex items-center gap-1.5 mt-1">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        selectedLandlord.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                      }`}
                    />
                    <span>{selectedLandlord.status || 'ACTIVE'}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000]">
                  <div className="text-slate-500 font-bold uppercase text-[10px] mb-0.5">Properties Owned</div>
                  <div className="font-black text-[#331A6F] text-xl mt-1">
                    {ownedProperties.length} <span className="text-xs text-slate-400 font-bold">properties</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000]">
                  <div className="text-slate-500 font-bold uppercase text-[10px] mb-0.5">Units Count</div>
                  <div className="font-black text-slate-900 text-xl mt-1">
                    {modalUnitsCount} <span className="text-xs text-emerald-600 font-bold">({modalOccCount} occ)</span>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50 rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000]">
                  <div className="text-emerald-800 font-bold uppercase text-[10px] mb-0.5">Expected Monthly</div>
                  <div className="font-black text-emerald-700 text-xl mt-1">
                    RWF {modalExpectedRent.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Contact Information Card */}
              <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] space-y-2">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#331A6F]" />
                  <span>Landlord Profile & Credentials</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-700 font-medium pt-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{selectedLandlord.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{selectedLandlord.phone || 'No phone registered'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Joined: {selectedLandlord.created_at ? new Date(selectedLandlord.created_at).toLocaleDateString() : 'Active'}</span>
                  </div>
                </div>
              </div>

              {/* Connected Properties & Units Portfolio */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#331A6F]" />
                    <span>Actual Properties & Registered Units</span>
                  </h4>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300">
                    {ownedProperties.length} Properties • {modalUnitsCount} Units Total
                  </span>
                </div>

                {ownedProperties.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 space-y-2">
                    <Building className="w-8 h-8 text-slate-400 mx-auto" />
                    <div className="font-bold text-slate-700 text-sm">No properties registered under this landlord yet</div>
                    <p className="text-xs text-slate-500">
                      Assign properties to this landlord in the Properties tab or during property creation.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ownedProperties.map((prop: any) => {
                      const isCollapsed = expandedPropertyIds[prop.id] === false;
                      return (
                        <div
                          key={prop.id}
                          className="rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden"
                        >
                          {/* Property Header Banner */}
                          <div
                            onClick={() => togglePropertyExpanded(prop.id)}
                            className="p-4 bg-slate-50 hover:bg-purple-50/40 border-b-2 border-black flex flex-wrap items-center justify-between gap-3 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-purple-100 text-[#331A6F] border border-purple-300">
                                <Building className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                                  <span>{prop.name}</span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-[#331A6F] border border-purple-200 uppercase">
                                    {prop.property_type || 'COMMERCIAL'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                  {prop.address || 'Address'}, {prop.district || 'District'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="font-bold text-slate-500 text-[10px] uppercase">Property Expected Monthly</div>
                                <div className="font-black text-emerald-700 text-sm">
                                  RWF {(prop.expected_monthly_rent || 0).toLocaleString()} /mo
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="font-bold text-slate-500 text-[10px] uppercase">Units Breakdown</div>
                                <div className="font-extrabold text-slate-900 text-xs">
                                  {prop.total_units || prop.units?.length || 0} Units{' '}
                                  <span className="text-emerald-600 font-bold">({prop.occupied_units || 0} occ)</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                className="p-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700"
                              >
                                {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Nested Units Table */}
                          {!isCollapsed && (
                            <div className="p-4 bg-white">
                              {prop.units && prop.units.length > 0 ? (
                                <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
                                  <table className="w-full text-left text-xs">
                                    <thead>
                                      <tr className="bg-[#331A6F] text-white font-extrabold uppercase text-[10px]">
                                        <th className="p-2.5">Unit #</th>
                                        <th className="p-2.5">Unit Type</th>
                                        <th className="p-2.5 text-center">Status</th>
                                        <th className="p-2.5 text-right">Monthly Rent (RWF)</th>
                                        <th className="p-2.5">Current Occupant / Tenant</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                                      {prop.units.map((unit: any) => (
                                        <tr key={unit.id} className="hover:bg-purple-50/30 transition-colors">
                                          <td className="p-2.5 font-black text-slate-900">
                                            Unit {unit.unit_number}
                                          </td>
                                          <td className="p-2.5 text-slate-600 font-semibold">
                                            {unit.unit_type || 'Standard Unit'}
                                          </td>
                                          <td className="p-2.5 text-center">
                                            <span
                                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                                                unit.status === 'OCCUPIED'
                                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                                              }`}
                                            >
                                              {unit.status}
                                            </span>
                                          </td>
                                          <td className="p-2.5 text-right font-black text-[#331A6F]">
                                            RWF {(parseFloat(unit.monthly_rent) || 0).toLocaleString()}
                                          </td>
                                          <td className="p-2.5">
                                            {unit.tenant_name ? (
                                              <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>{unit.tenant_name}</span>
                                              </span>
                                            ) : (
                                              <span className="text-amber-700 font-semibold italic text-[11px]">
                                                Vacant • Available for Lease
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="p-4 text-center text-slate-400 italic text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                  No units added to this property yet.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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
                className="px-5 py-2 bg-white text-slate-800 text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:bg-slate-100 cursor-pointer"
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
              <h3 className="font-extrabold text-base">Register Landlord Profile</h3>
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
                <label className="block font-bold text-slate-700 mb-1">Business / Real Estate Entity</label>
                <input
                  type="text"
                  value={newBusiness}
                  onChange={(e) => setNewBusiness(e.target.value)}
                  placeholder="e.g. Kigali Heights Properties Ltd"
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="landlord@notify.test"
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
                  disabled={submitting}
                  className="px-4 py-2 bg-[#331A6F] text-white font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Registering...' : 'Register Landlord'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
