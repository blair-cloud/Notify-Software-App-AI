import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  Building2,
  Calendar,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Check,
  X,
  CreditCard,
  Send,
  Download,
  Info,
  Layers,
  Search,
  Filter,
  Receipt,
  Bell,
  Users,
  Smartphone,
  Mail,
  Sparkles,
  Cpu,
  ShieldCheck,
  Zap,
  Activity,
  Lock,
  BarChart3,
  Bot
} from 'lucide-react';
import {
  TrackerDashboardData,
  TrackerPaymentStatus,
  TrackerPeriodType,
  TenantTrackerRow,
  BankStatementItem,
  BankTransactionItem,
  MatchingAnalysisRow,
  PossibleMatchCandidate,
  Property,
  Unit,
  Tenant,
  Lease,
  Invoice
} from '../../types';
import { api } from '../../services/api';

interface LandlordTrackerTabProps {
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  leases: Lease[];
  invoices: Invoice[];
  onOpenRecordPayment: (tenantId?: string, invoiceId?: string) => void;
  onSendReminder: (tenant: Tenant, invoice?: Invoice) => void;
  onViewReceipt?: (receipt: any) => void;
  onRefreshAllData: () => void;
}

type WizardStep = 'LANDING' | 'STEP_PROPERTY' | 'STEP_PERIOD' | 'STEP_STATEMENT' | 'STEP_ANALYSIS' | 'STEP_REPORT';

const TRACKER_STAGES: { key: WizardStep; label: string; shortLabel: string; number: number }[] = [
  { key: 'LANDING', label: 'Start Tracker', shortLabel: 'Start', number: 1 },
  { key: 'STEP_PROPERTY', label: 'Select Property', shortLabel: 'Property', number: 2 },
  { key: 'STEP_PERIOD', label: 'Select Period', shortLabel: 'Period', number: 3 },
  { key: 'STEP_STATEMENT', label: 'Upload Statement', shortLabel: 'Upload', number: 4 },
  { key: 'STEP_ANALYSIS', label: 'Analyzing', shortLabel: 'Analyze', number: 5 },
  { key: 'STEP_REPORT', label: 'Report', shortLabel: 'Report', number: 6 },
];

const STEP_ORDER: WizardStep[] = [
  'LANDING',
  'STEP_PROPERTY',
  'STEP_PERIOD',
  'STEP_STATEMENT',
  'STEP_ANALYSIS',
  'STEP_REPORT',
];

const ANALYSIS_STAGES = [
  'Upload Statement',
  'AI Reading Statement',
  'Transactions Detected',
  'Matching Payments',
  'Review Results',
];

