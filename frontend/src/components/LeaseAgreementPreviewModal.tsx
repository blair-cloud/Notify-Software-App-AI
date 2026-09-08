import React, { useEffect, useState } from 'react';
import { X, Download, AlertCircle, RefreshCw, FileText, Loader2 } from 'lucide-react';
import { Lease } from '../types';
import { api } from '../services/api';

interface LeaseAgreementPreviewModalProps {
  leaseId: string | null;
  onClose: () => void;
  // Landlords fetch via /leases/{id}; tenants via /leases/me/{id}. Defaults to
  // the landlord lookup so existing call sites are unaffected.
  fetchLease?: (id: string) => Promise<Lease>;
}

const formatDate = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatMoney = (value?: number, currency?: string) =>
  `${currency || 'RWF'} ${(value || 0).toLocaleString()}`;

const monthsBetween = (start?: string, end?: string) => {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return months > 0 ? months : null;
};

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const LeaseAgreementPreviewModal: React.FC<LeaseAgreementPreviewModalProps> = ({ leaseId, onClose, fetchLease }) => {
  const [lease, setLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const loadLease = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await (fetchLease ? fetchLease(id) : api.leases.get(id));
      setLease(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load the lease agreement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leaseId) {
      setLease(null);
      loadLease(leaseId);
    }
  }, [leaseId]);

  if (!leaseId) return null;

  const handleDownloadPdf = async () => {
    const element = document.getElementById('lease-agreement-document');
    if (!element || !lease) return;

    setIsDownloading(true);
    setDownloadError(null);
    try {
      // Loaded on demand so these (fairly heavy) libraries never bloat the
      // main bundle for users who never open a lease preview.
      // html2canvas-pro (not the original html2canvas) is required here: Tailwind
      // v4's default palette resolves to oklch() colors, which the unmaintained
      // original html2canvas cannot parse and throws on.
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const tenantSlug = (lease.tenant_name || 'Tenant').trim().replace(/[^a-z0-9]+/gi, '_');
      pdf.save(`Lease_Agreement_${tenantSlug}_${lease.id.slice(0, 8)}.pdf`);
    } catch (err) {
      console.error('Failed to generate lease PDF', err);
      setDownloadError('Failed to generate the PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const durationMonths = lease ? monthsBetween(lease.start_date, lease.end_date) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:block"
      onClick={onClose}
    >
      {/* Print isolation: only the document itself is visible on a printed page. */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #lease-agreement-document, #lease-agreement-document * { visibility: visible; }
          #lease-agreement-document {
            position: absolute; top: 0; left: 0; width: 100%; margin: 0; padding: 0;
            box-shadow: none; border: none; max-height: none; max-width: none;
          }
        }
      `}</style>

      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[92vh] print:max-h-none print:rounded-none print:shadow-none print:border-0 print:my-0 print:max-w-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#331A6F] text-white shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-300/30">
              <FileText className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Lease Agreement Preview</h3>
              <p className="text-xs text-purple-200 font-medium">
                Formatted, print-ready view of the lease contract
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {downloadError && (
              <span className="text-[11px] text-rose-200 font-semibold max-w-[180px]">{downloadError}</span>
            )}
            <button
              onClick={handleDownloadPdf}
              disabled={!lease || loading || !!error || isDownloading}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isDownloading ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 bg-slate-100 print:bg-white print:overflow-visible">
          {loading && (
            <div className="py-24 text-center text-slate-500">
              <div className="inline-block w-8 h-8 border-3 border-[#331A6F] border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-medium">Loading lease agreement...</p>
            </div>
          )}

          {!loading && error && (
            <div className="py-20 px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Couldn't load this lease agreement</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{error}</p>
              <button
                onClick={() => leaseId && loadLease(leaseId)}
                className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 bg-[#331A6F] text-white rounded-lg text-xs font-bold hover:bg-[#251352] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          )}

          {!loading && !error && lease && (
            <div className="p-4 sm:p-8 print:p-0">
              {/* THE ACTUAL PRINTABLE DOCUMENT */}
              <div
                id="lease-agreement-document"
                className="mx-auto bg-white text-slate-900 font-serif shadow-sm print:shadow-none max-w-[210mm] w-full p-10 sm:p-14 print:p-12 leading-relaxed"
              >
                {/* Watermark for non-active leases */}
                {(lease.status === 'DRAFT' || lease.status === 'TERMINATED') && (
                  <div className="mb-6 text-center">
                    <span className="inline-block px-4 py-1 rounded border-2 border-rose-400 text-rose-500 font-sans font-black text-xs uppercase tracking-[0.2em]">
                      {lease.status === 'DRAFT' ? 'Draft — Not Yet Signed' : 'Terminated'}
                    </span>
                  </div>
                )}

                {/* Letterhead */}
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-6 font-sans">
                  <div>
                    <div className="text-lg font-black tracking-tight">Notify</div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">Property Management System · Kigali, Rwanda</div>
                  </div>
                  <div className="text-right text-[11px] text-slate-500">
                    <div>Lease Ref: <span className="font-mono text-slate-700">{lease.id.slice(0, 8).toUpperCase()}</span></div>
                    <div>Generated: {formatDate(new Date().toISOString())}</div>
                  </div>
                </div>

                <h1 className="text-center text-2xl font-bold tracking-tight uppercase mb-1">Lease Agreement</h1>
                <p className="text-center text-xs text-slate-500 mb-8 font-sans">
                  This Lease Agreement ("Agreement") is made and entered into on {formatDate(lease.created_at)}, governing the tenancy described below.
                </p>

                {/* 1. Parties */}
                <section className="mb-7">
                  <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-300 pb-1.5 mb-3">1. Parties to this Agreement</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 font-sans">Landlord (Lessor)</div>
                      <div className="font-semibold">{lease.landlord_name || '—'}</div>
                      {lease.landlord_business_name && <div>{lease.landlord_business_name}</div>}
                      {lease.landlord_address && <div>{lease.landlord_address}</div>}
                      {lease.landlord_phone && <div>Tel: {lease.landlord_phone}</div>}
                      {lease.landlord_email && <div>Email: {lease.landlord_email}</div>}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 font-sans">Tenant (Lessee)</div>
                      <div className="font-semibold">{lease.tenant_name || '—'}</div>
                      {lease.tenant_national_id && <div>National ID: {lease.tenant_national_id}</div>}
                      {lease.tenant_phone && <div>Tel: {lease.tenant_phone}</div>}
                      {lease.tenant_email && <div>Email: {lease.tenant_email}</div>}
                    </div>
                  </div>
                </section>

                {/* 2. Premises */}
                <section className="mb-7">
                  <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-300 pb-1.5 mb-3">2. Leased Premises</h2>
                  <p className="text-sm">
                    The Landlord agrees to lease to the Tenant the premises described as{' '}
                    <strong>Unit {lease.unit_number || '—'}{lease.unit_floor !== undefined ? ` (Floor ${lease.unit_floor})` : ''}</strong> at{' '}
                    <strong>{lease.property_name || '—'}</strong>
                    {lease.property_address ? `, located at ${lease.property_address}` : ''}
                    {lease.property_district ? `, ${lease.property_district} District, Kigali, Rwanda` : ''}.
                  </p>
                </section>

                {/* 3. Term */}
                <section className="mb-7">
                  <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-300 pb-1.5 mb-3">3. Term of Lease</h2>
                  <p className="text-sm">
                    This Agreement shall commence on <strong>{formatDate(lease.start_date)}</strong> and shall continue through{' '}
                    <strong>{formatDate(lease.end_date)}</strong>
                    {durationMonths ? <> (a term of approximately <strong>{durationMonths} month{durationMonths === 1 ? '' : 's'}</strong>)</> : null}, unless terminated earlier in accordance with the terms herein.
                  </p>
                </section>

                {/* 4. Financial Terms */}
                <section className="mb-7">
                  <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-300 pb-1.5 mb-3">4. Financial Terms</h2>
                  <table className="w-full text-sm border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-2 pr-4 text-slate-500 w-1/2">Monthly Rent</td>
                        <td className="py-2 font-semibold">{formatMoney(lease.monthly_rent, lease.currency)}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-2 pr-4 text-slate-500">Security Deposit</td>
                        <td className="py-2 font-semibold">{formatMoney(lease.security_deposit, lease.currency)}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-2 pr-4 text-slate-500">Rent Due Date</td>
                        <td className="py-2 font-semibold">The {ordinal(lease.payment_due_day || 5)} of each month</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-slate-500">Late Payment Fee</td>
                        <td className="py-2 font-semibold">{formatMoney(lease.late_fee, lease.currency)} per late payment</td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                {/* 5. Terms and Conditions */}
                <section className="mb-7">
                  <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-300 pb-1.5 mb-3">5. Terms and Conditions</h2>
                  <ol className="list-decimal list-outside pl-5 space-y-2 text-sm">
                    <li>The Tenant agrees to pay rent in full and on time as specified above, using an approved payment channel (Mobile Money, bank transfer, or cash receipt).</li>
                    <li>The Tenant shall use the premises solely for lawful residential/commercial purposes consistent with the property's designation and shall not sublet without the Landlord's prior written consent.</li>
                    <li>The Landlord is responsible for structural repairs and major maintenance; the Tenant is responsible for day-to-day upkeep and shall promptly report any damage or required repairs.</li>
                    <li>The security deposit shall be refunded within a reasonable period after the end of the tenancy, less any deductions for damages beyond normal wear and tear or outstanding amounts owed.</li>
                    <li>Either party may terminate this Agreement in accordance with applicable Rwandan tenancy law and any notice period agreed between the parties.</li>
                    {lease.notes && <li>Additional terms: {lease.notes}</li>}
                  </ol>
                </section>

                {/* 6. Signatures */}
                <section className="mt-12">
                  <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-300 pb-1.5 mb-8">6. Signatures</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 text-sm">
                    <div>
                      <div className="border-b border-slate-900 h-12"></div>
                      <div className="mt-1.5 font-semibold">{lease.landlord_name || 'Landlord'}</div>
                      <div className="text-xs text-slate-500">Landlord / Lessor — Date: ______________</div>
                    </div>
                    <div>
                      <div className="border-b border-slate-900 h-12"></div>
                      <div className="mt-1.5 font-semibold">{lease.tenant_name || 'Tenant'}</div>
                      <div className="text-xs text-slate-500">Tenant / Lessee — Date: ______________</div>
                    </div>
                  </div>
                </section>

                <div className="mt-12 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 font-sans">
                  Generated electronically via the Notify Property Management System. Physical or verified digital signatures are required for this Agreement to become legally binding.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
