import React, { useState } from 'react';
import { Plus, Search, Filter, CheckCircle2 } from 'lucide-react';
import { UnitDetail } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ManageUnitsPageProps {
  onBack: () => void;
  onOpenGetStarted: (source?: string) => void;
}

export const ManageUnitsPage: React.FC<ManageUnitsPageProps> = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUnitCode, setNewUnitCode] = useState('');
  const [newTenant, setNewTenant] = useState('');
  const [newRent, setNewRent] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);

  const [units, setUnits] = useState<UnitDetail[]>([
    {
      id: '1',
      unitCode: 'Unit F-04',
      floor: 'Ground Floor',
      tenantName: 'Java House Coffee',
      businessType: 'Restaurant & Cafe',
      sizeSqm: 145,
      monthlyRentRwf: 1450000,
      status: 'occupied',
      lastPaymentDate: '2026-08-01',
      dueStatus: 'paid',
    },
    {
      id: '2',
      unitCode: 'Unit G-12',
      floor: 'Ground Floor',
      tenantName: 'Inzora Specialty Cafe',
      businessType: 'Cafe & Books',
      sizeSqm: 90,
      monthlyRentRwf: 950000,
      status: 'occupied',
      lastPaymentDate: '2026-08-02',
      dueStatus: 'paid',
    },
    {
      id: '3',
      unitCode: 'Unit S-08',
      floor: '2nd Floor',
      tenantName: 'Kigali Innovation Hub',
      businessType: 'Tech Office',
      sizeSqm: 210,
      monthlyRentRwf: 2100000,
      status: 'occupied',
      lastPaymentDate: '2026-07-28',
      dueStatus: 'paid',
    },
    {
      id: '4',
      unitCode: 'Unit K-02',
      floor: 'Ground Floor Atrium',
      tenantName: 'Available Space',
      businessType: 'Retail Kiosk',
      sizeSqm: 18,
      monthlyRentRwf: 350000,
      status: 'vacant',
      lastPaymentDate: '-',
      dueStatus: 'due_soon',
    },
    {
      id: '5',
      unitCode: 'Unit F-15',
      floor: '1st Floor',
      tenantName: 'Express Pharmacy Rwanda',
      businessType: 'Pharmacy & Healthcare',
      sizeSqm: 75,
      monthlyRentRwf: 800000,
      status: 'occupied',
      lastPaymentDate: '2026-08-01',
      dueStatus: 'paid',
    },
    {
      id: '6',
      unitCode: 'Unit M-01',
      floor: '2nd Floor',
      tenantName: 'Vacant Commercial Suite',
      businessType: 'Executive Office',
      sizeSqm: 120,
      monthlyRentRwf: 1200000,
      status: 'vacant',
      lastPaymentDate: '-',
      dueStatus: 'due_soon',
    },
    {
      id: '7',
      unitCode: 'Unit S-03',
      floor: '1st Floor',
      tenantName: 'Electronics Hub Kigali',
      businessType: 'Electronics Store',
      sizeSqm: 110,
      monthlyRentRwf: 1100000,
      status: 'occupied',
      lastPaymentDate: '2026-07-05',
      dueStatus: 'overdue',
    },
    {
      id: '8',
      unitCode: 'Unit G-05',
      floor: 'Ground Floor',
      tenantName: 'Simba Supermarket Annex',
      businessType: 'Retail Grocery',
      sizeSqm: 320,
      monthlyRentRwf: 3500000,
      status: 'occupied',
      lastPaymentDate: '2026-08-03',
      dueStatus: 'paid',
    },
  ]);

  const filteredUnits = units.filter((u) => {
    const matchesSearch =
      u.unitCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.tenantName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || u.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const occupiedCount = units.filter((u) => u.status === 'occupied').length;
  const vacantCount = units.filter((u) => u.status === 'vacant').length;

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitCode) return;
    const newUnit: UnitDetail = {
      id: Date.now().toString(),
      unitCode: newUnitCode,
      floor: 'Ground Floor',
      tenantName: newTenant || 'Vacant Space',
      businessType: newTenant ? 'Retail Store' : 'Unassigned',
      sizeSqm: 80,
      monthlyRentRwf: parseInt(newRent) || 750000,
      status: newTenant ? 'occupied' : 'vacant',
      lastPaymentDate: newTenant ? '2026-08-01' : '-',
      dueStatus: 'paid',
    };
    setUnits([newUnit, ...units]);
    setAddSuccess(true);
    setTimeout(() => {
      setAddSuccess(false);
      setShowAddModal(false);
      setNewUnitCode('');
      setNewTenant('');
      setNewRent('');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-notify-grid text-black pb-24 font-montserrat">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-36 sm:pt-40 space-y-8">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
              {t.featureManageUnitsTitle}
            </h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
              {units.length} {t.totalUnits} &bull; {occupiedCount} {t.occupiedUnits} &bull; {vacantCount} {t.vacantUnits}
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-[14px] bg-[#331A6F] text-white font-extrabold text-sm border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] cursor-pointer flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t.addUnit}</span>
          </button>
        </div>

        {/* Quick Search & Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-[12px] bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000000] font-semibold text-black focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white border-2 border-black rounded-[12px] px-3 py-2 shadow-[0.5px_0.5px_0_#000000]">
              <Filter className="w-3.5 h-3.5 text-black stroke-[2.5]" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent text-xs font-bold text-black focus:outline-none cursor-pointer"
              >
                <option value="all">{t.allUnits}</option>
                <option value="occupied">{t.occupiedUnits}</option>
                <option value="vacant">{t.vacantUnits}</option>
              </select>
            </div>
        </div>

        {/* Minimal Units List Table */}
        <div className="bg-white rounded-[20px] border-2 border-black shadow-[0.5px_0.5px_0_#000000] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#331A6F] text-white text-xs uppercase font-extrabold border-b-2 border-black">
                <th className="p-4 pl-6">Unit</th>
                <th className="p-4">Tenant</th>
                <th className="p-4">Location</th>
                <th className="p-4">Monthly Rent</th>
                <th className="p-4 pr-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/10 text-xs text-black">
              {filteredUnits.map((unit) => (
                <tr key={unit.id} className="hover:bg-[#331A6F]/5 transition-colors">
                  <td className="p-4 pl-6 font-black text-[#331A6F]">{unit.unitCode}</td>
                  <td className="p-4 font-bold text-black">{unit.tenantName}</td>
                  <td className="p-4 text-slate-600 font-medium">{unit.floor}</td>
                  <td className="p-4 font-extrabold text-black">
                    RWF {unit.monthlyRentRwf.toLocaleString()}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded-[8px] text-[11px] font-black uppercase border-2 border-black shadow-[0.5px_0.5px_0_#000000] ${
                        unit.status === 'occupied' ? 'bg-emerald-300 text-black' : 'bg-amber-300 text-black'
                      }`}
                    >
                      {unit.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add Unit Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="relative w-full max-w-sm bg-white rounded-[20px] shadow-[0.5px_0.5px_0_#000000] border-2 border-black p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-black mb-4">Add Unit</h3>

            {addSuccess ? (
              <div className="p-4 text-center bg-emerald-100 border-2 border-black rounded-[14px]">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1 stroke-[2.5]" />
                <div className="text-sm font-bold text-black">Unit Added</div>
              </div>
            ) : (
              <form onSubmit={handleAddUnit} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
                    Unit Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Unit F-18"
                    value={newUnitCode}
                    onChange={(e) => setNewUnitCode(e.target.value)}
                    className="w-full text-xs bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2 text-black font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
                    Tenant Name
                  </label>
                  <input
                    type="text"
                    placeholder="Tenant name or vacant"
                    value={newTenant}
                    onChange={(e) => setNewTenant(e.target.value)}
                    className="w-full text-xs bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2 text-black font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
                    Monthly Rent (RWF)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="1200000"
                    value={newRent}
                    onChange={(e) => setNewRent(e.target.value)}
                    className="w-full text-xs bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2 text-black font-semibold focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2 rounded-[12px] bg-white text-black font-bold text-xs border-2 border-black cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-[12px] bg-[#331A6F] text-white font-extrabold text-xs border-2 border-black cursor-pointer uppercase"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
