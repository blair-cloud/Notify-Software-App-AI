import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Upload, ShieldCheck, Download, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Lease, LeaseDocumentVersion } from '../types';
import { TENANT_DOC_STATUS_META } from './LeaseDocumentDetailsModal';

interface TenantLeaseDocumentModalProps {
  lease: Lease;
  isOpen: boolean;
  onClose: () => void;
  onUploadSignedCopy: (leaseId: string, docData: any) => Promise<void>;
  onSignLease: (leaseId: string, signatureName: string) => Promise<void>;
}

const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export const TenantLeaseDocumentModal: React.FC<TenantLeaseDocumentModalProps> = ({
  lease,
  isOpen,
  onClose,
  onUploadSignedCopy,
  onSignLease,
}) => {
  const [panel, setPanel] = useState<'DOCUMENT' | 'UPLOAD' | 'SIGN'>('DOCUMENT');
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; size: number; data: string } | null>(null);
  const [signatureName, setSignatureName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewedVersion, setViewedVersion] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeDoc = lease.agreement_document;

  // Every stored version stays viewable - the landlord's original stays on file
  // after the tenant uploads a signed copy, newest first.
  const versions = useMemo<LeaseDocumentVersion[]>(
    () => [...(lease.document_history || [])].sort((a, b) => (b.version || 0) - (a.version || 0)),
    [lease.document_history]
  );

  // Follow the lease whenever it changes (a fresh upload adds a new version).
  useEffect(() => {
    setViewedVersion(activeDoc?.version ?? versions[0]?.version ?? null);
  }, [activeDoc?.version, versions.length]);

  if (!isOpen) return null;

  const doc =
    versions.find((v) => v.version === viewedVersion) ||
    (activeDoc as LeaseDocumentVersion | undefined) ||
    versions[0];
  const status = TENANT_DOC_STATUS_META[lease.tenant_document_status || 'NO_DOCUMENT'] || TENANT_DOC_STATUS_META.NO_DOCUMENT;

  const versionLabel = (v: LeaseDocumentVersion) =>
    v.uploaded_by_role === 'TENANT' ? 'Signed copy' : 'Original';

  const resetPanel = () => {
    setPanel('DOCUMENT');
    setSelectedFile(null);
    setError(null);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('That file is larger than 15 MB. Please choose a smaller file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError(null);
      setSelectedFile({ name: file.name, type: file.type, size: file.size, data: reader.result as string });
    };
    reader.onerror = () => setError('Could not read that file. Please try again.');
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please choose a file to upload.');
      return;
    }
    try {
      setIsBusy(true);
      setError(null);
      await onUploadSignedCopy(lease.id, {
        document_name: 'Signed Lease Agreement',
        file_name: selectedFile.name,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
        file_data: selectedFile.data,
        version_notes: 'Signed copy uploaded by tenant',
        uploaded_by: lease.tenant_name || 'Tenant',
        uploaded_by_role: 'TENANT',
      });
      // Stay open on the document so the tenant immediately sees the copy that
      // was just stored, and can keep viewing it (or the original).
      setSelectedFile(null);
      setPanel('DOCUMENT');
      setSuccess('Signed copy uploaded successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload the signed copy. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSign = async () => {
    const name = signatureName.trim();
    if (!name) {
      setError('Please type your full legal name.');
      return;
    }
    if (!agreed) {
      setError('Please confirm that you agree to the lease terms.');
      return;
    }
    try {
      setIsBusy(true);
      setError(null);
      await onSignLease(lease.id, name);
      setPanel('DOCUMENT');
      setSuccess('Lease signed successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to sign the lease. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDownload = () => {
    if (!doc?.file_data) {
      setError('The original file is not available for download.');
      return;
    }
    const a = document.createElement('a');
    a.href = doc.file_data;
    a.download = doc.file_name || 'Lease_Agreement.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const renderDocument = () => {
    if (!doc || !doc.file_data) {
      return (
        <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center px-6">
          <FileText className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-900">No lease document available yet</p>
        </div>
      );
    }
    if (doc.file_type?.startsWith('image/')) {
      return <img src={doc.file_data} alt="Lease document" className="w-full h-auto" />;
    }
    if (doc.file_type === 'application/pdf') {
      return <iframe src={doc.file_data} title="Lease document" className="w-full h-full min-h-[55vh] bg-white" />;
    }
    return (
      <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center px-6">
        <FileText className="w-10 h-10 text-slate-300 mb-3" />
        <p className="text-sm font-semibold text-slate-900">Preview isn't available for this file type</p>
        <button
          type="button"
          onClick={handleDownload}
          className="mt-3 px-4 py-2 rounded-xl bg-[#331A6F] text-white text-xs font-bold cursor-pointer"
        >
          Download document
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">Lease Agreement</h2>
            <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${status.className}`}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {doc?.file_data && (
              <button
                type="button"
                onClick={handleDownload}
                title="Download"
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <Download className="w-4.5 h-4.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {(error || success) && (
          <div className="px-5 sm:px-6 pt-4">
            {success && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
              </div>
            )}
            {error && !success && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          {panel === 'DOCUMENT' && (
            <div className="space-y-3">
              {versions.length > 1 && (
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto sm:inline-flex overflow-x-auto">
                  {versions.map((v) => (
                    <button
                      key={v.version}
                      type="button"
                      onClick={() => setViewedVersion(v.version)}
                      className={`flex-1 sm:flex-none whitespace-nowrap min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        viewedVersion === v.version
                          ? 'bg-white text-[#331A6F] shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {versionLabel(v)}
                    </button>
                  ))}
                </div>
              )}
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">{renderDocument()}</div>
              {lease.tenant_document_status === 'SIGNED' && lease.tenant_signature_name && (
                <p className="text-xs text-slate-500">
                  Signed by <span className="font-semibold text-slate-700">{lease.tenant_signature_name}</span>
                  {lease.tenant_signed_at && ` on ${new Date(lease.tenant_signed_at).toLocaleDateString()}`}
                </p>
              )}
            </div>
          )}

          {panel === 'UPLOAD' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleFilePick}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-10 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#331A6F] hover:bg-slate-50 transition-colors flex flex-col items-center gap-2 cursor-pointer"
              >
                <Upload className="w-6 h-6 text-slate-400" />
                <span className="text-sm font-semibold text-slate-900">
                  {selectedFile ? selectedFile.name : 'Choose a file'}
                </span>
                <span className="text-xs text-slate-500">PDF, Word or image • up to 15 MB</span>
              </button>
            </div>
          )}

          {panel === 'SIGN' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full legal name</label>
                <input
                  type="text"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder={lease.tenant_name || 'Your full name'}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30 focus:border-[#331A6F]"
                />
              </div>
              <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 cursor-pointer"
                />
                <span>I agree to the terms of this lease and confirm this is my digital signature.</span>
              </label>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-200">
          {panel === 'DOCUMENT' ? (
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPanel('UPLOAD');
                }}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" /> Upload Signed Copy
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPanel('SIGN');
                }}
                disabled={lease.tenant_document_status === 'SIGNED'}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#331A6F] hover:bg-[#281458] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                {lease.tenant_document_status === 'SIGNED' ? 'Signed' : 'Sign Digitally'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button
                type="button"
                onClick={resetPanel}
                disabled={isBusy}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={panel === 'UPLOAD' ? handleUpload : handleSign}
                disabled={isBusy || (panel === 'UPLOAD' ? !selectedFile : !signatureName.trim() || !agreed)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#331A6F] hover:bg-[#281458] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {isBusy
                  ? panel === 'UPLOAD'
                    ? 'Uploading...'
                    : 'Signing...'
                  : panel === 'UPLOAD'
                  ? 'Upload'
                  : 'Sign Lease'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
