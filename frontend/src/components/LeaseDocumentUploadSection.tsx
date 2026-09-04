import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  RefreshCw,
  FileCheck,
  ShieldCheck,
  FileSpreadsheet,
  Image as ImageIcon,
  HardDrive
} from 'lucide-react';
import { LeaseAgreementDocument, LeaseDocumentVersion } from '../types';

interface UploadedFileState {
  file: File | null;
  documentName: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  previewUrl?: string;
  versionNotes?: string;
}

interface LeaseDocumentUploadSectionProps {
  currentDocument?: LeaseAgreementDocument;
  documentHistory?: LeaseDocumentVersion[];
  onDocumentChange: (doc: UploadedFileState | null) => void;
  isDraftMode?: boolean;
  leaseId?: string;
  disabled?: boolean;
  requiredForActivation?: boolean;
  compact?: boolean;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/jpg',
];

const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const LeaseDocumentUploadSection: React.FC<LeaseDocumentUploadSectionProps> = ({
  currentDocument,
  documentHistory,
  onDocumentChange,
  isDraftMode = false,
  leaseId = 'new',
  disabled = false,
  requiredForActivation = true,
  compact = false,
}) => {
  const [uploadedFile, setUploadedFile] = useState<UploadedFileState | null>(() => {
    if (currentDocument) {
      return {
        file: null,
        documentName: currentDocument.document_name,
        fileName: currentDocument.file_name,
        fileType: currentDocument.file_type,
        fileSize: currentDocument.file_size,
        previewUrl: currentDocument.file_data,
        versionNotes: '',
      };
    }
    return null;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [versionNotesInput, setVersionNotesInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const validateAndProcessFile = (file: File) => {
    setErrorMessage(null);

    // Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(`File size exceeds maximum limit of ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    // Validate type
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    const isAllowedExt = ACCEPTED_EXTENSIONS.includes(fileExt);
    const isAllowedType = ACCEPTED_TYPES.includes(file.type) || isAllowedExt;

    if (!isAllowedType) {
      setErrorMessage(
        'Unsupported file format. Please upload a PDF, DOC, DOCX, JPG, or PNG document.'
      );
      return;
    }

    // Simulate upload progress
    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null || prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 30;
      });
    }, 80);

    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(null);

      // Create preview if image or pdf
      let previewUrl: string | undefined = undefined;
      if (file.type.startsWith('image/')) {
        previewUrl = URL.createObjectURL(file);
      }

      const defaultDocName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

      const newFileState: UploadedFileState = {
        file,
        documentName: defaultDocName,
        fileName: file.name,
        fileType: file.type || 'application/pdf',
        fileSize: file.size,
        previewUrl,
        versionNotes: versionNotesInput || (currentDocument ? `Updated version replacing v${currentDocument.version}` : 'Initial executed lease agreement.'),
      };

      setUploadedFile(newFileState);
      setIsReplacing(false);
      onDocumentChange(newFileState);
    }, 350);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    setUploadedFile(null);
    setErrorMessage(null);
    setVersionNotesInput('');
    setIsReplacing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onDocumentChange(null);
  };

  const handleNameChange = (newName: string) => {
    if (!uploadedFile) return;
    const updated = { ...uploadedFile, documentName: newName };
    setUploadedFile(updated);
    onDocumentChange(updated);
  };

  const handleVersionNotesChange = (notes: string) => {
    setVersionNotesInput(notes);
    if (uploadedFile) {
      const updated = { ...uploadedFile, versionNotes: notes };
      setUploadedFile(updated);
      onDocumentChange(updated);
    }
  };

  const nextVersionNumber = (currentDocument?.version || 0) + (uploadedFile && uploadedFile.file ? 1 : 0) || 1;
  const storagePathDisplay = `leases/${leaseId}/agreement/v${nextVersionNumber}/${uploadedFile?.fileName || 'document.pdf'}`;

  return (
    <div className="space-y-3" id="lease-agreement-document-section">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">
            Lease Agreement Document{' '}
            {requiredForActivation && !isDraftMode && (
              <span className="text-red-500 font-bold">*</span>
            )}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Upload the official signed lease agreement. Required to activate the lease.
          </p>
        </div>

        {/* Compliance indicator badge */}
        {uploadedFile ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            Compliance Verified
          </span>
        ) : (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isDraftMode
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {isDraftMode ? 'Optional for Draft' : 'Required for Activation'}
          </span>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="lease-document-file-input"
        disabled={disabled}
      />

      {/* Error message */}
      {errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Upload Error: </span>
            {errorMessage}
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Uploading progress bar */}
      {uploadProgress !== null && (
        <div className="p-4 bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-primary-900 dark:text-primary-200">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Validating and storing lease document in Supabase Storage...
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-primary-200 dark:bg-primary-900 h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary-600 h-full rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* When NO document is uploaded */}
      {!uploadedFile && uploadProgress === null && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 shadow-inner'
              : 'border-gray-300 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-600 bg-gray-50/50 dark:bg-gray-800/30'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          id="lease-document-dropzone"
        >
          <div className="mx-auto w-11 h-11 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-2.5">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            <span className="text-primary-600 dark:text-primary-400 hover:underline">
              Click to upload
            </span>{' '}
            or drag and drop lease agreement
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Supported: PDF, DOC, DOCX, JPG, PNG (Max {MAX_FILE_SIZE_MB}MB)
          </p>

          <div className="mt-3 flex items-center justify-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5 text-emerald-500" /> Auto-Versioned
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-blue-500" /> Supabase Storage
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-500" /> Compliance Tied
            </span>
          </div>
        </div>
      )}

      {/* When a document IS uploaded or present */}
      {uploadedFile && uploadProgress === null && (
        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 shrink-0 mt-0.5">
                {uploadedFile.fileType.includes('image') ? (
                  <ImageIcon className="w-5 h-5" />
                ) : uploadedFile.fileType.includes('word') ? (
                  <FileSpreadsheet className="w-5 h-5" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {uploadedFile.fileName}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-primary-100 text-primary-700 dark:bg-primary-900/60 dark:text-primary-300">
                    v{currentDocument?.version || 1}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({formatFileSize(uploadedFile.fileSize)})
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Official Agreement
                  </span>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-gray-400 truncate max-w-[200px]">
                    {storagePathDisplay}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions: Preview, Replace, Remove */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors title='Preview document'"
                title="Preview document"
              >
                <Eye className="w-4 h-4" />
              </button>

              {!disabled && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsReplacing(true);
                      fileInputRef.current?.click();
                    }}
                    className="p-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg transition-colors"
                    title="Replace with new version"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleRemove}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                    title="Remove document"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Document metadata fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs">
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Document Title
              </label>
              <input
                type="text"
                value={uploadedFile.documentName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Heights Unit A-102 Lease Agreement"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-primary-500"
                disabled={disabled}
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Version Notes (Optional)
              </label>
              <input
                type="text"
                value={uploadedFile.versionNotes || versionNotesInput}
                onChange={(e) => handleVersionNotesChange(e.target.value)}
                placeholder="e.g. Signed by landlord and tenant with ID stamps"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-primary-500"
                disabled={disabled}
              />
            </div>
          </div>

          {/* Document history summary if any */}
          {documentHistory && documentHistory.length > 1 && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                Previous Versions ({documentHistory.length - 1})
              </span>
              <div className="space-y-1">
                {documentHistory
                  .filter((v) => v.version !== (currentDocument?.version || 1))
                  .slice(0, 2)
                  .map((ver) => (
                    <div
                      key={ver.version}
                      className="flex items-center justify-between text-[11px] text-gray-500 bg-gray-50 dark:bg-gray-900/50 px-2 py-1 rounded"
                    >
                      <span className="font-mono">v{ver.version}: {ver.file_name}</span>
                      <span className="text-gray-400">{ver.uploaded_at?.slice(0, 10)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && uploadedFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Document Preview: {uploadedFile.documentName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document metadata display */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-xl space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-400">File Name:</span>{' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {uploadedFile.fileName}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">File Size:</span>{' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatFileSize(uploadedFile.fileSize)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Storage Destination:</span>{' '}
                  <span className="font-mono text-gray-900 dark:text-white">
                    {storagePathDisplay}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>{' '}
                  <span className="font-bold text-emerald-600">OFFICIAL AGREEMENT</span>
                </div>
              </div>
            </div>

            {/* Stylized Document Mockup Preview */}
            <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4 font-serif text-gray-800 dark:text-gray-200 shadow-xs">
              <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  Residential Tenancy & Lease Agreement
                </h2>
                <p className="text-xs text-gray-500 font-sans mt-1">
                  Republic of Rwanda • Official Legal Contract Record
                </p>
              </div>

              <div className="space-y-2 text-xs leading-relaxed font-sans">
                <p>
                  <strong>Document Title:</strong> {uploadedFile.documentName}
                </p>
                <p>
                  <strong>Lease Reference:</strong> {leaseId}
                </p>
                <p className="text-gray-600 dark:text-gray-400 italic">
                  This document serves as the binding, verified lease agreement executed between the
                  Lessor (Landlord / Property Manager) and the Lessee (Tenant) for the designated
                  premises, governed by the standard tenancy laws and terms registered on the Notify
                  Property Operating System.
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-sans font-semibold text-emerald-700 dark:text-emerald-400">
                    Notarized & Digitally Stamped
                  </span>
                </div>
                <span className="text-[11px] font-sans text-gray-400">
                  Version {currentDocument?.version || 1} • Stored in Cloud Storage
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
