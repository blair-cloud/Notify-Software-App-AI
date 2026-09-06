import React, { useState } from 'react';
import {
  X,
  Wrench,
  Calendar,
  Clock,
  DollarSign,
  User,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Send,
  MessageSquare,
  Building,
  Check,
  ArrowRight,
  ShieldCheck,
  Phone,
  Plus
} from 'lucide-react';
import { MaintenanceRequest, MaintenanceWorker } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: MaintenanceRequest | null;
  isCreating?: boolean;
  isLandlord?: boolean;
  workers?: MaintenanceWorker[];
  onCreate?: (data: { title: string; description: string; category: string; priority: string }) => Promise<void>;
  onAcknowledge?: (id: string) => Promise<void>;
  onSchedule?: (id: string, data: { scheduled_date: string; scheduled_time?: string; assigned_to?: string; estimated_cost?: number }) => Promise<void>;
  onMarkInProgress?: (id: string) => Promise<void>;
  onResolve?: (id: string, data: { actual_cost?: number; landlord_notes?: string }) => Promise<void>;
  onAddToExpense?: (id: string) => Promise<void>;
  onConfirmResolution?: (id: string, data?: { tenant_notes?: string }) => Promise<void>;
  onReopen?: (id: string, data: { tenant_notes: string }) => Promise<void>;
  onAddComment?: (id: string, message: string) => Promise<void>;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  onClose,
  request,
  isCreating = false,
  isLandlord = false,
  workers = [],
  onCreate,
  onAcknowledge,
  onSchedule,
  onMarkInProgress,
  onResolve,
  onAddToExpense,
  onConfirmResolution,
  onReopen,
  onAddComment,
}) => {
  const { t } = useLanguage();

  // Create Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('PLUMBING');
  const [priority, setPriority] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);

  // Landlord Schedule Form state
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [assignedWorker, setAssignedWorker] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');

  // Landlord Resolve Form state
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [actualCost, setActualCost] = useState('');
  const [landlordNotes, setLandlordNotes] = useState('');

  // Tenant Reopen Form state
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [tenantReopenNotes, setTenantReopenNotes] = useState('');

  // Tenant Confirm Form state
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [tenantConfirmNotes, setTenantConfirmNotes] = useState('');

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);

  // Shared error banner - only one action can be in flight at a time in this modal
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !onCreate) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onCreate({ title, description, category, priority });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit maintenance request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledgeClick = async () => {
    if (!request || !onAcknowledge) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onAcknowledge(request.id);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to acknowledge request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkInProgressClick = async () => {
    if (!request || !onMarkInProgress) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onMarkInProgress(request.id);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update status. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToExpenseClick = async () => {
    if (!request || !onAddToExpense) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onAddToExpense(request.id);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to add cost to expenses. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !onSchedule || !scheduledDate) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onSchedule(request.id, {
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime || undefined,
        assigned_to: assignedWorker || undefined,
        estimated_cost: estimatedCost ? Number(estimatedCost) : undefined,
      });
      setShowScheduleForm(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to schedule visit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !onResolve) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onResolve(request.id, {
        actual_cost: actualCost ? Number(actualCost) : undefined,
        landlord_notes: landlordNotes || undefined,
      });
      setShowResolveForm(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to mark as resolved. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !onReopen || !tenantReopenNotes.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onReopen(request.id, { tenant_notes: tenantReopenNotes });
      setShowReopenForm(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to reopen request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSubmit = async () => {
    if (!request || !onConfirmResolution) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onConfirmResolution(request.id, { tenant_notes: tenantConfirmNotes });
      setShowConfirmForm(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to confirm resolution. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !onAddComment || !newComment.trim()) return;
    setCommenting(true);
    setErrorMsg(null);
    try {
      await onAddComment(request.id, newComment.trim());
      setNewComment('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send message. Please try again.');
    } finally {
      setCommenting(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p?.toUpperCase()) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300">
            <AlertTriangle className="w-3 h-3" /> {t.urgent}
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            {t.high}
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            {t.medium}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            {t.low}
          </span>
        );
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s?.toUpperCase()) {
      case 'SUBMITTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            {t.submitted}
          </span>
        );
      case 'ACKNOWLEDGED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
            {t.acknowledged}
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            {t.scheduled}
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            {t.inProgress}
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            {t.resolved}
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300">
            {t.closed}
          </span>
        );
      case 'REOPENED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            {t.reopened}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {s}
          </span>
        );
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat?.toUpperCase()) {
      case 'PLUMBING':
        return t.plumbing;
      case 'ELECTRICAL':
        return t.electrical;
      case 'WATER':
        return t.water;
      case 'HEATING_COOLING':
        return t.heatingCooling;
      case 'STRUCTURAL':
        return t.structural;
      case 'APPLIANCE':
        return t.appliance;
      case 'SECURITY':
        return t.securityCategory;
      case 'CLEANING':
        return t.cleaning;
      case 'INTERNET':
        return t.internet;
      default:
        return t.otherCategory;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-poppins"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#331A6F] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-300/30">
              <Wrench className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">
                {isCreating ? t.newMaintenanceRequest : request?.title || t.maintenanceRequests}
              </h3>
              <p className="text-xs text-purple-200 font-medium">
                {isCreating
                  ? 'Submit issue for prompt resolution'
                  : `${request?.request_number || ''} • ${request?.property_name || 'Notify Property'} (Unit ${request?.unit_number || 'N/A'})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {isCreating ? (
            /* CREATE FORM */
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {t.issueTitle} *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Water leak under kitchen sink"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-[#331A6F] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    {t.category} *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-[#331A6F] transition-all cursor-pointer"
                  >
                    <option value="PLUMBING">{t.plumbing}</option>
                    <option value="ELECTRICAL">{t.electrical}</option>
                    <option value="WATER">{t.water}</option>
                    <option value="HEATING_COOLING">{t.heatingCooling}</option>
                    <option value="STRUCTURAL">{t.structural}</option>
                    <option value="APPLIANCE">{t.appliance}</option>
                    <option value="SECURITY">{t.securityCategory}</option>
                    <option value="CLEANING">{t.cleaning}</option>
                    <option value="INTERNET">{t.internet}</option>
                    <option value="OTHER">{t.otherCategory}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    {t.priority} *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-[#331A6F] transition-all cursor-pointer"
                  >
                    <option value="LOW">{t.low}</option>
                    <option value="MEDIUM">{t.medium}</option>
                    <option value="HIGH">{t.high}</option>
                    <option value="URGENT">{t.urgent} 🚨</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {t.issueDescription} *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide complete details: location in the unit, when it started, urgency level..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-[#331A6F] transition-all"
                />
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-[#331A6F] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Your request is routed directly to your property manager. You will receive real-time updates via SMS and in-app notifications.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#331A6F] hover:bg-[#281458] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? 'Submitting...' : t.reportIssue}
                </button>
              </div>
            </form>
          ) : request ? (
            /* DETAILS VIEW */
            <div className="space-y-6">
              {/* Status and Summary Header */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {getStatusBadge(request.status)}
                  {getPriorityBadge(request.priority)}
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-slate-700 border border-slate-200">
                    {getCategoryLabel(request.category)}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {new Date(request.created_at).toLocaleDateString([], {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Description</h4>
                <p className="text-sm text-slate-800 bg-white p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                  {request.description}
                </p>
              </div>

              {/* Progress & Work Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#331A6F]" /> {t.assignedTechnician}
                  </div>
                  <div className="font-semibold text-slate-900">
                    {request.assigned_to || 'Not assigned yet'}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#331A6F]" /> {t.scheduledFor}
                  </div>
                  <div className="font-semibold text-slate-900">
                    {request.scheduled_date
                      ? `${request.scheduled_date} ${request.scheduled_time || ''}`
                      : 'Pending scheduling'}
                  </div>
                </div>
              </div>

              {/* Financial impact */}
              {(request.estimated_cost !== undefined || request.actual_cost !== undefined) && (
                <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-xs text-emerald-800 font-bold">Financial Tracking</div>
                    <div className="text-xs text-emerald-600 mt-0.5">
                      {request.estimated_cost ? `Est: ${request.estimated_cost.toLocaleString()} ${request.currency || 'RWF'}` : ''}
                      {request.estimated_cost && request.actual_cost ? ' • ' : ''}
                      {request.actual_cost ? `Actual: ${request.actual_cost.toLocaleString()} ${request.currency || 'RWF'}` : ''}
                    </div>
                  </div>

                  {isLandlord && !request.expense_id && request.actual_cost && onAddToExpense && (
                    <button
                      onClick={handleAddToExpenseClick}
                      disabled={submitting}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Please wait...' : t.addToExpenses}
                    </button>
                  )}

                  {request.expense_id && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <CheckCircle className="w-3.5 h-3.5" /> {t.addedToExpenses}
                    </span>
                  )}
                </div>
              )}

              {/* Landlord notes or Tenant notes */}
              {request.landlord_notes && (
                <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 text-xs">
                  <span className="font-bold text-purple-900 block mb-1">{t.landlordNotes}:</span>
                  <p className="text-purple-800">{request.landlord_notes}</p>
                </div>
              )}

              {request.tenant_notes && (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                  <span className="font-bold text-amber-900 block mb-1">{t.tenantNotes}:</span>
                  <p className="text-amber-800">{request.tenant_notes}</p>
                </div>
              )}

              {/* --- ACTION FORMS & BUTTONS --- */}

              {/* Landlord Actions */}
              {isLandlord && (
                <div className="pt-2 border-t border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Landlord Actions</h4>

                  <div className="flex flex-wrap gap-2">
                    {request.status === 'SUBMITTED' && onAcknowledge && (
                      <button
                        onClick={handleAcknowledgeClick}
                        disabled={submitting}
                        className="px-3.5 py-2 bg-[#331A6F] text-white rounded-xl text-xs font-bold hover:bg-purple-900 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Please wait...' : `${t.acknowledged} (Acknowledge)`}
                      </button>
                    )}

                    {['SUBMITTED', 'ACKNOWLEDGED', 'REOPENED'].includes(request.status) && (
                      <button
                        onClick={() => setShowScheduleForm(!showScheduleForm)}
                        disabled={submitting}
                        className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t.assignWorker}
                      </button>
                    )}

                    {request.status === 'SCHEDULED' && onMarkInProgress && (
                      <button
                        onClick={handleMarkInProgressClick}
                        disabled={submitting}
                        className="px-3.5 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-amber-600 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Please wait...' : `Start Work (${t.inProgress})`}
                      </button>
                    )}

                    {['SCHEDULED', 'IN_PROGRESS', 'REOPENED'].includes(request.status) && (
                      <button
                        onClick={() => setShowResolveForm(!showResolveForm)}
                        disabled={submitting}
                        className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t.markResolved}
                      </button>
                    )}
                  </div>

                  {/* Schedule Form */}
                  {showScheduleForm && (
                    <form onSubmit={handleScheduleSubmit} className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 space-y-3 mt-2">
                      <div className="font-bold text-xs text-blue-900">Schedule Visit & Assign Technician</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Technician / Worker</label>
                          <input
                            type="text"
                            placeholder="e.g. Kigali Plumbers Ltd"
                            value={assignedWorker}
                            onChange={(e) => setAssignedWorker(e.target.value)}
                            list="workers-list"
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                          <datalist id="workers-list">
                            {workers.map((w) => (
                              <option key={w.id} value={`${w.name} (${w.specialization})`} />
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Visit Date *</label>
                          <input
                            type="date"
                            required
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Visit Time Window</label>
                          <input
                            type="text"
                            placeholder="e.g. 10:00 AM - 12:00 PM"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Estimated Cost (RWF)</label>
                          <input
                            type="number"
                            placeholder="e.g. 25000"
                            value={estimatedCost}
                            onChange={(e) => setEstimatedCost(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowScheduleForm(false)}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 cursor-pointer"
                        >
                          Confirm Schedule
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Resolve Form */}
                  {showResolveForm && (
                    <form onSubmit={handleResolveSubmit} className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-3 mt-2">
                      <div className="font-bold text-xs text-emerald-900">Mark Maintenance as Resolved</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Actual Repair Cost (RWF)</label>
                          <input
                            type="number"
                            placeholder="e.g. 30000"
                            value={actualCost}
                            onChange={(e) => setActualCost(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Landlord / Technician Notes</label>
                          <textarea
                            rows={2}
                            placeholder="Replaced broken valve and tested flow..."
                            value={landlordNotes}
                            onChange={(e) => setLandlordNotes(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowResolveForm(false)}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                        >
                          Submit Resolution
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Tenant Confirmation / Reopening Workflow */}
              {!isLandlord && request.status === 'RESOLVED' && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    {t.confirmResolutionPrompt}
                  </div>
                  <p className="text-xs text-slate-600">
                    The landlord marked this issue as resolved. Please verify the repair in your unit.
                  </p>

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <button
                      onClick={() => setShowConfirmForm(true)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      <Check className="w-4 h-4 stroke-[3]" /> {t.confirmResolution}
                    </button>
                    <button
                      onClick={() => setShowReopenForm(!showReopenForm)}
                      className="px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" /> {t.reopenRequest}
                    </button>
                  </div>

                  {showConfirmForm && (
                    <div className="p-3 bg-white rounded-xl border border-slate-300 space-y-2 mt-2">
                      <div className="text-xs font-bold text-slate-800">Close and confirm repair</div>
                      <input
                        type="text"
                        placeholder="Optional feedback or notes (e.g. Excellent work, thank you)"
                        value={tenantConfirmNotes}
                        onChange={(e) => setTenantConfirmNotes(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setShowConfirmForm(false)}
                          className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmSubmit}
                          disabled={submitting}
                          className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm"
                        >
                          Confirm & Close Request
                        </button>
                      </div>
                    </div>
                  )}

                  {showReopenForm && (
                    <form onSubmit={handleReopenSubmit} className="p-3 bg-white rounded-xl border border-rose-300 space-y-2 mt-2">
                      <div className="text-xs font-bold text-rose-900">{t.reopenPrompt} *</div>
                      <textarea
                        required
                        rows={2}
                        placeholder="Explain why the issue is not fixed..."
                        value={tenantReopenNotes}
                        onChange={(e) => setTenantReopenNotes(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowReopenForm(false)}
                          className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-sm"
                        >
                          Submit Reopen
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Conversation Thread */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> {t.conversation}
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {!request.comments || request.comments.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No messages yet. Send a message below.</p>
                  ) : (
                    request.comments.map((c) => (
                      <div
                        key={c.id}
                        className={`p-2.5 rounded-xl text-xs max-w-[85%] ${
                          (isLandlord && (c.author_role === 'LANDLORD' || c.author_role === 'ADMIN')) ||
                          (!isLandlord && c.author_role === 'TENANT')
                            ? 'bg-[#331A6F] text-white ml-auto'
                            : 'bg-white text-slate-800 border border-slate-200 mr-auto'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 mb-1">
                          <span className="font-bold">{c.author_name || c.author_role}</span>
                          <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="leading-relaxed">{c.message}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Send Comment Box */}
                {onAddComment && (
                  <form onSubmit={handleSendComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-[#331A6F] transition-all"
                    />
                    <button
                      type="submit"
                      disabled={commenting || !newComment.trim()}
                      className="px-4 py-2 bg-[#331A6F] hover:bg-[#281458] text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {!isCreating && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold text-xs hover:bg-slate-100 cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
