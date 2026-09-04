import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  ShieldCheck,
  Building,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Upload,
  RefreshCw,
  HardDrive,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { Lease, Property, Tenant } from '../types';
import { LeaseDocumentDetailsModal } from './LeaseDocumentDetailsModal';

interface LandlordDocumentsTabProps {
  leases?: Lease[];
  properties?: Property[];
  tenants?: Tenant[];
  onUploadDocument?: (leaseId: string, docData: any) => Promise<void>;
  onOpenCreateLease?: () => void;
  onSelectLeaseForDocument?: (lease: Lease) => void;
  onCreateNewLease?: () => void;
}

export const LandlordDocumentsTab: React.FC<LandlordDocumentsTabProps> = ({
  leases = [],
  properties = [],
  tenants = [],
  onUploadDocument,
  onOpenCreateLease,
  onSelectLeaseForDocument,
  onCreateNewLease,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('ALL');
  const [complianceFilter, setComplianceFilter] = useState('ALL');
  const [selectedLeaseForDoc, setSelectedLeaseForDoc] = useState<Lease | null>(null);

  const handleCreateLeaseAction = onOpenCreateLease || onCreateNewLease || (() => {});

  const handleOpenDocModal = (lease: Lease) => {
    if (onSelectLeaseForDocument) {
      onSelectLeaseForDocument(lease);
    } else {
      setSelectedLeaseForDoc(lease);
    }
  };

  // Extract all lease documents (single-source of truth directly from leases)
  const safeLeases = leases || [];
  const safeProperties = properties || [];

  const documentsList = useMemo(() => {
    return safeLeases.map((lease) => {
      const doc = lease.agreement_document;
      const prop = safeProperties.find((p) => p.id === lease.property_id);
      const isCompliant = !!(doc || lease.has_signed_document);

      return {
        lease,
        document: doc,
        document_name: doc?.document_name || `${lease.property_name || prop?.name || 'Property'} Unit ${lease.unit_number || ''} Agreement`,
        file_name: doc?.file_name || 'No document uploaded',
        version: doc?.version || 1,
        property_id: lease.property_id || prop?.id || '',
        property_name: lease.property_name || prop?.name || 'Property',
        unit_number: lease.unit_number || 'N/A',
        tenant_name: lease.tenant_name || 'Tenant',
        file_size: doc?.file_size || 2400000,
        uploaded_at: doc?.uploaded_at || lease.created_at || '2026-01-01',
        storage_path: doc?.storage_path || `leases/${lease.id}/agreement/v1/pending.pdf`,
        compliance_status: isCompliant ? 'COMPLETE' : 'INCOMPLETE',
        lease_status: lease.status,
        has_document: isCompliant,
        history_count: doc?.history?.length || lease.document_history?.length || 1,
      };
    });
  }, [safeLeases, safeProperties]);

  const filteredDocs = useMemo(() => {
    return documentsList.filter((item) => {
      const matchesSearch =
        item.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.file_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesProperty =
        selectedPropertyId === 'ALL' || item.property_id === selectedPropertyId;

      const matchesCompliance =
        complianceFilter === 'ALL' ||
        (complianceFilter === 'COMPLETE' && item.has_document) ||
        (complianceFilter === 'INCOMPLETE' && !item.has_document);

      return matchesSearch && matchesProperty && matchesCompliance;
    });
  }, [documentsList, searchTerm, selectedPropertyId, complianceFilter]);

  const totalDocuments = documentsList.filter((d) => d.has_document).length;
  const missingDocuments = documentsList.filter((d) => !d.has_document).length;

  const handleDownload = (item: any) => {
    const fileName = item.file_name !== 'No document uploaded' ? item.file_name : `${item.property_name}_Unit_${item.unit_number}_Lease_Agreement.pdf`;
    const content = `NOTIFY PROPERTY OPERATING SYSTEM - OFFICIAL LEASE AGREEMENT\n` +
      `===============================================================\n` +
      `Document Title: ${item.document_name}\n` +
      `Lease ID: ${item.lease.id}\n` +
      `Property: ${item.property_name}\n` +
      `Unit: ${item.unit_number}\n` +
      `Tenant: ${item.tenant_name}\n` +
      `Rent: ${item.lease.monthly_rent?.toLocaleString()} RWF\n` +
      `Version: v${item.version}\n` +
      `Storage Path: ${item.storage_path}\n` +
      `Legal Compliance: ${item.compliance_status}\n` +
      `===============================================================\n` +
      `Stored securely in Supabase Storage.`;

    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" id="landlord-documents-tab">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Documents & Legal Contracts
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Single repository for all official lease agreements, signed contracts, and version records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateLeaseAction}
            className="bg-[#331A6F] hover:bg-[#251352] text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Create Lease with Document</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200/80 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Total Leases
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {safeLeases.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#331A6F] dark:text-purple-300 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200/80 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
              Signed Agreements
            </span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {totalDocuments}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200/80 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">
              Awaiting Document
            </span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {missingDocuments}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200/80 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search document name, tenant, or property..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg text-xs border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#331A6F]/30"
            />
          </div>

          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-200 font-medium"
          >
            <option value="ALL">All Properties</option>
            {safeProperties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={complianceFilter}
            onChange={(e) => setComplianceFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-200 font-medium"
          >
            <option value="ALL">All Compliance Statuses</option>
            <option value="COMPLETE">Compliance Complete (Document Present)</option>
            <option value="INCOMPLETE">Compliance Incomplete (Document Missing)</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Showing <span className="font-bold text-slate-800 dark:text-white">{filteredDocs.length}</span> records
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200/80 dark:border-gray-700 shadow-xs overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#331A6F] dark:text-purple-300 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No documents found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchTerm || selectedPropertyId !== 'ALL' || complianceFilter !== 'ALL'
                ? 'Try adjusting your search query or filters to find agreement documents.'
                : 'No leases or signed agreements exist yet. Create a lease to attach and manage documents.'}
            </p>
            {(searchTerm || selectedPropertyId !== 'ALL' || complianceFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedPropertyId('ALL');
                  setComplianceFilter('ALL');
                }}
                className="mt-2 text-xs font-semibold text-[#331A6F] dark:text-purple-300 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-gray-300">
              <thead className="bg-slate-50 dark:bg-gray-900/60 text-slate-500 dark:text-gray-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-gray-700">
                <tr>
                  <th className="py-3.5 px-4">Document Title</th>
                  <th className="py-3.5 px-4">Tenant / Unit</th>
                  <th className="py-3.5 px-4">Version & Storage</th>
                  <th className="py-3.5 px-4">Upload Date</th>
                  <th className="py-3.5 px-4">Compliance Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-700/60">
                {filteredDocs.map((item) => (
                  <tr key={item.lease.id} className="hover:bg-slate-50/60 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-[#331A6F] dark:text-purple-400 shrink-0 mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white truncate max-w-xs">
                            {item.document_name}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-gray-400 font-mono truncate max-w-xs">
                            {item.file_name}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.tenant_name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-gray-400">
                        {item.property_name} (Unit {item.unit_number})
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {item.has_document ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-[#331A6F] dark:bg-purple-900/60 dark:text-purple-300">
                            v{item.version} ({item.history_count} {item.history_count === 1 ? 'version' : 'versions'})
                          </span>
                          <span className="block font-mono text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">
                            {item.storage_path}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Pending Upload</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-slate-600 dark:text-gray-400">
                      {item.uploaded_at ? new Date(item.uploaded_at).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-4 px-4">
                      {item.has_document ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <ShieldCheck className="w-3.5 h-3.5" /> COMPLETE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          <AlertCircle className="w-3.5 h-3.5" /> INCOMPLETE
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDocModal(item.lease)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="View Document and History"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>

                        {item.has_document ? (
                          <button
                            type="button"
                            onClick={() => handleDownload(item)}
                            className="p-1.5 text-slate-500 hover:text-[#331A6F] rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                            title="Download Document"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenDocModal(item.lease)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold hover:bg-amber-100 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Upload Signed Agreement"
                          >
                            <Upload className="w-3.5 h-3.5" /> Upload
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lease Document Details Modal */}
      {selectedLeaseForDoc && (
        <LeaseDocumentDetailsModal
          lease={selectedLeaseForDoc}
          isOpen={true}
          onClose={() => setSelectedLeaseForDoc(null)}
          onUploadNewVersion={async (leaseId, docData) => {
            if (onUploadDocument) {
              await onUploadDocument(leaseId, docData);
            }
            // Refresh selection
            const updated = safeLeases.find((l) => l.id === leaseId);
            if (updated) setSelectedLeaseForDoc(updated);
          }}
          userRole="LANDLORD"
        />
      )}
    </div>
  );
};
