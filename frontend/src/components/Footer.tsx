import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { BRAND_IMAGES, BrandPicture } from '../constants/brandImages';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-notify-grid border-t-2 border-black pt-20 pb-12 sm:pt-24 sm:pb-16 lg:pt-28 lg:pb-16 text-black mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-8 sm:gap-12">
          <div className="flex flex-col items-start gap-1.5">
            <BrandPicture
              webp={BRAND_IMAGES.logo}
              png={BRAND_IMAGES.logoPng}
              alt="Notify"
              className="h-16 sm:h-20 w-auto object-contain"
              loading="lazy"
            />
            <p className="text-xs text-slate-700 font-normal mt-1">
              {t.heroTitle1}{t.heroTitle2}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 text-xs font-medium text-slate-700">
            <div>{t.footerRights}</div>
          </div>
        </div>
      </div>
    </footer>
  );
};
