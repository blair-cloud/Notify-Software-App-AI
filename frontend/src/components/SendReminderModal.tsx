import React, { useEffect, useMemo, useState } from 'react';
import {
  Tenant,
  Invoice,
  MessageTemplate,
  LocalizedMessages,
  BulkSendResult,
  CommunicationChannel,
} from '../types';
import { api } from '../services/api';
import { openWhatsApp, buildReminderWhatsAppMessage } from '../utils/whatsapp';
import {
  X,
  Send,
  Bell,
  Mail,
  Smartphone,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Languages,
  Search,
  RefreshCw,
} from 'lucide-react';

interface SendReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-selected recipient (from a tenant row or invoice). */
  tenant: Tenant | null;
  /** Full directory so the landlord can add more recipients. */
  tenants?: Tenant[];
  invoice?: Invoice | null;
  onSuccess: (msg: string) => void;
}

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'EN', label: 'English' },
  { code: 'FR', label: 'Français' },
  { code: 'RW', label: 'Kinyarwanda' },
];

const CHANNELS: { code: CommunicationChannel; label: string; icon: React.ElementType; color: string }[] = [
  { code: 'SMS', label: 'SMS', icon: Smartphone, color: 'text-amber-600' },
  { code: 'IN_APP', label: 'In-App', icon: Bell, color: 'text-[#331A6F]' },
  { code: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle, color: 'text-[#008069]' },
  { code: 'EMAIL', label: 'Email', icon: Mail, color: 'text-blue-600' },
];

const STATUS_STYLES: Record<string, string> = {
  SENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
  SKIPPED: 'bg-amber-50 text-amber-800 border-amber-200',
};

const emptyMessages = (): LocalizedMessages => ({
  EN: { title: '', body: '' },
  FR: { title: '', body: '' },
  RW: { title: '', body: '' },
});

