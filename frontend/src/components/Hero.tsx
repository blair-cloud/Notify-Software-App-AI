import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { BRAND_IMAGES, BrandPicture } from '../constants/brandImages';

interface HeroProps {
  onOpenGetStarted: (source?: string) => void;
  onExploreNotify: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenGetStarted }) => {
  const { t } = useLanguage();

  return (
    <section className="relative pt-40 pb-20 md:pt-48 md:pb-28 overflow-hidden bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column */}
          <div className="lg:col-span-5 text-left">
            <h1 className="text-4xl sm:text-6xl lg:text-[58px] leading-[1.05] font-black text-black tracking-tight mb-6">
              {t.heroTitle1}<span className="text-[#331A6F]">{t.heroTitle2}</span>
            </h1>

            <p className="text-base sm:text-xl text-black font-normal leading-relaxed mb-6 max-w-xl">
              {t.heroSubtitle}
            </p>

            <div className="pt-2">
              <div className="text-xs font-black uppercase tracking-wider text-[#331A6F] mb-4">
                {t.downloadApp}
              </div>
              <div className="flex flex-wrap items-center gap-5 sm:gap-6">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenGetStarted('Download Microsoft Web');
                  }}
                  className="cursor-pointer inline-block"
                  aria-label="Get it for Microsoft Web"
                >
                  <svg className="h-14 w-auto" viewBox="0 0 210 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="3" width="17" height="17" fill="#F25022" />
                    <rect x="19" y="3" width="17" height="17" fill="#7FBA00" />
                    <rect x="0" y="22" width="17" height="17" fill="#00A4EF" />
                    <rect x="19" y="22" width="17" height="17" fill="#FFB900" />
                    <text x="44" y="28" fill="#333333" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="19" fontWeight="600">Microsoft Web</text>
                  </svg>
                </a>

                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenGetStarted('Download Google Play');
                  }}
                  className="cursor-pointer inline-block"
                  aria-label="Get it on Google Play"
                >
                  <BrandPicture
                    webp={BRAND_IMAGES.playstore}
                    png={BRAND_IMAGES.playstorePng}
                    alt="Get it on Google Play"
                    className="h-14 w-auto object-contain"
                    loading="lazy"
                  />
                </a>

                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenGetStarted('Download App Store');
                  }}
                  className="cursor-pointer inline-block"
                  aria-label="Download on the App Store"
                >
                  <BrandPicture
                    webp={BRAND_IMAGES.appStore}
                    png={BRAND_IMAGES.appStorePng}
                    alt="Download on the App Store"
                    className="h-14 w-auto object-contain"
                    loading="lazy"
                  />
                </a>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 relative flex items-center justify-center">
            <div className="relative w-full transition-all duration-300 hover:scale-[1.02] lg:scale-110 xl:scale-115 transform-gpu origin-center">
              <BrandPicture
                webp={BRAND_IMAGES.landing}
                png={BRAND_IMAGES.landingPng}
                alt="Notify — Commercial Rental & Property Management Software Rwanda"
                className="w-full h-auto object-contain filter drop-shadow-[0_25px_45px_rgba(51,26,111,0.22)]"
                loading="eager"
                fetchPriority="high"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
