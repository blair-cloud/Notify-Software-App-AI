import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Mail, MapPin, ChevronDown, CheckCircle2, Send, HelpCircle, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';

interface SupportPageProps {
  onBack: () => void;
  onOpenGetStarted: (source?: string) => void;
}

export const SupportPage: React.FC<SupportPageProps> = ({ onBack, onOpenGetStarted }) => {
  const { t } = useLanguage();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [name, setName] = useState('');
  const [mallName, setMallName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const faqs = [
    {
      question: 'How does MTN Mobile Money & Airtel Money rent collection work in Kigali?',
      answer:
        'Notify integrates directly with Rwanda telecom Mobile Money APIs. Each month, your commercial tenants receive an automated payment request or short code prompt on their phone. When they approve with their MoMo PIN, rent is instantly cleared and matched to their unit in your Notify dashboard.',
    },
    {
      question: 'Can I manage multiple commercial malls under a single Notify account?',
      answer:
        'Yes! Whether you manage Kigali Heights, CHIC Commercial Complex, Kimironko Commercial Center, or multiple shopping plazas across Nyarugenge and Gasabo, you can manage all properties and units from a single unified account.',
    },
    {
      question: 'How are overdue rent notifications sent to commercial tenants?',
      answer:
        'You can configure custom escalation rules in Notify. Standard workflows send an SMS reminder 5 days before the 1st of the month, followed by an automated WhatsApp message and email statement if payment is overdue by 24 hours.',
    },
    {
      question: 'Is there an onboarding setup fee for Kigali landlords?',
      answer:
        'No setup fees! Our local Kigali team provides free assistance to import your current tenant list, floor plans, and rental lease agreements directly into Notify.',
    },
    {
      question: 'Can I generate EBM-compliant tax invoice reports for my tenants?',
      answer:
        'Yes, Notify automatically formats monthly rent collection data and exports itemized tax summaries compatible with Rwanda Revenue Authority (RRA) EBM reporting standards.',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !message) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setName('');
      setMallName('');
      setEmail('');
      setPhone('');
      setMessage('');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-notify-grid text-black pb-24">
      {/* Top Navigation Bar with No Horizontal Line Under Navbar */}
      <header className="sticky top-0 z-40 bg-[#F4F4F0]/90 backdrop-blur-md py-5 px-4 sm:px-8 border-b border-black/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-[14px] bg-[#331A6F] text-white font-extrabold text-sm border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0.5px_0.5px_0_#000000] transition-all duration-150 cursor-pointer flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>{t.backToHome}</span>
          </button>

          <div className="flex items-center gap-3">
            <LanguageSelector />

            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-[12px] text-xs font-bold bg-[#331A6F] text-white border-2 border-black shadow-[0.5px_0.5px_0_#000000]">
              {t.support}
            </span>
            <button
              onClick={() => onOpenGetStarted('Support Header')}
              className="px-5 py-2.5 rounded-[14px] bg-white text-black font-extrabold text-xs sm:text-sm border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] cursor-pointer"
            >
              {t.getStarted}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-12 sm:space-y-16">
        {/* Page Heading */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tight mb-4">
            {t.supportTitle}
          </h1>
          <p className="text-base sm:text-lg text-slate-700 font-normal">
            {t.supportSubtitle}
          </p>
        </div>

        {/* Section 1: Contact Channels (Arranged Horizontally in a Row) */}
        <div className="space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-2">
            {t.directContactChannels}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a
              href="https://wa.me/250788364786"
              target="_blank"
              rel="noreferrer"
              className="p-6 rounded-[22px] bg-emerald-300 text-black border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] transition-all duration-150 flex flex-col justify-between min-h-[180px]"
            >
              <div>
                <div className="w-12 h-12 rounded-[14px] bg-black text-emerald-300 flex items-center justify-center border-2 border-black mb-4">
                  <MessageSquare className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-black/80">{t.whatsAppSupport}</div>
                <div className="text-xl font-black text-black mt-1">+250 788 364786</div>
              </div>
              <div className="mt-6 pt-3 border-t-2 border-black flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                <span>Instant Replies</span>
                <span className="text-[10px] bg-white/80 px-2 py-1 rounded-[6px] border border-black">8 AM - 7 PM</span>
              </div>
            </a>

            <div className="p-6 rounded-[22px] bg-white text-black border-2 border-black shadow-[0.5px_0.5px_0_#000000] flex flex-col justify-between min-h-[180px]">
              <div>
                <div className="w-12 h-12 rounded-[14px] bg-[#331A6F] text-white flex items-center justify-center border-2 border-black mb-4">
                  <Mail className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">{t.emailDesk}</div>
                <div className="text-lg font-black text-black mt-1">support@notifysoft.com</div>
              </div>
              <div className="mt-6 pt-3 border-t-2 border-black flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
                <span>Response Time</span>
                <span className="text-[10px] bg-[#FAFAFA] px-2 py-1 rounded-[6px] border border-black">Within 2 hrs</span>
              </div>
            </div>

            <div className="p-6 rounded-[22px] bg-white text-black border-2 border-black shadow-[0.5px_0.5px_0_#000000] flex flex-col justify-between min-h-[180px]">
              <div>
                <div className="w-12 h-12 rounded-[14px] bg-amber-400 text-black flex items-center justify-center border-2 border-black mb-4">
                  <MapPin className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">{t.kigaliPhoneLine}</div>
                <div className="text-lg font-black text-black mt-1">+250 788 364786</div>
              </div>
              <div className="mt-6 pt-3 border-t-2 border-black flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
                <span>Location</span>
                <span className="text-[10px] bg-[#FAFAFA] px-2 py-1 rounded-[6px] border border-black">KG 313 St, House No. 11.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 & 3: Contact Support Form & FAQs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Contact Support Form (Left Column) */}
          <div className="lg:col-span-5 p-6 sm:p-8 rounded-[22px] bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000000]">
            <h2 className="text-2xl font-black text-black mb-1">{t.sendUsAMessage}</h2>
            <p className="text-xs text-slate-600 font-normal mb-6">
              {t.describeInquiry}
            </p>

            {submitted ? (
              <div className="p-6 text-center bg-emerald-100 border-2 border-black rounded-[16px]">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2 stroke-[2.5]" />
                <div className="text-base font-bold text-black">{t.messageSentSuccess}</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-black uppercase tracking-wider block mb-1">
                    {t.yourName}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[14px] px-3.5 py-2.5 text-black font-semibold shadow-[0.5px_0.5px_0_#000000]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-black uppercase tracking-wider block mb-1">
                    {t.emailAddress}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[14px] px-3.5 py-2.5 text-black font-semibold shadow-[0.5px_0.5px_0_#000000]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-black uppercase tracking-wider block mb-1">
                    {t.describeInquiry}
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full text-sm bg-[#FAFAFA] border-2 border-black rounded-[14px] px-3.5 py-2.5 text-black font-semibold shadow-[0.5px_0.5px_0_#000000]"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-[16px] bg-[#331A6F] text-white font-extrabold text-sm border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  <span>{t.sendMessage}</span>
                  <Send className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            )}
          </div>

          {/* FAQs (Right Column) */}
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#331A6F] stroke-[2.5]" />
              {t.frequentlyAskedQuestions}
            </h2>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-[18px] border-2 border-black bg-white shadow-[0.5px_0.5px_0_#000000] overflow-hidden transition-all duration-150"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full text-left p-4 sm:p-5 text-sm sm:text-base font-bold text-black flex items-center justify-between gap-4 hover:bg-[#FAFAFA] cursor-pointer"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-black shrink-0 stroke-[2.5] transition-transform ${isOpen ? 'rotate-180 text-[#331A6F]' : ''
                          }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-slate-700 font-normal leading-relaxed border-t-2 border-black bg-[#FAFAFA]">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};


