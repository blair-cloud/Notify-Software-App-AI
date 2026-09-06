import React, { useMemo, useState } from 'react';
import { FileText, ChevronRight, FileCheck, Calendar } from 'lucide-react';
import { Lease } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface TenantLeaseCountdownCardProps {
  leases: Lease[];
  tenancy: any | null;
  onViewLeaseDetails: () => void;
  onViewDocument?: (lease: Lease) => void;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Parse a backend date. `YYYY-MM-DD` is built as a *local* calendar date so the
 * countdown matches the day the tenant is actually living in, instead of the
 * UTC-midnight instant `new Date('2026-01-01')` would produce.
 */
const parseDateOnly = (value?: string | null): Date | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

export interface LeaseTiming {
  start: Date | null;
  end: Date | null;
  /** Negative once the lease has ended. Null when dates are unusable. */
  daysRemaining: number | null;
  daysExpired: number;
  totalDays: number;
  isExpired: boolean;
  hasDates: boolean;
}

/** Remaining days computed from the lease's own start/end dates - never stored. */
export const getLeaseTiming = (lease: Lease | null | undefined): LeaseTiming => {
  const start = parseDateOnly(lease?.start_date);
  const end = parseDateOnly(lease?.end_date);

  if (!end) {
    return { start, end: null, daysRemaining: null, daysExpired: 0, totalDays: 0, isExpired: false, hasDates: false };
  }

  const today = startOfToday();
  const daysRemaining = Math.round((end.getTime() - today.getTime()) / MS_PER_DAY);
  const totalDays = start ? Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)) : 0;
  const terminated = lease?.status === 'TERMINATED';

  return {
    start,
    end,
    daysRemaining,
    daysExpired: daysRemaining < 0 ? Math.abs(daysRemaining) : 0,
    totalDays,
    isExpired: terminated || daysRemaining < 0,
    hasDates: true,
  };
};

