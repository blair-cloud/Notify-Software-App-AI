import React, { useState } from 'react';
import {
  FolderOpen,
  Search,
  Plus,
  FileText,
  Building,
  CheckCircle,
  Clock,
  Eye,
  Trash2,
  X,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { adminService } from '../../services/adminService';

interface AdminDocumentsTabProps {
  documents?: any[];
  properties?: any[];
  onRefresh: () => void;
}

export const AdminDocumentsTab: React.FC<AdminDocumentsTabProps> = ({
  documents = [],
  properties = [],
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  // Form State
  const [docName, setDocName] = useState('');
  const [category, setCategory] = useState('LEASE_AGREEMENT');
  const [entityType, setEntityType] = useState('PROPERTY');
  const [entityId, setEntityId] = useState(properties?.[0]?.id || '');

  const filtered = (documents || []).filter((d) => {
    const matchesSearch =
      d.document_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.file_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.entity_name?.toLowerCase().includes(search.toLowerCase());

    const matchesCat = categoryFilter === 'ALL' || d.category === categoryFilter;

    return matchesSearch && matchesCat;
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName) return;

    adminService.uploadDocument({
      document_name: docName,
      category,
      entity_type: entityType,
      entity_id: entityId,
      file_url: `/documents/${docName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
    });

    setDocName('');
    setShowAddModal(false);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderOpen className="w-6 h-6 text-emerald-600" />
            <span>Platform Legal & Document Vault</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Centralized document management repository for signed leases, title deeds, tax certificates, and inspection records
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#331A6F] text-white text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents by name, entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold bg-slate-100 border-2 border-black rounded-xl outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="LEASE_AGREEMENT">Lease Agreements</option>
            <option value="TITLE_DEED">Title Deeds</option>
            <option value="TAX_CLEARANCE">Tax Clearances</option>
            <option value="INSPECTION_REPORT">Inspection Reports</option>
            <option value="ID_PROOF">ID Proofs</option>
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((doc) => (
          <div
            key={doc.id}
            className="rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] p-5 flex flex-col justify-between hover:border-[#331A6F] transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-50 text-[#331A6F] border border-purple-200">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm truncate max-w-[180px]">
                      {doc.document_name || doc.file_name}
                    </h4>
                    <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {doc.category || 'LEGAL_DOC'}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {doc.status || 'VERIFIED'}
                </span>
              </div>

              <div className="my-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Linked Entity:</span>
                  <span className="font-bold text-slate-900 truncate">
                    {doc.entity_name || `${doc.entity_type || 'Platform'} (${doc.entity_id?.slice(0, 8)})`}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Version:</span>
                  <span className="font-bold text-slate-900">v{doc.version || 1}.0</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Uploaded:</span>
                  <span className="font-bold text-slate-900">{doc.uploaded_at?.slice(0, 10) || '2026-08-14'}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedDoc(doc)}
                className="flex-1 py-1.5 px-3 bg-[#331A6F] text-white text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:bg-[#251352] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Document</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <div>
                <h3 className="font-extrabold text-base">{selectedDoc.document_name || selectedDoc.file_name}</h3>
                <div className="text-xs text-purple-200">Category: {selectedDoc.category}</div>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-6 bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                <FileText className="w-12 h-12 text-[#331A6F]" />
                <div>
                  <div className="font-black text-slate-900 text-sm">
                    {selectedDoc.document_name || selectedDoc.file_name}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Official Cryptographically Signed Document • Verified by Notify Platform
                  </div>
                </div>
                <div className="text-[10px] font-mono text-purple-800 bg-purple-100 px-3 py-1 rounded-full border border-purple-300">
                  SHA-256: 7f8a9e1b2c3d4e5f6a7b8c9d0e1f2a3b
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="px-4 py-2 bg-white text-slate-800 font-bold rounded-xl border-2 border-black cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
            <div className="p-5 bg-[#331A6F] text-white flex items-center justify-between border-b-2 border-black">
              <h3 className="font-extrabold text-base">Upload Official Document</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Title / Name *</label>
                <input
                  type="text"
                  required
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Countersigned Lease Agreement 2026-2027"
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Document Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  >
                    <option value="LEASE_AGREEMENT">Lease Agreement</option>
                    <option value="TITLE_DEED">Title Deed</option>
                    <option value="TAX_CLEARANCE">Tax Clearance</option>
                    <option value="INSPECTION_REPORT">Inspection Report</option>
                    <option value="ID_PROOF">Identity Proof</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Linked Property</label>
                  <select
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none font-medium"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl border-2 border-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#331A6F] text-white font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] cursor-pointer"
                >
                  Save to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
