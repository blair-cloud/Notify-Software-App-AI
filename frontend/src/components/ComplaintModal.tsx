import React, { useState } from 'react';
import {
  X,
  AlertCircle,
  Clock,
  Send,
  MessageSquare,
  Building,
  CheckCircle,
  ShieldAlert,
  ShieldCheck,
  User
} from 'lucide-react';
import { Complaint } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: Complaint | null;
  isCreating?: boolean;
  isLandlord?: boolean;
  onCreate?: (data: { subject: string; description: string; category: string; priority: string }) => Promise<void>;
  onAcknowledge?: (id: string) => Promise<void>;
  onUnderReview?: (id: string, data?: { landlord_response?: string }) => Promise<void>;
  onResolve?: (id: string, data: { landlord_response: string }) => Promise<void>;
  onCloseComplaint?: (id: string) => Promise<void>;
  onAddComment?: (id: string, message: string) => Promise<void>;
}

export const ComplaintModal: React.FC<ComplaintModalProps> = ({
  isOpen,
  onClose,
  complaint,
  isCreating = false,
  isLandlord = false,
  onCreate,
  onAcknowledge,
  onUnderReview,
  onResolve,
  onCloseComplaint,
  onAddComment,
}) => {
  const { t } = useLanguage();

  // Form state
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('NOISE');
  const [priority, setPriority] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);

  // Landlord response form
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseAction, setResponseAction] = useState<'REVIEW' | 'RESOLVE'>('REVIEW');
  const [landlordResponseText, setLandlordResponseText] = useState('');

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);

  if (!isOpen) return null;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || !onCreate) return;
    setSubmitting(true);
    try {
      await onCreate({ subject, description, category, priority });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleResponseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint) return;
    setSubmitting(true);
    try {
      if (responseAction === 'RESOLVE' && onResolve) {
        await onResolve(complaint.id, { landlord_response: landlordResponseText });
      } else if (responseAction === 'REVIEW' && onUnderReview) {
        await onUnderReview(complaint.id, { landlord_response: landlordResponseText || undefined });
      }
      setShowResponseForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !onAddComment || !newComment.trim()) return;
    setCommenting(true);
    try {
      await onAddComment(complaint.id, newComment.trim());
      setNewComment('');
    } finally {
      setCommenting(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p?.toUpperCase()) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
            {t.urgent} 🚨
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
      case 'UNDER_REVIEW':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            {t.underReview}
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
      case 'NOISE':
        return t.noise;
      case 'NEIGHBOR':
        return t.neighbor;
      case 'PROPERTY_CONDITION':
        return t.propertyCondition;
      case 'LANDLORD_SERVICE':
        return t.landlordService;
      case 'UTILITY':
        return t.utility;
      case 'PAYMENT':
        return t.payment;
      case 'LEASE':
        return t.leaseCategory;
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
            <div className="p-2 bg-rose-500/20 text-rose-300 rounded-xl border border-rose-400/30">
              <AlertCircle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">
                {isCreating ? t.newComplaint : complaint?.subject || t.complaints}
              </h3>
              <p className="text-xs text-purple-200 font-medium">
                {isCreating
                  ? 'Submit formal complaint or inquiry'
                  : `${complaint?.complaint_number || ''} • ${complaint?.property_name || 'Property'} (Unit ${complaint?.unit_number || 'N/A'})`}
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
          {isCreating ? (
            /* CREATE COMPLAINT FORM */
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {t.complaintSubject} *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Excessive noise after 11 PM from next door"
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
                    <option value="NOISE">{t.noise}</option>
                    <option value="NEIGHBOR">{t.neighbor}</option>
                    <option value="PROPERTY_CONDITION">{t.propertyCondition}</option>
                    <option value="LANDLORD_SERVICE">{t.landlordService}</option>
                    <option value="UTILITY">{t.utility}</option>
                    <option value="PAYMENT">{t.payment}</option>
                    <option value="LEASE">{t.leaseCategory}</option>
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
                  placeholder="Describe the complaint in full detail: dates, times, persons involved, previous attempts to address..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-[#331A6F] transition-all"
                />
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-[#331A6F] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Complaints are kept confidential and handled directly by the property management administration.
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
                  className="px-6 py-2.5 bg-[#331A6F] hover:bg-[#281458] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : t.fileComplaint}
                </button>
              </div>
            </form>
          ) : complaint ? (
            /* DETAILS VIEW */
            <div className="space-y-6">
              {/* Header tags */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {getStatusBadge(complaint.status)}
                  {getPriorityBadge(complaint.priority)}
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-slate-700 border border-slate-200">
                    {getCategoryLabel(complaint.category)}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {new Date(complaint.created_at).toLocaleDateString([], {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Complaint Details</h4>
                <p className="text-sm text-slate-800 bg-white p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                  {complaint.description}
                </p>
              </div>

              {/* Landlord Response */}
              {complaint.landlord_response && (
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-1.5 text-xs">
                  <div className="font-bold text-purple-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-700" /> {t.landlordResponse}
                  </div>
                  <p className="text-purple-800 leading-relaxed">{complaint.landlord_response}</p>
                </div>
              )}

              {/* Landlord Actions */}
              {isLandlord && (
                <div className="pt-2 border-t border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Landlord Actions</h4>

                  <div className="flex flex-wrap gap-2">
                    {complaint.status === 'SUBMITTED' && onAcknowledge && (
                      <button
                        onClick={() => onAcknowledge(complaint.id)}
                        className="px-3.5 py-2 bg-[#331A6F] text-white rounded-xl text-xs font-bold hover:bg-purple-900 cursor-pointer transition-colors"
                      >
                        {t.acknowledged} (Acknowledge)
                      </button>
                    )}

                    {['SUBMITTED', 'ACKNOWLEDGED'].includes(complaint.status) && (
                      <button
                        onClick={() => {
                          setResponseAction('REVIEW');
                          setShowResponseForm(!showResponseForm);
                        }}
                        className="px-3.5 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-amber-600 cursor-pointer transition-colors"
                      >
                        Set Under Review
                      </button>
                    )}

                    {['SUBMITTED', 'ACKNOWLEDGED', 'UNDER_REVIEW'].includes(complaint.status) && (
                      <button
                        onClick={() => {
                          setResponseAction('RESOLVE');
                          setShowResponseForm(!showResponseForm);
                        }}
                        className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer transition-colors"
                      >
                        Resolve Complaint
                      </button>
                    )}

                    {complaint.status === 'RESOLVED' && onCloseComplaint && (
                      <button
                        onClick={() => onCloseComplaint(complaint.id)}
                        className="px-3.5 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 cursor-pointer transition-colors"
                      >
                        Close Complaint
                      </button>
                    )}
                  </div>

                  {showResponseForm && (
                    <form onSubmit={handleResponseSubmit} className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-3 mt-2">
                      <div className="font-bold text-xs text-slate-800">
                        {responseAction === 'RESOLVE' ? 'Provide Resolution Response' : 'Update Review Response'}
                      </div>
                      <textarea
                        required={responseAction === 'RESOLVE'}
                        rows={3}
                        placeholder="Provide response details for the tenant..."
                        value={landlordResponseText}
                        onChange={(e) => setLandlordResponseText(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowResponseForm(false)}
                          className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-1.5 bg-[#331A6F] text-white text-xs font-bold rounded-lg shadow-sm"
                        >
                          {responseAction === 'RESOLVE' ? 'Mark Resolved' : 'Save Update'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Tenant Close Action */}
              {!isLandlord && complaint.status === 'RESOLVED' && onCloseComplaint && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="font-bold text-xs text-emerald-900">Complaint Resolved</div>
                    <div className="text-xs text-emerald-700">The management has provided a resolution.</div>
                  </div>
                  <button
                    onClick={() => onCloseComplaint(complaint.id)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer transition-colors"
                  >
                    Confirm & Close
                  </button>
                </div>
              )}

              {/* Conversation Thread */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> {t.conversation}
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {!complaint.comments || complaint.comments.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No comments yet.</p>
                  ) : (
                    complaint.comments.map((c) => (
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

                {onAddComment && (
                  <form onSubmit={handleSendComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a follow-up comment..."
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