export const TenantLeaseCountdownCard: React.FC<TenantLeaseCountdownCardProps> = ({
  leases,
  tenancy,
  onViewLeaseDetails,
  onViewDocument,
}) => {
  const { t, language } = useLanguage();
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null);

  // Soonest to expire first; leases already over drop to the end.
  const orderedLeases = useMemo(() => {
    return [...leases]
      .map((lease) => ({ lease, timing: getLeaseTiming(lease) }))
      .sort((a, b) => {
        if (a.timing.isExpired !== b.timing.isExpired) return a.timing.isExpired ? 1 : -1;
        const aDays = a.timing.daysRemaining ?? Number.MAX_SAFE_INTEGER;
        const bDays = b.timing.daysRemaining ?? Number.MAX_SAFE_INTEGER;
        return aDays - bDays;
      });
  }, [leases]);

  const selected = orderedLeases.find((entry) => entry.lease.id === selectedLeaseId) || orderedLeases[0] || null;
  const lease = selected?.lease || null;
  const timing = selected?.timing;

  const dateLocale = language === 'fr' ? 'fr-FR' : language === 'rw' ? 'rw-RW' : 'en-GB';
  const formatDate = (d: Date | null) =>
    d ? d.toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const labelFor = (l: Lease) => {
    const unit = l.unit_number || tenancy?.unit?.unit_number;
    const property = l.property_name || tenancy?.property?.name;
    if (unit && property) return `${t.unitLabel || 'Unit'} ${unit} • ${property}`;
    return unit ? `${t.unitLabel || 'Unit'} ${unit}` : property || 'Lease';
  };

  // Short identifier for the compact selector pills.
  const shortLabelFor = (l: Lease) =>
    l.unit_number || tenancy?.unit?.unit_number || l.property_name || tenancy?.property?.name || 'Lease';

  if (!lease || !timing) {
    return (
      <section
        id="tenant-lease-countdown-section"
        className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-10 text-center"
      >
        <Calendar className="w-9 h-9 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-900">{'No active lease'}</h3>
      </section>
    );
  }

  const remainingDays = timing.daysRemaining ?? 0;
  const displayDays = timing.isExpired ? 0 : Math.max(0, remainingDays);
  const fraction =
    timing.totalDays > 0 && !timing.isExpired ? Math.max(0, Math.min(1, displayDays / timing.totalDays)) : 0;

  let statusBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let statusText = t.activeLeaseStatus || 'Active Lease';
  let strokeColor = '#331A6F';

  if (timing.isExpired) {
    statusBadgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
    statusText = lease.status === 'TERMINATED' ? ('Terminated') : (t.leaseExpiredStatus || 'Lease Expired');
    strokeColor = '#64748B';
  } else if (remainingDays <= 30) {
    statusBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
    statusText = t.expiringSoonStatus || 'Expiring Soon';
    strokeColor = '#E11D48';
  } else if (remainingDays <= 60) {
    statusBadgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
    statusText = t.expiringTwoMonths || 'Expiring in ~2 Months';
    strokeColor = '#D97706';
  }

  // SVG circular geometry
  const size = 180;
  const strokeWidth = 12;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - fraction * circumference;

  const daysWord = language === 'rw' ? 'Iminsi' : language === 'fr' ? 'Jours' : 'Days';

  return (
    <section
      id="tenant-lease-countdown-section"
      className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden transition-all"
    >
      {/* Top Meta Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-4 mb-2 border-b border-slate-100 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-slate-500 shrink-0">{t.rentalUnit || 'Rental Unit'}:</span>
          <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full truncate">
            {labelFor(lease)}
          </span>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${statusBadgeColor}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
          {statusText}
        </span>
      </div>

      {/* Lease selector - only when the tenant actually holds more than one */}
      {orderedLeases.length > 1 && (
        <div className="w-full flex flex-wrap justify-center gap-1.5 mt-3">
          {orderedLeases.map(({ lease: l, timing: lt }) => {
            const isSelected = l.id === lease.id;
            return (
              <button
                key={l.id}
                type="button"
                title={labelFor(l)}
                onClick={() => setSelectedLeaseId(l.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                  isSelected ? 'bg-[#331A6F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {shortLabelFor(l)}
                <span className={isSelected ? 'text-white/70' : 'text-slate-400'}>
                  {' · '}
                  {lt.isExpired ? (t.leaseExpiredStatus || 'Expired') : `${Math.max(0, lt.daysRemaining ?? 0)}d`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Circular Doughnut Progress Indicator */}
      <div className="my-3 relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
          aria-label={`${displayDays} ${t.daysRemaining || 'days remaining'} out of ${timing.totalDays} ${t.daysTotalLease || 'total lease duration'}`}
        >
          <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#F1F5F9" strokeWidth={strokeWidth} />
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
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
          <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none">
            {displayDays}
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">{daysWord}</span>
        </div>
      </div>

      {/* Progress Ratio Description */}
      <div className="mt-2 text-xs sm:text-sm font-medium text-slate-500">
        {timing.isExpired ? (
          <span className="font-bold text-slate-800">
            {timing.daysExpired > 0
              ? `${t.leaseExpiredStatus || 'Lease expired'} • ${timing.daysExpired} ${daysWord.toLowerCase()}`
              : t.leaseExpiredStatus || 'Lease expired'}
          </span>
        ) : (
          <>
            <span className="font-bold text-slate-800">
              {displayDays} {t.daysRemaining || 'days remaining'}
            </span>
            {timing.totalDays > 0 && (
              <>
                <span className="text-slate-400 mx-1.5">/</span>
                <span>
                  {timing.totalDays} {t.daysTotalLease || 'days total lease duration'}
                </span>
              </>
            )}
          </>
        )}
      </div>

      {/* Essential Expiration Information */}
      <div className="mt-3 pt-3 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600">
        <div className="flex items-center gap-1.5 font-medium">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <span>{timing.isExpired ? ('Expired on') : (t.leaseExpires || 'Lease expires')}:</span>
          <span className="font-bold text-slate-900">{formatDate(timing.end)}</span>
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

        {onViewDocument && (
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
