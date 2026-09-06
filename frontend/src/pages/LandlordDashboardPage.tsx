import React, { useState, useEffect } from 'react';
import {
  Building2,
  Home,
  Users,
  Send,
  Plus,
  Settings,
  LogOut,
  CreditCard,
  Wrench,
  BarChart3,
  FileText,
  X,
  Copy,
  Check,
  Menu,
  ShieldCheck,
  Building,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  ChevronRight,
  ChevronLeft,
  Eye,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit,
  History,
  Layers,
  Sparkles,
  Bell,
  MessageSquare,
  Wrench as ToolIcon,
  Phone,
  CheckSquare,
  ArrowRight,
  PlusCircle,
  UserCheck,
  User,
  CalendarCheck,
  ShieldAlert,
  Receipt as ReceiptIcon,
  RefreshCw,
  Sliders,
  Mail,
  TrendingUp,
  Wallet,
  Percent,
  ArrowUpRight,
  PieChart,
  Printer,
  Download,
  CheckCircle,
  Banknote,
  FileSpreadsheet,
  FileCheck,
  UserCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LeaseAgreementPreviewModal } from '../components/LeaseAgreementPreviewModal';
import {
  Property,
  Unit,
  Tenant,
  Tenancy,
  ConversationSummary,
  Lease,
  Invitation,
  Invoice,
  Payment,
  Receipt,
  Expense,
  LandlordFinancials,
  MaintenanceRequest,
  Complaint,
  MaintenanceWorker,
  Notification
} from '../types';
import { InvoiceModal } from '../components/InvoiceModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { MaintenanceModal } from '../components/MaintenanceModal';
import { ComplaintModal } from '../components/ComplaintModal';
import { WorkerModal } from '../components/WorkerModal';
import { NotificationModal } from '../components/NotificationModal';
import { NotificationPreferencesModal } from '../components/NotificationPreferencesModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { TenantLedgerModal } from '../components/TenantLedgerModal';
import { SendReminderModal } from '../components/SendReminderModal';
import { LandlordOverviewTab } from '../components/LandlordOverviewTab';
import { LandlordFinancialOverviewTab } from '../components/LandlordFinancialOverviewTab';
import { LandlordInvoicesTab } from '../components/LandlordInvoicesTab';
import { LandlordPaymentsTab } from '../components/LandlordPaymentsTab';
import { LandlordExpensesTab } from '../components/LandlordExpensesTab';
import { LandlordComplaintsTab } from '../components/LandlordComplaintsTab';
import { LandlordMessagesTab } from '../components/LandlordMessagesTab';
import { LandlordAccountTab } from '../components/LandlordAccountTab';
import { LandlordTrackerTab } from '../components/tracker/LandlordTrackerTab';
import { CreateInvoiceModal } from '../components/CreateInvoiceModal';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { LeaseDocumentUploadSection } from '../components/LeaseDocumentUploadSection';
import { LeaseDocumentDetailsModal } from '../components/LeaseDocumentDetailsModal';

interface LandlordDashboardPageProps {
  onLogout: () => void;
}

type LandlordTab =
  | 'dashboard'
  | 'tracker'
  | 'messages'
  | 'maintenance'
  | 'complaints'
  | 'workers'
  | 'financials'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'properties'
  | 'units'
  | 'tenants'
  | 'leases'
  | 'invitations'
  | 'account'
  | 'profile';

