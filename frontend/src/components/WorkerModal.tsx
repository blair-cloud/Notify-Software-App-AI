import React, { useState } from 'react';
import { X, Users, Phone, UserCheck, Plus, ShieldCheck, Wrench, Briefcase, AlertCircle } from 'lucide-react';
import { MaintenanceWorker } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { WORKER_SPECIALIZATIONS, specializationLabel } from '../constants/workerSpecializations';

interface WorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workers: MaintenanceWorker[];
  onAddWorker: (data: { name: string; phone: string; specialization: string; notes?: string }) => Promise<void>;
}

export const WorkerModal: React.FC<WorkerModalProps> = ({
  isOpen,
  onClose,
  workers,
  onAddWorker,
}) => {
  const { t } = useLanguage();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('PLUMBER');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onAddWorker({ name, phone, specialization, notes: notes || undefined });
      setName('');
      setPhone('');
      setNotes('');
      setShowAddForm(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to add technician. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-poppins"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-[0.5px_0.5px_0_#000] border-2 border-black overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#331A6F] text-white border-b-2 border-black">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400 text-black rounded-xl border border-black shadow-[0.5px_0.5px_0_#000]">
              <Wrench className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">{t.workersTechnicians}</h3>
              <p className="text-xs text-amber-300 font-medium">Directory of verified maintenance specialists</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {workers.length} Registered Technicians
            </span>
            <button
              onClick={() => {
                setErrorMsg(null);
                setShowAddForm(!showAddForm);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#331A6F] text-white rounded-xl text-xs font-extrabold border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:bg-purple-900 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addWorker}</span>
            </button>
          </div>

          {/* Add Worker Form */}
          {showAddForm && (
            <form onSubmit={handleSubmit} className="p-4 bg-slate-50 rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000] space-y-3">
              <div className="font-extrabold text-xs text-slate-900">Add New Technician</div>
              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-800 text-[11px] rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">{t.workerName} *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jean Pierre Nshimiyimana"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">{t.workerPhone} *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+250 788 123 456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">{t.specialization} *</label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    {WORKER_SPECIALIZATIONS.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Notes / Availability</label>
                  <input
                    type="text"
                    placeholder="Available 24/7 in Nyarugenge"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#331A6F] text-white rounded-lg text-xs font-bold hover:bg-purple-900 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Technician'}
                </button>
              </div>
            </form>
          )}

          {/* Workers list */}
          <div className="divide-y divide-slate-100 space-y-2">
            {workers.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No technicians registered yet. Click "Add Technician" to add one.
              </div>
            ) : (
              workers.map((w) => (
                <div key={w.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#331A6F] flex items-center justify-center font-bold text-xs border border-purple-200">
                      {w.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-slate-900">{w.name}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[10px]">
                          {specializationLabel(w.specialization)}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" /> {w.phone}
                        </span>
                      </div>
                      {w.notes && <div className="text-[11px] text-slate-400 mt-1 italic">{w.notes}</div>}
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                    <UserCheck className="w-3 h-3" /> Active
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white border-2 border-black rounded-xl text-slate-900 font-extrabold text-xs shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
