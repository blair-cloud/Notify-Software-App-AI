import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Send,
  Paperclip,
  Wrench,
  MessageSquare,
  Check,
  CheckCheck,
  ArrowLeft,
  X,
  Image as ImageIcon,
  FileText,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import {
  ChatMessage,
  ConversationSummary,
  Tenancy,
  MaintenanceCategory,
} from '../types';

interface TenantMessagesTabProps {
  initialMaintenanceMode?: boolean;
  activeTenancies?: Tenancy[];
  onOpenMaintenanceDetails?: (maintenanceId: string) => void;
  onRefreshData?: () => void;
}

export const TenantMessagesTab: React.FC<TenantMessagesTabProps> = ({
  initialMaintenanceMode = false,
  activeTenancies = [],
  onRefreshData,
}) => {
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string>('mock-landlord-001');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Mobile view toggle: 'list' on small screens, 'chat' when in active conversation
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('chat');

  // Simple Mode Toggle: General vs Maintenance
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(initialMaintenanceMode);
  const [content, setContent] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const primaryTenancy = activeTenancies[0];
  const propertyName = primaryTenancy?.property?.name || 'Kigali City Mall';
  const unitNumber = primaryTenancy?.unit?.unit_number || 'A-102';

  // Load conversations
  const loadConversations = async () => {
    try {
      setLoading(true);
      const convList = await api.messages.getConversations();
      setConversations(convList);
      if (convList.length > 0 && !activePartnerId) {
        setActivePartnerId(convList[0].partner_id);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (partnerId: string) => {
    try {
      const allMsgs = await api.messages.getAll(partnerId);
      setMessages(allMsgs);
      await api.messages.markAsRead(partnerId);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activePartnerId) {
      loadMessages(activePartnerId);
    }
  }, [activePartnerId]);

  useEffect(() => {
    if (initialMaintenanceMode) {
      setIsMaintenanceMode(true);
      setMobileView('chat');
    }
  }, [initialMaintenanceMode]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, mobileView]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setAttachmentUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSamplePhoto = () => {
    setAttachmentName('inspection_photo.jpg');
    setAttachmentUrl('https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80');
  };

  // Helper to auto-categorize maintenance requests from message content
  const detectCategory = (text: string): MaintenanceCategory => {
    const lower = text.toLowerCase();
    if (lower.includes('leak') || lower.includes('water') || lower.includes('pipe') || lower.includes('sink') || lower.includes('toilet') || lower.includes('drain')) {
      return 'PLUMBING';
    }
    if (lower.includes('power') || lower.includes('light') || lower.includes('electricity') || lower.includes('socket') || lower.includes('wire')) {
      return 'ELECTRICAL';
    }
    if (lower.includes('ac') || lower.includes('air') || lower.includes('cool') || lower.includes('hvac') || lower.includes('heat')) {
      return 'HEATING_COOLING';
    }
    if (lower.includes('lock') || lower.includes('key') || lower.includes('door') || lower.includes('security') || lower.includes('gate')) {
      return 'SECURITY';
    }
    if (lower.includes('clean') || lower.includes('trash') || lower.includes('waste') || lower.includes('garbage')) {
      return 'CLEANING';
    }
    return 'OTHER';
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = content.trim();
    if (!text && !attachmentUrl) return;

    setSending(true);
    try {
      const isMaint = isMaintenanceMode;
      const title = isMaint
        ? text.length > 50 ? `${text.substring(0, 47)}...` : (text || (t.maintenanceInquiry || 'Maintenance Inquiry'))
        : undefined;

      const newMsg = await api.messages.send({
        recipient_id: activePartnerId,
        content: text || (isMaint ? (t.submittedMaintenancePhoto || 'Submitted maintenance photo') : (t.sentAnAttachment || 'Sent an attachment')),
        message_type: isMaint ? 'MAINTENANCE' : 'GENERAL',
        maintenance_title: title,
        maintenance_category: isMaint ? detectCategory(text) : undefined,
        maintenance_priority: 'MEDIUM',
        attachment_url: attachmentUrl || undefined,
        attachment_name: attachmentName || undefined,
        property_id: primaryTenancy?.property?.id,
        unit_id: primaryTenancy?.unit?.id,
      });

      setMessages((prev) => [...prev, newMsg]);
      setContent('');
      setAttachmentUrl('');
      setAttachmentName('');

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      loadConversations();
      onRefreshData?.();
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.partner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.last_message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const activeConv = conversations.find((c) => c.partner_id === activePartnerId) || conversations[0];

  return (
    <div id="tenant-messages-workspace" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col md:flex-row h-[calc(100vh-125px)] md:h-[calc(100vh-140px)] min-h-[460px] md:min-h-[560px]">
      {/* LEFT SIDEBAR: CONVERSATION LIST (WhatsApp Inspired) */}
      <div
        id="tenant-chat-sidebar"
        className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-slate-200 flex flex-col bg-white ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 bg-[#f0f2f5] border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#008069] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">{t.chats || 'Chats'}</h2>
              <p className="text-xs text-slate-500">{propertyName}</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-2.5 bg-white border-b border-slate-100">
          <div className="relative flex items-center bg-[#f0f2f5] rounded-xl px-3 py-1.5">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder={t.searchChats || 'Search chats'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#008069]" />
              <p className="text-xs">{t.loadingConversations || 'Loading conversations...'}</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">{t.noChatsFound || 'No chats found'}</p>
              <p className="text-xs text-slate-400 mt-1">{t.startConversationManagement || 'Start a conversation with management.'}</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = activePartnerId === conv.partner_id;
              return (
                <div
                  key={conv.id}
                  id={`conv-item-${conv.partner_id}`}
                  onClick={() => {
                    setActivePartnerId(conv.partner_id);
                    setMobileView('chat');
                  }}
                  className={`p-3.5 cursor-pointer transition flex items-center gap-3 ${
                    isActive
                      ? 'bg-[#f0f2f5]'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-[#008069] text-white flex items-center justify-center font-bold text-sm">
                      {conv.partner_name.charAt(0)}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">
                        {conv.partner_name}
                      </h4>
                      <span className="text-[11px] text-slate-400 shrink-0 ml-1">
                        {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500 truncate flex-1 pr-2">
                        {conv.last_message || (t.tapToChat || 'Tap to chat')}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="px-2 py-0.5 bg-[#25d366] text-white text-[10px] font-bold rounded-full shrink-0">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT MAIN CHAT AREA (WhatsApp Full Experience) */}
      <div
        id="tenant-chat-main-area"
        className={`flex-1 flex flex-col bg-[#efeae2] relative ${
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Chat Header */}
        <div id="tenant-chat-header" className="p-3 bg-[#f0f2f5] border-b border-slate-200 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileView('list')}
              className="md:hidden p-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors"
              title={t.back || 'Back to conversations'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#008069] text-white flex items-center justify-center font-bold text-sm">
                {activeConv?.partner_name?.charAt(0) || 'M'}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 truncate leading-snug">
                {activeConv?.partner_name || (t.landlordPropertySupport || 'Landlord & Property Support')}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0"></span>
                <span>{t.online || 'Online'} • {propertyName} ({t.unitLabel || 'Unit'} {unitNumber})</span>
              </p>
            </div>
          </div>

          {/* Simple Mode Toggle (Chat vs Maintenance) */}
          <div className="flex items-center gap-1 bg-white/80 backdrop-blur-xs p-1 rounded-xl border border-slate-200/80 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => setIsMaintenanceMode(false)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                !isMaintenanceMode
                  ? 'bg-[#008069] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.chat || 'Chat'}
            </button>
            <button
              type="button"
              onClick={() => setIsMaintenanceMode(true)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                isMaintenanceMode
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wrench className="w-3 h-3" />
              <span>{t.maintenance || 'Maintenance'}</span>
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div
          id="tenant-chat-stream"
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3"
          style={{
            backgroundImage: `radial-gradient(#cbd5e1 0.75px, transparent 0.75px)`,
            backgroundSize: '24px 24px',
          }}
        >
          {/* Top Encrypted / Direct sync notice */}
          <div className="flex justify-center my-1">
            <span className="bg-white/90 text-slate-600 text-[11px] font-medium px-3 py-1 rounded-lg shadow-2xs border border-slate-200/50">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          {messages.map((msg) => {
            const isMe = msg.sender_role === 'TENANT';

            return (
              <div
                key={msg.id}
                id={`msg-bubble-${msg.id}`}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[70%] md:max-w-[60%] rounded-2xl p-3 shadow-2xs relative transition-all ${
                    isMe
                      ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-xs'
                      : 'bg-white text-[#111b21] rounded-tl-xs border border-slate-200/50'
                  }`}
                >
                  {/* Message Body Content */}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>

                  {/* Attachment if present */}
                  {msg.attachment_url && (
                    <div className="mt-2">
                      {msg.attachment_name?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
                      msg.attachment_url.startsWith('data:image') ||
                      msg.attachment_url.includes('images.unsplash.com') ? (
                        <div className="rounded-xl overflow-hidden border border-slate-200/60 max-w-sm">
                          <img
                            src={msg.attachment_url}
                            alt={msg.attachment_name || 'Attachment'}
                            className="w-full max-h-56 object-cover hover:opacity-95 cursor-pointer transition-opacity"
                            onClick={() => window.open(msg.attachment_url, '_blank')}
                          />
                          <div className="p-1.5 text-[11px] bg-black/5 text-slate-700 flex items-center justify-between">
                            <span className="truncate flex items-center gap-1 font-medium">
                              <ImageIcon className="w-3.5 h-3.5" />
                              {msg.attachment_name || (t.photoAttachment || 'Photo attachment')}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <a
                          href={msg.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-800 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-[#008069]" />
                          <span className="font-medium truncate">{msg.attachment_name || (t.attachedFile || 'Attached File')}</span>
                          <ExternalLink className="w-3.5 h-3.5 ml-auto text-slate-400" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Timestamp & Read Checks */}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-500">
                    <span>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      <span>
                        {msg.is_read ? (
                          <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] inline" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-slate-400 inline" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>

        {/* FIXED MESSAGE INPUT AT BOTTOM (WhatsApp Inspired) */}
        <div id="tenant-chat-input-bar" className="p-2.5 sm:p-3 bg-[#f0f2f5] border-t border-slate-200 shrink-0">
          {/* Attachment Preview Chip (if uploaded) */}
          {attachmentUrl && (
            <div className="flex items-center justify-between p-2 mb-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="w-4 h-4 text-[#008069] shrink-0" />
                <span className="font-medium truncate">{attachmentName || (t.photoAttached || 'Photo Attached')}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttachmentUrl('');
                  setAttachmentName('');
                }}
                className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                title={t.removeAttachment || 'Remove attachment'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
            />

            {/* Attach File Button */}
            <button
              type="button"
              id="attach-file-btn"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-full transition-colors shrink-0 cursor-pointer"
              title={t.attachPhotoDocument || 'Attach photo or document'}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {!attachmentUrl && (
              <button
                type="button"
                onClick={handleAddSamplePhoto}
                className="hidden sm:flex items-center gap-1 p-2 text-xs text-slate-500 hover:text-[#008069] hover:bg-slate-200/60 rounded-full transition-colors shrink-0 cursor-pointer"
                title={t.attachSamplePhoto || 'Attach sample photo'}
              >
                <ImageIcon className="w-4 h-4 text-[#008069]" />
              </button>
            )}

            {/* Input Text Box */}
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                rows={1}
                id="chat-message-input"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  isMaintenanceMode
                    ? (t.describeMaintenanceIssue || 'Describe your maintenance issue...')
                    : (t.typeMessage || 'Type a message...')
                }
                className="w-full px-4 py-2.5 text-sm bg-white border-none rounded-2xl focus:outline-none focus:ring-0 text-slate-900 placeholder:text-slate-400 shadow-2xs resize-none max-h-24 transition-all"
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              id="send-message-btn"
              disabled={sending || (!content.trim() && !attachmentUrl)}
              className={`w-10 h-10 rounded-full text-white flex items-center justify-center shrink-0 shadow-2xs transition-all active:scale-95 cursor-pointer ${
                sending || (!content.trim() && !attachmentUrl)
                  ? 'bg-slate-300 cursor-not-allowed'
                  : isMaintenanceMode
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-[#008069] hover:bg-[#00705a]'
              }`}
              title={t.sendMessage || 'Send message'}
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
