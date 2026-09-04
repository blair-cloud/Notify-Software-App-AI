import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  DollarSign,
  TrendingUp,
  Building,
  Users,
  Calendar,
  Filter,
  CheckCircle,
} from 'lucide-react';

interface AdminReportsTabProps {
  metrics?: Record<string, any>;
  properties?: any[];
  landlords?: any[];
  tenants?: any[];
  invoices?: any[];
  expenses?: any[];
}

export const AdminReportsTab: React.FC<AdminReportsTabProps> = ({
  metrics = {} as Record<string, any>,
  properties = [],
  landlords = [],
  tenants = [],
  invoices = [],
  expenses = [],
}) => {
  const [selectedReportType, setSelectedReportType] = useState<'FINANCIAL' | 'OCCUPANCY' | 'TENANT_LEDGER'>('FINANCIAL');

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (selectedReportType === 'FINANCIAL') {
      csvContent += 'Invoice Number,Tenant,Property,Unit,Amount (RWF),Paid (RWF),Balance (RWF),Status,Due Date\n';
      (invoices || []).forEach((inv) => {
        csvContent += `"${inv.invoice_number || inv.id}","${inv.tenant_name}","${inv.property_name}","${inv.unit_number}",${inv.amount},${inv.paid_amount || 0},${inv.balance || 0},"${inv.status}","${inv.due_date}"\n`;
      });
    } else if (selectedReportType === 'OCCUPANCY') {
      csvContent += 'Property Name,District,Total Units,Occupied Units,Vacant Units,Occupancy Rate (%),Expected Rent (RWF)\n';
      (properties || []).forEach((p) => {
        csvContent += `"${p.name}","${p.district}",${p.total_units},${p.occupied_units},${p.vacant_units},${p.occupancy_rate},${p.expected_monthly_rent}\n`;
      });
    } else {
      csvContent += 'Tenant Name,Email,Phone,Property,Unit,Lease Status,Monthly Rent (RWF),Outstanding Balance (RWF)\n';
      (tenants || []).forEach((t) => {
        csvContent += `"${t.first_name} ${t.last_name}","${t.email}","${t.phone || ''}","${t.property_name || ''}","${t.unit_number || ''}","${t.lease_status || ''}",${t.monthly_rent || 0},${t.outstanding_balance || 0}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `notify_report_${selectedReportType.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-[#331A6F]" />
            <span>Platform Analytics & Financial Reporting</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Consolidated platform ledgers, net operating income models, occupancy benchmarks, and automated CSV export
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4 stroke-[3]" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Summary KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-5 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Total Expected (Monthly)
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            RWF {(metrics.expected_rent || 0).toLocaleString()}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Total Collected
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">
            RWF {(metrics.collected_rent || 0).toLocaleString()}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Operating Expenses
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600">
            RWF {(metrics.total_expenses || 0).toLocaleString()}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#331A6F] text-white border-2 border-black shadow-[0.5px_0.5px_0_#000]">
          <div className="text-[11px] font-bold text-purple-200 uppercase tracking-wider mb-1">
            Net Platform Yield
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-300">
            RWF {(metrics.net_income || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {(
            [
              { key: 'FINANCIAL', label: 'Financial Rent Roll' },
              { key: 'OCCUPANCY', label: 'Property Occupancy Benchmark' },
              { key: 'TENANT_LEDGER', label: 'Tenants Balance Ledger' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedReportType(tab.key)}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border-2 border-black transition-all cursor-pointer ${
                selectedReportType === tab.key
                  ? 'bg-[#331A6F] text-white shadow-[0.5px_0.5px_0_#000]'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Render selected report table */}
      <div className="rounded-2xl bg-white border-2 border-black shadow-[0.5px_0.5px_0_#000] overflow-hidden">
        <div className="overflow-x-auto">
          {selectedReportType === 'FINANCIAL' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#331A6F] text-white font-extrabold uppercase tracking-wider border-b-2 border-black">
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5">Tenant</th>
                  <th className="p-3.5">Property & Unit</th>
                  <th className="p-3.5 text-right">Expected (RWF)</th>
                  <th className="p-3.5 text-right">Paid (RWF)</th>
                  <th className="p-3.5 text-right">Balance Due</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-purple-50/40 font-medium">
                    <td className="p-3.5 font-mono font-bold text-slate-900">{inv.invoice_number || inv.id}</td>
                    <td className="p-3.5 font-bold text-slate-900">{inv.tenant_name}</td>
                    <td className="p-3.5 text-slate-700">{inv.property_name} (Unit {inv.unit_number})</td>
                    <td className="p-3.5 text-right font-extrabold text-slate-900">
                      RWF {(inv.amount || 0).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-emerald-600">
                      RWF {(inv.paid_amount || 0).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-rose-600">
                      RWF {(inv.balance || 0).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedReportType === 'OCCUPANCY' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#331A6F] text-white font-extrabold uppercase tracking-wider border-b-2 border-black">
                  <th className="p-3.5">Property Name</th>
                  <th className="p-3.5">District</th>
                  <th className="p-3.5 text-center">Total Units</th>
                  <th className="p-3.5 text-center">Occupied</th>
                  <th className="p-3.5 text-center">Vacant</th>
                  <th className="p-3.5 text-center">Occupancy Rate</th>
                  <th className="p-3.5 text-right">Expected Rent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {properties.map((p) => (
                  <tr key={p.id} className="hover:bg-purple-50/40 font-medium">
                    <td className="p-3.5 font-bold text-slate-900">{p.name}</td>
                    <td className="p-3.5 text-slate-600">{p.district}</td>
                    <td className="p-3.5 text-center font-bold text-slate-900">{p.total_units}</td>
                    <td className="p-3.5 text-center font-bold text-emerald-600">{p.occupied_units}</td>
                    <td className="p-3.5 text-center font-bold text-amber-600">{p.vacant_units}</td>
                    <td className="p-3.5 text-center font-black text-[#331A6F]">{p.occupancy_rate}%</td>
                    <td className="p-3.5 text-right font-extrabold text-slate-900">
                      RWF {(p.expected_monthly_rent || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedReportType === 'TENANT_LEDGER' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#331A6F] text-white font-extrabold uppercase tracking-wider border-b-2 border-black">
                  <th className="p-3.5">Tenant Name</th>
                  <th className="p-3.5">Email & Phone</th>
                  <th className="p-3.5">Property & Unit</th>
                  <th className="p-3.5 text-center">Lease Status</th>
                  <th className="p-3.5 text-right">Monthly Rent</th>
                  <th className="p-3.5 text-right">Outstanding Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-purple-50/40 font-medium">
                    <td className="p-3.5 font-bold text-slate-900">{t.first_name} {t.last_name}</td>
                    <td className="p-3.5 text-slate-600">{t.email}</td>
                    <td className="p-3.5 text-slate-900">{t.property_name} (Unit {t.unit_number})</td>
                    <td className="p-3.5 text-center font-bold text-emerald-700">{t.lease_status || 'ACTIVE'}</td>
                    <td className="p-3.5 text-right font-extrabold text-slate-900">
                      RWF {(t.monthly_rent || 0).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-extrabold">
                      {(t.outstanding_balance || 0) > 0 ? (
                        <span className="text-rose-600">RWF {(t.outstanding_balance || 0).toLocaleString()}</span>
                      ) : (
                        <span className="text-emerald-700">RWF 0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
