import React, { useState } from 'react';
import { X, HelpCircle, ChevronDown, MessageSquare, Phone, Mail } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGetStarted: (source?: string) => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose, onOpenGetStarted }) => {
  const { t } = useLanguage();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  if (!isOpen) return null;

  const faqs = [
    {
      question: 'How does Notify integrate with Rwandan Mobile Money (MTN MoMo & Airtel)?',
      answer:
        'Notify provides automated reconciliation for Mobile Money payments. When tenants pay rent via MTN MoMo or Airtel Money to your mall code or bank account, Notify automatically matches the transaction receipt with the unit number and marks the invoice as paid.',
    },
    {
      question: 'Can we manage multiple shopping malls or arcades under one account?',
      answer:
        'Yes! Notify is built for multi-property managers. You can switch between different commercial centers (e.g. Kigali Heights, CHIC, Inzora) from a single clean dashboard with separated financial logs.',
    },
    {
      question: 'What happens when a tenant is late on rent?',
      answer:
        'Notify automatically triggers friendly WhatsApp & SMS payment notices 3 days before due date, on the due date, and at custom grace period intervals specified by your mall management policy.',
    },
    {
      question: 'Is Notify compliant with Rwandan tax regulations (RRA EBM invoices)?',
      answer:
        'Yes, Notify exports VAT-compliant RWF invoices with statutory breakdown for service charges, utilities, and rental income tax reporting.',
    },
    {
      question: 'How long does it take to migrate our existing Excel tenant spreadsheets?',
      answer:
        'Most Kigali malls migrate in less than 2 hours. Our local Kigali support team helps import your unit lists, lease agreements, and tenant contact details free of charge during onboarding.',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-[22px] shadow-[0.5px_0.5px_0_#000000] border-2 border-black overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-[#FAFAFA] border-b-2 border-black flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#331A6F] text-white flex items-center justify-center font-extrabold text-xl border-2 border-black shadow-[0.5px_0.5px_0_#000000]">
              N
            </div>
            <div>
              <h3 className="font-bold text-xl text-black">{t.supportTitle}</h3>
              <p className="text-xs text-slate-700 font-normal">{t.supportSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-[12px] border-2 border-black bg-white shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] text-black font-bold cursor-pointer"
            aria-label="Close support modal"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Contact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="https://wa.me/250788364786"
              target="_blank"
              rel="noreferrer"
              className="p-4 rounded-[16px] bg-emerald-400 border-2 border-black text-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] transition-all duration-150 flex flex-col items-start gap-1 font-bold"
            >
              <MessageSquare className="w-5 h-5 stroke-[2.5] text-black" />
              <div className="text-xs font-bold uppercase mt-1">{t.whatsAppSupport}</div>
              <div className="text-xs font-semibold">+250 788 364 786</div>
            </a>

            <div className="p-4 rounded-[16px] bg-[#331A6F] border-2 border-black text-white shadow-[0.5px_0.5px_0_#000000] flex flex-col items-start gap-1 font-bold">
              <Phone className="w-5 h-5 stroke-[2.5] text-white" />
              <div className="text-xs font-bold uppercase mt-1">{t.kigaliPhoneLine}</div>
              <div className="text-xs font-semibold text-amber-300">+250 788 364786</div>
            </div>

            <div className="p-4 rounded-[16px] bg-[#FAFAFA] border-2 border-black text-black shadow-[0.5px_0.5px_0_#000000] flex flex-col items-start gap-1 font-bold">
              <Mail className="w-5 h-5 stroke-[2.5] text-black" />
              <div className="text-xs font-bold uppercase mt-1">{t.emailDesk}</div>
              <div className="text-xs font-semibold">support@notifysoft.com</div>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-black mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#331A6F] stroke-[2.5]" /> {t.frequentlyAskedQuestions}
            </h4>
            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-[16px] border-2 border-black bg-white shadow-[0.5px_0.5px_0_#000000] overflow-hidden transition-all duration-150"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full text-left p-4 text-xs sm:text-sm font-bold text-black flex items-center justify-between gap-3 hover:bg-[#FAFAFA] cursor-pointer"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-black shrink-0 stroke-[2.5] transition-transform ${isOpen ? 'rotate-180 text-[#331A6F]' : ''
                          }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="p-4 pt-0 text-xs text-slate-700 font-normal leading-relaxed border-t-2 border-black bg-[#FAFAFA]">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FAFAFA] border-t-2 border-black flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <span className="text-xs font-semibold text-black uppercase">{t.needPersonalOnboarding}</span>
          <button
            onClick={() => {
              onClose();
              onOpenGetStarted('Support Modal Footer');
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-[14px] bg-[#331A6F] text-white text-xs font-extrabold border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] transition-all duration-150 cursor-pointer uppercase"
          >
            {t.getStarted}
          </button>
        </div>
      </div>
    </div>
  );
};

