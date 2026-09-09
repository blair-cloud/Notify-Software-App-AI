import React, { useState } from 'react';
import { Search, Send, CheckCircle2 } from 'lucide-react';
import { PaymentTransaction } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface CollectRentPageProps {
  onBack: () => void;
  onOpenGetStarted: (source?: string) => void;
}

export const CollectRentPage: React.FC<CollectRentPageProps> = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stkPhone, setStkPhone] = useState('');
  const [stkAmount, setStkAmount] = useState('1600000');
  const [stkSent, setStkSent] = useState(false);

  const [transactions] = useState<PaymentTransaction[]>([
    {
      id: 'tx-101',
      tenantName: 'Inzora Specialty Cafe',
      unitCode: 'Unit G-12',
      amountRwf: 950000,
      date: '2026-08-02',
      method: 'MTN Mobile Money',
      status: 'completed',
      receiptNo: 'REC-2026-0891',
    },
    {
      id: 'tx-102',
      tenantName: 'Java House Coffee',
      unitCode: 'Unit F-04',
      amountRwf: 1600000,
      date: '2026-08-10',
      method: 'MTN Mobile Money',
      status: 'pending',
      receiptNo: 'PEND-8812',
    },
    {
      id: 'tx-103',
      tenantName: 'Express Pharmacy Rwanda',
      unitCode: 'Unit F-15',
      amountRwf: 800000,
      date: '2026-08-01',
      method: 'Bank Wire (I&M)',
      status: 'completed',
      receiptNo: 'REC-2026-0811',
    },
    {
      id: 'tx-104',
      tenantName: 'Electronics Hub Kigali',
      unitCode: 'Unit S-03',
      amountRwf: 1100000,
      date: '2026-08-05',
      method: 'Airtel Money',
      status: 'overdue',
      receiptNo: 'OVERDUE-03',
    },
    {
      id: 'tx-105',
      tenantName: 'Kigali Innovation Hub',
      unitCode: 'Unit S-08',
      amountRwf: 2100000,
      date: '2026-07-28',
      method: 'BK Direct Deposit',
      status: 'completed',
      receiptNo: 'REC-2026-0774',
    },
    {
      id: 'tx-106',
      tenantName: 'Simba Supermarket Annex',
      unitCode: 'Unit G-05',
      amountRwf: 3500000,
      date: '2026-08-03',
      method: 'Bank Wire (I&M)',
      status: 'completed',
      receiptNo: 'REC-2026-0833',
    },
  ]);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.unitCode.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'paid') return matchesSearch && tx.status === 'completed';
    if (activeTab === 'pending') return matchesSearch && tx.status === 'pending';
    if (activeTab === 'overdue') return matchesSearch && tx.status === 'overdue';
    return matchesSearch;
  });

  const totalCollected = transactions
    .filter((tx) => tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.amountRwf, 0);

  const totalOverdue = transactions
    .filter((tx) => tx.status === 'overdue')
    .reduce((sum, tx) => sum + tx.amountRwf, 0);

  const handleSendMoMo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stkPhone) return;
    setStkSent(true);
    setTimeout(() => {
      setStkSent(false);
      setStkPhone('');
    }, 2000);
  };

  const getStatusLabel = (status: string) => {
    if (status === 'completed') return t.paid;
    if (status === 'pending') return t.pending;
    if (status === 'overdue') return t.overdue;
    return status;
  };

  const getTabLabel = (tab: string) => {
    if (tab === 'all') return t.allUnits;
    if (tab === 'paid') return t.paid;
    if (tab === 'pending') return t.pending;
    if (tab === 'overdue') return t.overdue;
    return tab;
  };

  return (
    <div className="min-h-screen bg-notify-grid text-black pb-24 font-sans">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-36 sm:pt-40 space-y-8">
        {/* Title */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
            {t.collectRentTitle}
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
            {t.collected}: RWF {totalCollected.toLocaleString()} &bull; {t.overdue}: RWF {totalOverdue.toLocaleString()}
          </p>
        </div>

        {/* Minimal MoMo STK Push Form */}
        <div className="p-5 sm:p-6 rounded-[20px] bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000000]">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#331A6F] mb-3">
            {t.triggerMoMoPrompt}
          </h2>

          {stkSent ? (
            <div className="p-3 bg-emerald-100 border-2 border-black rounded-[12px] font-bold text-xs text-black flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
              <span>{t.promptSentTo} {stkPhone}. {t.awaitingTenantPin}</span>
            </div>
          ) : (
            <form onSubmit={handleSendMoMo} className="flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1 w-full">
                <label className="text-[11px] font-bold uppercase tracking-wider text-black block mb-1">
                  {t.tenantPhone}
                </label>
                <input
                  type="text"
                  required
                  placeholder="0788000000"
                  value={stkPhone}
                  onChange={(e) => setStkPhone(e.target.value)}
                  className="w-full text-xs bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2.5 text-black font-semibold focus:outline-none"
                />
              </div>

              <div className="flex-1 w-full">
                <label className="text-[11px] font-bold uppercase tracking-wider text-black block mb-1">
                  {t.amountRwf}
                </label>
                <input
                  type="number"
                  required
                  value={stkAmount}
                  onChange={(e) => setStkAmount(e.target.value)}
                  className="w-full text-xs bg-[#FAFAFA] border-2 border-black rounded-[12px] px-3 py-2.5 text-black font-semibold focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 rounded-[12px] bg-[#331A6F] text-white font-extrabold text-xs border-2 border-black shadow-[0.5px_0.5px_0_#000000] cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider shrink-0"
              >
                <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t.sendPrompt}</span>
              </button>
            </form>
          )}
        </div>

        {/* Ledger Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="inline-flex items-center p-1 rounded-[12px] bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000000] text-xs font-bold">
            {(['all', 'paid', 'pending', 'overdue'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-[8px] uppercase tracking-wider text-[11px] transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-[#331A6F] text-white font-extrabold'
                    : 'text-black hover:bg-black/5'
                }`}
              >
                {getTabLabel(tab)}
              </button>
            ))}
          </div>

          <div className="relative sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" />
            <input
              type="text"
              placeholder={t.searchTenantUnit}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-[12px] bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000000] font-semibold text-black focus:outline-none"
            />
          </div>
        </div>

        {/* Minimal Transactions Table */}
        <div className="bg-white rounded-[20px] border-2 border-black shadow-[0.5px_0.5px_0_#000000] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#331A6F] text-white text-xs uppercase font-extrabold border-b-2 border-black">
                <th className="p-4 pl-6">{t.tenantAndUnit}</th>
                <th className="p-4">{t.amount}</th>
                <th className="p-4">{t.method}</th>
                <th className="p-4 pr-6 text-right">{t.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/10 text-xs text-black">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#331A6F]/5 transition-colors">
                  <td className="p-4 pl-6">
                    <span className="font-bold text-black block">{tx.tenantName}</span>
                    <span className="text-[11px] font-semibold text-slate-500">{tx.unitCode}</span>
                  </td>
                  <td className="p-4 font-black text-black">
                    RWF {tx.amountRwf.toLocaleString()}
                  </td>
                  <td className="p-4 text-slate-600 font-medium">{tx.method}</td>
                  <td className="p-4 pr-6 text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded-[8px] text-[11px] font-black uppercase border-2 border-black shadow-[0.5px_0.5px_0_#000000] ${
                        tx.status === 'completed'
                          ? 'bg-emerald-300 text-black'
                          : tx.status === 'pending'
                          ? 'bg-amber-300 text-black'
                          : 'bg-rose-300 text-black'
                      }`}
                    >
                      {getStatusLabel(tx.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
