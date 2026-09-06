import React, { useState } from 'react';
import {
  FileText,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  History,
  ShieldCheck,
  Calendar,
  User,
  Building,
  HardDrive,
  Clock,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';
import { Lease, LeaseAgreementDocument, LeaseDocumentVersion } from '../types';
import { LeaseDocumentUploadSection } from './LeaseDocumentUploadSection';
import { useLanguage } from '../context/LanguageContext';

interface LeaseDocumentDetailsModalProps {
  lease: Lease;
  isOpen: boolean;
  onClose: () => void;
  onUploadNewVersion: (leaseId: string, docData: any) => Promise<void>;
  onSignLease?: (leaseId: string, signatureName: string) => Promise<void>;
  userRole?: string;
}

export const TENANT_DOC_STATUS_META: Record<string, { label: string; className: string }> = {
  NO_DOCUMENT: { label: 'No Document Yet', className: 'bg-gray-100 text-gray-600 border-gray-300' },
  PENDING_SIGNATURE: { label: 'Pending Signature', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  SIGNED: { label: 'Signed', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  UPLOADED: { label: 'Uploaded', className: 'bg-blue-100 text-blue-800 border-blue-300' },
};

export const LeaseDocumentDetailsModal: React.FC<LeaseDocumentDetailsModalProps> = ({
  lease,
  isOpen,
  onClose,
  onUploadNewVersion,
  onSignLease,
  userRole = 'LANDLORD',
}) => {
  const { t } = useLanguage();
  const isTenant = userRole === 'TENANT';
  const [activeTab, setActiveTab] = useState<'VIEW' | 'HISTORY' | 'REPLACE' | 'SIGN'>('VIEW');
  const [newVersionDoc, setNewVersionDoc] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showEmbeddedPreview, setShowEmbeddedPreview] = useState(true);
  const [signatureName, setSignatureName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  if (!isOpen) return null;

  const doc = lease.agreement_document;
  const history: LeaseDocumentVersion[] = doc?.history || lease.document_history || [];
  const hasDoc = !!doc;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '2.4 MB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSaveNewVersion = async () => {
    if (!newVersionDoc) {
      setErrorMessage(t.pleaseSelectDocumentToUpload || 'Please select a document to upload.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await onUploadNewVersion(lease.id, {
        document_name: newVersionDoc.documentName,
        file_name: newVersionDoc.fileName,
        file_type: newVersionDoc.fileType,
        file_size: newVersionDoc.fileSize,
        file_data: newVersionDoc.previewUrl,
        version_notes: newVersionDoc.versionNotes,
        uploaded_by: userRole === 'LANDLORD' ? 'Landlord / Property Manager' : 'Authorized Admin',
        uploaded_by_role: userRole,
      });

      setSuccessMessage(t.newDocumentVersionUploadedSuccess || 'New document version uploaded successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload new document version.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignLease = async () => {
    if (!onSignLease) return;
    const trimmedName = signatureName.trim();
    if (!trimmedName) {
      setErrorMessage('Please type your full legal name to sign this lease.');
      return;
    }
    if (!agreedToTerms) {
      setErrorMessage('Please confirm that you have read and agree to the lease terms.');
      return;
    }

    try {
      setIsSigning(true);
      setErrorMessage(null);
      await onSignLease(lease.id, trimmedName);
      setSuccessMessage('Lease signed successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign the lease. Please try again.');
    } finally {
      setIsSigning(false);
    }
  };

  const handleDownload = (versionToDownload?: LeaseDocumentVersion) => {
    const target = versionToDownload || doc;
    const fileName = target?.file_name || `${lease.property_name || 'Property'}_Lease_Agreement.pdf`;

    if (!target?.file_data) {
      setErrorMessage(
        'The original file for this version was not stored and cannot be downloaded. Please upload a new version.'
      );
      return;
    }

    // The stored file_data is already a data: URL captured from the real
    // uploaded file, so it can be used directly as a download link.
    const a = document.createElement('a');
    a.href = target.file_data;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        id="lease-document-details-modal"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t.leaseAgreementDocument || 'Lease Agreement Document'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {lease.property_name} • {t.unitLabel || 'Unit'} {lease.unit_number} • {lease.tenant_name}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('VIEW')}
            className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'VIEW'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <FileText className="w-4 h-4" /> {t.currentDocument || 'Current Document'} (v{doc?.version || 1})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'HISTORY'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <History className="w-4 h-4" /> {t.versionHistory || 'Version History'} ({history.length || 1})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('REPLACE')}
            className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'REPLACE'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Upload className="w-4 h-4" />
            {isTenant ? ('Upload Signed Copy') : (t.uploadNewVersion || 'Upload New Version')}
          </button>

          {isTenant && onSignLease && (
            <button
              type="button"
              onClick={() => setActiveTab('SIGN')}
              className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'SIGN'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> {'Sign Digitally'}
            </button>
          )}
        </div>

        {/* Alert Messages */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-800 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            {errorMessage}
          </div>
        )}

        {/* Tenant Signature / Compliance Status */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {'Tenant Document Status'}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              (TENANT_DOC_STATUS_META[lease.tenant_document_status || 'NO_DOCUMENT'] || TENANT_DOC_STATUS_META.NO_DOCUMENT).className
            }`}
          >
            {(TENANT_DOC_STATUS_META[lease.tenant_document_status || 'NO_DOCUMENT'] || TENANT_DOC_STATUS_META.NO_DOCUMENT).label}
          </span>
        </div>
        {lease.tenant_document_status === 'SIGNED' && lease.tenant_signature_name && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 -mt-2">
            {'Signed by'} <strong className="text-gray-700 dark:text-gray-300">{lease.tenant_signature_name}</strong>
            {lease.tenant_signed_at && ` on ${new Date(lease.tenant_signed_at).toLocaleString()}`}
          </p>
        )}

        {/* TAB 1: VIEW CURRENT DOCUMENT */}
        {activeTab === 'VIEW' && (
          <div className="space-y-4">
            {hasDoc ? (
              <>
                {/* Metadata Card */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-gray-900 dark:text-white">
                          {doc.document_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-700 dark:bg-primary-900/60 dark:text-primary-300">
                          v{doc.version}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> ACTIVE
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        File: {doc.file_name} • {formatFileSize(doc.file_size)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowEmbeddedPreview((prev) => !prev)}
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        {showEmbeddedPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showEmbeddedPreview ? 'Hide Preview' : 'View Document'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload()}
                        className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> {t.downloadAgreement || 'Download Agreement'}
                      </button>
                    </div>
                  </div>

                  {/* Embedded preview of the exact uploaded file */}
                  {showEmbeddedPreview && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      {!doc.file_data ? (
                        <div className="p-6 text-center text-xs text-gray-500 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                          The original file for this version was not stored and cannot be previewed.
                        </div>
                      ) : doc.file_type?.startsWith('image/') ? (
                        <img
                          src={doc.file_data}
                          alt={doc.document_name}
                          className="max-w-full max-h-[60vh] mx-auto rounded-lg border border-gray-200 dark:border-gray-700"
                        />
                      ) : doc.file_type === 'application/pdf' ? (
                        <iframe
                          src={doc.file_data}
                          title={doc.document_name}
                          className="w-full h-[60vh] rounded-lg border border-gray-200 dark:border-gray-700 bg-white"
                        />
                      ) : (
                        <div className="p-6 text-center text-xs text-gray-500 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <FileText className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                          Inline preview isn't available for this file type ({doc.file_type}). Use Download to view the full document.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <HardDrive className="w-3.5 h-3.5 text-blue-500" />
                        <span>{t.storagePath || 'Storage Path'}:</span>
                      </div>
                      <p className="font-mono text-[11px] text-gray-800 dark:text-gray-200 break-all bg-white dark:bg-gray-800 p-1.5 rounded border border-gray-100 dark:border-gray-700">
                        {doc.storage_path || `leases/${lease.id}/agreement/v${doc.version}/${doc.file_name}`}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Clock className="w-3.5 h-3.5 text-purple-500" />
                        <span>{t.uploadedAt || 'Uploaded At'}:</span>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200">
                        {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : 'N/A'} {t.uploadedBy ? `${t.uploadedBy} ` : 'by '}
                        <strong>{doc.uploaded_by || 'Landlord'}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Document Legal Contract Summary Box */}
                <div className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      {t.contractDetailsAndVerification || 'Contract Details & Verification'}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" /> {t.legalComplianceMet || 'Legal Compliance Met'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <span className="text-gray-400 block mb-1">{t.startDate || 'Start Date'}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {lease.start_date}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <span className="text-gray-400 block mb-1">{t.endDate || 'End Date'}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {lease.end_date}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <span className="text-gray-400 block mb-1">{t.monthlyRent || 'Monthly Rent'}</span>
                      <span className="font-semibold text-primary-600 dark:text-primary-400">
                        {lease.monthly_rent?.toLocaleString()} {lease.currency || 'RWF'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <span className="text-gray-400 block mb-1">{t.securityDeposit || 'Security Deposit'}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {lease.security_deposit?.toLocaleString()} {lease.currency || 'RWF'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {lease.notes || 'Official countersigned lease agreement registered in the property management system.'}
                  </p>
                </div>
              </>
            ) : (
              <div className="p-8 text-center bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {t.noSignedLeaseDocumentUploaded || 'No Signed Lease Document Uploaded'}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  {t.draftLeaseNotice || 'This lease is currently in draft or incomplete state. A signed lease agreement document is required before this lease can be activated.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('REPLACE')}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  {isTenant
                    ? ('Upload Signed Copy')
                    : (t.uploadAgreementDocumentNow || 'Upload Agreement Document Now')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VERSION HISTORY */}
        {activeTab === 'HISTORY' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t.auditLogVersionHistory || 'Audit log of all uploaded versions and amendments for this lease agreement.'}
            </p>

            {history.length > 0 ? (
              <div className="space-y-2">
                {history.map((ver, idx) => (
                  <div
                    key={ver.version || idx}
                    className={`p-4 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
                      ver.status === 'ACTIVE'
                        ? 'bg-primary-50/40 dark:bg-primary-950/20 border-primary-200 dark:border-primary-800'
                        : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          v{ver.version} - {ver.document_name || ver.file_name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ver.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {ver.status}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {ver.version_notes || 'Uploaded agreement version.'}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-1">
                        <span>{t.uploadedBy || 'Uploaded by'} {ver.uploaded_by}</span>
                        <span>•</span>
                        <span>{ver.uploaded_at ? new Date(ver.uploaded_at).toLocaleDateString() : 'N/A'}</span>
                        <span>•</span>
                        <span className="font-mono">{ver.storage_path}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownload(ver)}
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-white dark:hover:bg-gray-800 rounded-lg shrink-0 border border-gray-200 dark:border-gray-700 shadow-xs"
                      title={t.downloadThisVersion || 'Download this version'}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">{t.noVersionHistory || 'No version history records found.'}</p>
            )}
          </div>
        )}

        {/* TAB 3: UPLOAD NEW VERSION */}
        {activeTab === 'REPLACE' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-300">
              {t.uploadNewVersionNotice || `Uploading a new file will create a new version (v${(doc?.version || 0) + 1}), archive the current agreement, and update legal compliance records.`}
            </div>

            <LeaseDocumentUploadSection
              currentDocument={doc}
              documentHistory={history}
              leaseId={lease.id}
              onDocumentChange={(fileState) => setNewVersionDoc(fileState)}
              requiredForActivation={true}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setActiveTab('VIEW')}
                className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg"
              >
                {t.cancel || 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleSaveNewVersion}
                disabled={isSubmitting || !newVersionDoc}
                className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                {isSubmitting ? (t.uploadingAndVersioning || 'Uploading & Versioning...') : (t.saveAndPublishNewVersion || 'Save & Publish New Version')}
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: SIGN DIGITALLY (tenant only) */}
        {activeTab === 'SIGN' && (
          <div className="space-y-4">
            {!hasDoc ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                {'There is no lease agreement document to sign yet. Please wait for your landlord to upload one, or upload a signed copy yourself.'}
              </div>
            ) : lease.tenant_document_status === 'SIGNED' ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {'You have already signed this lease agreement.'}
                {lease.tenant_signature_name && ` (${lease.tenant_signature_name})`}
              </div>
            ) : (
              <>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-300">
                  {'Review the current document (Current Document tab) before signing. By typing your full legal name below and confirming, you are digitally signing this lease agreement.'}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {'Full Legal Name'}
                  </label>
                  <input
                    type="text"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder={lease.tenant_name || 'e.g. Jane Uwase'}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>{'I have read and agree to the terms of this lease agreement, and I confirm this constitutes my digital signature.'}</span>
                </label>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setActiveTab('VIEW')}
                    className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg"
                  >
                    {t.cancel || 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSignLease}
                    disabled={isSigning || !signatureName.trim() || !agreedToTerms}
                    className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg shadow-xs flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {isSigning ? ('Signing...') : ('Sign Lease')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer for VIEW/HISTORY tabs */}
        {activeTab !== 'REPLACE' && activeTab !== 'SIGN' && (
          <div className="flex justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg"
            >
              {t.close || 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
