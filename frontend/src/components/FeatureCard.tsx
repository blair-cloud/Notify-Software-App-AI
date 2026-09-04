import React from 'react';
import { Building2, CreditCard, BellRing, ChevronRight } from 'lucide-react';
import { FeatureItem } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface FeatureCardProps {
  feature: FeatureItem;
  onClick?: () => void;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ feature, onClick }) => {
  const { t } = useLanguage();
  const renderIcon = () => {
    switch (feature.iconName) {
      case 'ManageUnits':
        return <Building2 className="w-6 h-6 text-black stroke-[2]" />;
      case 'CollectRent':
        return <CreditCard className="w-6 h-6 text-black stroke-[2]" />;
      case 'StayNotified':
        return <BellRing className="w-6 h-6 text-black stroke-[2]" />;
      default:
        return <Building2 className="w-6 h-6 text-black stroke-[2]" />;
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative p-6 sm:p-8 rounded-[18px] bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0.5px_0.5px_0_#000000] active:translate-x-[5px] active:translate-y-[5px] active:shadow-[0.5px_0.5px_0_#000000] transition-all duration-150 flex flex-col justify-between cursor-pointer"
    >
      <div>
        {/* Top Header: Number badge and Icon */}


        {/* Feature Title */}
        <h3 className="text-xl font-bold text-black mb-3 group-hover:text-[#331A6F] transition-colors">
          {feature.title}
        </h3>

        {/* Feature Description */}
        <p className="text-sm text-slate-700 leading-relaxed font-normal">
          {feature.description}
        </p>
      </div>

      {/* Bottom Link Indicator */}
      <div className="mt-6 pt-4 border-t-2 border-black flex items-center text-xs font-bold text-[#331A6F] group-hover:translate-x-1 transition-transform uppercase tracking-wider">
        <span>{t.openFeaturePage}</span>
        <ChevronRight className="w-4 h-4 ml-1 stroke-[2.5]" />
      </div>
    </div>
  );
};