export const SendReminderModal: React.FC<SendReminderModalProps> = ({
  isOpen,
  onClose,
  tenant,
  tenants = [],
  invoice,
  onSuccess,
}) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [templateCode, setTemplateCode] = useState('RENT_DUE_3D');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [channels, setChannels] = useState<CommunicationChannel[]>(['SMS', 'IN_APP']);
  const [messages, setMessages] = useState<LocalizedMessages>(emptyMessages());
  const [activeLang, setActiveLang] = useState('EN');
  const [customNote, setCustomNote] = useState('');
  const [search, setSearch] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<BulkSendResult | null>(null);

  // The directory always includes the tenant the modal was opened from.
  const directory = useMemo(() => {
    const all = [...tenants];
    if (tenant && !all.some((t) => t.id === tenant.id)) all.unshift(tenant);
    return all;
  }, [tenants, tenant]);

  const filteredDirectory = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return directory;
    return directory.filter((t) =>
      `${t.first_name} ${t.last_name} ${t.unit_number || ''} ${t.property_name || ''}`
        .toLowerCase()
        .includes(term)
    );
  }, [directory, search]);

  const dueAmount = invoice?.balance_due ?? tenant?.monthly_rent ?? 0;
  const currency = tenant?.currency || 'RWF';

  const variables = useMemo(
    () => ({
      amount: dueAmount ? dueAmount.toLocaleString() : '',
      currency,
      due_date: invoice?.due_date || '',
      end_date: tenant?.lease_end_date || '',
      invoice_number: invoice?.invoice_number || '',
      custom_note: customNote,
    }),
    [dueAmount, currency, invoice?.due_date, invoice?.invoice_number, tenant?.lease_end_date, customNote]
  );

  // Reset to a clean composer each time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds(tenant ? [tenant.id] : []);
    setResult(null);
    setErrorMsg(null);
    setNotice(null);
    setSearch('');
    setActiveLang('EN');
  }, [isOpen, tenant?.id]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    api.messages
      .getTemplates()
      .then((data) => {
        if (cancelled) return;
        setTemplates(data.templates || []);
        if (data.templates?.length && !data.templates.some((t) => t.code === templateCode)) {
          setTemplateCode(data.templates[0].code);
        }
      })
      .catch(() => setTemplates([]));
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Load the template's three-language wording whenever the template or its
  // variables change. The landlord's own edits are made on top of this.
  useEffect(() => {
    if (!isOpen || !templateCode) return;
    let cancelled = false;
    api.messages
      .preview({ template_code: templateCode, variables })
      .then((data) => {
        if (!cancelled) setMessages(data.messages || emptyMessages());
      })
      .catch(() => {
        if (!cancelled) setMessages(emptyMessages());
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, templateCode, variables]);

  if (!isOpen) return null;

  const toggleRecipient = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleChannel = (code: CommunicationChannel) =>
    setChannels((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));

  const updateMessage = (lang: string, field: 'title' | 'body', value: string) =>
    setMessages((prev) => ({ ...prev, [lang]: { ...(prev[lang] || {}), [field]: value } }));

  const handleTranslate = async () => {
    const source = messages[activeLang]?.body?.trim();
    if (!source) {
      setErrorMsg('Write the message in this language first, then translate it.');
      return;
    }
    try {
      setIsTranslating(true);
      setErrorMsg(null);
      const targets = LANGUAGES.map((l) => l.code).filter((l) => l !== activeLang);
      const data = await api.messages.translate({
        text: source,
        source_language: activeLang,
        target_languages: targets,
      });
      setMessages((prev) => {
        const next = { ...prev };
        targets.forEach((lang) => {
          const translated = data.translations?.[lang];
          if (translated) next[lang] = { ...(next[lang] || {}), body: translated };
        });
        return next;
      });
      setNotice(data.notice || 'Translated. Please review each language before sending.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Translation failed. Please edit each language manually.');
    } finally {
      setIsTranslating(false);
    }
  };

  const send = async (recipientIds: string[], sendChannels: CommunicationChannel[]) => {
    const template = templates.find((t) => t.code === templateCode);
    setIsSending(true);
    setErrorMsg(null);
    try {
      const data = await api.messages.sendBulk({
        recipient_ids: recipientIds,
        channels: sendChannels,
        template_code: templateCode,
        messages,
        variables,
        category: template?.category || 'SYSTEM',
        priority: template?.priority || 'MEDIUM',
        entity_type: invoice ? 'INVOICE' : undefined,
        entity_id: invoice?.id,
      });
      setResult(data);

      if (data.recipients_failed === 0 && data.channel_failed === 0) {
        onSuccess(
          `Message delivered to ${data.recipients_delivered} recipient${data.recipients_delivered === 1 ? '' : 's'} on ${data.channels.length} channel${data.channels.length === 1 ? '' : 's'}.`
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send. Please try again.');
    } finally {
      setIsSending(false);
    }
  };


  const handleOpenDirectWhatsApp = (targetTenant?: Tenant | null) => {
    const t = targetTenant || (tenant ? tenant : directory.find((d) => selectedIds.includes(d.id)));
    if (!t) {
      setErrorMsg('Please select a tenant to send via WhatsApp.');
      return;
    }
    const lang = t.preferred_language || activeLang || 'EN';
    const bodyTemplate = messages[lang]?.body || messages['EN']?.body || messages['FR']?.body || messages['RW']?.body || '';
    if (!bodyTemplate.trim()) {
      setErrorMsg('Please write a reminder message before opening WhatsApp.');
      return;
    }
    const text = buildReminderWhatsAppMessage({
      templateBody: bodyTemplate,
      tenantName: `${t.first_name} ${t.last_name}`.trim(),
      unitNumber: t.unit_number,
      propertyName: t.property_name,
      amount: variables.amount,
      dueDate: variables.due_date,
      invoiceNumber: variables.invoice_number,
    });
    openWhatsApp(t.phone || '', text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setErrorMsg('Select at least one recipient.');
      return;
    }
    if (channels.length === 0) {
      setErrorMsg('Select at least one delivery channel.');
      return;
    }
    if (!LANGUAGES.some((l) => messages[l.code]?.body?.trim())) {
      setErrorMsg('Write the message in at least one language.');
      return;
    }
    await send(selectedIds, channels);
  };

  const handleRetryFailed = async () => {
    if (!result) return;
    const failedIds = result.results.filter((r) => r.channels.some((c) => c.status === 'FAILED')).map((r) => r.tenant_id);
    const failedChannels = Array.from(
      new Set(
        result.results.flatMap((r) => r.channels.filter((c) => c.status === 'FAILED').map((c) => c.channel))
      )
    ) as CommunicationChannel[];
    if (!failedIds.length || !failedChannels.length) return;
    await send(failedIds, failedChannels);
  };

  const hasFailures = !!result && result.channel_failed > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#331A6F] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center border border-black">
              <Send className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold">Send Reminder</h3>
              <p className="text-xs text-purple-200">
                {selectedIds.length} recipient{selectedIds.length === 1 ? '' : 's'} • {channels.length} channel
                {channels.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results view */}
        {result ? (
          <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                hasFailures ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              {hasFailures ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              )}
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  {result.recipients_delivered} of {result.total_recipients} recipients reached
                </p>
                <p className="text-slate-600 mt-0.5">
                  {result.channel_sent} sent
                  {result.channel_failed > 0 && ` • ${result.channel_failed} failed`}
                  {result.channel_skipped > 0 && ` • ${result.channel_skipped} skipped`}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {result.results.map((r) => (
                <div key={r.tenant_id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{r.name}</span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {r.language}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const recTenant = directory.find((d) => d.id === r.tenant_id);
                        if (recTenant) handleOpenDirectWhatsApp(recTenant);
                      }}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Open WhatsApp chat with pre-filled message"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#008069]" />
                      <span>Chat on WhatsApp</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {r.channels.map((c) => (
                      <span
                        key={c.channel}
                        title={c.error || (c.simulated ? 'Simulated delivery (no provider configured)' : '')}
                        className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${
                          STATUS_STYLES[c.status] || STATUS_STYLES.SKIPPED
                        }`}
                      >
                        {c.channel.replace('_', '-')}: {c.status}
                        {c.simulated && c.status === 'SENT' ? ' (simulated)' : ''}
                      </span>
                    ))}
                  </div>
                  {r.channels.some((c) => c.error) && (
                    <ul className="text-[11px] text-rose-700 space-y-0.5">
                      {r.channels
                        .filter((c) => c.error)
                        .map((c) => (
                          <li key={`${c.channel}-err`}>
                            {c.channel}: {c.error}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
              {hasFailures && (
                <button
                  type="button"
                  onClick={handleRetryFailed}
                  disabled={isSending}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Retry failed
                </button>
              )}
              <button
                type="button"
                onClick={() => setResult(null)}
                className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Send another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-[#331A6F] hover:bg-[#251352] text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {notice && !errorMsg && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            {/* Recipients */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-700 font-bold">
                  Recipients <span className="text-slate-400 font-medium">({selectedIds.length} selected)</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIds(
                      selectedIds.length === filteredDirectory.length ? [] : filteredDirectory.map((t) => t.id)
                    )
                  }
                  className="text-[11px] font-bold text-[#331A6F] hover:underline cursor-pointer"
                >
                  {selectedIds.length === filteredDirectory.length ? 'Clear all' : 'Select all'}
                </button>
              </div>

              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tenant, unit or property"
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30"
                />
              </div>

              <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                {filteredDirectory.length === 0 ? (
                  <p className="p-3 text-slate-400">No tenants match your search.</p>
                ) : (
                  filteredDirectory.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-2.5 p-2.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(t.id)}
                        onChange={() => toggleRecipient(t.id)}
                        className="w-4 h-4 accent-[#331A6F]"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block font-bold text-slate-800 truncate">
                          {t.first_name} {t.last_name}
                        </span>
                        <span className="block text-[11px] text-slate-500 truncate">
                          {t.unit_number ? `Unit ${t.unit_number} • ` : ''}
                          {t.phone || 'no phone'} • {t.email || 'no email'}
                        </span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {(t.preferred_language || 'EN').toUpperCase()}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Template */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Reminder type</label>
              <select
                value={templateCode}
                onChange={(e) => setTemplateCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30"
              >
                {templates.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {templateCode === 'CUSTOM' || templateCode === 'GENERAL_ANNOUNCEMENT' || templateCode === 'MAINTENANCE_UPDATE' ? (
              <div>
                <label className="block text-slate-700 font-bold mb-1">Your message</label>
                <textarea
                  rows={2}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Type the message, then review each language below."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30"
                />
              </div>
            ) : null}

            {/* Channels */}
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Delivery channels</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CHANNELS.map(({ code, label, icon: Icon, color }) => (
                  <label
                    key={code}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      channels.includes(code)
                        ? 'bg-purple-50 border-[#331A6F]/40'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={channels.includes(code)}
                      onChange={() => toggleChannel(code)}
                      className="w-4 h-4 accent-[#331A6F]"
                    />
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                    <span className="font-bold text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Message per language */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-700 font-bold">Message</label>
                <button
                  type="button"
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className="text-[11px] font-bold text-[#331A6F] hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                  Translate to other languages
                </button>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl mb-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setActiveLang(lang.code)}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-colors cursor-pointer ${
                      activeLang === lang.code ? 'bg-white text-[#331A6F] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {lang.label}
                    {!messages[lang.code]?.body?.trim() && <span className="text-rose-500"> •</span>}
                  </button>
                ))}
              </div>

              <input
                value={messages[activeLang]?.title || ''}
                onChange={(e) => updateMessage(activeLang, 'title', e.target.value)}
                placeholder="Subject / title"
                className="w-full px-3 py-2 mb-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30 font-semibold"
              />
              <textarea
                rows={5}
                value={messages[activeLang]?.body || ''}
                onChange={(e) => updateMessage(activeLang, 'body', e.target.value)}
                placeholder="Message body"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30 leading-relaxed"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Each tenant receives the version for their own language. Placeholders like{' '}
                <code className="font-mono">{'{{tenant_name}}'}</code> and{' '}
                <code className="font-mono">{'{{unit_number}}'}</code> are filled in per tenant.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleOpenDirectWhatsApp()}
                disabled={selectedIds.length === 0}
                className="px-4 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
                title="Open WhatsApp with prefilled reminder message"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Open in WhatsApp</span>
              </button>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSending}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2.5 bg-[#331A6F] hover:bg-[#251352] text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      Send to {selectedIds.length} recipient{selectedIds.length === 1 ? '' : 's'}
                    </span>
                  </>
                )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
