import React from 'react';
import { FeatureCard } from './FeatureCard';
import { FeatureItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { BRAND_IMAGES, BrandPicture } from '../constants/brandImages';

interface ValuePropositionProps {
  onSelectFeature?: (featureKey: string) => void;
}

export const ValueProposition: React.FC<ValuePropositionProps> = ({ onSelectFeature }) => {
  const { t } = useLanguage();

  const features: (FeatureItem & { pageKey: string })[] = [
    {
      number: '01',
      title: t.featureManageUnitsTitle,
      description: t.featureManageUnitsDesc,
      iconName: 'ManageUnits',
      pageKey: 'manage-units',
    },
    {
      number: '02',
      title: t.featureCollectRentTitle,
      description: t.featureCollectRentDesc,
      iconName: 'CollectRent',
      pageKey: 'collect-rent',
    },
    {
      number: '03',
      title: t.featureStayNotifiedTitle,
      description: t.featureStayNotifiedDesc,
      iconName: 'StayNotified',
      pageKey: 'stay-notified',
    },
  ];

  return (
    <section id="features" className="py-20 sm:py-28 bg-notify-grid border-t-2 border-black relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[14px] bg-[#331A6F] text-white text-xs font-bold uppercase tracking-wider mb-4 border-2 border-black shadow-[0.5px_0.5px_0_#000000]">
            {t.everythingInOnePlace}
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-black tracking-tight mb-4">
            {t.yourMallUnderControl}
          </h2>
          <p className="text-base sm:text-lg text-slate-700 font-normal leading-relaxed">
            {t.valuePropSubtitle}
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature) => (
            <FeatureCard
              key={feature.number}
              feature={feature}
              onClick={() => onSelectFeature && onSelectFeature(feature.pageKey)}
            />
          ))}
        </div>

      </div>

      {/* Certifications */}
      <hr className="mt-16 sm:mt-20 border-t-2 border-black" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-14 text-center">
        <p className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-6">
          {t.certifiedBy}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16">
          <BrandPicture
            webp={BRAND_IMAGES.cyber}
            png={BRAND_IMAGES.cyberPng}
            alt="Cyber security certification"
            className="h-24 sm:h-28 w-auto object-contain"
            loading="lazy"
          />
          <BrandPicture
            webp={BRAND_IMAGES.rwandadpo}
            png={BRAND_IMAGES.rwandadpoPng}
            alt="Rwanda Data Protection Office certification"
            className="h-24 sm:h-28 w-auto object-contain"
            loading="lazy"
          />
          <BrandPicture
            webp={BRAND_IMAGES.rdb}
            png={BRAND_IMAGES.rdbPng}
            alt="Rwanda Development Board (RDB)"
            className="h-24 sm:h-28 w-auto object-contain"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
};


