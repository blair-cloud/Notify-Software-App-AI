import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Send,
  Paperclip,
  CheckCheck,
  Building2,
  CheckCircle2,
  Info,
  X,
  FileText
} from 'lucide-react';
import { Complaint, ComplaintComment } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface TenantComplaintChatViewProps {
  complaint: Complaint;
  onBack: () => void;
  onAddComment: (id: string, message: string) => Promise<void>;
  onCloseComplaint?: (id: string) => Promise<void>;
  activeTenancy?: any;
  user?: any;
}

export const TenantComplaintChatView: React.FC<TenantComplaintChatViewProps> = ({
  complaint,
  onBack,
  onAddComment,
  onCloseComplaint,
  activeTenancy,
  user,
}) => {
  const { t } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [complaint.id]);

  useEffect(() => {
    scrollToBottom(true);
  }, [complaint.comments?.length]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      await onAddComment(complaint.id, text);
      setInputText('');
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
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            {t.complaintSubmitted || 'Submitted'}
          </span>
        );
      case 'ACKNOWLEDGED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            {t.complaintAcknowledged || 'Acknowledged'}
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
            {t.complaintUnderReview || 'Under Review'}
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            {t.complaintResolved || 'Resolved'}
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
            {t.complaintClosed || 'Closed'}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const comments: ComplaintComment[] = complaint.comments || [];

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[#efeae2] overflow-hidden">
      {/* WhatsApp Inspired Header */}
      <div className="bg-[#f0f2f5] border-b border-slate-300/70 px-4 py-2.5 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
            title={t.back || 'Back'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Profile / Property Avatar */}
          <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
            <Building2 className="w-5 h-5 text-emerald-100" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                {t.propertyManagement || 'Property Management'}
              </h2>
              <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                ({complaint.complaint_number})
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">
              {complaint.subject} • {t.unitLabel || 'Unit'} #{activeTenancy?.unit?.unit_number || 'A-102'}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {getStatusBadge(complaint.status)}

          {complaint.status === 'RESOLVED' && onCloseComplaint && (
            <button
              onClick={() => onCloseComplaint(complaint.id)}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-full transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              title={t.confirmResolution || 'Confirm Resolution'}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.confirmResolution || 'Confirm Resolution'}</span>
            </button>
          )}

          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              showInfo ? 'bg-slate-300/80 text-slate-800' : 'text-slate-600 hover:bg-slate-200/70'
            }`}
            title={t.ticketInfo || 'Ticket info'}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ticket Details Drawer (Minimal & Lightweight) */}
      {showInfo && (
        <div className="bg-white border-b border-slate-200 px-4 py-3 text-xs text-slate-700 flex items-start justify-between gap-4 animate-in slide-in-from-top-2 duration-150 shrink-0">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 font-medium text-slate-900">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>{complaint.subject}</span>
              <span className="text-slate-400">•</span>
              <span className="uppercase text-[11px] font-bold text-slate-500">{complaint.category}</span>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">{complaint.description}</p>
          </div>
          <button
            onClick={() => setShowInfo(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* WhatsApp Message Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 relative">
        {/* Date Marker */}
        <div className="flex justify-center my-1">
          <span className="bg-white text-slate-600 text-[11px] font-medium px-3 py-1 rounded-lg shadow-xs border border-slate-200/50">
            {new Date(complaint.created_at).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Initial Complaint Message (Sent by Tenant on the Right) */}
        <div className="flex justify-end">
          <div className="max-w-[85%] sm:max-w-[70%] md:max-w-[60%] bg-[#d9fdd3] text-slate-900 rounded-2xl rounded-tr-xs p-3 sm:p-3.5 shadow-xs relative">
            <div className="font-semibold text-xs text-emerald-950 mb-1">
              {complaint.subject}
            </div>
            <p className="text-xs sm:text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">
              {complaint.description}
            </p>
            {complaint.attachment_path && (
              <div className="mt-2 p-2 bg-emerald-50/80 rounded-lg flex items-center gap-2 text-xs text-emerald-900">
                <Paperclip className="w-3.5 h-3.5" />
                <span className="truncate">{complaint.attachment_path}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 mt-1">
              <span>
                {new Date(complaint.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <CheckCheck className="w-3.5 h-3.5 text-sky-600" />
            </div>
          </div>
        </div>

        {/* Landlord Official Response if provided */}
        {complaint.landlord_response && (
          <div className="flex justify-start">
            <div className="max-w-[85%] sm:max-w-[70%] md:max-w-[60%] bg-white text-slate-900 rounded-2xl rounded-tl-xs p-3 sm:p-3.5 shadow-xs relative border border-slate-100">
              <div className="text-[11px] font-semibold text-emerald-700 mb-0.5">
                {t.propertyManagement || 'Property Management'}
              </div>
              <p className="text-xs sm:text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">
                {complaint.landlord_response}
              </p>
              <div className="flex items-center justify-end text-[10px] text-slate-400 mt-1">
                <span>
                  {complaint.resolved_at
                    ? new Date(complaint.resolved_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Conversation Comments */}
        {comments.map((comment) => {
          const isTenant = comment.author_role === 'TENANT';
          return (
            <div
              key={comment.id}
              className={`flex ${isTenant ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[70%] md:max-w-[60%] p-3 sm:p-3.5 text-xs sm:text-sm shadow-xs relative ${
                  isTenant
                    ? 'bg-[#d9fdd3] text-slate-900 rounded-2xl rounded-tr-xs'
                    : 'bg-white text-slate-900 rounded-2xl rounded-tl-xs border border-slate-100'
                }`}
              >
                {!isTenant && (
                  <div className="text-[11px] font-semibold text-emerald-700 mb-0.5">
                    {comment.author_name || (t.propertyManagement || 'Property Management')}
                  </div>
                )}
                <p className="leading-relaxed whitespace-pre-wrap text-slate-900">
                  {comment.message}
                </p>
                <div
                  className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                    isTenant ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  <span>
                    {new Date(comment.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isTenant && <CheckCheck className="w-3.5 h-3.5 text-sky-600" />}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* WhatsApp Inspired Input Area at Bottom */}
      <div className="p-2.5 sm:p-3 bg-[#f0f2f5] border-t border-slate-300/70 shrink-0">
        <form
          onSubmit={handleSendMessage}
          className="flex items-end gap-2 max-w-4xl mx-auto"
        >
          <button
            type="button"
            onClick={() => alert(t.attachmentUploadReady || 'Attachment upload ready.')}
            className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200/70 rounded-full transition-colors cursor-pointer shrink-0"
            title={t.attachFile || 'Attach file'}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1 bg-white rounded-2xl px-3.5 py-1.5 shadow-2xs border border-slate-200/80 focus-within:border-emerald-600 transition-colors flex items-end">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={t.typeMessage || 'Type a message...'}
              className="w-full bg-transparent resize-none text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none max-h-28 py-1.5 leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full shadow-xs transition-colors cursor-pointer shrink-0 flex items-center justify-center"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
