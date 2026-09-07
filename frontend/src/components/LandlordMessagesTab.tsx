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
  X,
  Image as ImageIcon,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { api } from '../services/api';
import { realtime } from '../services/realtime';
import { ChatMessage, ConversationSummary } from '../types';

interface LandlordMessagesTabProps {
  /** Open this tenant's thread on mount (e.g. from a tenant row). */
  initialPartnerId?: string;
  onOpenMaintenance?: (maintenanceId: string) => void;
  onRefreshData?: () => void;
}

const POLL_INTERVAL_MS = 20000;
/** Messages from the same person within this window are visually grouped. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

const formatTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

/** WhatsApp-style day label: Today / Yesterday / weekday / full date. */
const formatDayLabel = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7 && days > 0) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

/** List timestamps show the clock today, "Yesterday", then a short date. */
const formatListTime = (iso?: string) => {
  if (!iso) return '';
  const label = formatDayLabel(iso);
  if (label === 'Today') return formatTime(iso);
  if (label === 'Yesterday') return 'Yesterday';
  return new Date(iso).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const isImageAttachment = (msg: ChatMessage) =>
  !!msg.attachment_url &&
  (msg.attachment_url.startsWith('data:image') ||
    !!msg.attachment_name?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
    msg.attachment_url.includes('images.unsplash.com'));

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
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  /** Unread count captured when the thread opened, used to draw the divider. */
  const [unreadOnOpen, setUnreadOnOpen] = useState(0);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    const conv = conversations.find((c) => c.partner_id === activePartnerId);
    setUnreadOnOpen(conv?.unread_count || 0);
    loadMessages(activePartnerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePartnerId]);

  // Live updates: a tenant's message arrives over the socket and is appended
  // immediately - no refresh, no waiting for a poll.
  useEffect(() => {
    const unsubscribe = realtime.subscribe((event) => {
      if (event.type !== 'message.created') return;
      const incoming: any = event.message;
      const partner =
        incoming.sender_role === 'LANDLORD' ? incoming.recipient_id : incoming.sender_id;

      loadConversations();

      if (!activePartnerRef.current && partner) {
        setActivePartnerId(partner);
        return;
      }
      if (partner !== activePartnerRef.current) return;

      setMessages((prev) => {
        if (incoming.id && prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });

      if (incoming.sender_role !== 'LANDLORD' && activePartnerRef.current) {
        api.messages.markAsRead(activePartnerRef.current).catch(() => undefined);
      }
    });
    return unsubscribe;
  }, []);

  // Safety net for a dropped socket; skipped entirely while it is connected.
  useEffect(() => {
    const timer = setInterval(() => {
      if (realtime.connected) return;
      loadConversations();
      if (activePartnerRef.current) loadMessages(activePartnerRef.current, false);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Stay pinned to the newest message unless the reader has scrolled up.
  useEffect(() => {
    if (!showJumpToLatest) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, mobileView]);

  const handleStreamScroll = () => {
    const el = streamRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJumpToLatest(distanceFromBottom > 240);
  };

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
  const firstUnreadIndex = unreadOnOpen > 0 ? Math.max(0, messages.length - unreadOnOpen) : -1;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = () => setAttachmentUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = content.trim();
    if ((!text && !attachmentUrl) || !activePartnerId) return;

    setSending(true);
    setErrorMsg(null);
    try {
      const newMsg = await api.messages.send({
        recipient_id: activePartnerId,
        content: text || 'Sent an attachment',
        message_type: 'GENERAL',
        attachment_url: attachmentUrl || undefined,
        attachment_name: attachmentName || undefined,
        property_id: activeConv?.property_id,
        unit_id: activeConv?.unit_id,
      });
      setMessages((prev) => [...prev, newMsg]);
      setContent('');
      setAttachmentUrl('');
      setAttachmentName('');
      setUnreadOnOpen(0);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
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
    <div
      id="landlord-messages-workspace"
      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col md:flex-row h-[calc(100vh-210px)] min-h-[480px]"
    >
      {/* LEFT: CHAT LIST */}
      <div
        className={`w-full md:w-80 lg:w-96 shrink-0 border-r border-slate-200 flex flex-col bg-white ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* List header */}
        <div className="p-3.5 bg-[#f0f2f5] border-b border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#008069] text-white flex items-center justify-center shadow-xs shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 leading-tight">Chats</h2>
            <p className="text-xs text-slate-500 truncate">
              {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
              {totalUnread > 0 && ` • ${totalUnread} unread`}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="p-2.5 bg-white border-b border-slate-100">
          <div className="relative flex items-center bg-[#f0f2f5] rounded-xl px-3 py-1.5">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or start a new chat"
              className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 scrollbar-subtle-dark">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#008069]" />
              <p className="text-xs">Loading chats...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No chats found</p>
              <p className="text-xs text-slate-400 mt-1">
                Conversations appear here when a tenant messages you.
              </p>
            </div>
          ) : (
            filtered.map((conv) => {
              const isActive = conv.partner_id === activePartnerId;
              return (
                <div
                  key={conv.partner_id}
                  onClick={() => {
                    setActivePartnerId(conv.partner_id);
                    setMobileView('chat');
                  }}
                  className={`p-3.5 cursor-pointer transition flex items-center gap-3 ${
                    isActive ? 'bg-[#f0f2f5]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-[#008069] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {conv.partner_name?.charAt(0).toUpperCase() || 'T'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">{conv.partner_name}</h4>
                      <span
                        className={`text-[11px] shrink-0 ml-1 ${
                          conv.unread_count > 0 ? 'text-[#25d366] font-bold' : 'text-slate-400'
                        }`}
                      >
                        {formatListTime(conv.last_message_at)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500 truncate flex-1 flex items-center gap-1">
                        {conv.has_maintenance && <Wrench className="w-3 h-3 text-amber-600 shrink-0" />}
                        <span className="truncate">{conv.last_message || 'Tap to chat'}</span>
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="px-2 py-0.5 bg-[#25d366] text-white text-[10px] font-bold rounded-full shrink-0">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>

                    {conv.unit_number && (
                      <span className="inline-block mt-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        Unit {conv.unit_number}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: CHAT AREA */}
      <div
        className={`flex-1 flex flex-col bg-[#efeae2] relative min-w-0 ${
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {!activePartnerId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-[#dfd9d2] flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-[#8696a0]" />
            </div>
            <p className="text-base font-semibold text-slate-700">Notify Chat</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Select a conversation on the left to read and reply to your tenants.
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="p-3 bg-[#f0f2f5] border-b border-slate-200 flex items-center justify-between shrink-0 z-10 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Back to chats"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-10 h-10 rounded-full bg-[#008069] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {activeConv?.partner_name?.charAt(0).toUpperCase() || 'T'}
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate leading-snug">
                    {activeConv?.partner_name || 'Tenant'}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    {[activeConv?.property_name, activeConv?.unit_number ? `Unit ${activeConv.unit_number}` : '']
                      .filter(Boolean)
                      .join(' • ') || 'Tenant'}
                  </p>
                </div>
              </div>

              {activeConv?.maintenance_request_id && onOpenMaintenance && (
                <button
                  onClick={() => onOpenMaintenance(activeConv.maintenance_request_id as string)}
                  className="px-3 py-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
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

            {/* Message stream */}
            <div
              ref={streamRef}
              onScroll={handleStreamScroll}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1.5"
              style={{
                backgroundImage: 'radial-gradient(#d6cfc7 0.75px, transparent 0.75px)',
                backgroundSize: '22px 22px',
              }}
            >
              {messages.length === 0 ? (
                <div className="flex justify-center pt-8">
                  <span className="bg-white/90 text-slate-600 text-[11px] font-medium px-3 py-1.5 rounded-lg shadow-2xs border border-slate-200/50">
                    No messages yet - say hello to start the conversation.
                  </span>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMine = msg.sender_role === 'LANDLORD';
                  const prev = messages[idx - 1];
                  const showDay = !prev || formatDayLabel(prev.created_at) !== formatDayLabel(msg.created_at);
                  const groupedWithPrev =
                    !showDay &&
                    !!prev &&
                    prev.sender_role === msg.sender_role &&
                    new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < GROUP_WINDOW_MS;

                  return (
                    <React.Fragment key={msg.id}>
                      {showDay && (
                        <div className="flex justify-center py-3">
                          <span className="bg-white/90 text-slate-600 text-[11px] font-medium px-3 py-1 rounded-lg shadow-2xs border border-slate-200/50">
                            {formatDayLabel(msg.created_at)}
                          </span>
                        </div>
                      )}

                      {idx === firstUnreadIndex && (
                        <div className="py-2">
                          <div className="bg-[#e7f3ea] text-[#008069] text-[11px] font-bold px-3 py-1 rounded-lg border border-[#cfe6d6] text-center">
                            {unreadOnOpen} unread message{unreadOnOpen === 1 ? '' : 's'}
                          </div>
                        </div>
                      )}

                      <div
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${
                          groupedWithPrev ? 'mt-0.5' : 'mt-2'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] md:max-w-[62%] px-2.5 py-1.5 shadow-2xs relative rounded-2xl ${
                            isMine
                              ? `bg-[#d9fdd3] text-[#111b21] ${groupedWithPrev ? '' : 'rounded-tr-xs'}`
                              : `bg-white text-[#111b21] border border-slate-200/50 ${
                                  groupedWithPrev ? '' : 'rounded-tl-xs'
                                }`
                          }`}
                        >
                          {msg.message_type === 'MAINTENANCE' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold mb-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                              <Wrench className="w-2.5 h-2.5" />
                              {msg.maintenance_title || 'Maintenance request'}
                            </span>
                          )}

                          {msg.attachment_url && (
                            <div className="mb-1">
                              {isImageAttachment(msg) ? (
                                <div className="rounded-xl overflow-hidden border border-black/5 max-w-xs">
                                  <img
                                    src={msg.attachment_url}
                                    alt={msg.attachment_name || 'Attachment'}
                                    onClick={() => window.open(msg.attachment_url, '_blank')}
                                    className="w-full max-h-56 object-cover hover:opacity-95 cursor-pointer transition-opacity"
                                  />
                                </div>
                              ) : (
                                <a
                                  href={msg.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 rounded-xl bg-black/5 hover:bg-black/10 text-xs text-slate-800 transition-colors"
                                >
                                  <FileText className="w-4 h-4 text-[#008069] shrink-0" />
                                  <span className="font-medium truncate">
                                    {msg.attachment_name || 'Attached file'}
                                  </span>
                                  <ExternalLink className="w-3.5 h-3.5 ml-auto text-slate-400 shrink-0" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Text reserves room for the inline timestamp, as WhatsApp does */}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words pr-12">
                            {msg.content}
                          </p>
                          <span className="absolute bottom-1 right-2.5 flex items-center gap-0.5 text-[10px] text-slate-500">
                            {formatTime(msg.created_at)}
                            {isMine &&
                              (msg.is_read ? (
                                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-slate-400" />
                              ))}
                          </span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Jump to latest */}
            {showJumpToLatest && (
              <button
                onClick={() => {
                  setShowJumpToLatest(false);
                  chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="absolute bottom-20 right-5 w-9 h-9 rounded-full bg-white shadow-md border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
                title="Jump to latest"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}

            {/* Composer */}
            <div className="p-2.5 sm:p-3 bg-[#f0f2f5] border-t border-slate-200 shrink-0">
              {attachmentUrl && (
                <div className="flex items-center justify-between p-2 mb-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <ImageIcon className="w-4 h-4 text-[#008069] shrink-0" />
                    <span className="font-medium truncate">{attachmentName || 'Attachment'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentUrl('');
                      setAttachmentName('');
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                    title="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSend} className="flex items-end gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-full transition-colors shrink-0 cursor-pointer"
                  title="Attach photo or document"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message"
                  className="flex-1 px-4 py-2.5 text-sm bg-white border-none rounded-2xl focus:outline-none focus:ring-0 text-slate-900 placeholder:text-slate-400 shadow-2xs resize-none max-h-24"
                />

                <button
                  type="submit"
                  disabled={sending || (!content.trim() && !attachmentUrl)}
                  className={`w-10 h-10 rounded-full text-white flex items-center justify-center shrink-0 shadow-2xs transition-all active:scale-95 cursor-pointer ${
                    sending || (!content.trim() && !attachmentUrl)
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-[#008069] hover:bg-[#00705a]'
                  }`}
                  title="Send message"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