export const LandlordTrackerTab: React.FC<LandlordTrackerTabProps> = ({
  properties,
  units,
  tenants,
  leases,
  invoices,
  onOpenRecordPayment,
  onSendReminder,
  onViewReceipt,
  onRefreshAllData,
}) => {
  // Wizard Navigation State
  const [currentStep, setCurrentStep] = useState<WizardStep>('LANDING');

  // Selection State
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    properties.length > 0 ? properties[0].id : 'ALL'
  );
  const [periodType, setPeriodType] = useState<TrackerPeriodType>('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  // Statement Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statementFileName, setStatementFileName] = useState<string>('');
  const [statementContent, setStatementContent] = useState<string>('');
  const [statementAnalysisResult, setStatementAnalysisResult] = useState<any | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analysis State
  const [analysisStageIndex, setAnalysisStageIndex] = useState<number>(0);

  // Report & Dashboard Data
  const [reportData, setReportData] = useState<TrackerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('ALL');
  const [reportSearchQuery, setReportSearchQuery] = useState<string>('');
  const [reviewTab, setReviewTab] = useState<'AUTO' | 'REVIEW' | 'UNMATCHED' | 'ALL'>('REVIEW');
  const [selectedCandidateOverrides, setSelectedCandidateOverrides] = useState<Record<string, string>>({});

  // Manual Matching Modal
  const [isManualMatchModalOpen, setIsManualMatchModalOpen] = useState<boolean>(false);
  const [selectedTxnForMatch, setSelectedTxnForMatch] = useState<BankTransactionItem | null>(null);
  const [selectedInvoiceForMatch, setSelectedInvoiceForMatch] = useState<string>('');
  const [matchNotes, setMatchNotes] = useState<string>('');

  // Bulk and Individual Reminders Modal State
  const [isBulkRemindModalOpen, setIsBulkRemindModalOpen] = useState<boolean>(false);
  const [selectedTenantForIndividualRemind, setSelectedTenantForIndividualRemind] = useState<TenantTrackerRow | null>(null);
  const [individualReminderCustomMsg, setIndividualReminderCustomMsg] = useState<string>('');
  const [isSendingReminders, setIsSendingReminders] = useState<boolean>(false);
  const [isMatching, setIsMatching] = useState<boolean>(false);

  // Notifications
  const [notification, setNotification] = useState<{ message: string; isError?: boolean } | null>(null);

  const showNotification = (message: string, isError = false) => {
    setNotification({ message, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  // Selected Property Object
  const selectedProperty = useMemo(() => {
    if (selectedPropertyId === 'ALL') {
      return { id: 'ALL', name: 'All Properties', address: 'All Managed Units' };
    }
    return properties.find((p) => p.id === selectedPropertyId) || {
      id: selectedPropertyId,
      name: 'Selected Property',
      address: '',
    };
  }, [selectedPropertyId, properties]);

  // Date Range Display Strings
  const dateRangeDisplay = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    if (periodType === 'TODAY') {
      const formatted = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      return { label: 'Today', range: formatted };
    }

    if (periodType === 'THIS_WEEK') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const startStr = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return { label: 'This Week', range: `${startStr} – ${endStr}` };
    }

    if (periodType === 'THIS_MONTH') {
      const monthName = now.toLocaleDateString('en-US', { month: 'long' });
      const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
      return { label: 'This Month', range: `${monthName} 1, ${curYear} – ${monthName} ${daysInMonth}, ${curYear}` };
    }

    // Custom
    const sDate = new Date(customStartDate);
    const eDate = new Date(customEndDate);
    const sFormatted = isNaN(sDate.getTime()) ? customStartDate : sDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const eFormatted = isNaN(eDate.getTime()) ? customEndDate : eDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return { label: 'Custom Period', range: `${sFormatted} – ${eFormatted}` };
  }, [periodType, customStartDate, customEndDate]);

  // Expected Payments Preview calculation based on actual Notify data
  const expectedPaymentsPreview = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (periodType === 'TODAY') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(startDate);
    } else if (periodType === 'THIS_WEEK') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else if (periodType === 'THIS_MONTH') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    }

    const startIso = startDate.toISOString().split('T')[0];
    const endIso = endDate.toISOString().split('T')[0];

    const relevantInvoices = invoices.filter((inv) => {
      const matchesProp = selectedPropertyId === 'ALL' || inv.property_id === selectedPropertyId;
      const isExpected = inv.due_date && inv.due_date >= startIso && inv.due_date <= endIso;
      return matchesProp && isExpected && (inv.status === 'ISSUED' || inv.status === 'PARTIALLY_PAID' || inv.status === 'OVERDUE');
    });

    const uniqueTenants = new Set(relevantInvoices.map((inv) => inv.tenant_id));
    const tenantCount = uniqueTenants.size;
    const totalExpected = relevantInvoices.reduce((sum, inv) => sum + (inv.balance_due !== undefined ? inv.balance_due : (inv.total_amount || 0)), 0);

    return {
      tenantCount,
      totalExpected,
    };
  }, [invoices, selectedPropertyId, periodType, customStartDate, customEndDate]);

  // Fetch report data
  const fetchReportData = async () => {
    try {
      const res = await api.tracker.getDashboard({
        property_id: selectedPropertyId,
        period_type: periodType,
        start_date: periodType === 'CUSTOM' ? customStartDate : undefined,
        end_date: periodType === 'CUSTOM' ? customEndDate : undefined,
      });
      setReportData(res);
      return res;
    } catch (err: any) {
      console.error('Error fetching tracker report:', err);
      showNotification(err.message || 'Failed to fetch report data', true);
      return null;
    }
  };


  // Handle File Input Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStatementFileName(file.name);
      // Read text content if text/csv
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setStatementContent(text || '');
      };
      reader.readAsText(file);
    }
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStatementFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setStatementContent(text || '');
      };
      reader.readAsText(file);
    }
  };

  // Start Analysis Workflow (5-Stage AI Document Understanding & Matching Pipeline)
  const handleStartAnalysis = async () => {
    if (!selectedFile && !statementContent.trim()) {
      showNotification('Please select a valid bank statement file to upload', true);
      return;
    }

    setCurrentStep('STEP_ANALYSIS');
    setAnalysisStageIndex(0); // Stage 0: Upload Statement

    try {
      // Stage 1: AI Reading Statement (Gemini Document Understanding)
      setTimeout(() => setAnalysisStageIndex(1), 350);

      // Perform backend upload & parsing
      let uploadPromise: Promise<any>;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (selectedPropertyId && selectedPropertyId !== 'ALL') {
          formData.append('property_id', selectedPropertyId);
        }
        formData.append('auto_confirm', 'false');
        uploadPromise = api.tracker.uploadFile(formData);
      } else {
        uploadPromise = api.tracker.uploadContent({
          property_id: selectedPropertyId !== 'ALL' ? selectedPropertyId : undefined,
          file_name: statementFileName || 'bank_statement.csv',
          content: statementContent,
          auto_confirm: false,
        });
      }

      const uploadResult = await uploadPromise;
      if (uploadResult?.matching_analysis_report) {
        setStatementAnalysisResult(uploadResult);
      }

      // Stage 2: Transactions Detected
      setAnalysisStageIndex(2);
      await new Promise((r) => setTimeout(r, 450));

      // Stage 3: Matching Payments
      setAnalysisStageIndex(3);
      await fetchReportData();
      await new Promise((r) => setTimeout(r, 450));

      // Stage 4: Review Results
      setAnalysisStageIndex(4);
      await new Promise((r) => setTimeout(r, 400));

      // Automatically transition to Report screen when finished
      setCurrentStep('STEP_REPORT');
      onRefreshAllData();
    } catch (err: any) {
      console.error('Analysis error:', err);
      showNotification(err.message || 'Statement analysis failed.', true);
      await fetchReportData();
      setTimeout(() => {
        setCurrentStep('STEP_REPORT');
      }, 1200);
    }
  };

  // Unpaid Tenants computation for Report actions
  const unpaidTenantsList = useMemo(() => {
    if (!reportData?.tenant_tracking_list) return [];
    return reportData.tenant_tracking_list.filter((r) => r.balance_due > 0);
  }, [reportData]);

  const totalOutstandingAmount = useMemo(() => {
    return unpaidTenantsList.reduce((sum, r) => sum + (r.balance_due || 0), 0);
  }, [unpaidTenantsList]);

  // Download CSV Handler
  const handleDownloadCsv = () => {
    const rows = reportData?.tenant_tracking_list || [];
    if (rows.length === 0) {
      showNotification('No tracking data available to export', true);
      return;
    }

    const headers = [
      'Tenant Name',
      'Unit Number',
      'Property Name',
      'Due Date',
      'Expected Amount (RWF)',
      'Received Amount (RWF)',
      'Balance Due (RWF)',
      'Reconciliation Status',
      'Payment Date',
      'Payment Reference',
      'Phone',
      'Email',
    ];

    const csvLines = [
      headers.join(','),
      ...rows.map((r) => [
        `"${(r.tenant_name || '').replace(/"/g, '""')}"`,
        `"${(r.unit_number || '').replace(/"/g, '""')}"`,
        `"${(r.property_name || '').replace(/"/g, '""')}"`,
        `"${r.due_date || ''}"`,
        r.expected_amount || 0,
        r.paid_amount || 0,
        r.balance_due || 0,
        `"${r.status}"`,
        `"${r.paid_date || ''}"`,
        `"${(r.payment_reference || r.last_transaction_desc || '').replace(/"/g, '""')}"`,
        `"${r.tenant_phone || ''}"`,
        `"${r.tenant_email || ''}"`,
      ].join(',')),
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safePropName = (selectedProperty.name || 'Report').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStamp = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `Notify_Payment_Tracking_Report_${safePropName}_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('Tracking report downloaded successfully as CSV');
  };

  // Bulk Remind Unpaid Tenants Handler
  const handleConfirmBulkRemind = async () => {
    if (unpaidTenantsList.length === 0) return;
    setIsSendingReminders(true);

    try {
      // One call for the whole group: the backend delivers per tenant, per
      // channel, in each tenant's own language, and reports every outcome.
      const result = await api.messages.sendBulk({
        recipient_ids: unpaidTenantsList.map((row) => row.tenant_id),
        channels: ['SMS', 'IN_APP'],
        template_code: 'RENT_OVERDUE_3D',
        messages: {
          EN: {
            title: 'Outstanding rent balance',
            body: 'Dear {{tenant_name}}, this is a reminder regarding your outstanding rent balance for Unit {{unit_number}} at {{property_name}}. Please settle it via Bank Transfer or Mobile Money.',
          },
          FR: {
            title: 'Solde de loyer impayé',
            body: "Cher/Chère {{tenant_name}}, ceci est un rappel concernant votre solde de loyer impayé pour l'unité {{unit_number}} à {{property_name}}. Merci de régler par virement bancaire ou Mobile Money.",
          },
          RW: {
            title: 'Ubukode butarishyuwe',
            body: "Muraho {{tenant_name}}, turabibutsa ku bukode butarishyuwe bw'inzu {{unit_number}} muri {{property_name}}. Mwishyure muri banki cyangwa kuri Mobile Money.",
          },
        },
        category: 'RENT_DUE',
        priority: 'HIGH',
      });

      if (result.channel_failed > 0) {
        showNotification(
          `Reminders sent to ${result.recipients_delivered} of ${result.total_recipients} tenants. ${result.channel_failed} delivery attempt(s) failed.`,
          true
        );
      } else {
        showNotification(
          `Rent payment reminders sent to ${result.recipients_delivered} unpaid tenant${result.recipients_delivered === 1 ? '' : 's'}.`
        );
      }
      setIsBulkRemindModalOpen(false);
      onRefreshAllData();
    } catch (err: any) {
      console.error('Error sending bulk reminders:', err);
      showNotification(err.message || 'Failed to dispatch reminders', true);
    } finally {
      setIsSendingReminders(false);
    }
  };

  // Individual Tenant Remind Handler
  const handleConfirmIndividualRemind = async () => {
    if (!selectedTenantForIndividualRemind) return;
    setIsSendingReminders(true);

    try {
      const row = selectedTenantForIndividualRemind;
      const messageContent =
        individualReminderCustomMsg.trim() ||
        `Dear ${row.tenant_name}, this is an official reminder regarding your outstanding rent balance of RWF ${row.balance_due.toLocaleString()} for Unit ${row.unit_number} at ${row.property_name}. Please settle your payment promptly via Bank Transfer or Mobile Money.`;

      const result = await api.messages.sendBulk({
        recipient_ids: [row.tenant_id],
        channels: ['SMS', 'IN_APP'],
        template_code: 'CUSTOM',
        messages: {
          EN: { title: `Rent reminder: Unit ${row.unit_number}`, body: messageContent },
        },
        category: 'RENT_DUE',
        priority: 'HIGH',
      });

      const failed = result.results[0]?.channels.filter((c) => c.status === 'FAILED') || [];
      if (failed.length > 0) {
        showNotification(
          `Reminder to ${row.tenant_name} failed on ${failed.map((f) => f.channel).join(', ')}: ${failed[0].error}`,
          true
        );
      } else {
        showNotification(`Rent reminder successfully sent to ${row.tenant_name}.`);
      }
      setSelectedTenantForIndividualRemind(null);
      onRefreshAllData();
    } catch (err: any) {
      console.error('Error sending individual reminder:', err);
      showNotification(err.message || 'Failed to send reminder', true);
    } finally {
      setIsSendingReminders(false);
    }
  };

  // Restart / Reset Tracker
  const handleStartNewTracking = () => {
    setSelectedFile(null);
    setStatementFileName('');
    setStatementContent('');
    setStatementAnalysisResult(null);
    setSelectedCandidateOverrides({});
    setAnalysisStageIndex(0);
    setReportStatusFilter('ALL');
    setReportSearchQuery('');
    setCurrentStep('STEP_PROPERTY');
  };

  // Manual Match Execution
  const handleConfirmManualMatch = async () => {
    if (!selectedTxnForMatch || !selectedInvoiceForMatch) {
      showNotification('Please select an active tenant invoice to credit', true);
      return;
    }
    if (isMatching) return;

    setIsMatching(true);
    try {
      await api.tracker.manualMatch({
        transaction_id: selectedTxnForMatch.id,
        invoice_id: selectedInvoiceForMatch,
        notes: matchNotes || 'Manual match verified in tracker',
      });
      showNotification('Transaction matched successfully. Payment recorded and receipt issued.');
      setIsManualMatchModalOpen(false);
      setSelectedTxnForMatch(null);
      setSelectedInvoiceForMatch('');
      setMatchNotes('');
      fetchReportData();
      onRefreshAllData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to complete manual match. Please try again.', true);
    } finally {
      setIsMatching(false);
    }
  };

  const handleApproveMatch = async (row: MatchingAnalysisRow | BankTransactionItem) => {
    if (isMatching) return;
    const suggestedInvoiceId =
      (row as MatchingAnalysisRow).suggested_invoice_id ||
      (row as BankTransactionItem).suggested_invoice_id;
    if (!suggestedInvoiceId) {
      openManualMatchForRow(row);
      return;
    }
    setIsMatching(true);
    try {
      await api.tracker.approveMatch({
        transaction_id: row.id,
        notes: 'Approved suggested match from Matching Analysis Report',
      });
      showNotification('Match approved. Payment persisted and invoice updated.');
      await fetchReportData();
      onRefreshAllData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to approve match', true);
    } finally {
      setIsMatching(false);
    }
  };

  const handleLeaveUnmatched = async (row: MatchingAnalysisRow | BankTransactionItem) => {
    if (isMatching) return;
    setIsMatching(true);
    try {
      await api.tracker.rejectMatch({
        transaction_id: row.id,
        reason: 'Left unmatched for later review',
      });
      showNotification('Transaction left unmatched for later review.');
      await fetchReportData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to update transaction', true);
    } finally {
      setIsMatching(false);
    }
  };

  const openManualMatchForRow = (row: MatchingAnalysisRow | BankTransactionItem) => {
    setSelectedTxnForMatch(row as BankTransactionItem);
    const suggested =
      (row as MatchingAnalysisRow).suggested_invoice_id ||
      (row as BankTransactionItem).suggested_invoice_id ||
      '';
    setSelectedInvoiceForMatch(suggested);
    setMatchNotes('');
    setIsManualMatchModalOpen(true);
  };

  const matchingAnalysisRows: MatchingAnalysisRow[] = useMemo(() => {
    if (statementAnalysisResult?.matching_analysis_report?.length) {
      return statementAnalysisResult.matching_analysis_report;
    }
    if (reportData?.matching_analysis_report?.length) {
      return reportData.matching_analysis_report;
    }
    // Fallback: map needs_review into analysis-shaped rows
    return (reportData?.needs_review_transactions || []).map((t) => ({
      id: t.id,
      statement_id: t.statement_id,
      transaction_reference: t.transaction_reference,
      transaction_date: t.transaction_date,
      amount: t.amount,
      payer_name: t.payer_name,
      bank_statement_name: (t as any).bank_statement_name || t.payer_name,
      description: t.description,
      bank_reference_id: t.transaction_reference,
      matched_tenant_id: t.suggested_tenant_id,
      matched_tenant_name: t.matched_tenant_name,
      property_name: t.property_name,
      unit_number: t.unit_number,
      suggested_invoice_id: t.suggested_invoice_id,
      invoice_number: t.invoice_number,
      expected_amount: t.expected_amount,
      amount_kind: (t as any).amount_kind,
      amount_status: (t as any).amount_status || (t as any).payment_amount_status,
      match_summary: (t as any).match_summary,
      confidence_score: t.confidence_score,
      confidence_label: t.confidence_label || (t.confidence_score >= 0.85 ? 'HIGH' : t.confidence_score >= 0.6 ? 'MEDIUM' : 'LOW'),
      match_method: t.match_method,
      matching_signals: t.matching_signals || [],
      matching_status: t.matching_status,
      display_status: t.display_status || t.matching_status,
      pending_approval: t.pending_approval,
    }));
  }, [statementAnalysisResult, reportData]);

  // Categorized groups for human review
  const autoMatchedRows: MatchingAnalysisRow[] = useMemo(() => {
    return matchingAnalysisRows.filter((r) => {
      const status = r.display_status || r.matching_status;
      const confLevel = r.confidence_level || (r.confidence_score >= 0.95 ? 'AUTO_MATCH' : '');
      const hasWarning = (r.warnings || []).some(
        (w) => w.toLowerCase().includes('ambiguous') || w.toLowerCase().includes('difference')
      );
      return (
        status === 'MATCHED' &&
        (confLevel === 'AUTO_MATCH' || !r.pending_approval || r.confidence_score >= 0.95) &&
        !hasWarning
      );
    });
  }, [matchingAnalysisRows]);

  const needsReviewRows: MatchingAnalysisRow[] = useMemo(() => {
    return matchingAnalysisRows.filter((r) => {
      const status = r.display_status || r.matching_status;
      const confLevel = r.confidence_level || (r.confidence_score >= 0.95 ? 'AUTO_MATCH' : '');
      const hasWarning = (r.warnings || []).some(
        (w) => w.toLowerCase().includes('ambiguous') || w.toLowerCase().includes('difference')
      );
      if (
        status === 'MATCHED' &&
        (confLevel === 'AUTO_MATCH' || (!r.pending_approval && r.confidence_score >= 0.95)) &&
        !hasWarning
      ) {
        return false;
      }
      if (status === 'UNMATCHED' || (!r.matched_tenant_id && !r.suggested_invoice_id)) {
        return false;
      }
      return true;
    });
  }, [matchingAnalysisRows]);

  const unmatchedRows: MatchingAnalysisRow[] = useMemo(() => {
    return matchingAnalysisRows.filter((r) => {
      const status = r.display_status || r.matching_status;
      return status === 'UNMATCHED' || (!r.matched_tenant_id && !r.suggested_invoice_id);
    });
  }, [matchingAnalysisRows]);

  const displayedReviewRows = useMemo(() => {
    switch (reviewTab) {
      case 'AUTO':
        return autoMatchedRows;
      case 'REVIEW':
        return needsReviewRows;
      case 'UNMATCHED':
        return unmatchedRows;
      case 'ALL':
      default:
        return matchingAnalysisRows;
    }
  }, [reviewTab, autoMatchedRows, needsReviewRows, unmatchedRows, matchingAnalysisRows]);

  const handleConfirmRowMatch = async (row: MatchingAnalysisRow) => {
    if (isMatching) return;
    const chosenInvoiceId = selectedCandidateOverrides[row.id] || row.suggested_invoice_id;
    if (!chosenInvoiceId) {
      openManualMatchForRow(row);
      return;
    }

    setIsMatching(true);
    try {
      if (selectedCandidateOverrides[row.id] && selectedCandidateOverrides[row.id] !== row.suggested_invoice_id) {
        await api.tracker.manualMatch({
          transaction_id: row.id,
          invoice_id: chosenInvoiceId,
          notes: 'Confirmed candidate chosen by landlord',
        });
      } else {
        await api.tracker.approveMatch({
          transaction_id: row.id,
          notes: 'Approved match from review interface',
        });
      }
      showNotification('Match confirmed. Payment recorded and invoice balance updated.');
      await fetchReportData();
      onRefreshAllData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to confirm match', true);
    } finally {
      setIsMatching(false);
    }
  };

  const matchStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      MATCHED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      PARTIAL: 'bg-amber-100 text-amber-800 border-amber-200',
      NEEDS_REVIEW: 'bg-orange-100 text-orange-800 border-orange-200',
      UNMATCHED: 'bg-slate-100 text-slate-700 border-slate-200',
      DUPLICATE: 'bg-violet-100 text-violet-800 border-violet-200',
      POSSIBLE_MISMATCH: 'bg-rose-100 text-rose-800 border-rose-200',
    };
    return map[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const amountStatusBadge = (kind?: string) => {
    const map: Record<string, string> = {
      FULLY_PAID: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      PARTIALLY_PAID: 'bg-amber-50 text-amber-800 border-amber-200',
      OVERPAID: 'bg-sky-50 text-sky-800 border-sky-200',
      AMOUNT_REVIEW: 'bg-rose-50 text-rose-800 border-rose-200',
    };
    return map[kind || ''] || 'bg-slate-50 text-slate-600 border-slate-200';
  };

  // Filtered rows for the report table
  const filteredReportRows = useMemo(() => {
    if (!reportData?.tenant_tracking_list) return [];
    return reportData.tenant_tracking_list.filter((row) => {
      // Status filter
      if (reportStatusFilter === 'PAID') {
        if (row.status !== 'PAID' && row.status !== 'PAID_LATE') return false;
      } else if (reportStatusFilter === 'PARTIAL') {
        if (row.status !== 'PARTIAL') return false;
      } else if (reportStatusFilter === 'UNPAID') {
        if (row.status !== 'NOT_PAID' && row.status !== 'UPCOMING') return false;
      }

      // Search query
      if (reportSearchQuery.trim()) {
        const q = reportSearchQuery.toLowerCase();
        const matchesName = row.tenant_name.toLowerCase().includes(q);
        const matchesUnit = row.unit_number.toLowerCase().includes(q);
        const matchesProp = row.property_name.toLowerCase().includes(q);
        const matchesRef = row.payment_reference?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesUnit && !matchesProp && !matchesRef) return false;
      }

      return true;
    });
  }, [reportData, reportStatusFilter, reportSearchQuery]);

  // Render Status Badge
  const renderStatusBadge = (status: TrackerPaymentStatus) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3 h-3 text-emerald-600" />
            Paid on Time
          </span>
        );
      case 'PAID_LATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            Paid Late
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Partial Payment
          </span>
        );
      case 'NOT_PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Unpaid / Overdue
          </span>
        );
      case 'UPCOMING':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3 h-3 text-slate-500" />
            Upcoming
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold transition-all flex items-center gap-2 ${notification.isError
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
        >
          {notification.isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* =========================================================================
          PROGRESS INDICATOR: 6-STAGE TRACKING PROCESS
      ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs transition-all">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {TRACKER_STAGES.map((stg, index) => {
            const currentStepIndex = STEP_ORDER.indexOf(currentStep);
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isClickable = isCompleted && currentStep !== 'STEP_ANALYSIS';

            return (
              <React.Fragment key={stg.key}>
                {/* Step Item */}
                <div
                  onClick={() => {
                    if (isClickable) {
                      setCurrentStep(stg.key);
                    }
                  }}
                  className={`flex items-center gap-2 select-none ${isClickable ? 'cursor-pointer group' : ''
                    }`}
                  title={isClickable ? `Return to ${stg.label}` : stg.label}
                >
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isCompleted
                      ? 'bg-[#331a6f] text-white'
                      : isCurrent
                        ? 'bg-[#331a6f] text-white ring-4 ring-[#331a6f]/15 shadow-xs'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                      } ${stg.key === 'STEP_ANALYSIS' && isCurrent ? 'animate-pulse' : ''}`}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    ) : (
                      <span>{stg.number}</span>
                    )}
                  </div>
                  <span
                    className={`text-xs transition-colors hidden md:inline font-semibold ${isCurrent
                      ? 'text-[#331a6f] font-black'
                      : isCompleted
                        ? 'text-slate-700 group-hover:text-[#331a6f]'
                        : 'text-slate-400'
                      }`}
                  >
                    {stg.label}
                  </span>
                  <span
                    className={`text-xs transition-colors md:hidden font-semibold ${isCurrent
                      ? 'text-[#331a6f] font-black'
                      : isCompleted
                        ? 'text-slate-700'
                        : 'text-slate-400'
                      }`}
                  >
                    {stg.shortLabel}
                  </span>
                </div>

                {/* Connector Line between steps */}
                {index < TRACKER_STAGES.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1.5 sm:mx-3 transition-colors ${index < currentStepIndex ? 'bg-[#331a6f]' : 'bg-slate-200'
                      }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          SCREEN 0: TRACKER LANDING (Futuristic AI-Powered Payment Tracker)
      ========================================================================= */}
      {currentStep === 'LANDING' && (
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-12 lg:p-14 shadow-xs space-y-12 my-6">
          {/* Subtle Ambient Tech Background Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[340px] bg-gradient-to-b from-[#331a6f]/8 via-[#331a6f]/2 to-transparent blur-3xl pointer-events-none rounded-full" />
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/5 blur-2xl pointer-events-none rounded-full" />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-[#331a6f]/5 blur-2xl pointer-events-none rounded-full" />

          {/* Hero Section: Badges, Heading, Description, and Primary CTA */}
          <div className="relative max-w-3xl mx-auto text-center space-y-5">
            {/* AI / Robot Icon */}
            <div className="flex justify-center pb-1">
              <div className="relative group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-[#FFE600] border-2 border-black shadow-[0.5px_0.5px_0_#000000] flex items-center justify-center text-black transition-transform duration-200 group-hover:-translate-y-1 group-hover:shadow-[0.5px_0.5px_0_#000000]">
                  <Bot className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2.2]" />
                </div>
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#331A6F] border-2 border-black flex items-center justify-center text-white shadow-[0.5px_0.5px_0_#000000]">
                  <Sparkles className="w-3 h-3 text-amber-300 stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Top AI Status Pill */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#331a6f]/5 border border-[#331a6f]/20 text-[#331a6f] text-xs font-semibold shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#331a6f] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#331a6f]"></span>
              </span>
              <Sparkles className="w-3.5 h-3.5 text-[#331a6f]" />
              <span>AI-Powered Ledger Intelligence</span>
            </div>

            {/* Primary Headline with Strong Visual Hierarchy */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
              Payment Tracker
            </h1>

            {/* Exact Required Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 font-normal max-w-2xl mx-auto leading-relaxed">
              Track expected tenant payments against payments received in your bank statement.
            </p>

            {/* Clear Primary CTA: Start the Tracker */}
            <div className="pt-3 flex flex-col items-center gap-4">
              <button
                onClick={() => setCurrentStep('STEP_PROPERTY')}
                className="px-9 py-4.5 rounded-2xl bg-[#331a6f] hover:bg-[#251352] text-white text-base font-bold transition-all duration-200 shadow-lg shadow-[#331a6f]/25 hover:shadow-xl hover:shadow-[#331a6f]/35 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer inline-flex items-center gap-3 group"
              >
                <span>Start the Tracker</span>
                <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
              </button>

              {/* Trust Indicators below CTA */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-500 font-medium pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Universal Statement Ingestion
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  99.8% Match Accuracy
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Bank-Grade Privacy
                </span>
              </div>
            </div>
          </div>

          {/* AI & Data-Visualization Console Showcase */}


          {/* 3 Modern SaaS Architecture & Trust Pillars */}

        </div>
      )}

      {/* =========================================================================
          STEP 1: SELECT A PROPERTY
      ========================================================================= */}
      {currentStep === 'STEP_PROPERTY' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-xs space-y-8">
          {/* Header */}
          <div className="space-y-1.5 border-b border-slate-100 pb-5">
            <span className="text-xs font-bold text-[#331a6f] uppercase tracking-wider">Step 1 of 3</span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Select a Property</h2>
            <p className="text-sm text-slate-500">Choose the property you want to track.</p>
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option: All Properties */}
            <div
              onClick={() => setSelectedPropertyId('ALL')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${selectedPropertyId === 'ALL'
                ? 'border-[#331a6f] bg-[#331a6f]/5 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedPropertyId === 'ALL' ? 'bg-[#331a6f] text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                  >
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">All Properties</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Entire Portfolio ({properties.length} properties)</p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedPropertyId === 'ALL'
                    ? 'border-[#331a6f] bg-[#331a6f] text-white'
                    : 'border-slate-300 bg-white'
                    }`}
                >
                  {selectedPropertyId === 'ALL' && <Check className="w-3 h-3" />}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
                <span>Total Units: {units.length}</span>
                <span>Active Leases: {leases.filter((l) => l.status === 'ACTIVE').length}</span>
              </div>
            </div>

            {/* Individual Properties */}
            {properties.map((prop) => {
              const propUnits = units.filter((u) => u.property_id === prop.id);
              const propLeases = leases.filter((l) => l.property_id === prop.id && l.status === 'ACTIVE');
              const isSelected = selectedPropertyId === prop.id;

              return (
                <div
                  key={prop.id}
                  onClick={() => setSelectedPropertyId(prop.id)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${isSelected
                    ? 'border-[#331a6f] bg-[#331a6f]/5 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-[#331a6f] text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                      >
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">{prop.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{prop.address || 'Not available'}</p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#331a6f] bg-[#331a6f] text-white' : 'border-slate-300 bg-white'
                        }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
                    <span>{propUnits.length} Units</span>
                    <span>{propLeases.length} Active Leases</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Confirmation Area */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Selected Property</span>
            <span className="font-bold text-slate-900 text-sm">{selectedProperty.name}</span>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep('LANDING')}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={() => setCurrentStep('STEP_PERIOD')}
              disabled={!selectedPropertyId}
              className="px-6 py-2.5 rounded-xl bg-[#331a6f] hover:bg-[#251352] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 2: CHOOSE A TRACKING PERIOD
      ========================================================================= */}
      {currentStep === 'STEP_PERIOD' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-xs space-y-8">
          {/* Header */}
          <div className="space-y-1.5 border-b border-slate-100 pb-5">
            <span className="text-xs font-bold text-[#331a6f] uppercase tracking-wider">Step 2 of 3</span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Choose a Tracking Period</h2>
            <p className="text-sm text-slate-500">Select the timeframe for which you want to reconcile bank inflows.</p>
          </div>

          {/* 4 Period Options */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {(
              [
                { key: 'TODAY', title: 'Today', desc: 'Current Day' },
                { key: 'THIS_WEEK', title: 'This Week', desc: 'Mon – Sun' },
                { key: 'THIS_MONTH', title: 'This Month', desc: 'Full Month' },
                { key: 'CUSTOM', title: 'Custom', desc: 'Choose Dates' },
              ] as const
            ).map((opt) => {
              const isSelected = periodType === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPeriodType(opt.key)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${isSelected
                    ? 'border-[#331a6f] bg-[#331a6f]/5 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-black text-slate-900">{opt.title}</span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#331a6f] bg-[#331a6f] text-white' : 'border-slate-300 bg-white'
                        }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 font-medium">{opt.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Date Pickers if Custom is chosen */}
          {periodType === 'CUSTOM' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#331a6f]/20 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#331a6f]/20 font-medium"
                />
              </div>
            </div>
          )}

          {/* Date Range & Expected Payments Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Selected Period Details */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{dateRangeDisplay.label}</span>
              <div className="text-base font-extrabold text-slate-900">{dateRangeDisplay.range}</div>
              <p className="text-xs text-slate-500 pt-1">
                Property: <span className="font-semibold text-slate-800">{selectedProperty.name}</span>
              </p>
            </div>

            {/* Expected Payments Preview Box */}
            <div className="p-5 rounded-2xl bg-[#331a6f]/5 border border-[#331a6f]/20 space-y-1">
              <span className="text-xs font-bold text-[#331a6f] uppercase tracking-wider">Expected Payments</span>
              <div className="text-xl font-black text-[#331a6f]">
                RWF {expectedPaymentsPreview.totalExpected.toLocaleString()} expected
              </div>
              <p className="text-xs text-slate-600 pt-1 font-medium">
                {expectedPaymentsPreview.tenantCount} active tenant{expectedPaymentsPreview.tenantCount === 1 ? '' : 's'} with scheduled rent
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep('STEP_PROPERTY')}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={() => setCurrentStep('STEP_STATEMENT')}
              className="px-6 py-2.5 rounded-xl bg-[#331a6f] hover:bg-[#251352] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 3: UPLOAD STATEMENT
      ========================================================================= */}
      {currentStep === 'STEP_STATEMENT' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-xs space-y-8">
          {/* Header */}
          <div className="space-y-1.5 border-b border-slate-100 pb-5">
            <span className="text-xs font-bold text-[#331a6f] uppercase tracking-wider">Step 3 of 3</span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Upload Bank Statement</h2>
            <p className="text-sm text-slate-500">
              Upload the bank statement for the selected property and period. Notify will analyze the transactions and compare them with expected tenant payments.
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf"
            className="hidden"
          />

          {/* Large Upload Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 ${isDragOver
              ? 'border-[#331a6f] bg-[#331a6f]/5 scale-[0.99]'
              : statementFileName
                ? 'border-[#331a6f] bg-[#331a6f]/5'
                : 'border-slate-300 hover:border-[#331a6f] bg-slate-50/50 hover:bg-slate-50'
              }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-[#331a6f]/10 text-[#331a6f] flex items-center justify-center">
              <Upload className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                {statementFileName ? 'Replace statement file' : 'Click to upload or drag and drop'}
              </h3>
              <p className="text-xs text-slate-500">
                Supported formats: <span className="font-semibold text-slate-700">PDF, CSV, XLS, XLSX</span>
              </p>
            </div>

            {/* Format badges */}
            <div className="flex items-center gap-2 pt-1">
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-600">
                PDF
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-600">
                CSV
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-600">
                XLS
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-600">
                XLSX
              </span>
            </div>
          </div>

          

          {/* Statement Selected Confirmation Box */}
          {statementFileName && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-900">Statement selected</div>
                  <div className="text-sm font-black text-slate-900">{statementFileName}</div>
                </div>
              </div>

              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Ready for Analysis
              </span>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep('STEP_PERIOD')}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleStartAnalysis}
              disabled={!statementFileName}
              className="px-6 py-3 rounded-xl bg-[#331a6f] hover:bg-[#251352] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span>Analyze Statement</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 4: DEDICATED ANALYSIS SCREEN
      ========================================================================= */}
      {currentStep === 'STEP_ANALYSIS' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-14 shadow-xs text-center space-y-8 my-6">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#331a6f]/10 text-[#331a6f] flex items-center justify-center mx-auto">
              <RefreshCw className="w-8 h-8 animate-spin text-[#331a6f]" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Analyzing your statement
            </h2>

            <p className="text-sm text-slate-600 leading-relaxed">
              Notify is reviewing your transactions and matching them with expected tenant payments.
            </p>
          </div>

          {/* Step-by-Step Processing Indicator */}
          <div className="max-w-md mx-auto bg-slate-50 rounded-2xl p-6 border border-slate-200/80 text-left space-y-3.5">
            {ANALYSIS_STAGES.map((stage, idx) => {
              const isDone = idx < analysisStageIndex;
              const isCurrent = idx === analysisStageIndex;

              return (
                <div key={stage} className="flex items-center justify-between text-xs transition-all">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${isDone
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                          ? 'bg-[#331a6f] text-white animate-pulse'
                          : 'bg-slate-200 text-slate-400'
                        }`}
                    >
                      {isDone ? (
                        <Check className="w-3 h-3" />
                      ) : isCurrent ? (
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      ) : (
                        <span className="text-[10px]">{idx + 1}</span>
                      )}
                    </div>
                    <span
                      className={`font-semibold ${isCurrent
                        ? 'text-[#331a6f] font-bold'
                        : isDone
                          ? 'text-slate-800'
                          : 'text-slate-400'
                        }`}
                    >
                      {stage}
                    </span>
                  </div>

                  {isDone && <span className="text-[10px] font-bold text-emerald-700">Completed</span>}
                  {isCurrent && <span className="text-[10px] font-bold text-[#331a6f]">Processing...</span>}
                </div>
              );
            })}
          </div>

          <div className="text-xs text-slate-400">
            Selected Property: <span className="font-semibold text-slate-700">{selectedProperty.name}</span> • Period:{' '}
            <span className="font-semibold text-slate-700">{dateRangeDisplay.range}</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 5: PAYMENT TRACKING REPORT
      ========================================================================= */}
      {currentStep === 'STEP_REPORT' && (
        <div className="space-y-6">
          {/* Top Report Header Banner */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#331a6f] uppercase tracking-wider">
                Payment Tracking Report
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {selectedProperty.name}
              </h1>
              <p className="text-sm text-slate-500 font-medium">{dateRangeDisplay.range}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Download CSV Action */}
              <button
                onClick={handleDownloadCsv}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                title="Export tracking results as a CSV spreadsheet"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Download CSV</span>
              </button>

              {/* Remind Unpaid Tenants Bulk Action */}
              {unpaidTenantsList.length > 0 && (
                <button
                  onClick={() => setIsBulkRemindModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#331a6f] hover:bg-[#251352] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                  title="Send rent reminders to all unpaid tenants"
                >
                  <Bell className="w-4 h-4 text-white" />
                  <span>Remind Unpaid Tenants ({unpaidTenantsList.length})</span>
                </button>
              )}

              {/* Start New Tracking */}
              <button
                onClick={handleStartNewTracking}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                title="Reset wizard and start a new tracking cycle"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Start New Tracking</span>
              </button>
            </div>
          </div>

          {/* Key Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Expected */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Expected</span>
              <div className="text-xl font-black text-slate-900">
                {reportData?.summary?.total_expected_amount != null
                  ? `RWF ${reportData.summary.total_expected_amount.toLocaleString()}`
                  : 'Not available'}
              </div>
              <p className="text-xs text-slate-500">
                {reportData?.summary?.total_expected_tenants != null
                  ? `${reportData.summary.total_expected_tenants} tenants scheduled`
                  : 'Not available'}
              </p>
            </div>

            {/* Total Received */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-1">
              <span className="text-xs font-bold text-emerald-700 uppercase">Total Received</span>
              <div className="text-xl font-black text-emerald-700">
                {statementAnalysisResult?.total_incoming_amount != null
                  ? `RWF ${statementAnalysisResult.total_incoming_amount.toLocaleString()}`
                  : reportData?.summary?.total_received_amount != null
                  ? `RWF ${reportData.summary.total_received_amount.toLocaleString()}`
                  : 'Not available'}
              </div>
              <p className="text-xs text-slate-500">
                {statementAnalysisResult
                  ? `${statementAnalysisResult.total_transactions} bank transactions analyzed`
                  : reportData?.summary?.total_paid_tenants != null
                  ? `${reportData.summary.total_paid_tenants} tenant(s) fully paid`
                  : 'Not available'}
              </p>
            </div>

            {/* Total Outstanding */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-1">
              <span className="text-xs font-bold text-rose-700 uppercase">Total Outstanding</span>
              <div className="text-xl font-black text-rose-700">
                {reportData?.summary?.total_outstanding_amount != null
                  ? `RWF ${reportData.summary.total_outstanding_amount.toLocaleString()}`
                  : 'Not available'}
              </div>
              <p className="text-xs text-slate-500">
                {reportData?.summary
                  ? `${reportData.summary.total_unpaid_tenants || 0} unpaid • ${reportData.summary.total_partial_tenants || 0} partial`
                  : 'Not available'}
              </p>
            </div>

            {/* Collection Rate */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-1">
              <span className="text-xs font-bold text-[#331a6f] uppercase">Reconciliation Rate</span>
              <div className="text-xl font-black text-[#331a6f]">
                {matchingAnalysisRows.length > 0
                  ? `${Math.round((autoMatchedRows.length / matchingAnalysisRows.length) * 100)}%`
                  : reportData?.summary?.collection_rate_percent != null
                  ? `${reportData.summary.collection_rate_percent}%`
                  : 'Not available'}
              </div>
              <p className="text-xs text-slate-500">
                {matchingAnalysisRows.length > 0
                  ? `${autoMatchedRows.length} of ${matchingAnalysisRows.length} matched`
                  : 'Auto-matched from bank'}
              </p>
            </div>
          </div>

          {/* Outstanding Balance Alert Banner (if unpaid tenants exist) */}
          {unpaidTenantsList.length > 0 && (
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900">
                    {unpaidTenantsList.length} Unpaid Tenant{unpaidTenantsList.length > 1 ? 's' : ''} Identified
                  </h3>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    Total overdue balance of{' '}
                    <span className="font-bold font-mono">
                      RWF {totalOutstandingAmount.toLocaleString()}
                    </span>{' '}
                    requires attention. You can send immediate rent reminders to all unpaid tenants.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsBulkRemindModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#331a6f] hover:bg-[#251352] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Remind All Unpaid ({unpaidTenantsList.length})</span>
              </button>
            </div>
          )}

          {/* Detailed Tenant Payment Ledger Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Table Header & Controls */}
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900">Tenant Payment Results</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reconciliation status for all leases in {selectedProperty.name}
                </p>
              </div>

              {/* Status Filter & Search */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search tenant or unit..."
                    value={reportSearchQuery}
                    onChange={(e) => setReportSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#331a6f]/20"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
                  {(
                    [
                      { key: 'ALL', label: 'All' },
                      { key: 'PAID', label: 'Paid' },
                      { key: 'PARTIAL', label: 'Partial' },
                      { key: 'UNPAID', label: 'Unpaid' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setReportStatusFilter(f.key)}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${reportStatusFilter === f.key
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4">Tenant & Unit</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4">Expected</th>
                    <th className="py-3.5 px-4">Received</th>
                    <th className="py-3.5 px-4">Balance</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Match Reference</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReportRows.length > 0 ? (
                    filteredReportRows.map((row) => {
                      const isPaid = row.status === 'PAID' || row.status === 'PAID_LATE';
                      const isUnpaid = row.status === 'NOT_PAID' || row.status === 'UPCOMING';
                      const isPartial = row.status === 'PARTIAL';

                      return (
                        <tr key={row.lease_id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{row.tenant_name}</div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {row.unit_number} • {row.property_name}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-700">
                            {row.due_date || 'Not available'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            RWF {row.expected_amount.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-emerald-700">
                            RWF {row.paid_amount.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-rose-700">
                            RWF {row.balance_due.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">{renderStatusBadge(row.status)}</td>
                          <td className="py-3.5 px-4">
                            {row.payment_reference ? (
                              <div>
                                <span className="font-mono text-[11px] font-bold text-slate-800">
                                  {row.payment_reference}
                                </span>
                                {row.paid_date && (
                                  <div className="text-[10px] text-slate-400">Paid: {row.paid_date}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No statement match yet</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Record Payment Button */}
                              {row.balance_due > 0 && (
                                <button
                                  onClick={() => onOpenRecordPayment(row.tenant_id, row.invoice_id)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition-colors cursor-pointer"
                                  title="Record Manual Payment"
                                >
                                  Record Pay
                                </button>
                              )}

                              {/* Send Reminder Button with Confirmation Modal */}
                              {row.balance_due > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedTenantForIndividualRemind(row);
                                    setIndividualReminderCustomMsg(
                                      `Dear ${row.tenant_name}, this is an official reminder regarding your outstanding rent balance of RWF ${row.balance_due.toLocaleString()} for Unit ${row.unit_number} at ${row.property_name}. Please settle your balance promptly via Bank Transfer or Mobile Money.`
                                    );
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-[#331a6f]/10 hover:bg-[#331a6f]/20 text-[#331a6f] text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                                  title={`Send Rent Reminder to ${row.tenant_name}`}
                                >
                                  <Bell className="w-3 h-3 text-[#331a6f]" />
                                  <span>Remind</span>
                                </button>
                              )}

                              {/* View Receipt Button */}
                              {row.paid_amount > 0 && (
                                <button
                                  onClick={() => {
                                    if (onViewReceipt) {
                                      onViewReceipt({
                                        receipt_number: row.invoice_number ? `REC-${row.invoice_number}` : (row.invoice_id ? `REC-${row.invoice_id.slice(0, 8)}` : 'REC-UNASSIGNED'),
                                        tenant_name: row.tenant_name,
                                        unit_number: row.unit_number,
                                        property_name: row.property_name,
                                        amount_paid: row.paid_amount,
                                        payment_method: 'BANK_TRANSFER',
                                        payment_date: row.paid_date || 'Not available',
                                        transaction_reference: row.payment_reference || 'Not available',
                                      });
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition-colors cursor-pointer"
                                  title="View Receipt"
                                >
                                  Receipt
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs font-medium">
                        No tenant rows match your active filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Interpretation & Matching Summary Banner */}
          {matchingAnalysisRows.length > 0 && (
            <div className="bg-gradient-to-r from-slate-900 via-[#251352] to-[#331a6f] text-white rounded-3xl p-6 sm:p-7 shadow-lg space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <div className="text-xs uppercase font-extrabold tracking-wider text-amber-300">
                      AI Document Understanding & Reconciler
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      AI found {matchingAnalysisRows.length} transaction{matchingAnalysisRows.length === 1 ? '' : 's'}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs bg-white/10 px-3.5 py-1.5 rounded-xl text-slate-200 backdrop-blur-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold">Deterministic Validation • Human in the Loop</span>
                </div>
              </div>

              {/* 4 Simple-Language Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-xs">
                  <div className="text-xs text-slate-300 font-medium">Detected Transactions</div>
                  <div className="text-2xl font-black text-white mt-1">{matchingAnalysisRows.length}</div>
                  <div className="text-[11px] text-slate-300 mt-1 font-medium">
                    AI found {matchingAnalysisRows.length} transaction{matchingAnalysisRows.length === 1 ? '' : 's'}
                  </div>
                </div>

                <div
                  onClick={() => setReviewTab('AUTO')}
                  className={`rounded-2xl p-4 border backdrop-blur-xs cursor-pointer transition-all ${
                    reviewTab === 'AUTO'
                      ? 'bg-emerald-500/30 border-emerald-400 ring-2 ring-emerald-400/40'
                      : 'bg-emerald-500/15 border-emerald-500/25 hover:bg-emerald-500/20'
                  }`}
                >
                  <div className="text-xs text-emerald-200 font-medium">Automatically Matched</div>
                  <div className="text-2xl font-black text-emerald-300 mt-1">{autoMatchedRows.length}</div>
                  <div className="text-[11px] text-emerald-200 mt-1 font-medium">
                    {autoMatchedRows.length} payment{autoMatchedRows.length === 1 ? '' : 's'} matched automatically
                  </div>
                </div>

                <div
                  onClick={() => setReviewTab('REVIEW')}
                  className={`rounded-2xl p-4 border backdrop-blur-xs cursor-pointer transition-all ${
                    reviewTab === 'REVIEW'
                      ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-400/40'
                      : 'bg-amber-500/15 border-amber-500/25 hover:bg-amber-500/20'
                  }`}
                >
                  <div className="text-xs text-amber-200 font-medium">Needs Your Review</div>
                  <div className="text-2xl font-black text-amber-300 mt-1">{needsReviewRows.length}</div>
                  <div className="text-[11px] text-amber-200 mt-1 font-medium">
                    {needsReviewRows.length} payment{needsReviewRows.length === 1 ? '' : 's'} need your review
                  </div>
                </div>

                <div
                  onClick={() => setReviewTab('UNMATCHED')}
                  className={`rounded-2xl p-4 border backdrop-blur-xs cursor-pointer transition-all ${
                    reviewTab === 'UNMATCHED'
                      ? 'bg-rose-500/30 border-rose-400 ring-2 ring-rose-400/40'
                      : 'bg-rose-500/15 border-rose-500/25 hover:bg-rose-500/20'
                  }`}
                >
                  <div className="text-xs text-rose-200 font-medium">Unmatched</div>
                  <div className="text-2xl font-black text-rose-300 mt-1">{unmatchedRows.length}</div>
                  <div className="text-[11px] text-rose-200 mt-1 font-medium">
                    {unmatchedRows.length} transaction{unmatchedRows.length === 1 ? '' : 's'} could not be matched
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Review Results Interface with 3 Dedicated Sections */}
          {matchingAnalysisRows.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
              {/* Section Header & Sub-Tabs */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Reconciliation Review
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Multi-signal matching evaluated name similarity, reference tokens, expected amount, and dates.
                  </p>
                </div>

                {/* 3 Clear Sections / Tabs */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setReviewTab('AUTO')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      reviewTab === 'AUTO'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Automatically Matched ({autoMatchedRows.length})</span>
                  </button>

                  <button
                    onClick={() => setReviewTab('REVIEW')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      reviewTab === 'REVIEW'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Needs Review ({needsReviewRows.length})</span>
                  </button>

                  <button
                    onClick={() => setReviewTab('UNMATCHED')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      reviewTab === 'UNMATCHED'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Unmatched ({unmatchedRows.length})</span>
                  </button>

                  <button
                    onClick={() => setReviewTab('ALL')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      reviewTab === 'ALL'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>All ({matchingAnalysisRows.length})</span>
                  </button>
                </div>
              </div>

              {/* SECTION 1: AUTOMATICALLY MATCHED */}
              {reviewTab === 'AUTO' && (
                <div className="space-y-3">
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900 leading-relaxed">
                      <span className="font-bold">High-Confidence Automatic Matches (95-100% Score):</span> These transactions
                      satisfy all financial safety thresholds with exact amount matches and high name/reference fidelity.
                    </div>
                  </div>

                  {autoMatchedRows.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-2xl">
                      No transactions met the 95%+ automatic match threshold in this statement.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-xs text-slate-600 min-w-[950px]">
                        <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-3">Matched Tenant</th>
                            <th className="py-3 px-3">Property & Unit</th>
                            <th className="py-3 px-3">Amount Paid</th>
                            <th className="py-3 px-3">Date</th>
                            <th className="py-3 px-3">Invoice</th>
                            <th className="py-3 px-3">Confidence</th>
                            <th className="py-3 px-3">Why it Matched</th>
                            <th className="py-3 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {autoMatchedRows.map((row) => {
                            const confPct = Math.round((row.confidence_score || 0) * 100);
                            const signals = row.reasons?.length ? row.reasons : row.matching_signals || [];
                            return (
                              <tr key={row.id} className="hover:bg-slate-50/70 align-top">
                                <td className="py-3.5 px-3">
                                  <div className="font-bold text-slate-900">{row.matched_tenant_name}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    Payer: {row.bank_statement_name || row.payer_name}
                                  </div>
                                </td>
                                <td className="py-3.5 px-3">
                                  <div className="font-semibold text-slate-800">{row.property_name || 'Not available'}</div>
                                  <div className="text-[11px] text-slate-500">{row.unit_number ? `Unit ${row.unit_number}` : 'Not available'}</div>
                                </td>
                                <td className="py-3.5 px-3 font-bold text-emerald-700 whitespace-nowrap">
                                  RWF {row.amount.toLocaleString()}
                                </td>
                                <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">{row.transaction_date}</td>
                                <td className="py-3.5 px-3">
                                  <span className="font-mono text-[11px] font-semibold text-slate-700">
                                    {row.invoice_number || 'Needs review'}
                                  </span>
                                  {row.expected_amount != null && (
                                    <div className="text-[10px] text-slate-400">
                                      Expected: RWF {Number(row.expected_amount).toLocaleString()}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3.5 px-3">
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <Sparkles className="w-3 h-3" />
                                    {confPct}% {row.confidence_level || 'AUTO_MATCH'}
                                  </div>
                                </td>
                                <td className="py-3.5 px-3 max-w-[240px]">
                                  <ul className="space-y-0.5">
                                    {signals.slice(0, 3).map((sig, i) => (
                                      <li key={i} className="text-[11px] text-emerald-800 font-medium leading-tight">
                                        ✓ {sig}
                                      </li>
                                    ))}
                                  </ul>
                                </td>
                                <td className="py-3.5 px-3 text-right">
                                  {row.payment_id ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <Check className="w-3 h-3" /> Payment Posted
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleConfirmRowMatch(row)}
                                      disabled={isMatching}
                                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs disabled:opacity-50"
                                    >
                                      Confirm Match
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 2: NEEDS REVIEW */}
              {reviewTab === 'REVIEW' && (
                <div className="space-y-4">
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 leading-relaxed">
                      <span className="font-bold">Payments Requiring Landlord Confirmation:</span> These transactions have
                      a strong candidate or multiple possible candidates, but require your manual sign-off before any money is credited.
                    </div>
                  </div>

                  {needsReviewRows.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-2xl">
                      No payments currently require review. All transactions are matched or accounted for!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {needsReviewRows.map((row) => {
                        const confPct = Math.round((row.confidence_score || 0) * 100);
                        const candidates = row.possible_matches || [];
                        const selectedInv = selectedCandidateOverrides[row.id] || row.suggested_invoice_id || '';
                        const signals = row.reasons?.length ? row.reasons : row.matching_signals || [];
                        const warnings = row.warnings || [];

                        return (
                          <div
                            key={row.id}
                            className="bg-slate-50/70 rounded-2xl border border-slate-200 p-5 space-y-4 transition-all hover:border-slate-300"
                          >
                            {/* Row Top Header */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xs">
                                  {confPct}%
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-slate-900 text-sm">
                                      {row.bank_statement_name || row.payer_name || 'Not available'}
                                    </h4>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                        row.confidence_level === 'STRONG_MATCH'
                                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                                          : 'bg-amber-50 text-amber-800 border-amber-200'
                                      }`}
                                    >
                                      {row.confidence_level || 'REVIEW_REQUIRED'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                    <span>Date: {row.transaction_date || 'Not available'}</span>
                                    <span>•</span>
                                    <span className="font-mono">Ref: {row.bank_reference_id || row.transaction_reference || 'Not available'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-base font-black text-emerald-700">
                                  +RWF {row.amount.toLocaleString()}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 max-w-xs truncate" title={row.description}>
                                  {row.description}
                                </div>
                              </div>
                            </div>

                            {/* Candidate Selection if Multiple Candidates */}
                            {candidates.length > 1 ? (
                              <div className="space-y-2">
                                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Multiple Close Candidate Matches (Select correct tenant):</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {candidates.map((cand) => {
                                    const isSelected = selectedInv === cand.invoice_id;
                                    return (
                                      <div
                                        key={cand.invoice_id}
                                        onClick={() =>
                                          setSelectedCandidateOverrides((prev) => ({
                                            ...prev,
                                            [row.id]: cand.invoice_id,
                                          }))
                                        }
                                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                          isSelected
                                            ? 'bg-white border-[#331a6f] ring-2 ring-[#331a6f]/20 shadow-xs'
                                            : 'bg-white/60 border-slate-200 hover:bg-white'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-slate-900">{cand.tenant_name}</span>
                                          <span className="font-bold text-[#331a6f] font-mono">
                                            {Math.round((cand.match_score || 0) * 100)}% Match
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                          Unit {cand.unit_number || 'Not available'} • {cand.property_name || 'Not available'}
                                        </div>
                                        <div className="text-[11px] text-slate-600 font-medium mt-1">
                                          Expected: {cand.expected_amount != null ? `RWF ${Number(cand.expected_amount).toLocaleString()}` : 'Not available'}
                                        </div>
                                        {cand.reasons?.length > 0 && (
                                          <div className="text-[10px] text-slate-400 mt-1 truncate">
                                            {cand.reasons.join(' · ')}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              /* Single Best Candidate View */
                              <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Suggested Candidate
                                  </span>
                                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                                    {row.matched_tenant_name || 'Needs review'}
                                  </div>
                                  <div className="text-slate-500 text-[11px] mt-0.5">
                                    {[row.property_name, row.unit_number ? `Unit ${row.unit_number}` : null]
                                      .filter(Boolean)
                                      .join(' · ') || 'Not available'}
                                    {row.invoice_number && ` • ${row.invoice_number}`}
                                  </div>
                                </div>

                                <div className="sm:text-right">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Expected Rent
                                  </span>
                                  <div className="font-bold text-slate-800 mt-0.5">
                                    {row.expected_amount != null
                                      ? `RWF ${Number(row.expected_amount).toLocaleString()}`
                                      : 'Not available'}
                                  </div>
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${amountStatusBadge(row.amount_kind)}`}>
                                    {row.amount_status || 'Needs review'}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Reasons & Warnings */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              {signals.length > 0 && (
                                <div className="bg-white/70 rounded-xl p-3 border border-slate-200/70">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
                                    Matching Reasons
                                  </div>
                                  <ul className="space-y-1">
                                    {signals.map((sig, i) => (
                                      <li key={i} className="text-slate-700 flex items-center gap-1.5">
                                        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                        <span>{sig}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {warnings.length > 0 && (
                                <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200/70">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1">
                                    Warnings / Caution
                                  </div>
                                  <ul className="space-y-1">
                                    {warnings.map((w, i) => (
                                      <li key={i} className="text-amber-900 flex items-center gap-1.5">
                                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                        <span>{w}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {/* Actions Bar */}
                            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200/70">
                              <button
                                onClick={() => handleLeaveUnmatched(row)}
                                disabled={isMatching}
                                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject Match</span>
                              </button>

                              <button
                                onClick={() => openManualMatchForRow(row)}
                                disabled={isMatching}
                                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
                              >
                                Change / Search Tenant
                              </button>

                              <button
                                onClick={() => handleConfirmRowMatch(row)}
                                disabled={isMatching}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Confirm Match</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3: UNMATCHED */}
              {reviewTab === 'UNMATCHED' && (
                <div className="space-y-4">
                  <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-rose-900 leading-relaxed">
                      <span className="font-bold">Unmatched Transactions (0-59% Score):</span> These deposits could not be
                      safely correlated to an active tenant or lease. Use Manual Match to search and assign to any tenant invoice.
                    </div>
                  </div>

                  {unmatchedRows.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-2xl">
                      No unmatched transactions in this statement. Every deposit is reconciled!
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-xs text-slate-600 min-w-[900px]">
                        <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-3">Date</th>
                            <th className="py-3 px-3">Bank Payer Name</th>
                            <th className="py-3 px-3">Amount</th>
                            <th className="py-3 px-3">Narration / Description</th>
                            <th className="py-3 px-3">Reference</th>
                            <th className="py-3 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {unmatchedRows.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50/70 align-top">
                              <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-700">
                                {row.transaction_date}
                              </td>
                              <td className="py-3.5 px-3">
                                <div className="font-bold text-slate-900">
                                  {row.bank_statement_name || row.payer_name || 'Not available'}
                                </div>
                              </td>
                              <td className="py-3.5 px-3 font-bold text-emerald-700 whitespace-nowrap">
                                RWF {row.amount.toLocaleString()}
                              </td>
                              <td className="py-3.5 px-3 max-w-[280px]">
                                <div className="text-slate-600 line-clamp-2">{row.description}</div>
                              </td>
                              <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500">
                                {row.bank_reference_id || row.transaction_reference || 'Not available'}
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                <button
                                  onClick={() => openManualMatchForRow(row)}
                                  disabled={isMatching}
                                  className="px-3.5 py-1.5 rounded-xl bg-[#331a6f] hover:bg-[#251352] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ml-auto disabled:opacity-50"
                                >
                                  <Search className="w-3 h-3" />
                                  <span>Manual Match</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 4: ALL TRANSACTIONS */}
              {reviewTab === 'ALL' && (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs text-slate-600 min-w-[1100px]">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Bank-statement name</th>
                        <th className="py-3 px-3">Reference</th>
                        <th className="py-3 px-3">Amount paid</th>
                        <th className="py-3 px-3">Expected</th>
                        <th className="py-3 px-3">Payment status</th>
                        <th className="py-3 px-3">Suggested tenant</th>
                        <th className="py-3 px-3">Confidence</th>
                        <th className="py-3 px-3">Matching reasons</th>
                        <th className="py-3 px-3">Match status</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {matchingAnalysisRows.map((row) => {
                        const status = row.display_status || row.matching_status;
                        const confPct = Math.round((row.confidence_score || 0) * 100);
                        const canApprove =
                          !!row.pending_approval &&
                          !!row.suggested_invoice_id &&
                          !row.payment_id &&
                          (status === 'MATCHED' || status === 'PARTIAL');
                        const canAct = !row.payment_id && status !== 'DUPLICATE';
                        const bankName = row.bank_statement_name || row.payer_name || 'Not available';
                        const amountLabel =
                          row.amount_status || row.payment_amount_status || 'Needs review';

                        return (
                          <tr key={row.id} className="hover:bg-slate-50/70 align-top">
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900 max-w-[180px]">{bankName}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{row.transaction_date}</div>
                              <div className="text-[11px] text-slate-500 mt-1 line-clamp-2 max-w-[200px]">
                                {row.description}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                              {row.bank_reference_id || row.transaction_reference || 'Not available'}
                            </td>
                            <td className="py-3 px-3 font-bold text-emerald-700 whitespace-nowrap">
                              RWF {row.amount.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {row.expected_amount != null
                                ? `RWF ${Number(row.expected_amount).toLocaleString()}`
                                : 'Not available'}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${amountStatusBadge(row.amount_kind)}`}
                              >
                                {amountLabel}
                              </span>
                            </td>
                            <td className="py-3 px-3 max-w-[220px]">
                              <div className="font-semibold text-slate-800">
                                {row.matched_tenant_name || 'Not available'}
                              </div>
                              {(row.property_name || row.unit_number) && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {[row.property_name, row.unit_number ? `Unit ${row.unit_number}` : null]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </div>
                              )}
                              {row.invoice_number && (
                                <div className="text-[10px] text-slate-400 mt-0.5">{row.invoice_number}</div>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-800">{confPct}%</div>
                              <div className="text-[10px] text-slate-400">{row.confidence_label || 'Not available'}</div>
                            </td>
                            <td className="py-3 px-3">
                              <ul className="space-y-0.5 max-w-[200px]">
                                {(row.reasons?.length ? row.reasons : row.matching_signals || []).slice(0, 3).map((sig, i) => (
                                  <li key={i} className="text-[10px] text-slate-500 leading-snug">
                                    • {sig}
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${matchStatusBadge(status)}`}
                              >
                                {status.replace(/_/g, ' ')}
                              </span>
                              {row.pending_approval && !row.payment_id && (
                                <div className="text-[10px] text-amber-700 mt-1 font-semibold">
                                  Awaiting approval
                                </div>
                              )}
                              {row.payment_id && (
                                <div className="text-[10px] text-emerald-700 mt-1 font-semibold">
                                  Payment posted
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col items-end gap-1.5 min-w-[120px]">
                                {canApprove && (
                                  <button
                                    onClick={() => handleConfirmRowMatch(row)}
                                    disabled={isMatching}
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer disabled:opacity-50"
                                  >
                                    Confirm Match
                                  </button>
                                )}
                                {canAct && (
                                  <button
                                    onClick={() => openManualMatchForRow(row)}
                                    disabled={isMatching}
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#331a6f] hover:bg-[#251352] text-white text-[10px] font-bold cursor-pointer disabled:opacity-50"
                                  >
                                    {row.matched_tenant_name ? 'Change / Reassign' : 'Manual Match'}
                                  </button>
                                )}
                                {canAct && status !== 'UNMATCHED' && (
                                  <button
                                    onClick={() => handleLeaveUnmatched(row)}
                                    disabled={isMatching}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[10px] font-bold cursor-pointer disabled:opacity-50"
                                  >
                                    Leave Unmatched
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Finished reviewing this report?</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                You can run another statement reconciliation anytime.
              </p>
            </div>

            <button
              onClick={handleStartNewTracking}
              className="px-6 py-2.5 rounded-xl bg-[#331a6f] hover:bg-[#251352] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Start New Tracking</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: MANUAL TRANSACTION MATCHING
      ========================================================================= */}
      {isManualMatchModalOpen && selectedTxnForMatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Manual Transaction Reconciliation</h3>
              <button
                onClick={() => setIsManualMatchModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Transaction Highlight */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Bank Deposit</span>
                <span className="text-emerald-700 font-black">
                  +RWF {selectedTxnForMatch.amount.toLocaleString()}
                </span>
              </div>
              <div className="text-slate-600">
                <span className="font-semibold text-slate-400">Narration: </span>
                {selectedTxnForMatch.description}
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Date: {selectedTxnForMatch.transaction_date || 'Not available'}</span>
                <span>Ref: {selectedTxnForMatch.transaction_reference || 'Not available'}</span>
              </div>
            </div>

            {/* Select Target Tenant Invoice */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Active Tenant Invoice to Credit
              </label>
              <select
                value={selectedInvoiceForMatch}
                onChange={(e) => setSelectedInvoiceForMatch(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#331a6f]/20 cursor-pointer font-medium"
              >
                <option value="">-- Choose Tenant / Invoice --</option>
                {invoices
                  .filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED')
                  .map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      [{inv.tenant_name || 'Unknown Tenant'}] Invoice {inv.invoice_number} (Due: {inv.due_date || 'N/A'}, Bal: RWF{' '}
                      {(inv.balance_due || inv.total_amount).toLocaleString()})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reconciliation Notes</label>
              <input
                type="text"
                value={matchNotes}
                onChange={(e) => setMatchNotes(e.target.value)}
                placeholder="Optional notes for the receipt audit trail"
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#331a6f]/20"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsManualMatchModalOpen(false)}
                disabled={isMatching}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmManualMatch}
                disabled={isMatching}
                className="px-5 py-2.5 rounded-xl bg-[#331a6f] text-white hover:bg-[#251352] text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isMatching ? 'Matching...' : 'Confirm Match & Issue Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONFIRMATION MODAL: BULK REMIND UNPAID TENANTS
      ========================================================================= */}
      {isBulkRemindModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#331a6f]/10 text-[#331a6f] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Remind Unpaid Tenants</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Confirm sending official rent reminders to {unpaidTenantsList.length} tenants
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkRemindModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Overview Stats Box */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unpaid Tenants</span>
                <div className="text-lg font-black text-slate-900 mt-0.5">{unpaidTenantsList.length} Recipients</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Overdue</span>
                <div className="text-lg font-black text-rose-700 mt-0.5">
                  RWF {totalOutstandingAmount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Recipient List Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Recipients Preview</span>
                <span className="text-slate-400 font-normal">{unpaidTenantsList.length} total</span>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                {unpaidTenantsList.map((row) => (
                  <div key={row.tenant_id + (row.invoice_id || '')} className="p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{row.tenant_name}</div>
                      <div className="text-[11px] text-slate-500">Unit {row.unit_number} • {row.property_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-rose-700 font-mono">
                        RWF {row.balance_due.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">Due: {row.due_date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notification Channels */}
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center gap-3 text-xs text-indigo-950 font-medium">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-[#331a6f] flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="leading-snug">
                Dispatched via Notify In-App Alert and notification center with prompt settlement links.
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkRemindModalOpen(false)}
                disabled={isSendingReminders}
                className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkRemind}
                disabled={isSendingReminders}
                className="px-5 py-2.5 rounded-xl bg-[#331a6f] hover:bg-[#251352] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSendingReminders ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Reminders...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to All {unpaidTenantsList.length} Tenants</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONFIRMATION MODAL: INDIVIDUAL TENANT REMINDER
      ========================================================================= */}
      {selectedTenantForIndividualRemind && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#331a6f]/10 text-[#331a6f] flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Send Rent Reminder</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Review and confirm notice before sending
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTenantForIndividualRemind(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tenant Detail Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">
                    {selectedTenantForIndividualRemind.tenant_name}
                  </div>
                  <div className="text-xs text-slate-500">
                    Unit {selectedTenantForIndividualRemind.unit_number} • {selectedTenantForIndividualRemind.property_name}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Balance Due</span>
                  <div className="text-base font-black text-rose-700 font-mono">
                    RWF {selectedTenantForIndividualRemind.balance_due.toLocaleString()}
                  </div>
                </div>
              </div>

              {(selectedTenantForIndividualRemind.tenant_phone || selectedTenantForIndividualRemind.tenant_email) && (
                <div className="pt-2 border-t border-slate-200/60 flex items-center gap-4 text-[11px] text-slate-500">
                  {selectedTenantForIndividualRemind.tenant_phone && (
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-slate-400" />
                      {selectedTenantForIndividualRemind.tenant_phone}
                    </span>
                  )}
                  {selectedTenantForIndividualRemind.tenant_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {selectedTenantForIndividualRemind.tenant_email}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Editable Message Content */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Reminder Notice Message
              </label>
              <textarea
                rows={4}
                value={individualReminderCustomMsg}
                onChange={(e) => setIndividualReminderCustomMsg(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#331a6f]/20 font-medium leading-relaxed resize-none"
                placeholder="Enter reminder message..."
              />
              <p className="text-[11px] text-slate-400">
                This notice will appear immediately in the tenant's portal with full invoice details.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  const row = selectedTenantForIndividualRemind;
                  const tObj = tenants.find((t) => t.id === row.tenant_id) || {
                    id: row.tenant_id,
                    first_name: row.tenant_name.split(' ')[0],
                    last_name: row.tenant_name.split(' ')[1] || '',
                    phone: row.tenant_phone,
                    email: row.tenant_email,
                  };
                  const invObj = invoices.find((i) => i.id === row.invoice_id);
                  setSelectedTenantForIndividualRemind(null);
                  onSendReminder(tObj as Tenant, invObj);
                }}
                className="text-[11px] font-bold text-[#331a6f] hover:underline cursor-pointer"
              >
                Open Full Reminder Modal
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTenantForIndividualRemind(null)}
                  disabled={isSendingReminders}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmIndividualRemind}
                  disabled={isSendingReminders}
                  className="px-5 py-2.5 rounded-xl bg-[#331a6f] hover:bg-[#251352] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSendingReminders ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Confirm & Send Reminder</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
