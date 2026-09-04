import React from 'react';
import { ArrowLeft, Check, ArrowRight, Sparkles } from 'lucide-react';
import { PRICING_PLANS } from '../data/mockMallData';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';

interface PricingPageProps {
  onBack: () => void;
  onOpenGetStarted: (source?: string) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onBack, onOpenGetStarted }) => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-notify-grid text-black pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#F4F4F0]/90 backdrop-blur-md py-5 px-4 sm:px-8 border-b border-black/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-[14px] bg-[#331A6F] text-white font-extrabold text-sm border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] cursor-pointer flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>{t.backToHome}</span>
          </button>

          <div className="flex items-center gap-4">
            <LanguageSelector />

            <button
              onClick={() => onOpenGetStarted('Pricing Header CTA')}
              className="px-4 py-2 rounded-[14px] bg-[#331A6F] text-white font-extrabold text-sm border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] cursor-pointer flex items-center gap-2 uppercase tracking-wider"
            >
              <span>{t.getStarted}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-12 sm:space-y-16">
        {/* Page Heading */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[12px] bg-[#FFE600] text-black border-2 border-black shadow-[0.5px_0.5px_0_#000000] text-xs font-black uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>All Plans Free • Pricing Coming Soon</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tight mb-4">
            {t.pricingTitle}
          </h1>
          <p className="text-base sm:text-lg text-slate-700 font-normal max-w-2xl mx-auto">
            All plans are currently 100% free while in early access. Explore every feature with zero cost official subscription pricing will be announced soon.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {PRICING_PLANS.map((plan) => {
            const isRec = plan.recommended;
            return (
              <div
                key={plan.id}
                className={`relative rounded-[22px] p-6 sm:p-8 flex flex-col justify-between transition-all duration-150 border-2 border-black bg-white ${isRec
                    ? 'shadow-[0.5px_0.5px_0_#331A6F] md:-translate-y-2'
                    : 'shadow-[0.5px_0.5px_0_#000000]'
                  }`}
              >
                {/* Popular Badge */}
                {isRec && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#331A6F] text-white text-[11px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-[12px] border-2 border-black shadow-[0.5px_0.5px_0_#000000] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 stroke-[2.5]" />
                    <span>{t.mostPopular}</span>
                  </div>
                )}

                <div>
                  {/* Plan Header */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h2 className="text-2xl font-black text-black">{plan.name}</h2>
                    <span className="text-xs font-bold text-white bg-[#331A6F] border-2 border-black px-2.5 py-0.5 rounded-[8px] shadow-[0.5px_0.5px_0_#000000] uppercase tracking-wider">
                      {plan.tenantsLimit}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-normal mb-6 min-h-[36px]">{plan.tagline}</p>

                  {/* Price Header */}
                  <div className="mb-6 pb-6 border-b-2 border-black">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-black text-black tracking-tight">
                        FREE
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-black bg-[#FFE600] border-2 border-black px-2.5 py-0.5 rounded-[8px] shadow-[0.5px_0.5px_0_#000000]">
                        Pricing coming soon
                      </span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-3 mb-8">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-black mb-3">
                      Features ({plan.tenantsLimit})
                    </div>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800 font-medium">
                        <div className="w-5 h-5 rounded-[6px] bg-[#331A6F] text-white border-2 border-black flex items-center justify-center shrink-0 mt-0.5 shadow-[0.5px_0.5px_0_#000000]">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                        <span className={feat.startsWith('Everything in') ? 'font-bold text-black' : ''}>
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card CTA */}
                <button
                  onClick={() => onOpenGetStarted(`Pricing Page - ${plan.name} Plan`)}
                  className={`w-full py-3.5 px-6 rounded-[16px] border-2 border-black font-extrabold text-xs sm:text-sm shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0.5px_0.5px_0_#000000] transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider ${isRec
                      ? 'bg-[#331A6F] text-white'
                      : 'bg-white text-black'
                    }`}
                >
                  <span>{t.choosePlan}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Enterprise Note */}
        <div className="p-6 rounded-[22px] bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000000] text-center text-xs text-slate-700 font-medium max-w-2xl mx-auto">
          Need a custom deployment for multiple shopping malls across Rwanda?{' '}
          <button
            onClick={() => onOpenGetStarted('Enterprise Custom Request')}
            className="text-[#331A6F] font-bold underline cursor-pointer hover:bg-[#331A6F]/10 px-1 py-0.5 rounded-[4px]"
          >
            Talk to our Kigali team
          </button>
        </div>
      </main>
    </div>
  );
};
