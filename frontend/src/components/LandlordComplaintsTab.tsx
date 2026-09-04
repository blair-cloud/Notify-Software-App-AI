import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Send,
  Paperclip,
  CheckCheck,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Info,
  X,
  FileText,
  User,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { Complaint, ComplaintComment, ComplaintStatus } from '../types';

interface LandlordComplaintsTabProps {
  complaints: Complaint[];
  selectedComplaintId?: string | null;
  onAcknowledge: (id: string) => Promise<void>;
  onUnderReview: (id: string, data?: { landlord_response?: string }) => Promise<void>;
  onResolve: (id: string, data: { landlord_response: string }) => Promise<void>;
  onCloseComplaint: (id: string) => Promise<void>;
  onAddComment: (id: string, message: string) => Promise<void>;
  onRefresh?: () => void;
}

export const LandlordComplaintsTab: React.FC<LandlordComplaintsTabProps> = ({
  complaints = [],
  selectedComplaintId,
  onAcknowledge,
  onUnderReview,
  onResolve,
  onCloseComplaint,
  onAddComment,
  onRefresh,
}) => {
  const [activeComplaintId, setActiveComplaintId] = useState<string | null>(
    selectedComplaintId || (complaints.length > 0 ? complaints[0].id : null)
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ComplaintStatus | 'ACTIVE'>('ALL');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const [messageInput, setMessageInput] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [showStatusMenu, setShowStatusMenu] = useState<boolean>(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState<boolean>(false);
  const [attachmentName, setAttachmentName] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync active complaint if props or list changes
  useEffect(() => {
    if (selectedComplaintId) {
      setActiveComplaintId(selectedComplaintId);
      setMobileView('chat');
    } else if (!activeComplaintId && complaints.length > 0) {
      setActiveComplaintId(complaints[0].id);
    }
  }, [selectedComplaintId, complaints]);

  const activeComplaint = complaints.find((c) => c.id === activeComplaintId) || null;

  // Filter complaints list
  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      (c.subject && c.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.tenant_name && c.tenant_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.unit_number && c.unit_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.complaint_number && c.complaint_number.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') {
      return ['SUBMITTED', 'ACKNOWLEDGED', 'UNDER_REVIEW'].includes(c.status);
    }
    return c.status === statusFilter;
  });

  // Auto scroll chat to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [activeComplaintId]);

  useEffect(() => {
    scrollToBottom(true);
  }, [activeComplaint?.comments?.length, activeComplaint?.landlord_response, activeComplaint?.status]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = messageInput.trim();
    if (!text || !activeComplaint || sending) return;

    setSending(true);
    try {
      const fullMessage = attachmentName ? `${text}\n📎 Attached: ${attachmentName}` : text;
      await onAddComment(activeComplaint.id, fullMessage);
      setMessageInput('');
      setAttachmentName('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleQuickStatusChange = async (newStatus: ComplaintStatus) => {
    if (!activeComplaint) return;
    setShowStatusMenu(false);

    try {
      if (newStatus === 'ACKNOWLEDGED') {
        await onAcknowledge(activeComplaint.id);
      } else if (newStatus === 'UNDER_REVIEW') {
        await onUnderReview(activeComplaint.id, {
          landlord_response: activeComplaint.landlord_response || 'We are actively investigating this issue.',
        });
      } else if (newStatus === 'RESOLVED') {
        const responseText = prompt('Enter resolution note for tenant:', 'Issue has been mediated and resolved.') || 'Resolved by landlord.';
        await onResolve(activeComplaint.id, { landlord_response: responseText });
      } else if (newStatus === 'CLOSED') {
        await onCloseComplaint(activeComplaint.id);
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const getStatusBadge = (status: ComplaintStatus | string) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
            New
          </span>
        );
      case 'ACKNOWLEDGED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-[#331A6F]">
            Acknowledged
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            In Review
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Resolved
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            Closed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'T';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const comments: ComplaintComment[] = activeComplaint?.comments || [];

  return (
    <div className="h-[calc(100vh-120px)] min-h-[580px] w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col md:flex-row">
      {/* 1. LEFT CONVERSATION LIST PANEL */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-white shrink-0 h-full ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#331A6F]" />
              <span>Complaints & Chats</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {complaints.length} tenant grievance{complaints.length !== 1 ? 's' : ''}
            </p>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-[#331A6F]">
            WhatsApp View
          </span>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tenant, unit, or issue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-xs rounded-xl border border-transparent focus:border-slate-300 focus:outline-none transition-all placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips */}
        <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {(
            [
              { key: 'ALL', label: 'All' },
              { key: 'ACTIVE', label: 'Active' },
              { key: 'SUBMITTED', label: 'New' },
              { key: 'UNDER_REVIEW', label: 'In Review' },
              { key: 'RESOLVED', label: 'Resolved' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === filter.key
                  ? 'bg-[#331A6F] text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Conversations Scroll List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredComplaints.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium">No complaints match your search</p>
            </div>
          ) : (
            filteredComplaints.map((c) => {
              const isSelected = c.id === activeComplaintId;
              const lastComment = c.comments && c.comments.length > 0 ? c.comments[c.comments.length - 1] : null;
              const previewText = lastComment ? lastComment.message : c.description;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setActiveComplaintId(c.id);
                    setMobileView('chat');
                  }}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-purple-50/70 border-l-4 border-[#331A6F]'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Tenant Avatar */}
                  <div className="w-11 h-11 rounded-full bg-[#331A6F]/10 text-[#331A6F] font-bold text-xs flex items-center justify-center shrink-0 border border-purple-200/60 shadow-2xs">
                    {getInitials(c.tenant_name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h3 className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                        {c.tenant_name || 'Tenant'}
                      </h3>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {c.created_at
                          ? new Date(c.created_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Today'}
                      </span>
                    </div>

                    <div className="text-[11px] font-medium text-slate-700 truncate mb-1">
                      {c.subject}
                    </div>

                    <p className="text-[11px] text-slate-500 truncate leading-tight">
                      {previewText}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-2">
                      <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                        Unit {c.unit_number || 'N/A'}
                      </span>
                      {getStatusBadge(c.status)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. RIGHT CHAT CONVERSATION PANEL (WHATSAPP STYLE) */}
      <div
        className={`flex-1 flex flex-col h-full bg-[#efeae2] relative overflow-hidden ${
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeComplaint ? (
          <>
            {/* WhatsApp Chat Header */}
            <div className="bg-[#f0f2f5] border-b border-slate-300/70 px-4 py-2.5 flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back button on mobile */}
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1.5 -ml-1 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer"
                  title="Back to complaints list"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Tenant Avatar */}
                <div className="w-10 h-10 rounded-full bg-[#331A6F] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {getInitials(activeComplaint.tenant_name)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                      {activeComplaint.tenant_name || 'Tenant'}
                    </h2>
                    <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                      ({activeComplaint.complaint_number || activeComplaint.id})
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {activeComplaint.subject} • Unit {activeComplaint.unit_number || '101'}
                  </p>
                </div>
              </div>

              {/* Header Right Actions: Status Dropdown & Details Toggle */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Quick Status Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    {getStatusBadge(activeComplaint.status)}
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {showStatusMenu && (
                    <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30 text-xs animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-1 font-bold text-slate-400 uppercase text-[10px]">
                        Update Status
                      </div>
                      <button
                        onClick={() => handleQuickStatusChange('ACKNOWLEDGED')}
                        className="w-full px-3 py-1.5 text-left hover:bg-purple-50 text-purple-900 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                        <span>Acknowledge</span>
                      </button>
                      <button
                        onClick={() => handleQuickStatusChange('UNDER_REVIEW')}
                        className="w-full px-3 py-1.5 text-left hover:bg-amber-50 text-amber-900 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                        <span>Mark Under Review</span>
                      </button>
                      <button
                        onClick={() => handleQuickStatusChange('RESOLVED')}
                        className="w-full px-3 py-1.5 text-left hover:bg-emerald-50 text-emerald-900 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        <span>Mark as Resolved</span>
                      </button>
                      <button
                        onClick={() => handleQuickStatusChange('CLOSED')}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                        <span>Close Complaint</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Info Button */}
                <button
                  onClick={() => setShowInfoDrawer(!showInfoDrawer)}
                  className={`p-2 rounded-full transition-colors cursor-pointer ${
                    showInfoDrawer ? 'bg-slate-300/80 text-slate-800' : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                  title="View ticket info"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Info Drawer (Minimal & Lightweight) */}
            {showInfoDrawer && (
              <div className="bg-white border-b border-slate-200 px-4 py-3 text-xs text-slate-700 flex items-start justify-between gap-4 animate-in slide-in-from-top-2 duration-150 shrink-0 z-10">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    <FileText className="w-3.5 h-3.5 text-[#331A6F]" />
                    <span className="font-bold">{activeComplaint.subject}</span>
                    <span className="text-slate-400">•</span>
                    <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {activeComplaint.category}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    {activeComplaint.description}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                    <span>
                      <strong>Property:</strong> {activeComplaint.property_name || 'Notify Property'}
                    </span>
                    <span>
                      <strong>Unit:</strong> {activeComplaint.unit_number || 'N/A'}
                    </span>
                    <span>
                      <strong>Filed on:</strong>{' '}
                      {activeComplaint.created_at
                        ? new Date(activeComplaint.created_at).toLocaleString()
                        : 'Today'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowInfoDrawer(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* WhatsApp Chat Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 relative">
              {/* Date Marker */}
              <div className="flex justify-center my-1">
                <span className="bg-white/90 text-slate-600 text-[11px] font-medium px-3 py-1 rounded-lg shadow-2xs border border-slate-200/50">
                  {activeComplaint.created_at
                    ? new Date(activeComplaint.created_at).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Today'}
                </span>
              </div>

              {/* 1. Initial Tenant Complaint (Received Message Bubble on LEFT) */}
              <div className="flex justify-start">
                <div className="max-w-[85%] sm:max-w-[70%] md:max-w-[60%] bg-white text-slate-900 rounded-2xl rounded-tl-xs p-3 sm:p-3.5 shadow-2xs relative border border-slate-100">
                  <div className="text-[11px] font-bold text-[#331A6F] mb-1">
                    {activeComplaint.tenant_name || 'Tenant'} • Complaint Filed
                  </div>
                  <div className="font-semibold text-xs text-slate-900 mb-1">
                    {activeComplaint.subject}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">
                    {activeComplaint.description}
                  </p>
                  {activeComplaint.attachment_path && (
                    <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2 text-xs text-slate-700">
                      <Paperclip className="w-3.5 h-3.5 text-[#331A6F]" />
                      <span className="truncate">{activeComplaint.attachment_path}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-end text-[10px] text-slate-400 mt-1">
                    <span>
                      {activeComplaint.created_at
                        ? new Date(activeComplaint.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Official Landlord Response if stored on complaint (Sent Message Bubble on RIGHT) */}
              {activeComplaint.landlord_response && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] sm:max-w-[70%] md:max-w-[60%] bg-[#d9fdd3] text-slate-900 rounded-2xl rounded-tr-xs p-3 sm:p-3.5 shadow-2xs relative">
                    <div className="text-[11px] font-bold text-emerald-900 mb-0.5">
                      Property Management (You)
                    </div>
                    <p className="text-xs sm:text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">
                      {activeComplaint.landlord_response}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 mt-1">
                      <span>
                        {activeComplaint.resolved_at
                          ? new Date(activeComplaint.resolved_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Official Note'}
                      </span>
                      <CheckCheck className="w-3.5 h-3.5 text-sky-600" />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Conversation Comments stream */}
              {comments.map((comment) => {
                const isLandlord =
                  comment.author_role === 'LANDLORD' ||
                  comment.author_role === 'USER' ||
                  comment.user_id === 'mock-lp-001' ||
                  comment.user_id === 'mock-user';

                return (
                  <div
                    key={comment.id}
                    className={`flex ${isLandlord ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] md:max-w-[60%] p-3 sm:p-3.5 text-xs sm:text-sm shadow-2xs relative ${
                        isLandlord
                          ? 'bg-[#d9fdd3] text-slate-900 rounded-2xl rounded-tr-xs'
                          : 'bg-white text-slate-900 rounded-2xl rounded-tl-xs border border-slate-100'
                      }`}
                    >
                      <div
                        className={`text-[11px] font-bold mb-0.5 ${
                          isLandlord ? 'text-emerald-900' : 'text-[#331A6F]'
                        }`}
                      >
                        {isLandlord
                          ? 'Property Management (You)'
                          : comment.author_name || activeComplaint.tenant_name || 'Tenant'}
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap text-slate-900">
                        {comment.message}
                      </p>
                      <div
                        className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                          isLandlord ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        <span>
                          {comment.created_at
                            ? new Date(comment.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                        {isLandlord && <CheckCheck className="w-3.5 h-3.5 text-sky-600" />}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Resolution Banner if complaint is resolved or closed */}
              {activeComplaint.status === 'RESOLVED' && (
                <div className="flex justify-center my-3">
                  <div className="bg-emerald-100 text-emerald-900 text-xs font-semibold px-4 py-1.5 rounded-full border border-emerald-300 shadow-2xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>This complaint has been marked as RESOLVED</span>
                  </div>
                </div>
              )}

              {activeComplaint.status === 'CLOSED' && (
                <div className="flex justify-center my-3">
                  <div className="bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-1.5 rounded-full border border-slate-300 shadow-2xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-slate-600" />
                    <span>This complaint is CLOSED</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* WhatsApp Bottom Input Area */}
            <div className="bg-[#f0f2f5] border-t border-slate-300/70 p-3 sm:px-4 sm:py-3 shrink-0 z-10">
              {/* Attachment tag preview if file attached */}
              {attachmentName && (
                <div className="mb-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs text-slate-700 max-w-sm">
                  <div className="flex items-center gap-2 truncate">
                    <Paperclip className="w-3.5 h-3.5 text-[#331A6F]" />
                    <span className="truncate font-medium">{attachmentName}</span>
                  </div>
                  <button
                    onClick={() => setAttachmentName('')}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                {/* File Attachment Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAttachmentName(file.name);
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-full transition-colors cursor-pointer shrink-0"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {/* Textarea Input */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-300 focus-within:border-[#331A6F]/50 focus-within:ring-1 focus-within:ring-[#331A6F]/20 px-3.5 py-2 shadow-2xs">
                  <textarea
                    ref={textareaRef}
                    value={messageInput}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message to tenant... (Press Enter to send)"
                    rows={1}
                    className="w-full resize-none bg-transparent text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none max-h-28 overflow-y-auto"
                  />
                </div>

                {/* Send Button (WhatsApp circular style matching #331A6F) */}
                <button
                  type="submit"
                  disabled={(!messageInput.trim() && !attachmentName) || sending}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    messageInput.trim() || attachmentName
                      ? 'bg-[#331A6F] hover:bg-[#251352] text-white shadow-sm hover:scale-105 active:scale-95'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                  title="Send message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty state when no complaint exists or none selected */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f0f2f5]">
            <div className="w-16 h-16 rounded-full bg-purple-100 text-[#331A6F] flex items-center justify-center mb-4 shadow-2xs">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              No complaint conversation selected
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Select a grievance or message from the left list to review and reply directly via the WhatsApp-style interface.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
