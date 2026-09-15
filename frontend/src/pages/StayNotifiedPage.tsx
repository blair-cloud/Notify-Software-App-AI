import React, { useState } from 'react';
import { Send, CheckCircle2, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface StayNotifiedPageProps {
  onBack: () => void;
  onOpenGetStarted: (source?: string) => void;
}

export const StayNotifiedPage: React.FC<StayNotifiedPageProps> = () => {
  const { t } = useLanguage();

  const [rules, setRules] = useState([
    {
      id: 'rule-1',
      title: '5-Day Rent Due Reminder',
      channel: 'SMS & WhatsApp',
      enabled: true,
    },
    {
      id: 'rule-2',
      title: 'Day 1 Overdue Escalation Notice',
      channel: 'WhatsApp & Email',
      enabled: true,
    },
    {
      id: 'rule-3',
      title: 'Instant Payment Receipt Auto-Send',
      channel: 'SMS & Email',
      enabled: true,
    },
    {
      id: 'rule-4',
      title: '30-Day Lease Expiry Alert',
      channel: 'Email & In-App',
      enabled: false,
    },
  ]);

  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);

  const logs = [
    {
      id: 'log-1',
      timestamp: 'Today, 10:30 AM',
      channel: 'SMS',
      recipient: 'Java House Coffee',
      message: 'Monthly rent RWF 1,450,000 due in 5 days.',
    },
    {
      id: 'log-2',
      timestamp: 'Today, 09:15 AM',
      channel: 'WhatsApp',
      recipient: 'Inzora Specialty Cafe',
      message: 'Payment of RWF 950,000 received. Receipt #REC-0891.',
    },
    {
      id: 'log-3',
      timestamp: 'Yesterday, 04:00 PM',
      channel: 'SMS',
      recipient: 'Electronics Hub Kigali',
      message: 'Unit S-03 rent is overdue by 3 days.',
    },
  ];

  const toggleRule = (id: string) => {
    setRules(
      rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage) return;
    setBroadcastSent(true);
    setTimeout(() => {
      setBroadcastSent(false);
      setBroadcastMessage('');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-notify-grid text-black pb-24 font-roboto">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-36 sm:pt-40 space-y-8">
        {/* Title */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
            {t.stayNotifiedTitle}
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
            {t.stayNotifiedSubtitle} &bull; {rules.filter((r) => r.enabled).length} {t.activeAutomatedRules}
          </p>
        </div>

        {/* Minimal Broadcast Notice */}
        <div className="p-5 sm:p-6 rounded-[20px] bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000000]">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#331A6F] mb-3">
            {t.sendBroadcastNotice}
          </h2>

          {broadcastSent ? (
            <div className="p-3 bg-emerald-100 border-2 border-black rounded-[12px] font-bold text-xs text-black flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
              <span>{t.broadcastDispatched}</span>
            </div>
          ) : (
            <form onSubmit={handleBroadcast} className="space-y-3">
              <input
                type="text"
                required
                placeholder={t.typeNoticeMessage}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full text-xs bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3.5 py-2.5 text-black font-semibold focus:outline-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-[12px] bg-[#331A6F] text-white font-extrabold text-xs border-2 border-black shadow-[0.5px_0.5px_0_#000000] cursor-pointer flex items-center gap-2 uppercase tracking-wider"
                >
                  <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{t.sendBroadcast}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Automation Rules */}
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            {t.activeAutomations}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-[16px] bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000000] flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-xs font-bold text-black">{rule.title}</div>
                  <div className="text-[11px] font-semibold text-slate-500">{rule.channel}</div>
                </div>
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`px-3 py-1 rounded-[8px] text-[10px] font-black uppercase border-2 border-black cursor-pointer transition-all ${
                    rule.enabled ? 'bg-emerald-300 text-black' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {rule.enabled ? t.activeRule : t.offRule}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Live Logs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              {t.recentSentLog}
            </h2>
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 text-emerald-600 stroke-[2.5]" /> {t.liveStatus}
            </span>
          </div>

          <div className="bg-white rounded-[20px] border-2 border-black shadow-[0.5px_0.5px_0_#000000] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#331A6F] text-white text-[11px] uppercase font-extrabold border-b-2 border-black">
                  <th className="p-3 pl-5">{t.recipient}</th>
                  <th className="p-3">{t.channel}</th>
                  <th className="p-3">{t.message}</th>
                  <th className="p-3 pr-5 text-right">{t.time}</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/10 text-xs text-black">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#331A6F]/5 transition-colors">
                    <td className="p-3 pl-5 font-bold text-black">{log.recipient}</td>
                    <td className="p-3 font-semibold text-[#331A6F]">{log.channel}</td>
                    <td className="p-3 text-slate-600 font-medium truncate max-w-xs">{log.message}</td>
                    <td className="p-3 pr-5 text-right text-slate-500 text-[11px]">{log.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
