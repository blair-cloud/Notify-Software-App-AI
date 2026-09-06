import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Send,
  MessageSquare,
  Wrench,
  Check,
  CheckCheck,
  ArrowLeft,
  Loader2,
  Paperclip,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { ChatMessage, ConversationSummary } from '../types';

interface LandlordMessagesTabProps {
  /** Open this tenant's thread on mount (e.g. from a tenant row). */
  initialPartnerId?: string;
  onOpenMaintenance?: (maintenanceId: string) => void;
  onRefreshData?: () => void;
}

const POLL_INTERVAL_MS = 15000;

const formatTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDay = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return 'Today';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

export const LandlordMessagesTab: React.FC<LandlordMessagesTabProps> = ({
  initialPartnerId,
  onOpenMaintenance,
  onRefreshData,
}) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string>(initialPartnerId || '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const activePartnerRef = useRef(activePartnerId);
  activePartnerRef.current = activePartnerId;

  const loadConversations = async (selectFirst = false) => {
    try {
      const list = await api.messages.getConversations();
      setConversations(list);
      if (selectFirst && !activePartnerRef.current && list.length > 0) {
        setActivePartnerId(list[0].partner_id);
      }
    } catch (err: any) {
      console.error('Failed to load conversations', err);
      setErrorMsg(err?.message || 'Could not load conversations.');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (partnerId: string, markRead = true) => {
    if (!partnerId) {
      setMessages([]);
      return;
    }
    try {
      const all = await api.messages.getAll(partnerId);
      setMessages(all);
      if (markRead) {
        await api.messages.markAsRead(partnerId);
        loadConversations();
      }
    } catch (err: any) {
      console.error('Failed to load messages', err);
      setErrorMsg(err?.message || 'Could not load this conversation.');
    }
  };

  useEffect(() => {
    loadConversations(true);
  }, []);

  useEffect(() => {
    loadMessages(activePartnerId);
  }, [activePartnerId]);

  // Light polling so a tenant's reply shows up without a manual refresh.
  useEffect(() => {
    const timer = setInterval(() => {
      loadConversations();
      if (activePartnerRef.current) loadMessages(activePartnerRef.current, false);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, mobileView]);

  const filtered = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter(
      (c) =>
        c.partner_name.toLowerCase().includes(term) ||
        (c.unit_number || '').toLowerCase().includes(term) ||
        (c.last_message || '').toLowerCase().includes(term)
    );
  }, [conversations, searchQuery]);

  const activeConv = conversations.find((c) => c.partner_id === activePartnerId);
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = content.trim();
    if (!text || !activePartnerId) return;

    setSending(true);
    setErrorMsg(null);
    try {
      const newMsg = await api.messages.send({
        recipient_id: activePartnerId,
        content: text,
        message_type: 'GENERAL',
        property_id: activeConv?.property_id,
        unit_id: activeConv?.unit_id,
      });
      setMessages((prev) => [...prev, newMsg]);
      setContent('');
      loadConversations();
      onRefreshData?.();
    } catch (err: any) {
      console.error('Failed to send message', err);
      setErrorMsg(err?.message || 'Message not sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col md:flex-row h-[calc(100vh-190px)] min-h-[460px]">
      {/* Conversation list */}
      <div
        className={`w-full md:w-80 lg:w-96 shrink-0 border-r border-slate-200 flex flex-col bg-white ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-3.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#331A6F] text-white flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 leading-tight">Tenant Messages</h2>
              <p className="text-[11px] text-slate-500">
                {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
                {totalUnread > 0 && ` • ${totalUnread} unread`}
              </p>
            </div>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tenant, unit or message"
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-subtle-dark">
          {loading ? (
            <div className="p-6 flex items-center justify-center text-slate-400 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading conversations...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No messages yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Conversations appear here when a tenant messages you.
              </p>
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.partner_id}
                onClick={() => {
                  setActivePartnerId(conv.partner_id);
                  setMobileView('chat');
                }}
                className={`w-full text-left px-3.5 py-3 border-b border-slate-100 transition-colors cursor-pointer flex gap-3 ${
                  conv.partner_id === activePartnerId ? 'bg-purple-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                  {conv.partner_name?.charAt(0).toUpperCase() || 'T'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">{conv.partner_name}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">{formatTime(conv.last_message_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-500 truncate">{conv.last_message}</span>
                    {conv.unread_count > 0 && (
                      <span className="shrink-0 bg-[#008069] text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  {(conv.unit_number || conv.has_maintenance) && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {conv.unit_number && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          Unit {conv.unit_number}
                        </span>
                      )}
                      {conv.has_maintenance && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Wrench className="w-2.5 h-2.5" /> Maintenance
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Thread */}
      <div className={`flex-1 flex flex-col bg-[#f7f6f9] min-w-0 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
        {!activePartnerId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-700">Select a conversation</p>
            <p className="text-xs text-slate-400 mt-1">Choose a tenant on the left to read and reply.</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center gap-3 shrink-0">
              <button
                onClick={() => setMobileView('list')}
                className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-9 h-9 rounded-full bg-[#331A6F] text-white font-bold text-xs flex items-center justify-center shrink-0">
                {activeConv?.partner_name?.charAt(0).toUpperCase() || 'T'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {activeConv?.partner_name || 'Tenant'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {[activeConv?.property_name, activeConv?.unit_number ? `Unit ${activeConv.unit_number}` : '']
                    .filter(Boolean)
                    .join(' • ')}
                </p>
              </div>
              {activeConv?.maintenance_request_id && onOpenMaintenance && (
                <button
                  onClick={() => onOpenMaintenance(activeConv.maintenance_request_id as string)}
                  className="px-3 py-1.5 text-[11px] font-bold text-[#331A6F] bg-purple-50 border border-purple-100 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Wrench className="w-3 h-3" /> Ticket
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="mx-4 mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded-xl">
                {errorMsg}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-subtle-dark">
              {messages.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">
                  No messages in this conversation yet.
                </p>
              ) : (
                messages.map((msg, idx) => {
                  const isMine = msg.sender_role === 'LANDLORD';
                  const prev = messages[idx - 1];
                  const showDay =
                    !prev || formatDay(prev.created_at) !== formatDay(msg.created_at);
                  return (
                    <React.Fragment key={msg.id}>
                      {showDay && (
                        <div className="flex justify-center my-3">
                          <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">
                            {formatDay(msg.created_at)}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] sm:max-w-[70%] px-3 py-2 rounded-2xl shadow-xs ${
                            isMine
                              ? 'bg-[#331A6F] text-white rounded-br-md'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                          }`}
                        >
                          {msg.message_type === 'MAINTENANCE' && (
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold mb-1 px-1.5 py-0.5 rounded ${
                                isMine ? 'bg-white/15 text-amber-200' : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              <Wrench className="w-2.5 h-2.5" />
                              {msg.maintenance_title || 'Maintenance request'}
                            </span>
                          )}
                          {msg.attachment_url && (
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className={`flex items-center gap-1.5 text-[11px] mb-1 underline ${
                                isMine ? 'text-purple-100' : 'text-[#331A6F]'
                              }`}
                            >
                              <Paperclip className="w-3 h-3" />
                              {msg.attachment_name || 'Attachment'}
                            </a>
                          )}
                          <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                              isMine ? 'text-purple-200' : 'text-slate-400'
                            }`}
                          >
                            {formatTime(msg.created_at)}
                            {isMine && (msg.is_read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Composer */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-end gap-2 shrink-0">
              <textarea
                rows={1}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-2.5 text-xs border border-slate-200 rounded-xl resize-none max-h-28 focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20"
              />
              <button
                type="submit"
                disabled={sending || !content.trim()}
                className="w-10 h-10 rounded-xl bg-[#331A6F] hover:bg-[#251352] disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
