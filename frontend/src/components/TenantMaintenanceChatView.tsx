import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  Wrench,
  RotateCcw,
  CheckCircle2,
  X
} from 'lucide-react';
import { MaintenanceRequest } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface TenantMaintenanceChatViewProps {
  request: MaintenanceRequest;
  onBack: () => void;
  onAddComment: (id: string, message: string) => Promise<void>;
  onConfirmResolution?: (id: string, data?: { tenant_notes?: string }) => Promise<void>;
  onReopen?: (id: string, data: { tenant_notes: string }) => Promise<void>;
  activeTenancy?: any;
  user?: any;
}

export const TenantMaintenanceChatView: React.FC<TenantMaintenanceChatViewProps> = ({
  request,
  onBack,
  onAddComment,
  onConfirmResolution,
  onReopen,
  activeTenancy,
}) => {
  const { t } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenNotes, setReopenNotes] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [request.id]);

  useEffect(() => {
    scrollToBottom(true);
  }, [request.comments?.length]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      await onAddComment(request.id, text);
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

  const comments = request.comments || [];

  return (
    <div id="tenant-maintenance-chat" className="flex-1 flex flex-col h-full w-full bg-[#efeae2] overflow-hidden">
      {/* Clean WhatsApp Header */}
      <div className="bg-[#f0f2f5] border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
            title={t.backToDashboard || 'Back to dashboard'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#008069] text-white flex items-center justify-center font-bold text-sm shadow-2xs">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>

          <div className="min-w-0">
            <h2 className="font-semibold text-slate-900 text-sm sm:text-base truncate leading-snug">
              {t.maintenanceSupport || 'Maintenance Support'}
            </h2>
            <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0"></span>
              <span>{t.online || 'Online'} • {t.unitLabel || 'Unit'} #{activeTenancy?.unit?.unit_number || 'A-102'}</span>
            </p>
          </div>
        </div>

        {/* Resolution action (if resolved) */}
        {request.status === 'RESOLVED' && (
          <div className="flex items-center gap-1.5 shrink-0">
            {onConfirmResolution && (
              <button
                onClick={() => onConfirmResolution(request.id)}
                className="px-3 py-1.5 bg-[#008069] hover:bg-[#00705a] text-white text-xs font-semibold rounded-full transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.confirmDone || 'Confirm Done'}</span>
              </button>
            )}
            {onReopen && (
              <button
                onClick={() => setShowReopenModal(true)}
                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold rounded-full border border-rose-200 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.reopen || 'Reopen'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* WhatsApp Message Stream */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 relative"
        style={{
          backgroundImage: `radial-gradient(#cbd5e1 0.75px, transparent 0.75px)`,
          backgroundSize: '24px 24px',
        }}
      >
        {/* Date Marker */}
        <div className="flex justify-center my-1">
          <span className="bg-white/90 text-slate-600 text-[11px] font-medium px-3 py-1 rounded-lg shadow-2xs border border-slate-200/50">
            {new Date(request.created_at).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Initial Tenant Issue Message (Right) */}
        <div className="flex justify-end">
          <div className="max-w-[85%] sm:max-w-[70%] md:max-w-[60%] bg-[#d9fdd3] text-[#111b21] rounded-2xl rounded-tr-xs p-3 shadow-2xs relative">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {request.description || request.title}
            </p>
            <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 mt-1">
              <span>
                {new Date(request.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
            </div>
          </div>
        </div>

        {/* Conversation Comments */}
        {comments.map((comment) => {
          const isTenant = comment.author_role === 'TENANT';
          return (
            <div
              key={comment.id}
              className={`flex flex-col ${isTenant ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[70%] md:max-w-[60%] rounded-2xl p-3 shadow-2xs relative ${
                  isTenant
                    ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-xs'
                    : 'bg-white text-[#111b21] rounded-tl-xs border border-slate-200/50'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {comment.message}
                </p>
                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 mt-1">
                  <span>
                    {new Date(comment.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isTenant && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed WhatsApp Message Input Bar */}
      <div className="p-2.5 sm:p-3 bg-[#f0f2f5] border-t border-slate-200 shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={t.typeMessage || 'Type a message...'}
              className="w-full px-4 py-2.5 text-sm bg-white border-none rounded-2xl focus:outline-none focus:ring-0 text-slate-900 placeholder:text-slate-400 shadow-2xs resize-none max-h-24 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className={`w-10 h-10 rounded-full text-white flex items-center justify-center shrink-0 shadow-2xs transition-all active:scale-95 cursor-pointer ${
              sending || !inputText.trim()
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-[#008069] hover:bg-[#00705a]'
            }`}
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Reopen Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base">{t.reopenMaintenanceRequest || 'Reopen Maintenance Request'}</h3>
              <button
                onClick={() => setShowReopenModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              rows={3}
              value={reopenNotes}
              onChange={(e) => setReopenNotes(e.target.value)}
              placeholder={t.reopenExplanationPlaceholder || 'Explain why the issue requires further attention...'}
              className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReopenModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                {t.cancel || 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  if (onReopen && reopenNotes.trim()) {
                    await onReopen(request.id, { tenant_notes: reopenNotes });
                    setShowReopenModal(false);
                    setReopenNotes('');
                  }
                }}
                disabled={!reopenNotes.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl cursor-pointer"
              >
                {t.submitReopen || 'Submit Reopen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
