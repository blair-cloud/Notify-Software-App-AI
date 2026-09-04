import React from 'react';
import { ShieldCheck, FileText, ChevronRight, FileCheck, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Lease } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface TenantLeaseCountdownCardProps {
  lease: Lease | null;
  tenancy: any | null;
  onViewLeaseDetails: () => void;
  onViewDocument?: (lease: Lease) => void;
}

export const TenantLeaseCountdownCard: React.FC<TenantLeaseCountdownCardProps> = ({
  lease,
  tenancy,
  onViewLeaseDetails,
  onViewDocument,
}) => {
  const { t, language } = useLanguage();

  // Resolve dates from real backend / database objects
  const rawStartDate = lease?.start_date || tenancy?.start_date || '2026-01-01';
  const rawEndDate = lease?.end_date || tenancy?.end_date || tenancy?.unit?.lease_end_date || '2027-01-20';

  // Normalize dates to midnight for calendar day calculation
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const parsedStart = new Date(rawStartDate);
  const startDay = new Date(parsedStart.getFullYear(), parsedStart.getMonth(), parsedStart.getDate());

  const parsedEnd = new Date(rawEndDate);
  const endDay = new Date(parsedEnd.getFullYear(), parsedEnd.getMonth(), parsedEnd.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const totalDays = Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / msPerDay));
  const diffTime = endDay.getTime() - today.getTime();
  const rawRemainingDays = Math.ceil(diffTime / msPerDay);
  const remainingDays = Math.max(0, rawRemainingDays);

  // Circular progress fraction (0 to 1)
  const remainingFraction = Math.max(0, Math.min(1, remainingDays / totalDays));

  // Determine urgency status (Clean, calm, static visual indicators)
  let statusBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let statusText = t.activeLeaseStatus || 'Active Lease';
  let strokeColor = '#331A6F'; // Notify primary brand indigo

  if (rawRemainingDays <= 0) {
    statusBadgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
    statusText = t.leaseExpiredStatus || 'Lease Expired';
    strokeColor = '#64748B';
  } else if (rawRemainingDays <= 30) {
    statusBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
    statusText = t.expiringSoonStatus || 'Expiring Soon';
    strokeColor = '#E11D48';
  } else if (rawRemainingDays <= 60) {
    statusBadgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
    statusText = t.expiringTwoMonths || 'Expiring in ~2 Months';
    strokeColor = '#D97706';
  }

  // Format date: localized format
  const dateLocale = language === 'fr' ? 'fr-FR' : language === 'rw' ? 'rw-RW' : 'en-GB';
  const formattedEndDate = parsedEnd.toLocaleDateString(dateLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // SVG circular geometry
  const size = 180;
  const strokeWidth = 12;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - remainingFraction * circumference;

  const unitNumber = lease?.unit_number || tenancy?.unit?.unit_number || tenancy?.unit_number || 'A-102';
  const propertyName = lease?.property_name || tenancy?.property?.name || tenancy?.property_name || 'Notify Heights';

  return (
    <section
      id="tenant-lease-countdown-section"
      className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden transition-all"
    >
      {/* Top Meta Bar */}
      <div className="w-full flex items-center justify-between gap-2 pb-4 mb-2 border-b border-slate-100 text-left">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">{t.rentalUnit || 'Rental Unit'}:</span>
          <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {t.unitLabel || 'Unit'} #{unitNumber} • {propertyName}
          </span>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${statusBadgeColor}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
          {statusText}
        </span>
      </div>

      {/* Main Circular Doughnut Progress Indicator */}
      <div className="my-3 relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
          aria-label={`${remainingDays} ${t.daysRemaining || 'days remaining'} out of ${totalDays} ${t.daysTotalLease || 'total lease duration'}`}
        >
          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
          />
          {/* Active Progress Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </svg>

        {/* Center Content Inside Doughnut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
          <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none">
            {remainingDays}
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">
            {language === 'rw' ? 'Iminsi' : language === 'fr' ? 'Jours' : 'Days'}
          </span>
        </div>
      </div>

      {/* Progress Ratio Description */}
      <div className="mt-2 text-xs sm:text-sm font-medium text-slate-500">
        <span className="font-bold text-slate-800">{remainingDays} {t.daysRemaining || 'days remaining'}</span>
        <span className="text-slate-400 mx-1.5">/</span>
        <span>{totalDays} {t.daysTotalLease || 'days total lease duration'}</span>
      </div>

      {/* Essential Expiration Information */}
      <div className="mt-3 pt-3 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600">
        <div className="flex items-center gap-1.5 font-medium">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <span>{t.leaseExpires || 'Lease expires'}:</span>
          <span className="font-bold text-slate-900">{formattedEndDate}</span>
        </div>
      </div>

      {/* Quick Minimal Action Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full max-w-md pt-4 border-t border-slate-100">
        <button
          id="btn-view-lease-details"
          onClick={onViewLeaseDetails}
          className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-[#331A6F] font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{t.viewLeaseDetails || 'View Lease Details'}</span>
          <ChevronRight className="w-3 h-3" />
        </button>

        {lease && onViewDocument && (
          <button
            id="btn-view-lease-document"
            onClick={() => onViewDocument(lease)}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.signedDocument || 'Signed Document'}</span>
          </button>
        )}
      </div>
    </section>
  );
};