export const LandlordDashboardPage: React.FC<LandlordDashboardPageProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<LandlordTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Data states
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [financials, setFinancials] = useState<LandlordFinancials | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Phase 4: Maintenance, Complaints, Workers, Notifications
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [workers, setWorkers] = useState<MaintenanceWorker[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Filter & Search states
  const [propertySearch, setPropertySearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [unitPropertyFilter, setUnitPropertyFilter] = useState('ALL');
  const [unitStatusFilter, setUnitStatusFilter] = useState('ALL');
  const [tenantSearch, setTenantSearch] = useState('');
  const [leaseSearch, setLeaseSearch] = useState('');
  const [leaseStatusFilter, setLeaseStatusFilter] = useState('ALL');
  const [leasePage, setLeasePage] = useState(1);
  const LEASES_PER_PAGE = 5;

  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('ALL');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL');

  // Phase 4 Filter & Search states
  const [maintSearch, setMaintSearch] = useState('');
  const [maintStatusFilter, setMaintStatusFilter] = useState('ALL');
  const [maintPriorityFilter, setMaintPriorityFilter] = useState('ALL');
  const [maintPropertyFilter, setMaintPropertyFilter] = useState('ALL');
  const [complaintSearch, setComplaintSearch] = useState('');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('ALL');
  const [workerSearch, setWorkerSearch] = useState('');

  // Modal states
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateLeaseModal, setShowCreateLeaseModal] = useState(false);
  const [showRecordExpenseModal, setShowRecordExpenseModal] = useState(false);
  const [selectedExpenseForEdit, setSelectedExpenseForEdit] = useState<Expense | undefined>(undefined);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [selectedTenantForProfile, setSelectedTenantForProfile] = useState<Tenant | null>(null);
  const [selectedPropertyForView, setSelectedPropertyForView] = useState<Property | null>(null);

  // Financial & Tenant Modals (Phase 3/5 Extension)
  const [selectedTenantForLedger, setSelectedTenantForLedger] = useState<Tenant | null>(null);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [recordPaymentTenantId, setRecordPaymentTenantId] = useState<string | undefined>(undefined);
  const [recordPaymentInvoiceId, setRecordPaymentInvoiceId] = useState<string | undefined>(undefined);
  const [isSendReminderModalOpen, setIsSendReminderModalOpen] = useState(false);
  const [reminderTenant, setReminderTenant] = useState<Tenant | null>(null);
  const [reminderInvoice, setReminderInvoice] = useState<Invoice | null>(null);

  // Phase 4 Modals
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceRequest | null>(null);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isNotificationPrefModalOpen, setIsNotificationPrefModalOpen] = useState(false);
  const [isProcessingReminders, setIsProcessingReminders] = useState(false);

  // Form states - Expenses
  const [expPropId, setExpPropId] = useState('');
  const [expUnitId, setExpUnitId] = useState('');
  const [expCategory, setExpCategory] = useState<any>('MAINTENANCE');
  const [expAmount, setExpAmount] = useState(50000);
  const [expDescription, setExpDescription] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);

  // Form states - Custom Invoice
  const [invLeaseId, setInvLeaseId] = useState('');
  const [invPeriodStart, setInvPeriodStart] = useState(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
  const [invPeriodEnd, setInvPeriodEnd] = useState(new Date().toISOString().split('T')[0]);
  const [invDueDate, setInvDueDate] = useState(new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]);
  const [invRentAmount, setInvRentAmount] = useState(350000);
  const [invNotes, setInvNotes] = useState('');

  // Form states - Property
  const [propName, setPropName] = useState('');
  const [propType, setPropType] = useState<any>('APARTMENT');
  const [propAddress, setPropAddress] = useState('');
  const [propDistrict, setPropDistrict] = useState('Gasabo');
  const [propSector, setPropSector] = useState('Kacyiru');
  const [propDesc, setPropDesc] = useState('');

  // Form states - Edit Property
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editPropName, setEditPropName] = useState('');
  const [editPropType, setEditPropType] = useState<any>('APARTMENT');
  const [editPropAddress, setEditPropAddress] = useState('');
  const [editPropDistrict, setEditPropDistrict] = useState('');
  const [editPropSector, setEditPropSector] = useState('');
  const [editPropDesc, setEditPropDesc] = useState('');
  const [isSavingProperty, setIsSavingProperty] = useState(false);

  // Form states - Unit
  const [selectedPropIdForUnit, setSelectedPropIdForUnit] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [unitFloor, setUnitFloor] = useState(1);
  const [unitRooms, setUnitRooms] = useState('');
  const [unitBathrooms, setUnitBathrooms] = useState('');
  const [unitSquareMeters, setUnitSquareMeters] = useState('');
  const [unitRent, setUnitRent] = useState(300000);
  const [unitCurrency, setUnitCurrency] = useState('RWF');
  const [unitDesc, setUnitDesc] = useState('');

  // Form states - Edit Unit
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editUnitNumber, setEditUnitNumber] = useState('');
  const [editUnitFloor, setEditUnitFloor] = useState(1);
  const [editUnitRooms, setEditUnitRooms] = useState('');
  const [editUnitBathrooms, setEditUnitBathrooms] = useState('');
  const [editUnitSquareMeters, setEditUnitSquareMeters] = useState('');
  const [editUnitRent, setEditUnitRent] = useState(0);
  const [isSavingUnit, setIsSavingUnit] = useState(false);

  // Deletion confirmation state - Properties & Units
  const [propertyPendingDelete, setPropertyPendingDelete] = useState<Property | null>(null);
  const [isDeletingProperty, setIsDeletingProperty] = useState(false);
  const [unitPendingDelete, setUnitPendingDelete] = useState<Unit | null>(null);
  const [isDeletingUnit, setIsDeletingUnit] = useState(false);

  // Per-row loading guards - Leases & Tenancies
  const [activatingLeaseId, setActivatingLeaseId] = useState<string | null>(null);
  const [endingTenancyId, setEndingTenancyId] = useState<string | null>(null);

  // Submitting guards - Property / Unit / Invitation / Lease creation forms
  const [isCreatingProperty, setIsCreatingProperty] = useState(false);
  const [isCreatingUnit, setIsCreatingUnit] = useState(false);
  const [isCreatingInvitation, setIsCreatingInvitation] = useState(false);
  const [isCreatingLease, setIsCreatingLease] = useState(false);

  // Form states - Invite Tenant
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('+250 788 123 456');
  const [invitePropId, setInvitePropId] = useState('');
  const [inviteUnitId, setInviteUnitId] = useState('');
  const [createdInviteResult, setCreatedInviteResult] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form states - Create Lease & Tenancy
  const [leaseTenantId, setLeaseTenantId] = useState('');
  const [leasePropId, setLeasePropId] = useState('');
  const [leaseUnitId, setLeaseUnitId] = useState('');
  const [leaseStartDate, setLeaseStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaseEndDate, setLeaseEndDate] = useState(
    new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
  );
  const [leaseRent, setLeaseRent] = useState(350000);
  const [leaseDeposit, setLeaseDeposit] = useState(350000);
  const [leaseNotes, setLeaseNotes] = useState('');
  const [leaseError, setLeaseError] = useState<string | null>(null);
  const [leaseIsDraft, setLeaseIsDraft] = useState(false);
  const [leaseUploadedDoc, setLeaseUploadedDoc] = useState<any | null>(null);
  const [selectedLeaseForDocModal, setSelectedLeaseForDocModal] = useState<Lease | null>(null);
  const [previewLeaseId, setPreviewLeaseId] = useState<string | null>(null);

  // Load portfolio data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        propsRes,
        unitsRes,
        invRes,
        tenantsRes,
        leasesRes,
        tenanciesRes,
        statsRes,
        invoicesRes,
        paymentsRes,
        receiptsRes,
        expensesRes,
        financialsRes,
        maintRes,
        complaintsRes,
        workersRes,
        notifRes,
        unreadRes,
        conversationsRes
      ] = await Promise.all([
        api.properties.list(),
        api.units.list(),
        api.invitations.list(),
        api.tenants.getLandlordTenants(),
        api.leases.list(),
        api.tenancies.list(),
        api.landlord.getStats(),
        api.invoices.list(),
        api.payments.list(),
        api.receipts.list(),
        api.expenses.list(),
        api.financials.getLandlordSummary(),
        api.maintenance.getLandlordRequests(),
        api.complaints.getLandlordComplaints(),
        api.maintenance.getWorkers(),
        api.notifications.getUserNotifications(user?.id || 'mock-lp-001'),
        api.notifications.getUnreadCount(),
        api.messages.getConversations().catch(() => [])
      ]);

      setProperties(Array.isArray(propsRes) ? propsRes : ((propsRes as any)?.properties || []));
      setUnits(Array.isArray(unitsRes) ? unitsRes : ((unitsRes as any)?.units || []));
      setInvitations(Array.isArray(invRes) ? invRes : ((invRes as any)?.invitations || []));
      setTenants(Array.isArray(tenantsRes) ? tenantsRes : ((tenantsRes as any)?.tenants || []));
      setLeases(Array.isArray(leasesRes) ? leasesRes : ((leasesRes as any)?.leases || []));
      setTenancies(Array.isArray(tenanciesRes) ? tenanciesRes : ((tenanciesRes as any)?.tenancies || []));
      setStats(statsRes);
      setInvoices(Array.isArray(invoicesRes) ? invoicesRes : ((invoicesRes as any)?.invoices || []));
      setPayments(Array.isArray(paymentsRes) ? paymentsRes : ((paymentsRes as any)?.payments || []));
      setReceipts(Array.isArray(receiptsRes) ? receiptsRes : ((receiptsRes as any)?.receipts || []));
      setExpenses(Array.isArray(expensesRes) ? expensesRes : ((expensesRes as any)?.expenses || []));
      setFinancials(financialsRes && !(financialsRes as any).detail ? financialsRes : null);

      setMaintenanceRequests(Array.isArray(maintRes) ? maintRes : []);
      setComplaints(Array.isArray(complaintsRes) ? complaintsRes : []);
      setWorkers(Array.isArray(workersRes) ? workersRes : []);
      setNotifications(Array.isArray(notifRes) ? notifRes : []);
      setConversations(Array.isArray(conversationsRes) ? conversationsRes : []);
      setUnreadCount(unreadRes?.unread_count ?? (Array.isArray(notifRes) ? notifRes.filter(n => !n.is_read).length : 0));

      if (propsRes && propsRes.length > 0) {
        if (!selectedPropIdForUnit) setSelectedPropIdForUnit(propsRes[0].id);
        if (!invitePropId) setInvitePropId(propsRes[0].id);
        if (!leasePropId) setLeasePropId(propsRes[0].id);
        if (!expPropId) setExpPropId(propsRes[0].id);
      }
      if (leasesRes && leasesRes.length > 0 && !invLeaseId) {
        setInvLeaseId(leasesRes[0].id);
        setInvRentAmount(leasesRes[0].monthly_rent || 350000);
      }
    } catch (err: any) {
      console.error('Failed to load landlord data:', err);
      setError(err.message || 'Failed to sync portfolio data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Shared success/error toast helpers - each call clears the other channel and
  // auto-dismisses only itself, so a fast follow-up message is never wiped out
  // by a stale timeout from a previous one.
  const showSuccess = (message: string, durationMs: number = 4000) => {
    setActionErrorMsg(null);
    setSuccessMsg(message);
    setTimeout(() => {
      setSuccessMsg((current) => (current === message ? null : current));
    }, durationMs);
  };

  const showError = (message: string, durationMs: number = 6000) => {
    setSuccessMsg(null);
    setActionErrorMsg(message);
    setTimeout(() => {
      setActionErrorMsg((current) => (current === message ? null : current));
    }, durationMs);
  };

  // Filter vacant units for dropdowns
  const vacantUnitsForInvite = units.filter(
    (u) =>
      u.property_id === invitePropId &&
      (u.status === 'VACANT' || u.status === 'vacant' || u.status === 'RESERVED')
  );

  const vacantUnitsForLease = units.filter(
    (u) =>
      u.property_id === leasePropId &&
      (u.status === 'VACANT' || u.status === 'vacant' || u.status === 'RESERVED')
  );

  // The tenants list has one row per tenancy, so the same tenant can appear more
  // than once (e.g. an ended tenancy plus a current one). De-dupe by tenant id
  // for the "select a tenant" dropdown, which only cares about the person.
  const uniqueTenantsForLease = React.useMemo(() => {
    const seen = new Set<string>();
    return tenants.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [tenants]);

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingProperty(true);
    try {
      await api.properties.create({
        name: propName,
        property_type: propType,
        address: propAddress,
        district: propDistrict,
        sector: propSector,
        description: propDesc,
      });

      setPropName('');
      setPropAddress('');
      setPropDesc('');
      setShowAddPropertyModal(false);
      showSuccess('Property created successfully.');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to create property.');
    } finally {
      setIsCreatingProperty(false);
    }
  };

  const handleOpenEditProperty = (prop: Property) => {
    setEditingProperty(prop);
    setEditPropName(prop.name || '');
    setEditPropType(prop.property_type || 'APARTMENT');
    setEditPropAddress(prop.address || '');
    setEditPropDistrict(prop.district || '');
    setEditPropSector(prop.sector || '');
    setEditPropDesc(prop.description || '');
  };

  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;
    setIsSavingProperty(true);
    try {
      await api.properties.update(editingProperty.id, {
        name: editPropName,
        property_type: editPropType,
        address: editPropAddress,
        district: editPropDistrict,
        sector: editPropSector,
        description: editPropDesc,
      });

      setEditingProperty(null);
      showSuccess('Property updated successfully.');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to update property.');
    } finally {
      setIsSavingProperty(false);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUnit(true);
    try {
      await api.units.create({
        property_id: selectedPropIdForUnit,
        unit_number: unitNumber,
        floor: Number(unitFloor),
        rooms: unitRooms.trim() === '' ? undefined : Number(unitRooms),
        bathrooms: unitBathrooms.trim() === '' ? undefined : Number(unitBathrooms),
        square_meters: unitSquareMeters.trim() === '' ? undefined : Number(unitSquareMeters),
        monthly_rent: Number(unitRent),
        currency: unitCurrency,
        description: unitDesc,
      });

      setUnitNumber('');
      setUnitRooms('');
      setUnitBathrooms('');
      setUnitSquareMeters('');
      setUnitDesc('');
      setShowAddUnitModal(false);
      showSuccess('Unit created successfully.');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to create unit.');
    } finally {
      setIsCreatingUnit(false);
    }
  };

  const handleOpenEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setEditUnitNumber(unit.unit_number || '');
    setEditUnitFloor(unit.floor ?? 1);
    setEditUnitRooms(unit.rooms !== undefined && unit.rooms !== null ? String(unit.rooms) : '');
    setEditUnitBathrooms(unit.bathrooms !== undefined && unit.bathrooms !== null ? String(unit.bathrooms) : '');
    setEditUnitSquareMeters(
      unit.square_meters !== undefined && unit.square_meters !== null ? String(unit.square_meters) : ''
    );
    setEditUnitRent(unit.monthly_rent || 0);
  };

  const handleUpdateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    setIsSavingUnit(true);
    try {
      await api.units.update(editingUnit.id, {
        unit_number: editUnitNumber,
        floor: Number(editUnitFloor),
        rooms: editUnitRooms.trim() === '' ? null : Number(editUnitRooms),
        bathrooms: editUnitBathrooms.trim() === '' ? null : Number(editUnitBathrooms),
        square_meters: editUnitSquareMeters.trim() === '' ? null : Number(editUnitSquareMeters),
        monthly_rent: Number(editUnitRent),
      });

      setEditingUnit(null);
      showSuccess('Unit updated successfully!');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to update unit');
    } finally {
      setIsSavingUnit(false);
    }
  };

  const handleConfirmDeleteUnit = async () => {
    if (!unitPendingDelete) return;
    const deletedUnitId = unitPendingDelete.id;
    setIsDeletingUnit(true);
    try {
      await api.units.delete(deletedUnitId);
      // Remove immediately from local state so it disappears without waiting on a full refetch
      setUnits((prev) => prev.filter((u) => u.id !== deletedUnitId));
      setUnitPendingDelete(null);
      showSuccess('Unit deleted successfully!');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to delete unit');
    } finally {
      setIsDeletingUnit(false);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUnitId) {
      showError('Please select a vacant unit for this invitation.');
      return;
    }
    setIsCreatingInvitation(true);
    try {
      const res = await api.invitations.create({
        tenant_email: inviteEmail.trim() ? inviteEmail.trim() : null,
        tenant_phone: invitePhone,
        property_id: invitePropId,
        unit_id: inviteUnitId,
      });

      setCreatedInviteResult(res);
      setInviteEmail('');
      showSuccess('Vacancy assigned successfully. Invitation link generated.');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to assign vacancy to tenant.');
    } finally {
      setIsCreatingInvitation(false);
    }
  };

  const handleCreateLeaseAndTenancy = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaseError(null);

    // Validate tenant selection
    if (!leaseTenantId) {
      setLeaseError('Please select the tenant this lease is being created for.');
      return;
    }

    // Validate unit occupancy
    const targetUnit = units.find((u) => u.id === leaseUnitId);
    if (targetUnit && targetUnit.status === 'OCCUPIED') {
      setLeaseError('Double occupancy prevented: Unit is already occupied by an active tenancy.');
      return;
    }

    // Check document validation: Required for Activation, optional for Draft
    if (!leaseIsDraft && !leaseUploadedDoc?.file && !leaseUploadedDoc?.fileName) {
      setLeaseError('Lease agreement document is required before this lease can be activated.');
      return;
    }

    setIsCreatingLease(true);
    try {
      // Create tenancy first
      const newTenancy = await api.tenancies.create({
        tenant_id: leaseTenantId,
        property_id: leasePropId,
        unit_id: leaseUnitId,
        start_date: leaseStartDate,
        end_date: leaseEndDate,
      });

      // Create lease record
      const createdLease = await api.leases.create({
        tenancy_id: newTenancy.id,
        property_id: leasePropId,
        unit_id: leaseUnitId,
        start_date: leaseStartDate,
        end_date: leaseEndDate,
        monthly_rent: Number(leaseRent),
        security_deposit: Number(leaseDeposit),
        payment_due_day: 5,
        late_fee: 15000,
        currency: 'RWF',
        notes: leaseNotes,
        status: leaseIsDraft ? 'DRAFT' : 'ACTIVE',
      });

      setShowCreateLeaseModal(false);
      setLeaseUploadedDoc(null);
      setLeaseIsDraft(false);
      setLeaseTenantId('');
      showSuccess(
        leaseIsDraft
          ? 'Lease created successfully. Saved as a draft — upload the signed document to activate it.'
          : 'Lease created successfully.'
      );
      fetchData();

      // Document upload is a secondary step - its failure must not hide the
      // fact that the lease and tenancy were already created successfully.
      if (leaseUploadedDoc && createdLease?.id) {
        try {
          await api.leases.uploadDocument(createdLease.id, {
            file_name: leaseUploadedDoc.fileName || 'lease_agreement.pdf',
            document_name: leaseUploadedDoc.documentName || 'Official Signed Lease Agreement',
            file_size: leaseUploadedDoc.fileSize || 2048500,
            file_type: leaseUploadedDoc.fileType || 'application/pdf',
            file_data: leaseUploadedDoc.previewUrl,
            version_notes: 'Initial signed agreement uploaded during lease creation.',
            uploaded_by: `${user?.first_name || 'Landlord'} ${user?.last_name || ''}`.trim() || 'Landlord',
            uploaded_by_role: 'LANDLORD',
          });
          fetchData();
        } catch (docErr: any) {
          showError(
            docErr.message ||
              'Lease was created, but the signed document could not be attached. Please upload it from the Documents tab.'
          );
        }
      }
    } catch (err: any) {
      setLeaseError(err.message || 'Failed to create lease.');
    } finally {
      setIsCreatingLease(false);
    }
  };

  const handleUploadDocumentForLease = async (leaseId: string, docData: any) => {
    try {
      await api.leases.uploadDocument(leaseId, {
        ...docData,
        uploaded_by_role: 'LANDLORD',
        uploaded_by_id: user?.id || 'mock-lp-001',
      });
      showSuccess('Lease agreement document uploaded & version history updated!');
      await fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to upload document version');
    }
  };

  const handleActivateDraftLease = async (lease: Lease) => {
    if (!lease.agreement_document && !lease.has_signed_document) {
      setSelectedLeaseForDocModal(lease);
      showSuccess('Please upload the signed lease agreement document to activate this lease.', 5000);
      return;
    }

    setActivatingLeaseId(lease.id);
    try {
      await api.leases.activate(lease.id);
      showSuccess('Lease activated successfully.');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to activate lease.');
    } finally {
      setActivatingLeaseId(null);
    }
  };

  const handleConfirmDeleteProperty = async () => {
    if (!propertyPendingDelete) return;
    const deletedPropertyId = propertyPendingDelete.id;
    setIsDeletingProperty(true);
    try {
      await api.properties.delete(deletedPropertyId);
      // Remove immediately from local state (and its now-deleted units) so it
      // disappears without waiting on a full refetch
      setProperties((prev) => prev.filter((p) => p.id !== deletedPropertyId));
      setUnits((prev) => prev.filter((u) => u.property_id !== deletedPropertyId));
      setPropertyPendingDelete(null);
      showSuccess('Property deleted successfully', 3000);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to delete property');
    } finally {
      setIsDeletingProperty(false);
    }
  };

  const handleEndTenancy = async (tenancyId: string) => {
    if (!confirm('Are you sure you want to end this tenancy? The unit will automatically be marked as VACANT.')) {
      return;
    }
    setEndingTenancyId(tenancyId);
    try {
      await api.tenancies.end(tenancyId);
      showSuccess('Tenancy ended successfully. The unit is now vacant.', 3000);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to end tenancy.');
    } finally {
      setEndingTenancyId(null);
    }
  };

  // Phase 3 & 5: Tenant Financial Ledger, Record Payment & Rent Reminders
  const handleOpenLedger = (tenant: Tenant) => {
    setSelectedTenantForLedger(tenant);
    setIsLedgerModalOpen(true);
  };

  const handleOpenRecordPayment = (tenantId?: string, invoiceId?: string) => {
    setRecordPaymentTenantId(tenantId);
    setRecordPaymentInvoiceId(invoiceId);
    setIsRecordPaymentModalOpen(true);
  };

  const handleOpenSendReminder = (tenant: Tenant, invoice?: Invoice) => {
    setReminderTenant(tenant);
    setReminderInvoice(invoice || null);
    setIsSendReminderModalOpen(true);
  };

  const handlePaymentRecorded = (receipt: any) => {
    setIsRecordPaymentModalOpen(false);
    setRecordPaymentTenantId(undefined);
    setRecordPaymentInvoiceId(undefined);
    showSuccess('Payment logged successfully and verified receipt issued!');
    fetchData();
    if (receipt) {
      setSelectedReceipt(receipt);
    }
  };

  const handleReminderSent = (msg: string) => {
    setIsSendReminderModalOpen(false);
    setReminderTenant(null);
    setReminderInvoice(null);
    showSuccess(msg || 'Payment reminder sent successfully!');
    fetchData();
  };

  // Phase 4: Maintenance Handlers
  const handleAcknowledgeMaintenance = async (id: string) => {
    try {
      await api.maintenance.acknowledgeRequest(id);
      showSuccess('Maintenance request acknowledged.');
      fetchData();
      if (selectedMaintenance && selectedMaintenance.id === id) {
        setSelectedMaintenance((prev) => (prev ? { ...prev, status: 'ACKNOWLEDGED' } : null));
      }
    } catch (err: any) {
      showError(err.message || 'Failed to acknowledge maintenance');
    }
  };

  const handleScheduleMaintenance = async (
    id: string,
    data: {
      scheduled_date: string;
      scheduled_time?: string;
      assigned_to?: string;
      assigned_worker_id?: string;
      estimated_cost?: number;
    }
  ) => {
    try {
      await api.maintenance.scheduleRequest(id, data);
      showSuccess('Maintenance visit scheduled and assigned.');
      fetchData();
      if (selectedMaintenance && selectedMaintenance.id === id) {
        setSelectedMaintenance((prev) =>
          prev
            ? {
                ...prev,
                status: 'SCHEDULED',
                scheduled_date: data.scheduled_date,
                scheduled_time: data.scheduled_time,
                assigned_to: data.assigned_to,
                estimated_cost: data.estimated_cost,
              }
            : null
        );
      }
    } catch (err: any) {
      showError(err.message || 'Failed to schedule maintenance');
    }
  };

  const handleMarkMaintenanceInProgress = async (id: string) => {
    try {
      await api.maintenance.markInProgress(id);
      showSuccess('Maintenance marked as in progress.');
      fetchData();
      if (selectedMaintenance && selectedMaintenance.id === id) {
        setSelectedMaintenance((prev) => (prev ? { ...prev, status: 'IN_PROGRESS' } : null));
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update maintenance status');
    }
  };

  const handleResolveMaintenance = async (
    id: string,
    data: { actual_cost?: number; landlord_notes?: string }
  ) => {
    try {
      await api.maintenance.resolveRequest(id, data);
      showSuccess('Maintenance marked as resolved. Awaiting tenant confirmation.');
      fetchData();
      if (selectedMaintenance && selectedMaintenance.id === id) {
        setSelectedMaintenance((prev) =>
          prev
            ? {
                ...prev,
                status: 'RESOLVED',
                actual_cost: data.actual_cost,
                landlord_notes: data.landlord_notes,
              }
            : null
        );
      }
    } catch (err: any) {
      showError(err.message || 'Failed to resolve maintenance');
    }
  };

  const handleAddToExpenseMaintenance = async (id: string) => {
    try {
      await api.maintenance.addToExpenses(id);
      showSuccess('Maintenance cost added to property expenses successfully!');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to add to expenses');
    }
  };

  const handleAddMaintenanceComment = async (id: string, message: string) => {
    try {
      await api.maintenance.addComment(id, message);
      fetchData();
      if (selectedMaintenance && selectedMaintenance.id === id) {
        const newComment = {
          id: `cmt-${Date.now()}`,
          request_id: id,
          user_id: user?.id || 'mock-lp-001',
          user_name: `${user?.first_name || 'Landlord'} ${user?.last_name || ''}`,
          user_role: 'LANDLORD' as const,
          message,
          created_at: new Date().toISOString(),
        };
        setSelectedMaintenance((prev) =>
          prev
            ? {
                ...prev,
                comments: [...(prev.comments || []), newComment],
              }
            : null
        );
      }
    } catch (err: any) {
      showError(err.message || 'Failed to add comment');
    }
  };

  // Phase 4: Complaint Handlers
  const handleAcknowledgeComplaint = async (id: string) => {
    try {
      await api.complaints.acknowledgeComplaint(id);
      showSuccess('Complaint acknowledged.');
      fetchData();
      if (selectedComplaint && selectedComplaint.id === id) {
        setSelectedComplaint((prev) => (prev ? { ...prev, status: 'ACKNOWLEDGED' } : null));
      }
    } catch (err: any) {
      showError(err.message || 'Failed to acknowledge complaint');
    }
  };

  const handleUnderReviewComplaint = async (id: string, data?: { landlord_response?: string }) => {
    try {
      await api.complaints.markUnderReview(id, data);
      showSuccess('Complaint moved to under review with official response.');
      fetchData();
      if (selectedComplaint && selectedComplaint.id === id) {
        setSelectedComplaint((prev) =>
          prev
            ? {
                ...prev,
                status: 'UNDER_REVIEW',
                landlord_response: data?.landlord_response || prev.landlord_response,
              }
            : null
        );
      }
    } catch (err: any) {
      showError(err.message || 'Failed to review complaint');
    }
  };

  const handleResolveComplaint = async (id: string, data: { landlord_response: string }) => {
    try {
      await api.complaints.resolveComplaint(id, data);
      showSuccess('Complaint marked as resolved.');
      fetchData();
      if (selectedComplaint && selectedComplaint.id === id) {
        setSelectedComplaint((prev) =>
          prev
            ? {
                ...prev,
                status: 'RESOLVED',
                landlord_response: data.landlord_response,
              }
            : null
        );
      }
    } catch (err: any) {
      showError(err.message || 'Failed to resolve complaint');
    }
  };

  const handleCloseComplaint = async (id: string) => {
    try {
      await api.complaints.closeComplaint(id);
      showSuccess('Complaint closed.');
      fetchData();
      if (selectedComplaint && selectedComplaint.id === id) {
        setSelectedComplaint((prev) => (prev ? { ...prev, status: 'CLOSED' } : null));
      }
    } catch (err: any) {
      showError(err.message || 'Failed to close complaint');
    }
  };

  const handleAddComplaintComment = async (id: string, message: string) => {
    try {
      await api.complaints.addComment(id, message);
      fetchData();
      if (selectedComplaint && selectedComplaint.id === id) {
        const newComment = {
          id: `cmt-${Date.now()}`,
          complaint_id: id,
          user_id: user?.id || 'mock-lp-001',
          user_name: `${user?.first_name || 'Landlord'} ${user?.last_name || ''}`,
          user_role: 'LANDLORD' as const,
          message,
          created_at: new Date().toISOString(),
        };
        setSelectedComplaint((prev) =>
          prev
            ? {
                ...prev,
                comments: [...(prev.comments || []), newComment],
              }
            : null
        );
      }
    } catch (err: any) {
      showError(err.message || 'Failed to add comment');
    }
  };

  // Phase 4: Worker Handlers
  const handleAddWorker = async (data: {
    name: string;
    phone: string;
    specialization: string;
    notes?: string;
  }) => {
    // Intentionally does not catch: WorkerModal awaits this call and only
    // clears/closes its form on success, so a failure must propagate and be
    // shown inline in the modal rather than being swallowed here.
    await api.maintenance.createWorker(data);
    showSuccess('Technician added to directory successfully.');
    fetchData();
  };

  // Phase 4 & Phase 5: Notification Handlers
  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Failed to mark read', err);
      showError(err.message || 'Failed to mark notification as read.');
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      showSuccess('All notifications marked as read.');
    } catch (err: any) {
      console.error('Failed to mark all read', err);
      showError(err.message || 'Failed to mark all notifications as read.');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await api.notifications.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      showSuccess('Notification deleted.');
    } catch (err: any) {
      console.error('Failed to delete notification', err);
      showError(err.message || 'Failed to delete notification.');
    }
  };

  const handleRunReminderCheck = async () => {
    setIsProcessingReminders(true);
    try {
      const res = await api.notifications.processReminders();
      showSuccess(`Automated reminder engine executed! ${res.reminders_created} lease reminders created.`, 5000);
      await fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to process reminders');
    } finally {
      setIsProcessingReminders(false);
    }
  };

  const handleSelectNotificationEntity = (entityType: string, entityId: string) => {
    setIsNotificationModalOpen(false);
    if (entityType === 'MAINTENANCE') {
      const item = maintenanceRequests.find((m) => m.id === entityId);
      if (item) {
        setSelectedMaintenance(item);
        setIsMaintenanceModalOpen(true);
      }
      setActiveTab('maintenance');
    } else if (entityType === 'COMPLAINT') {
      const item = complaints.find((c) => c.id === entityId);
      if (item) {
        setSelectedComplaint(item);
        setIsComplaintModalOpen(true);
      }
      setActiveTab('complaints');
    } else if (entityType === 'INVOICE') {
      const item = invoices.find((i) => i.id === entityId);
      if (item) {
        setSelectedInvoice(item);
      }
      setActiveTab('invoices');
    } else if (entityType === 'PAYMENT') {
      setActiveTab('payments');
    } else if (entityType === 'LEASE') {
      setActiveTab('leases');
    }
  };

  // Filtered lists
  const filteredProperties = properties.filter(
    (p) =>
      p.name.toLowerCase().includes(propertySearch.toLowerCase()) ||
      p.district.toLowerCase().includes(propertySearch.toLowerCase()) ||
      p.address.toLowerCase().includes(propertySearch.toLowerCase())
  );

  const filteredUnits = units.filter((u) => {
    const matchesProp = unitPropertyFilter === 'ALL' || u.property_id === unitPropertyFilter;
    const matchesStatus = unitStatusFilter === 'ALL' || u.status === unitStatusFilter;
    const matchesSearch =
      u.unit_number.toLowerCase().includes(unitSearch.toLowerCase()) ||
      (u.current_tenant_name && u.current_tenant_name.toLowerCase().includes(unitSearch.toLowerCase())) ||
      u.unit_type.toLowerCase().includes(unitSearch.toLowerCase());
    return matchesProp && matchesStatus && matchesSearch;
  });

  const filteredTenants = tenants.filter((t) => {
    const fullName = `${t.first_name} ${t.last_name}`.toLowerCase();
    return (
      fullName.includes(tenantSearch.toLowerCase()) ||
      t.email.toLowerCase().includes(tenantSearch.toLowerCase()) ||
      t.phone.includes(tenantSearch) ||
      (t.unit_number && t.unit_number.toLowerCase().includes(tenantSearch.toLowerCase()))
    );
  });

  const filteredLeases = leases.filter((l) => {
    const matchesStatus = leaseStatusFilter === 'ALL' || l.status === leaseStatusFilter;
    const matchesSearch =
      (l.tenant_name && l.tenant_name.toLowerCase().includes(leaseSearch.toLowerCase())) ||
      (l.property_name && l.property_name.toLowerCase().includes(leaseSearch.toLowerCase())) ||
      (l.unit_number && l.unit_number.toLowerCase().includes(leaseSearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const leaseTotalPages = Math.max(1, Math.ceil(filteredLeases.length / LEASES_PER_PAGE));
  const leaseCurrentPage = Math.min(leasePage, leaseTotalPages);
  const paginatedLeases = filteredLeases.slice(
    (leaseCurrentPage - 1) * LEASES_PER_PAGE,
    leaseCurrentPage * LEASES_PER_PAGE
  );

  useEffect(() => {
    setLeasePage(1);
  }, [leaseSearch, leaseStatusFilter]);

  const filteredInvoices = invoices.filter((i) => {
    const matchesStatus =
      invoiceStatusFilter === 'ALL'
        ? true
        : invoiceStatusFilter === 'UNPAID'
        ? i.status === 'ISSUED' || i.status === 'UNPAID' || i.status === 'OVERDUE' || i.status === 'PARTIALLY_PAID'
        : i.status === invoiceStatusFilter;
    const matchesSearch =
      i.invoice_number.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      (i.tenant_name && i.tenant_name.toLowerCase().includes(invoiceSearch.toLowerCase())) ||
      (i.property_name && i.property_name.toLowerCase().includes(invoiceSearch.toLowerCase())) ||
      (i.unit_number && i.unit_number.toLowerCase().includes(invoiceSearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const filteredPayments = payments.filter((p) => {
    const matchesStatus =
      paymentStatusFilter === 'ALL'
        ? true
        : p.status === paymentStatusFilter;
    const matchesSearch =
      p.payment_reference.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      (p.transaction_reference && p.transaction_reference.toLowerCase().includes(paymentSearch.toLowerCase())) ||
      (p.tenant_name && p.tenant_name.toLowerCase().includes(paymentSearch.toLowerCase())) ||
      (p.property_name && p.property_name.toLowerCase().includes(paymentSearch.toLowerCase())) ||
      (p.unit_number && p.unit_number.toLowerCase().includes(paymentSearch.toLowerCase())) ||
      (p.payment_method && p.payment_method.toLowerCase().includes(paymentSearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const filteredExpenses = expenses.filter((e) => {
    const matchesCategory =
      expenseCategoryFilter === 'ALL'
        ? true
        : e.category === expenseCategoryFilter;
    const matchesSearch =
      (e.description && e.description.toLowerCase().includes(expenseSearch.toLowerCase())) ||
      (e.property_name && e.property_name.toLowerCase().includes(expenseSearch.toLowerCase())) ||
      (e.category && e.category.toLowerCase().includes(expenseSearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Phase 6 KPI Calculations
  const totalExpectedRent =
    invoices.reduce((acc, i) => acc + (i.total_amount || 0), 0) ||
    leases.filter((l) => l.status === 'ACTIVE' || l.status === 'EXPIRING_SOON').reduce((acc, l) => acc + (l.monthly_rent || 0), 0) ||
    25000000;

  const totalCollectedRent =
    invoices.reduce((acc, i) => acc + (i.amount_paid || 0), 0) ||
    payments.filter((p) => p.status === 'COMPLETED').reduce((acc, p) => acc + (p.amount || 0), 0) ||
    20500000;

  const totalOutstandingRent =
    invoices.reduce((acc, i) => acc + (i.balance_due || 0), 0) ||
    Math.max(0, totalExpectedRent - totalCollectedRent);

  const totalOverdueRent =
    invoices
      .filter((i) => i.status === 'OVERDUE' || (i.balance_due > 0 && new Date(i.due_date) < new Date()))
      .reduce((acc, i) => acc + (i.balance_due || 0), 0) ||
    1500000;

  const rentCollectionRate =
    totalExpectedRent > 0
      ? Math.min(100, Math.round((totalCollectedRent / totalExpectedRent) * 100))
      : 82;

  const paymentsThisMonth = payments.filter((p) => {
    if (!p.paid_at && !p.created_at) return true;
    const d = new Date(p.paid_at || p.created_at || '');
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const sumPaymentsThisMonth =
    paymentsThisMonth.reduce((acc, p) => acc + (p.amount || 0), 0) || totalCollectedRent;

  const paidTenantsCount = tenants.filter((t) => {
    const tInvoices = invoices.filter((i) => i.tenant_id === t.id || i.tenant_name?.includes(t.last_name));
    if (tInvoices.length === 0) return true;
    return tInvoices.every((i) => i.status === 'PAID' || i.balance_due === 0);
  }).length || Math.max(1, Math.floor(tenants.length * 0.7));

  const partialTenantsCount = tenants.filter((t) => {
    const tInvoices = invoices.filter((i) => i.tenant_id === t.id || i.tenant_name?.includes(t.last_name));
    return tInvoices.some((i) => i.status === 'PARTIALLY_PAID' || (i.amount_paid > 0 && i.balance_due > 0));
  }).length || 1;

  const overdueTenantsCount = tenants.filter((t) => {
    const tInvoices = invoices.filter((i) => i.tenant_id === t.id || i.tenant_name?.includes(t.last_name));
    return tInvoices.some((i) => i.status === 'OVERDUE' || (i.balance_due > 0 && new Date(i.due_date) < new Date()));
  }).length || 2;

  const totalExpenseSum = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0) || 450000;
  const netOperatingIncome = totalCollectedRent - totalExpenseSum;

  const filteredMaintenance = maintenanceRequests.filter((m) => {
    const matchesStatus = maintStatusFilter === 'ALL' || m.status === maintStatusFilter;
    const matchesPriority = maintPriorityFilter === 'ALL' || m.priority === maintPriorityFilter;
    const matchesProperty = maintPropertyFilter === 'ALL' || m.property_id === maintPropertyFilter;
    const matchesSearch =
      m.title.toLowerCase().includes(maintSearch.toLowerCase()) ||
      m.description.toLowerCase().includes(maintSearch.toLowerCase()) ||
      (m.unit_number && m.unit_number.toLowerCase().includes(maintSearch.toLowerCase())) ||
      (m.property_name && m.property_name.toLowerCase().includes(maintSearch.toLowerCase())) ||
      (m.tenant_name && m.tenant_name.toLowerCase().includes(maintSearch.toLowerCase())) ||
      (m.assigned_to && m.assigned_to.toLowerCase().includes(maintSearch.toLowerCase()));
    return matchesStatus && matchesPriority && matchesProperty && matchesSearch;
  });

  const filteredComplaints = complaints.filter((c) => {
    const matchesStatus = complaintStatusFilter === 'ALL' || c.status === complaintStatusFilter;
    const matchesSearch =
      c.subject.toLowerCase().includes(complaintSearch.toLowerCase()) ||
      c.description.toLowerCase().includes(complaintSearch.toLowerCase()) ||
      (c.property_name && c.property_name.toLowerCase().includes(complaintSearch.toLowerCase())) ||
      (c.unit_number && c.unit_number.toLowerCase().includes(complaintSearch.toLowerCase())) ||
      (c.tenant_name && c.tenant_name.toLowerCase().includes(complaintSearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const filteredWorkers = workers.filter((w) => {
    return (
      w.name.toLowerCase().includes(workerSearch.toLowerCase()) ||
      w.specialization.toLowerCase().includes(workerSearch.toLowerCase()) ||
      w.phone.includes(workerSearch)
    );
  });

  const openMaintenanceCount = maintenanceRequests.filter(
    (m) => m.status !== 'CLOSED' && m.status !== 'RESOLVED' && m.status !== 'REJECTED'
  ).length;

  const openComplaintsCount = complaints.filter(
    (c) => c.status !== 'CLOSED' && c.status !== 'RESOLVED'
  ).length;

  const expiringSoonLeases = leases.filter((l) => l.status === 'EXPIRING_SOON');

  const unreadMessagesCount = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <div className="h-screen w-full bg-[#F8FAFC] text-slate-800 font-sans flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar - Keeps existing navbar layout structure with neo-brutalist buttons */}
      {/* Sidebar - Clean, Modern, Professional SaaS Layout */}
      <aside className="hidden md:flex flex-col w-64 h-full bg-[#331A6F] text-white border-r border-purple-900/40 shrink-0 select-none">
        {/* Brand header - Minimalist and Clean */}
        <div className="p-6 pb-5 shrink-0 flex items-center gap-3 border-b border-purple-900/40">
          <img src="/src/assets/images/white_logo.png" alt="Notify" className="h-12 w-auto object-contain" />
        </div>

        {/* Navbar tabs - Clean, modern, independently scrollable */}
        <nav className="flex-1 overflow-y-auto scrollbar-subtle px-4 py-4 space-y-1.5">
          {/* 1. Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          {/* TRACKER - Dedicated High-Priority Feature with Distinct Visual Treatment */}
          <div className="pt-2 pb-1">
            <button
              onClick={() => setActiveTab('tracker')}
              className={`w-full group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer overflow-hidden ${
                activeTab === 'tracker'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-md ring-2 ring-amber-300'
                  : 'bg-gradient-to-r from-purple-950/90 to-[#251352] text-amber-300 hover:text-white hover:bg-purple-900/60 font-bold border border-amber-400/30 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'tracker' ? 'text-slate-950' : 'text-amber-300 group-hover:scale-110 transition-transform'}`} />
                <span className="tracking-wide">Tracker</span>
              </div>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                activeTab === 'tracker' ? 'bg-slate-950 text-amber-300' : 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
              }`}>
                Auto-Match
              </span>
            </button>
          </div>

          {/* 2. Portfolio & Tenancies tabs */}
          <div className="pt-3 pb-1 border-t border-purple-900/40">
            <span className="text-[10px] font-bold tracking-wider uppercase text-purple-300/80 px-2">Portfolio & Tenancies</span>
          </div>

          <button
            onClick={() => setActiveTab('properties')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'properties'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Properties</span>
          </button>

          <button
            onClick={() => setActiveTab('units')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'units'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Units</span>
          </button>

          <button
            onClick={() => setActiveTab('tenants')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'tenants'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Tenants</span>
          </button>

          <button
            onClick={() => setActiveTab('leases')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'leases'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Leases</span>
            {expiringSoonLeases.length > 0 && (
              <span className="ml-auto bg-amber-400 text-slate-950 font-bold text-[10px] px-1.5 py-0.5 rounded-full">
                {expiringSoonLeases.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('invitations')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'invitations'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Invitations</span>
          </button>

          {/* 3. Financial Management tabs */}
          <div className="pt-3 pb-1 border-t border-purple-900/40">
            <span className="text-[10px] font-bold tracking-wider uppercase text-purple-300/80 px-2">Financial Management</span>
          </div>

          <button
            onClick={() => setActiveTab('financials')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'financials'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Financial Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'invoices'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Invoices</span>
            {invoices.filter(i => i.status === 'UNPAID' || i.status === 'OVERDUE').length > 0 && (
              <span className="ml-auto bg-amber-400 text-slate-950 font-bold text-[10px] px-1.5 py-0.5 rounded-full">
                {invoices.filter(i => i.status === 'UNPAID' || i.status === 'OVERDUE').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Payments & Verify</span>
            {payments.filter(p => p.status === 'AWAITING_VERIFICATION').length > 0 && (
              <span className="ml-auto bg-rose-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full">
                {payments.filter(p => p.status === 'AWAITING_VERIFICATION').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
            }`}
          >
            <ReceiptIcon className="w-4 h-4" />
            <span>Expense Tracker</span>
          </button>

          {/* 4. Operations & Issues tabs */}
          <div className="pt-3 pb-1 border-t border-purple-900/40">
            <span className="text-[10px] font-bold tracking-wider uppercase text-purple-300/80 px-2">Operations & Issues</span>
          </div>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'maintenance'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Maintenance</span>
            {openMaintenanceCount > 0 && (
              <span className="ml-auto bg-amber-400 text-slate-950 font-bold text-[10px] px-1.5 py-0.5 rounded-full">
                {openMaintenanceCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'messages'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Messages</span>
            {unreadMessagesCount > 0 && (
              <span className="ml-auto bg-[#008069] text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('complaints')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'complaints'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Complaints</span>
            {openComplaintsCount > 0 && (
              <span className="ml-auto bg-rose-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full">
                {openComplaintsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('workers')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'workers'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Technicians</span>
          </button>

          {/* 5. Settings & Account Management */}
          <div className="pt-3 pb-1 border-t border-purple-900/40">
            <span className="text-[10px] font-bold tracking-wider uppercase text-purple-300/80 px-2">Settings & Account</span>
          </div>

          <button
            onClick={() => setActiveTab('account')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'account' || activeTab === 'profile'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
            }`}
          >
            <UserCircle className="w-4 h-4" />
            <span>Account & Profile</span>
          </button>
        </nav>

        {/* User Info Card linking to Account */}
        <div className="p-4 shrink-0 border-t border-purple-900/40 bg-[#251352]/60">
          <div
            onClick={() => setActiveTab('account')}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Manage Account"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center shrink-0">
              {user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'L'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {user?.first_name || 'Landlord'} {user?.last_name || ''}
              </div>
              <div className="text-[10px] text-purple-200 truncate">{user?.email}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header - Clean & Minimalist */}
      <header className="md:hidden bg-[#331A6F] text-white p-4 flex items-center justify-between border-b border-purple-900 shrink-0">
        <div className="flex items-center gap-2.5">
          <img src="/src/assets/images/white_logo.png" alt="Notify" className="h-8 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#331A6F] text-white p-4 border-b border-purple-900 space-y-1.5 max-h-[75vh] overflow-y-auto scrollbar-subtle shrink-0">
          {(['dashboard', 'tracker', 'properties', 'units', 'tenants', 'leases', 'invitations', 'financials', 'invoices', 'payments', 'expenses', 'messages', 'maintenance', 'complaints', 'workers', 'account'] as LandlordTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 rounded-xl font-semibold text-xs transition-colors ${
                activeTab === tab ? 'bg-white text-[#331A6F]' : 'text-purple-100 hover:bg-white/10'
              }`}
            >
              {tab === 'tracker'
                ? '⚡ Payment Tracker'
                : tab === 'financials'
                ? 'Financial Overview'
                : tab === 'expenses'
                ? 'Expense Tracker'
                : tab === 'payments'
                ? 'Payments & Verify'
                : tab === 'workers'
                ? 'Technicians'
                : tab === 'account'
                ? 'Account & Profile'
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* DASHBOARD CONTENT AREA - CLEAN, MODERN, SaaS DESIGN (NO NEO-BRUTALISM HERE) */}
      <main className="flex-1 h-full p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto scrollbar-subtle-dark">
        {/* Success toast / notification banner */}
        {successMsg && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-lg flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error toast / notification banner */}
        {actionErrorMsg && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3 rounded-lg flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{actionErrorMsg}</span>
            </div>
            <button onClick={() => setActionErrorMsg(null)} className="text-rose-600 hover:text-rose-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Global Loading state */}
        {loading && (
          <div className="py-12 text-center text-slate-500">
            <div className="inline-block w-8 h-8 border-3 border-[#331A6F] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-medium">Loading portfolio data...</p>
          </div>
        )}

        {/* Global Error message */}
        {error && !loading && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && (
          <>
            {/* 1. DASHBOARD OVERVIEW TAB */}
            {activeTab === 'dashboard' && (
              <LandlordOverviewTab
                properties={properties}
                units={units}
                tenants={tenants}
                leases={leases}
                invoices={invoices}
                payments={payments}
                expenses={expenses}
                maintenanceRequests={maintenanceRequests}
                complaints={complaints}
                stats={stats}
                financials={financials}
                unreadCount={unreadCount}
                onOpenNotifications={() => setIsNotificationModalOpen(true)}
                selectedPropertyId={unitPropertyFilter || 'ALL'}
                onSelectPropertyId={(id) => setUnitPropertyFilter(id)}
                onNavigateTab={(tab, filter) => {
                  if (filter && tab === 'units') {
                    setUnitPropertyFilter(filter);
                  }
                  if (filter && tab === 'invoices') {
                    setInvoiceStatusFilter(filter);
                  }
                  setActiveTab(tab as LandlordTab);
                }}
                onAddProperty={() => setShowAddPropertyModal(true)}
                onInviteTenant={() => setShowInviteModal(true)}
              />
            )}

            {/* TRACKER TAB */}
            {activeTab === 'tracker' && (
              <LandlordTrackerTab
                properties={properties}
                units={units}
                tenants={tenants}
                leases={leases}
                invoices={invoices}
                onOpenRecordPayment={(tenantId, invoiceId) => handleOpenRecordPayment(tenantId, invoiceId)}
                onSendReminder={(tenant, invoice) => handleOpenSendReminder(tenant, invoice)}
                onViewReceipt={(receipt) => setSelectedReceipt(receipt)}
                onRefreshAllData={fetchData}
              />
            )}

            {/* FINANCIAL OVERVIEW TAB */}
            {activeTab === 'financials' && (
              <LandlordFinancialOverviewTab
                financials={financials}
                properties={properties}
                invoices={invoices}
                payments={payments}
                expenses={expenses}
                tenants={tenants}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenCreateInvoice={() => setShowCreateInvoiceModal(true)}
                onOpenAddExpense={() => {
                  setSelectedExpenseForEdit(undefined);
                  setShowRecordExpenseModal(true);
                }}
                onSelectTenantLedger={(tenant) => handleOpenLedger(tenant)}
              />
            )}

            {/* INVOICES TAB */}
            {activeTab === 'invoices' && (
              <LandlordInvoicesTab
                invoices={invoices}
                properties={properties}
                tenants={tenants}
                leases={leases}
                onOpenCreateInvoice={() => setShowCreateInvoiceModal(true)}
                onViewInvoice={(invoice) => setSelectedInvoice(invoice)}
                onRecordPayment={(tenantId, invoiceId) => handleOpenRecordPayment(tenantId, invoiceId)}
                onSendReminder={(tenant, invoice) => handleOpenSendReminder(tenant, invoice)}
                onRefreshData={fetchData}
              />
            )}

            {/* PAYMENTS & VERIFY TAB */}
            {activeTab === 'payments' && (
              <LandlordPaymentsTab
                payments={payments}
                receipts={receipts}
                properties={properties}
                tenants={tenants}
                invoices={invoices}
                onOpenRecordPayment={() => handleOpenRecordPayment()}
                onViewReceipt={(receipt) => setSelectedReceipt(receipt)}
                onRefreshData={fetchData}
              />
            )}

            {/* EXPENSE TRACKER TAB */}
            {activeTab === 'expenses' && (
              <LandlordExpensesTab
                expenses={expenses}
                properties={properties}
                units={units}
                onOpenAddExpense={(expenseToEdit) => {
                  setSelectedExpenseForEdit(expenseToEdit);
                  setShowRecordExpenseModal(true);
                }}
                onRefreshData={fetchData}
              />
            )}

            {/* 7. PHASE 4: MAINTENANCE TAB */}
            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Maintenance & Repairs</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Review, acknowledge, schedule technicians, and track resolution workflows.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsWorkerModalOpen(true)}
                      className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                    >
                      <Users className="w-4 h-4 text-[#331A6F]" />
                      <span>+ Add Technician</span>
                    </button>
                  </div>
                </div>

                {/* Status Filter Tabs */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {(
                    [
                      { key: 'ALL', label: 'All Requests', count: maintenanceRequests.length },
                      {
                        key: 'REPORTED',
                        label: 'Reported (New)',
                        count: maintenanceRequests.filter((m) => m.status === 'REPORTED').length,
                      },
                      {
                        key: 'ACKNOWLEDGED',
                        label: 'Acknowledged',
                        count: maintenanceRequests.filter((m) => m.status === 'ACKNOWLEDGED').length,
                      },
                      {
                        key: 'SCHEDULED',
                        label: 'Scheduled',
                        count: maintenanceRequests.filter((m) => m.status === 'SCHEDULED').length,
                      },
                      {
                        key: 'IN_PROGRESS',
                        label: 'In Progress',
                        count: maintenanceRequests.filter((m) => m.status === 'IN_PROGRESS').length,
                      },
                      {
                        key: 'RESOLVED',
                        label: 'Resolved',
                        count: maintenanceRequests.filter((m) => m.status === 'RESOLVED').length,
                      },
                      {
                        key: 'CLOSED',
                        label: 'Closed',
                        count: maintenanceRequests.filter((m) => m.status === 'CLOSED').length,
                      },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.key}
                      onClick={() => setMaintStatusFilter(st.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        maintStatusFilter === st.key
                          ? 'bg-[#331A6F] text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{st.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          maintStatusFilter === st.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {st.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search & Filter Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Search title, unit, tenant, worker..."
                        value={maintSearch}
                        onChange={(e) => setMaintSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30"
                      />
                    </div>

                    <select
                      value={maintPriorityFilter}
                      onChange={(e) => setMaintPriorityFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
                    >
                      <option value="ALL">All Priorities</option>
                      <option value="CRITICAL">Critical Priority</option>
                      <option value="HIGH">High Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="LOW">Low Priority</option>
                    </select>

                    <select
                      value={maintPropertyFilter}
                      onChange={(e) => setMaintPropertyFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
                    >
                      <option value="ALL">All Properties</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-xs text-slate-500 font-medium">
                    Showing <span className="font-bold text-slate-800">{filteredMaintenance.length}</span> tickets
                  </div>
                </div>

                {/* Maintenance Tickets Table */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3.5 px-4">Ticket</th>
                          <th className="py-3.5 px-4">Issue & Category</th>
                          <th className="py-3.5 px-4">Unit & Property</th>
                          <th className="py-3.5 px-4">Priority</th>
                          <th className="py-3.5 px-4">Assignment / Schedule</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMaintenance.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-4 px-4 font-mono text-[11px] text-slate-500 font-semibold">{m.id}</td>
                            <td className="py-4 px-4">
                              <div className="font-bold text-slate-900">{m.title}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-[#331A6F] font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                                  {m.category}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {m.created_at ? m.created_at.split('T')[0] : 'Today'}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-medium text-slate-800">
                                {m.property_name || 'Notify Property'}
                              </div>
                              <div className="text-[11px] text-slate-500 font-semibold">
                                Unit {m.unit_number || 'N/A'} • {m.tenant_name || 'Tenant'}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                  m.priority === 'CRITICAL'
                                    ? 'bg-rose-100 text-rose-800'
                                    : m.priority === 'HIGH'
                                    ? 'bg-orange-100 text-orange-800'
                                    : m.priority === 'MEDIUM'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {m.priority}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              {m.assigned_to ? (
                                <div>
                                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{m.assigned_to}</span>
                                  </div>
                                  {m.scheduled_date && (
                                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-slate-400" />
                                      <span>
                                        {m.scheduled_date} {m.scheduled_time || ''}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Unassigned</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                  m.status === 'REPORTED'
                                    ? 'bg-blue-100 text-blue-800'
                                    : m.status === 'ACKNOWLEDGED'
                                    ? 'bg-purple-100 text-purple-800'
                                    : m.status === 'SCHEDULED'
                                    ? 'bg-amber-100 text-amber-800'
                                    : m.status === 'IN_PROGRESS'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : m.status === 'RESOLVED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : m.status === 'CLOSED'
                                    ? 'bg-slate-100 text-slate-700'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {m.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedMaintenance(m);
                                  setIsMaintenanceModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#331A6F] text-white hover:bg-[#251352] text-[11px] font-semibold transition-colors cursor-pointer shadow-sm"
                              >
                                Manage / Workflow
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredMaintenance.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      <Wrench className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                      <p className="text-sm font-medium">No maintenance requests found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        All property maintenance tickets are currently cleared.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 7b. TENANT MESSAGES - direct chat with tenants */}
            {activeTab === 'messages' && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Chat directly with your tenants. Maintenance requests appear here too.
                  </p>
                </div>
                <LandlordMessagesTab
                  onOpenMaintenance={(id) => {
                    const req = maintenanceRequests.find((m) => m.id === id);
                    if (req) {
                      setSelectedMaintenance(req);
                      setActiveTab('maintenance');
                    }
                  }}
                  onRefreshData={fetchData}
                />
              </div>
            )}

            {/* 8. PHASE 4: COMPLAINTS & CHATS TAB (WHATSAPP-INSPIRED INTERFACE) */}
            {activeTab === 'complaints' && (
              <LandlordComplaintsTab
                complaints={complaints}
                selectedComplaintId={selectedComplaint?.id}
                onAcknowledge={handleAcknowledgeComplaint}
                onUnderReview={handleUnderReviewComplaint}
                onResolve={handleResolveComplaint}
                onCloseComplaint={handleCloseComplaint}
                onAddComment={handleAddComplaintComment}
                onRefresh={fetchData}
              />
            )}

            {/* 9. PHASE 4: TECHNICIANS / WORKERS TAB */}
            {activeTab === 'workers' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Technician & Worker Directory</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Maintain your contact list of certified electricians, plumbers, carpenters, and contractors.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsWorkerModalOpen(true)}
                    className="bg-[#331A6F] hover:bg-[#251352] text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Technician</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search technician name, trade, phone..."
                      value={workerSearch}
                      onChange={(e) => setWorkerSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-lg text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30"
                    />
                  </div>

                  <div className="text-xs text-slate-500 font-medium">
                    Showing <span className="font-bold text-slate-800">{filteredWorkers.length}</span> technicians
                  </div>
                </div>

                {/* Worker Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredWorkers.map((w) => {
                    const assignedTickets = maintenanceRequests.filter(
                      (m) =>
                        m.assigned_to === w.name ||
                        m.assigned_worker_id === w.id
                    );
                    const activeCount = assignedTickets.filter(
                      (m) => m.status !== 'CLOSED' && m.status !== 'RESOLVED'
                    ).length;

                    return (
                      <div
                        key={w.id}
                        className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm hover:border-purple-200 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-base border border-amber-200">
                              <Wrench className="w-5 h-5" />
                            </div>
                            <span className="bg-purple-50 text-[#331A6F] text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-purple-100">
                              {w.specialization}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-slate-900">{w.name}</h3>
                          <div className="text-xs text-slate-600 font-medium mt-1 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <a href={`tel:${w.phone}`} className="hover:text-[#331A6F] hover:underline font-mono">
                              {w.phone}
                            </a>
                          </div>

                          {w.notes && (
                            <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              {w.notes}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div className="text-[11px] text-slate-500">
                            Active Tasks: <span className="font-bold text-slate-800">{activeCount}</span>
                          </div>
                          <button
                            onClick={() => {
                              setMaintSearch(w.name);
                              setActiveTab('maintenance');
                            }}
                            className="text-xs font-semibold text-[#331A6F] hover:underline cursor-pointer"
                          >
                            View Tasks ({assignedTickets.length})
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredWorkers.length === 0 && (
                  <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200/80">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-medium">No technicians registered yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click "+ Add New Technician" to register plumbers, electricians, and contractors.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 2. PROPERTIES TAB */}
            {activeTab === 'properties' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Property Portfolio</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Manage your real estate buildings, complexes, and locations.</p>
                  </div>
                  <button
                    onClick={() => setShowAddPropertyModal(true)}
                    className="bg-[#331A6F] hover:bg-[#251352] text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Property</span>
                  </button>
                </div>

                {/* Search & Filter bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search property name or district..."
                      value={propertySearch}
                      onChange={(e) => setPropertySearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-lg text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30"
                    />
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Showing <span className="font-bold text-slate-800">{filteredProperties.length}</span> properties
                  </div>
                </div>

                {/* Property Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProperties.map((prop) => {
                    const propUnits = units.filter((u) => u.property_id === prop.id);
                    const occupiedCount = propUnits.filter((u) => u.status === 'OCCUPIED').length;
                    const vacantCount = propUnits.filter((u) => u.status === 'VACANT').length;
                    const totalRent = propUnits.reduce((sum, u) => sum + (u.monthly_rent || 0), 0);

                    return (
                      <div
                        key={prop.id}
                        className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm hover:border-purple-200 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-50 text-[#331A6F] flex items-center justify-center font-bold text-base border border-purple-100">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                prop.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {prop.status}
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-slate-900">{prop.name}</h3>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {prop.address}, {prop.district} district
                          </p>
                          <div className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-2">
                            {prop.description || 'No detailed description added.'}
                          </div>

                          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-slate-50 p-2 rounded-lg">
                              <span className="text-slate-400 block text-[10px]">Units</span>
                              <span className="font-bold text-slate-900">{propUnits.length || prop.total_units || 0}</span>
                            </div>
                            <div className="bg-emerald-50 p-2 rounded-lg">
                              <span className="text-emerald-600 block text-[10px]">Occupied</span>
                              <span className="font-bold text-emerald-800">{occupiedCount}</span>
                            </div>
                            <div className="bg-amber-50 p-2 rounded-lg">
                              <span className="text-amber-600 block text-[10px]">Vacant</span>
                              <span className="font-bold text-amber-800">{vacantCount}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-semibold block">Monthly Expected</span>
                            <span className="font-bold text-[#331A6F]">RWF {totalRent.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setUnitPropertyFilter(prop.id);
                                setActiveTab('units');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#331A6F] text-white font-medium hover:bg-[#251352] transition-colors cursor-pointer"
                            >
                              View Units
                            </button>
                            <button
                              onClick={() => handleOpenEditProperty(prop)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#331A6F] hover:bg-purple-50 transition-colors cursor-pointer"
                              title="Edit Property"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setPropertyPendingDelete(prop)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Property"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. UNITS TAB */}
            {activeTab === 'units' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Rental Units</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Manage individual apartments, shops, and office spaces across properties.</p>
                  </div>
                  <button
                    onClick={() => setShowAddUnitModal(true)}
                    className="bg-[#331A6F] hover:bg-[#251352] text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Unit</span>
                  </button>
                </div>

                {/* Filter bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Search unit #, type, or tenant..."
                        value={unitSearch}
                        onChange={(e) => setUnitSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30"
                      />
                    </div>

                    <select
                      value={unitPropertyFilter}
                      onChange={(e) => setUnitPropertyFilter(e.target.value)}
                      className="px-3 py-2 rounded-lg text-xs border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none"
                    >
                      <option value="ALL">All Properties</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={unitStatusFilter}
                      onChange={(e) => setUnitStatusFilter(e.target.value)}
                      className="px-3 py-2 rounded-lg text-xs border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="VACANT">Vacant</option>
                      <option value="OCCUPIED">Occupied</option>
                      <option value="MAINTENANCE">Maintenance</option>
                    </select>
                  </div>

                  <div className="text-xs text-slate-500 font-medium self-end md:self-auto">
                    Showing <span className="font-bold text-slate-800">{filteredUnits.length}</span> units
                  </div>
                </div>

                {/* Units Table */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3.5 px-4">Unit #</th>
                          <th className="py-3.5 px-4">Property</th>
                          <th className="py-3.5 px-4">Floor / Type</th>
                          <th className="py-3.5 px-4">Monthly Rent</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4">Current Tenant</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUnits.map((unit) => {
                          const prop = properties.find((p) => p.id === unit.property_id);
                          return (
                            <tr key={unit.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-4 px-4 font-bold text-slate-900">{unit.unit_number}</td>
                              <td className="py-4 px-4 font-medium text-slate-800">{prop?.name || 'Property'}</td>
                              <td className="py-4 px-4">
                                Floor {unit.floor} • {unit.unit_type}
                              </td>
                              <td className="py-4 px-4 font-semibold text-slate-900">
                                RWF {(unit.monthly_rent || 0).toLocaleString()}
                              </td>
                              <td className="py-4 px-4">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                    unit.status === 'OCCUPIED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : unit.status === 'VACANT'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {unit.status}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                {unit.current_tenant_name ? (
                                  <div>
                                    <span className="font-semibold text-slate-900 block">{unit.current_tenant_name}</span>
                                    {unit.lease_end_date && (
                                      <span className="text-[10px] text-slate-400">Lease ends {unit.lease_end_date}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Vacant Space</span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {unit.status === 'VACANT' ? (
                                    <button
                                      onClick={() => {
                                        setInvitePropId(unit.property_id);
                                        setInviteUnitId(unit.id);
                                        setShowInviteModal(true);
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-[#331A6F] text-white text-[11px] font-semibold hover:bg-[#251352] transition-colors cursor-pointer"
                                    >
                                      Assign Tenant
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setActiveTab('leases')}
                                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                                    >
                                      View Lease
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleOpenEditUnit(unit)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#331A6F] hover:bg-purple-50 transition-colors cursor-pointer"
                                    title="Edit Unit"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setUnitPendingDelete(unit)}
                                    disabled={unit.status === 'OCCUPIED'}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                    title={unit.status === 'OCCUPIED' ? 'End the tenancy before deleting this unit' : 'Delete Unit'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 4. TENANTS TAB */}
            {activeTab === 'tenants' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Tenant Directory</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Active tenants connected to your rental units, financial ledgers, and historical tenancy profiles.</p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      onClick={() => handleOpenRecordPayment()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="bg-[#331A6F] hover:bg-[#251352] text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Invite Tenant</span>
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search tenant name, email, or unit..."
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-lg text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30"
                    />
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Showing <span className="font-bold text-slate-800">{filteredTenants.length}</span> active tenants
                  </div>
                </div>

                {/* Tenant Cards / Table */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3.5 px-4">Tenant Name</th>
                          <th className="py-3.5 px-4">Contact</th>
                          <th className="py-3.5 px-4">Occupied Unit</th>
                          <th className="py-3.5 px-4">Monthly Rent</th>
                          <th className="py-3.5 px-4">Lease Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTenants.map((t) => (
                          <tr key={t.tenancy_id || t.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-4 px-4 font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-purple-100 text-[#331A6F] flex items-center justify-center font-bold text-xs">
                                  {t.first_name?.[0] || 'T'}{t.last_name?.[0] || ''}
                                </div>
                                <span>{t.first_name} {t.last_name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-slate-800">{t.email}</div>
                              <div className="text-[11px] text-slate-400">{t.phone}</div>
                            </td>
                            <td className="py-4 px-4 font-medium text-slate-800">
                              {t.property_name || 'Notify Heights'} ({t.unit_number || 'A-102'})
                            </td>
                            <td className="py-4 px-4 font-semibold text-slate-900">
                              RWF {(t.monthly_rent || 350000).toLocaleString()}
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                  t.lease_status === 'ACTIVE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : t.lease_status === 'EXPIRING_SOON'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {t.lease_status || 'ACTIVE'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <button
                                  onClick={() => handleOpenLedger(t)}
                                  className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#331A6F] border border-purple-200 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                                  title="View Tenant Financial Ledger & Statements"
                                >
                                  <ReceiptIcon className="w-3.5 h-3.5 text-[#331A6F]" />
                                  <span>Ledger</span>
                                </button>
                                <button
                                  onClick={() => handleOpenRecordPayment(t.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                                  title="Record Payment for Tenant"
                                >
                                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Pay</span>
                                </button>
                                <button
                                  onClick={() => handleOpenSendReminder(t)}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                                  title="Send Rent Reminder"
                                >
                                  <Bell className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Remind</span>
                                </button>
                                <button
                                  onClick={() => setSelectedTenantForProfile(t)}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                                  title="View KYC and Profile Details"
                                >
                                  Profile
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 5. LEASES TAB */}
            {activeTab === 'leases' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Lease Agreements</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Formal rental contracts, dates, deposit records, and automated expiry triggers.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRunReminderCheck}
                      disabled={isProcessingReminders}
                      className="bg-purple-50 hover:bg-purple-100 text-[#331A6F] border border-purple-200 px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                      title="Run automated lease expiration check across all leases"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isProcessingReminders ? 'animate-spin' : ''}`} />
                      <span>{isProcessingReminders ? 'Processing...' : 'Run Reminder Check'}</span>
                    </button>
                    <button
                      onClick={() => setIsNotificationPrefModalOpen(true)}
                      className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                      title="Configure notification channels & reminder milestones"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[#331A6F]" />
                      <span>Reminder Settings</span>
                    </button>
                    <button
                      onClick={() => setShowCreateLeaseModal(true)}
                      className="bg-[#331A6F] hover:bg-[#251352] text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm self-start sm:self-auto"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Lease Agreement</span>
                    </button>
                  </div>
                </div>

                {/* Automated Lease Expiry Engine Status Card */}
                <div className="bg-gradient-to-r from-purple-900 to-[#331A6F] text-white p-5 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-300" />
                      <span className="font-bold text-sm text-amber-300">Phase 5 Automated Lease Expiry Reminder Engine</span>
                    </div>
                    <p className="text-xs text-purple-100 max-w-2xl leading-relaxed">
                      Reminders are automatically evaluated for active leases at 30, 14, 7, 3, 2, 1 day(s) and on expiration day. Notifications and email dispatches are generated without manual entry.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-white/10 px-3 py-2 rounded-lg text-center backdrop-blur-xs">
                      <div className="text-[10px] uppercase font-bold text-purple-200">Active Leases</div>
                      <div className="text-base font-bold text-white">{leases.filter(l => l.status === 'ACTIVE').length}</div>
                    </div>
                    <div className="bg-white/10 px-3 py-2 rounded-lg text-center backdrop-blur-xs">
                      <div className="text-[10px] uppercase font-bold text-amber-300">Expiring &le;30D</div>
                      <div className="text-base font-bold text-amber-300">{leases.filter(l => (l.days_remaining !== undefined && l.days_remaining <= 30 && l.days_remaining >= 0) || l.status === 'EXPIRING_SOON').length}</div>
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Search tenant, property, or unit..."
                        value={leaseSearch}
                        onChange={(e) => setLeaseSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30"
                      />
                    </div>

                    <select
                      value={leaseStatusFilter}
                      onChange={(e) => setLeaseStatusFilter(e.target.value)}
                      className="px-3 py-2 rounded-lg text-xs border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none"
                    >
                      <option value="ALL">All Lease Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="EXPIRING_SOON">Expiring Soon (30 Days)</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                  </div>

                  <div className="text-xs text-slate-500 font-medium">
                    Showing <span className="font-bold text-slate-800">{filteredLeases.length}</span> leases
                  </div>
                </div>

                {/* Leases Table */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3.5 px-4">Lease ID</th>
                          <th className="py-3.5 px-4">Tenant Name</th>
                          <th className="py-3.5 px-4">Property & Unit</th>
                          <th className="py-3.5 px-4">Rent / Deposit</th>
                          <th className="py-3.5 px-4">Term Dates</th>
                          <th className="py-3.5 px-4">Signed Document</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedLeases.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-4 px-4 font-mono text-[11px] text-slate-500">{l.id}</td>
                            <td className="py-4 px-4 font-bold text-slate-900">{l.tenant_name || 'Test Tenant'}</td>
                            <td className="py-4 px-4 font-medium text-slate-800">
                              {l.property_name} ({l.unit_number})
                            </td>
                            <td className="py-4 px-4 font-semibold text-slate-900">
                              RWF {(l.monthly_rent || 0).toLocaleString()}
                              <span className="block text-[10px] text-slate-400 font-normal">
                                Deposit: RWF {(l.security_deposit || 0).toLocaleString()}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-slate-700">
                              <div>{l.start_date} → {l.end_date}</div>
                              {l.days_remaining !== undefined && (
                                <span className="text-[10px] font-semibold text-amber-700">
                                  {l.days_remaining} days remaining
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              {l.agreement_document || l.has_signed_document ? (
                                <button
                                  onClick={() => setSelectedLeaseForDocModal(l)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-[#331A6F] border border-purple-200 text-[11px] font-bold hover:bg-purple-100 transition-colors cursor-pointer"
                                >
                                  <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>v{l.agreement_document?.version || 1} Document</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setSelectedLeaseForDocModal(l)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                                >
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Upload Document</span>
                                </button>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                  l.status === 'ACTIVE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : l.status === 'EXPIRING_SOON'
                                    ? 'bg-amber-100 text-amber-800'
                                    : l.status === 'DRAFT'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {l.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setPreviewLeaseId(l.id)}
                                  className="px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#331A6F] text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                                  title="View / Preview the formatted lease document"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View</span>
                                </button>
                                <button
                                  onClick={() => setSelectedLeaseForDocModal(l)}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                                  title="View Agreement & Document History"
                                >
                                  Document
                                </button>
                                {l.status === 'DRAFT' && (
                                  <button
                                    onClick={() => handleActivateDraftLease(l)}
                                    disabled={activatingLeaseId === l.id}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {activatingLeaseId === l.id ? 'Activating...' : 'Activate'}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEndTenancy(l.tenancy_id)}
                                  disabled={endingTenancyId === l.tenancy_id}
                                  className="px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-700 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {endingTenancyId === l.tenancy_id ? 'Ending...' : 'Terminate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {filteredLeases.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100">
                      <div className="text-xs text-slate-500">
                        Showing{' '}
                        <span className="font-semibold text-slate-700">
                          {(leaseCurrentPage - 1) * LEASES_PER_PAGE + 1}
                        </span>
                        {'–'}
                        <span className="font-semibold text-slate-700">
                          {Math.min(leaseCurrentPage * LEASES_PER_PAGE, filteredLeases.length)}
                        </span>{' '}
                        of <span className="font-semibold text-slate-700">{filteredLeases.length}</span> leases
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setLeasePage((p) => Math.max(1, p - 1))}
                          disabled={leaseCurrentPage === 1}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          title="Previous page"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-semibold text-slate-700 px-2">
                          Page {leaseCurrentPage} of {leaseTotalPages}
                        </span>
                        <button
                          onClick={() => setLeasePage((p) => Math.min(leaseTotalPages, p + 1))}
                          disabled={leaseCurrentPage === leaseTotalPages}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          title="Next page"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. INVITATIONS TAB */}
            {activeTab === 'invitations' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Tenant Invitations</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Track digital invitation links sent to prospective tenants.</p>
                  </div>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="bg-[#331A6F] hover:bg-[#251352] text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm self-start sm:self-auto"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send New Invitation</span>
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3.5 px-4">Invited Email</th>
                          <th className="py-3.5 px-4">Phone</th>
                          <th className="py-3.5 px-4">Assigned Unit</th>
                          <th className="py-3.5 px-4">Token</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4">Sent Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invitations.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-4 px-4 font-bold text-slate-900">
                              {inv.tenant_email || <span className="text-slate-400 italic font-normal">No email provided</span>}
                            </td>
                            <td className="py-4 px-4">{inv.tenant_phone}</td>
                            <td className="py-4 px-4 font-medium text-slate-800">
                              {inv.property_name} ({inv.unit_number})
                            </td>
                            <td className="py-4 px-4 font-mono text-[11px] text-slate-500">{inv.token}</td>
                            <td className="py-4 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                  inv.status === 'ACCEPTED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : inv.status === 'PENDING'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-slate-500">{inv.created_at ? inv.created_at.split('T')[0] : '2026-08-10'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 13. ACCOUNT & PROFILE TAB */}
            {(activeTab === 'account' || activeTab === 'profile') && (
              <LandlordAccountTab
                properties={properties}
                units={units}
                onLogout={onLogout}
              />
            )}

          </>
        )}
      </main>

      {/* MODALS SECTION */}

      {/* 1. ADD PROPERTY MODAL */}
      {showAddPropertyModal && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setShowAddPropertyModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add New Property</h3>
              <button
                onClick={() => setShowAddPropertyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Property Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Notify Heights, Gasabo Plaza"
                  value={propName}
                  onChange={(e) => setPropName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Property Type</label>
                <select
                  value={propType}
                  onChange={(e) => setPropType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                >
                  <option value="APARTMENT">Apartment Complex</option>
                  <option value="COMMERCIAL">Commercial Complex</option>
                  <option value="HOUSE">Single Family House</option>
                  <option value="OFFICE">Office Building</option>
                  <option value="MIXED_USE">Mixed-Use</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">District *</label>
                  <input
                    type="text"
                    required
                    value={propDistrict}
                    onChange={(e) => setPropDistrict(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Sector *</label>
                  <input
                    type="text"
                    required
                    value={propSector}
                    onChange={(e) => setPropSector(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KG 14 Ave, Plot 88"
                  value={propAddress}
                  onChange={(e) => setPropAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief description of amenities or location..."
                  value={propDesc}
                  onChange={(e) => setPropDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPropertyModal(false)}
                  disabled={isCreatingProperty}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProperty}
                  className="px-4 py-2 bg-[#331A6F] text-white rounded-lg font-semibold hover:bg-[#251352] disabled:opacity-50"
                >
                  {isCreatingProperty ? 'Saving...' : 'Save Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1B. EDIT PROPERTY MODAL */}
      {editingProperty && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => !isSavingProperty && setEditingProperty(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Edit Property</h3>
              <button
                onClick={() => setEditingProperty(null)}
                disabled={isSavingProperty}
                className="text-slate-400 hover:text-slate-600 p-1 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProperty} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Property Name *</label>
                <input
                  type="text"
                  required
                  value={editPropName}
                  onChange={(e) => setEditPropName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#331A6F]/30"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Property Type</label>
                <select
                  value={editPropType}
                  onChange={(e) => setEditPropType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                >
                  <option value="APARTMENT">Apartment Complex</option>
                  <option value="COMMERCIAL">Commercial Complex</option>
                  <option value="HOUSE">Single Family House</option>
                  <option value="OFFICE">Office Building</option>
                  <option value="MIXED_USE">Mixed-Use</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">District *</label>
                  <input
                    type="text"
                    required
                    value={editPropDistrict}
                    onChange={(e) => setEditPropDistrict(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Sector *</label>
                  <input
                    type="text"
                    required
                    value={editPropSector}
                    onChange={(e) => setEditPropSector(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={editPropAddress}
                  onChange={(e) => setEditPropAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief description of amenities or location..."
                  value={editPropDesc}
                  onChange={(e) => setEditPropDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProperty(null)}
                  disabled={isSavingProperty}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProperty}
                  className="px-4 py-2 bg-[#331A6F] text-white rounded-lg font-semibold hover:bg-[#251352] disabled:opacity-50"
                >
                  {isSavingProperty ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. ADD UNIT MODAL */}
      {showAddUnitModal && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setShowAddUnitModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add New Unit</h3>
              <button onClick={() => setShowAddUnitModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUnit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Property *</label>
                <select
                  value={selectedPropIdForUnit}
                  onChange={(e) => setSelectedPropIdForUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.district})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A-101, B-102"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Floor *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={unitFloor}
                    onChange={(e) => setUnitFloor(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-slate-700 font-semibold mb-1">Rooms</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Optional"
                    value={unitRooms}
                    onChange={(e) => setUnitRooms(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-slate-700 font-semibold mb-1">Bathrooms</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Optional"
                    value={unitBathrooms}
                    onChange={(e) => setUnitBathrooms(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-slate-700 font-semibold mb-1">Square meters</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    placeholder="Optional"
                    value={unitSquareMeters}
                    onChange={(e) => setUnitSquareMeters(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Monthly Rent (RWF) *</label>
                <input
                  type="number"
                  required
                  min={10000}
                  step={5000}
                  value={unitRent}
                  onChange={(e) => setUnitRent(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-bold text-slate-900"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUnitModal(false)}
                  disabled={isCreatingUnit}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUnit}
                  className="px-4 py-2 bg-[#331A6F] text-white rounded-lg font-semibold hover:bg-[#251352] disabled:opacity-50"
                >
                  {isCreatingUnit ? 'Saving...' : 'Save Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2B. EDIT UNIT MODAL */}
      {editingUnit && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => !isSavingUnit && setEditingUnit(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Edit Unit</h3>
              <button
                onClick={() => setEditingUnit(null)}
                disabled={isSavingUnit}
                className="text-slate-400 hover:text-slate-600 p-1 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUnit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Property</label>
                <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500">
                  {properties.find((p) => p.id === editingUnit.property_id)?.name || 'Property'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit Number *</label>
                  <input
                    type="text"
                    required
                    value={editUnitNumber}
                    onChange={(e) => setEditUnitNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Floor *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editUnitFloor}
                    onChange={(e) => setEditUnitFloor(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-slate-700 font-semibold mb-1">Rooms</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Optional"
                    value={editUnitRooms}
                    onChange={(e) => setEditUnitRooms(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-slate-700 font-semibold mb-1">Bathrooms</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Optional"
                    value={editUnitBathrooms}
                    onChange={(e) => setEditUnitBathrooms(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-slate-700 font-semibold mb-1">Square meters</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    placeholder="Optional"
                    value={editUnitSquareMeters}
                    onChange={(e) => setEditUnitSquareMeters(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Monthly Rent (RWF) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={5000}
                  value={editUnitRent}
                  onChange={(e) => setEditUnitRent(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-bold text-slate-900"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  disabled={isSavingUnit}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUnit}
                  className="px-4 py-2 bg-[#331A6F] text-white rounded-lg font-semibold hover:bg-[#251352] disabled:opacity-50"
                >
                  {isSavingUnit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. INVITE TENANT MODAL */}
      {showInviteModal && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowInviteModal(false);
            setCreatedInviteResult(null);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Invite Tenant to Unit</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setCreatedInviteResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdInviteResult ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Invitation Generated!</h4>
                    <p className="mt-1">
                      Share the invitation link below with the tenant. Upon clicking, they will be registered and linked to this unit.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invitation Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}${createdInviteResult.invite_link}`}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-mono text-[11px]"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}${createdInviteResult.invite_link}`);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="px-3 py-2 bg-[#331A6F] text-white font-semibold rounded-lg hover:bg-[#251352] flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setShowInviteModal(false);
                      setCreatedInviteResult(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateInvitation} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Select Property *</label>
                  <select
                    value={invitePropId}
                    onChange={(e) => {
                      setInvitePropId(e.target.value);
                      setInviteUnitId('');
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Select Vacant Unit *</label>
                  <select
                    value={inviteUnitId}
                    onChange={(e) => setInviteUnitId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="">-- Choose Vacant Unit --</option>
                    {vacantUnitsForInvite.map((u) => (
                      <option key={u.id} value={u.id}>
                        Unit {u.unit_number} (Floor {u.floor}) - RWF {(u.monthly_rent || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {vacantUnitsForInvite.length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      No vacant units available in this property. Add a unit first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tenant Email (optional)</label>
                  <input
                    type="email"
                    placeholder="tenant@example.com (optional)"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tenant Phone *</label>
                  <input
                    type="text"
                    required
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    disabled={isCreatingInvitation}
                    className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!inviteUnitId || isCreatingInvitation}
                    className="px-4 py-2 bg-[#331A6F] text-white rounded-lg font-semibold hover:bg-[#251352] disabled:opacity-50"
                  >
                    {isCreatingInvitation ? 'Assigning...' : 'Generate Invite Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 4. CREATE LEASE & TENANCY MODAL WITH BUILT-IN DOCUMENT UPLOAD */}
      {showCreateLeaseModal && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowCreateLeaseModal(false);
            setLeaseError(null);
            setLeaseUploadedDoc(null);
            setLeaseTenantId('');
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Create Lease Agreement</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set lease terms, rent, and attach the official signed lease agreement document directly.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateLeaseModal(false);
                  setLeaseError(null);
                  setLeaseUploadedDoc(null);
                  setLeaseTenantId('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {leaseError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{leaseError}</span>
              </div>
            )}

            <form onSubmit={handleCreateLeaseAndTenancy} className="space-y-5 text-xs overflow-y-auto pr-1">
              {/* Status Mode Toggle */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 text-xs">Lease Agreement Mode</div>
                  <div className="text-[11px] text-slate-500">
                    {leaseIsDraft
                      ? 'Draft mode allows saving terms first; document is optional until activation.'
                      : 'Active mode requires attaching the official signed lease document.'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaseIsDraft(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !leaseIsDraft
                        ? 'bg-[#331A6F] text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Active Lease
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaseIsDraft(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      leaseIsDraft
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Save as Draft
                  </button>
                </div>
              </div>

              {/* Property & Unit Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Property *</label>
                  <select
                    value={leasePropId}
                    onChange={(e) => {
                      setLeasePropId(e.target.value);
                      setLeaseUnitId('');
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Unit *</label>
                  <select
                    value={leaseUnitId}
                    onChange={(e) => {
                      setLeaseUnitId(e.target.value);
                      const selectedUnit = units.find((u) => u.id === e.target.value);
                      if (selectedUnit) {
                        setLeaseRent(selectedUnit.monthly_rent || 350000);
                        setLeaseDeposit(selectedUnit.monthly_rent || 350000);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20"
                  >
                    <option value="">-- Choose Unit --</option>
                    {vacantUnitsForLease.map((u) => (
                      <option key={u.id} value={u.id}>
                        Unit {u.unit_number} ({u.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tenant Selection */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Tenant *</label>
                <select
                  required
                  value={leaseTenantId}
                  onChange={(e) => setLeaseTenantId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20"
                >
                  <option value="">-- Choose Tenant --</option>
                  {uniqueTenantsForLease.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} ({t.email})
                    </option>
                  ))}
                </select>
                {tenants.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No tenants yet. Use "Assign Tenant" from the Units tab to invite one first.
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={leaseStartDate}
                    onChange={(e) => setLeaseStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaseEndDate}
                    onChange={(e) => setLeaseEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#331A6F]/20"
                  />
                </div>
              </div>

              {/* Financials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Monthly Rent (RWF) *</label>
                  <input
                    type="number"
                    required
                    value={leaseRent}
                    onChange={(e) => setLeaseRent(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Security Deposit (RWF)</label>
                  <input
                    type="number"
                    value={leaseDeposit}
                    onChange={(e) => setLeaseDeposit(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Terms / Notes */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Special Lease Terms / Clauses</label>
                <textarea
                  rows={2}
                  value={leaseNotes}
                  onChange={(e) => setLeaseNotes(e.target.value)}
                  placeholder="e.g. Standard 12-month renewable agreement with 60-day notice requirement."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              {/* BUILT-IN LEASE AGREEMENT DOCUMENT UPLOAD SECTION */}
              <div className="pt-2">
                <LeaseDocumentUploadSection
                  onDocumentChange={(doc) => setLeaseUploadedDoc(doc)}
                  isDraftMode={leaseIsDraft}
                  requiredForActivation={!leaseIsDraft}
                  leaseId="new-lease"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateLeaseModal(false)}
                  disabled={isCreatingLease}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!leaseUnitId || !leaseTenantId || isCreatingLease}
                  className="px-5 py-2.5 bg-[#331A6F] text-white rounded-xl font-bold hover:bg-[#251352] disabled:opacity-50 transition-all cursor-pointer shadow-md flex items-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>
                    {isCreatingLease
                      ? 'Creating Lease...'
                      : leaseIsDraft
                      ? 'Save as Draft'
                      : 'Create & Activate Lease'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEASE DOCUMENT DETAILS & AUDIT MODAL */}
      {selectedLeaseForDocModal && (
        <LeaseDocumentDetailsModal
          lease={selectedLeaseForDocModal}
          isOpen={!!selectedLeaseForDocModal}
          onClose={() => setSelectedLeaseForDocModal(null)}
          onUploadNewVersion={async (leaseIdOrDocData: any, optionalDocData?: any) => {
            const targetLeaseId = typeof leaseIdOrDocData === 'string' && optionalDocData ? leaseIdOrDocData : selectedLeaseForDocModal.id;
            const payload = optionalDocData || leaseIdOrDocData;
            await handleUploadDocumentForLease(targetLeaseId, payload);
            // Refresh modal lease data
            const updated = (await api.leases.list()).find((l) => l.id === targetLeaseId);
            if (updated) setSelectedLeaseForDocModal(updated);
          }}
          userRole="LANDLORD"
        />
      )}

      {/* LEASE AGREEMENT DOCUMENT PREVIEW (formatted, printable contract) */}
      <LeaseAgreementPreviewModal
        leaseId={previewLeaseId}
        onClose={() => setPreviewLeaseId(null)}
      />

      {/* 5. TENANT PROFILE & HISTORY MODAL */}
      {selectedTenantForProfile && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedTenantForProfile(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedTenantForProfile.first_name} {selectedTenantForProfile.last_name}
                </h3>
                <span className="text-xs text-slate-500">Tenant Verification Profile</span>
              </div>
              <button
                onClick={() => setSelectedTenantForProfile(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Email</span>
                  <span className="font-semibold text-slate-800">{selectedTenantForProfile.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Phone</span>
                  <span className="font-semibold text-slate-800">{selectedTenantForProfile.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">National ID</span>
                  <span className="font-semibold text-slate-800">{selectedTenantForProfile.national_id || '1199580012345678'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Occupation</span>
                  <span className="font-semibold text-slate-800">{selectedTenantForProfile.occupation || 'Professional'}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-[#331A6F]" />
                  <span>Active Tenancy</span>
                </h4>
                <div className="bg-purple-50/60 p-3.5 rounded-lg border border-purple-100">
                  <div className="font-bold text-slate-900">
                    {selectedTenantForProfile.property_name || 'Notify Heights'} — Unit {selectedTenantForProfile.unit_number || 'A-102'}
                  </div>
                  <div className="text-slate-600 mt-1">
                    Monthly Rent: <span className="font-semibold text-slate-900">RWF {(selectedTenantForProfile.monthly_rent || 350000).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-slate-500" />
                  <span>Previous Tenancy History</span>
                </h4>
                {selectedTenantForProfile.history && selectedTenantForProfile.history.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTenantForProfile.history.map((h) => (
                      <div key={h.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="font-semibold text-slate-800">{h.property_name} (Unit {h.unit_number})</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {h.start_date} to {h.end_date} • Rent RWF {h.monthly_rent.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No prior tenancy history recorded in system.</p>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  const t = selectedTenantForProfile;
                  setSelectedTenantForProfile(null);
                  if (t) handleOpenLedger(t);
                }}
                className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-[#331A6F] border border-purple-200 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <ReceiptIcon className="w-4 h-4" />
                <span>View Full Financial Ledger</span>
              </button>

              <button
                onClick={() => setSelectedTenantForProfile(null)}
                className="px-4 py-2 bg-[#331A6F] text-white rounded-lg font-semibold hover:bg-[#251352] text-xs cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 3 & 4 & 5 MODALS */}
      {/* 1. Tenant Financial Ledger & Statement Modal */}
      <TenantLedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => {
          setIsLedgerModalOpen(false);
          setSelectedTenantForLedger(null);
        }}
        tenant={selectedTenantForLedger}
        invoices={invoices}
        payments={payments}
        receipts={receipts}
        lease={leases.find(
          (l) =>
            l.tenancy_id === selectedTenantForLedger?.id ||
            l.tenant_name === `${selectedTenantForLedger?.first_name} ${selectedTenantForLedger?.last_name}`
        )}
        onRecordPayment={(tenantId, invoiceId) => {
          handleOpenRecordPayment(tenantId, invoiceId);
        }}
        onSendReminder={(tenant, invoice) => {
          handleOpenSendReminder(tenant, invoice);
        }}
        onViewInvoice={(invoice) => {
          setSelectedInvoice(invoice);
        }}
        onViewReceipt={(receipt) => {
          setSelectedReceipt(receipt);
        }}
      />

      {/* 2. Record Payment & Instant Receipt Modal */}
      <RecordPaymentModal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => {
          setIsRecordPaymentModalOpen(false);
          setRecordPaymentTenantId(undefined);
          setRecordPaymentInvoiceId(undefined);
        }}
        onPaymentSuccess={handlePaymentRecorded}
        invoices={invoices}
        tenants={tenants}
        properties={properties}
        units={units}
        initialInvoiceId={recordPaymentInvoiceId}
        initialTenantId={recordPaymentTenantId}
      />

      {/* 3. Send Payment & Rent Reminder Modal */}
      <SendReminderModal
        isOpen={isSendReminderModalOpen}
        onClose={() => {
          setIsSendReminderModalOpen(false);
          setReminderTenant(null);
          setReminderInvoice(null);
        }}
        tenant={reminderTenant}
        tenants={tenants}
        invoice={reminderInvoice}
        onSuccess={handleReminderSent}
      />

      {/* 4. Invoice View Modal */}
      <InvoiceModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />

      {/* 2. Receipt Modal */}
      <ReceiptModal
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />

      {/* 3. Maintenance Request Modal */}
      <MaintenanceModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => {
          setIsMaintenanceModalOpen(false);
          setSelectedMaintenance(null);
        }}
        request={selectedMaintenance}
        isLandlord={true}
        workers={workers}
        onAcknowledge={handleAcknowledgeMaintenance}
        onSchedule={handleScheduleMaintenance}
        onMarkInProgress={handleMarkMaintenanceInProgress}
        onResolve={handleResolveMaintenance}
        onAddToExpense={handleAddToExpenseMaintenance}
        onAddComment={handleAddMaintenanceComment}
      />

      {/* 4. Complaint Modal */}
      <ComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => {
          setIsComplaintModalOpen(false);
          setSelectedComplaint(null);
        }}
        complaint={selectedComplaint}
        isLandlord={true}
        onAcknowledge={handleAcknowledgeComplaint}
        onUnderReview={handleUnderReviewComplaint}
        onResolve={handleResolveComplaint}
        onCloseComplaint={handleCloseComplaint}
        onAddComment={handleAddComplaintComment}
      />

      {/* 5. Worker Modal */}
      <WorkerModal
        isOpen={isWorkerModalOpen}
        onClose={() => setIsWorkerModalOpen(false)}
        workers={workers}
        onAddWorker={handleAddWorker}
      />

      {/* 6. Phase 4/5 Notification Center Modal */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkNotificationRead}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onDeleteNotification={handleDeleteNotification}
        onSelectEntity={handleSelectNotificationEntity}
        onOpenPreferences={() => {
          setIsNotificationModalOpen(false);
          setIsNotificationPrefModalOpen(true);
        }}
        onRunReminderCheck={handleRunReminderCheck}
        isProcessingReminders={isProcessingReminders}
      />

      {/* 7. Phase 5 Notification Preferences & Automated Engine Modal */}
      <NotificationPreferencesModal
        isOpen={isNotificationPrefModalOpen}
        onClose={() => setIsNotificationPrefModalOpen(false)}
        onRemindersProcessed={fetchData}
      />

      {/* Custom Invoice Generator Modal */}
      <CreateInvoiceModal
        isOpen={showCreateInvoiceModal}
        onClose={() => setShowCreateInvoiceModal(false)}
        onInvoiceCreated={fetchData}
        properties={properties}
        units={units}
        leases={leases}
        tenants={tenants}
      />

      {/* Expense Tracking Modal */}
      <AddExpenseModal
        isOpen={showRecordExpenseModal}
        onClose={() => {
          setShowRecordExpenseModal(false);
          setSelectedExpenseForEdit(undefined);
        }}
        onExpenseSaved={fetchData}
        properties={properties}
        units={units}
        initialExpense={selectedExpenseForEdit}
      />

      {/* Delete Property Confirmation */}
      <ConfirmDialog
        open={!!propertyPendingDelete}
        title="Delete this property?"
        message={
          <>
            You are about to permanently delete{' '}
            <strong className="text-slate-900">{propertyPendingDelete?.name}</strong> and all of its units.
            This action cannot be undone. Properties with occupied units cannot be deleted until the
            tenancy has ended.
          </>
        }
        confirmLabel="Delete Property"
        isLoading={isDeletingProperty}
        onConfirm={handleConfirmDeleteProperty}
        onCancel={() => setPropertyPendingDelete(null)}
      />

      {/* Delete Unit Confirmation */}
      <ConfirmDialog
        open={!!unitPendingDelete}
        title="Delete this unit?"
        message={
          <>
            You are about to permanently delete unit{' '}
            <strong className="text-slate-900">{unitPendingDelete?.unit_number}</strong>. This action
            cannot be undone.
          </>
        }
        confirmLabel="Delete Unit"
        isLoading={isDeletingUnit}
        onConfirm={handleConfirmDeleteUnit}
        onCancel={() => setUnitPendingDelete(null)}
      />
    </div>
  );
};


