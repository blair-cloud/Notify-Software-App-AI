import React, { useState, useEffect, useMemo } from 'react';
import {
  Home,
  CreditCard,
  Wrench,
  FileText,
  User,
  LogOut,
  CheckCircle,
  Globe,
  Menu,
  X,
  ArrowUpRight,
  DollarSign,
  Clock,
  AlertCircle,
  FileCheck,
  Download,
  Eye,
  Receipt as ReceiptIcon,
  Bell,
  MessageSquare,
  Plus,
  RotateCcw,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Shield,
  ChevronRight,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import {
  Invoice,
  Payment,
  Receipt,
  TenantFinancials,
  MaintenanceRequest,
  Complaint,
  Notification,
  Lease
} from '../types';
import { InvoiceModal } from '../components/InvoiceModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { PaymentModal } from '../components/PaymentModal';
import { MaintenanceModal } from '../components/MaintenanceModal';
import { ComplaintModal } from '../components/ComplaintModal';
import { NotificationModal } from '../components/NotificationModal';
import { TenantComplaintChatView } from '../components/TenantComplaintChatView';
import { TenantMaintenanceChatView } from '../components/TenantMaintenanceChatView';
import { TenantMessagesTab } from '../components/TenantMessagesTab';
import { TENANT_DOC_STATUS_META } from '../components/LeaseDocumentDetailsModal';
import { TenantLeaseDocumentModal } from '../components/TenantLeaseDocumentModal';
import { TenantLeaseCountdownCard } from '../components/TenantLeaseCountdownCard';
import { TenantProfileSettingsTab } from '../components/TenantProfileSettingsTab';

interface TenantDashboardPageProps {
  onLogout: () => void;
}

type TenantTab = 'home' | 'lease' | 'payments' | 'messages' | 'profile' | 'invoices' | 'receipts';

export const TenantDashboardPage: React.FC<TenantDashboardPageProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const [activeTab, setActiveTab] = useState<TenantTab>('home');
  const [paymentSubTab, setPaymentSubTab] = useState<'invoices' | 'history'>('invoices');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [messagesMaintenanceMode, setMessagesMaintenanceMode] = useState<boolean>(false);

  // Full page chat states (WhatsApp-inspired dedicated view)
  const [activeComplaintChat, setActiveComplaintChat] = useState<Complaint | null>(null);
  const [activeMaintenanceChat, setActiveMaintenanceChat] = useState<MaintenanceRequest | null>(null);

  // Data states
  const [tenancies, setTenancies] = useState<any[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [financials, setFinancials] = useState<TenantFinancials | null>(null);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [selectedLeaseDocForTenant, setSelectedLeaseDocForTenant] = useState<Lease | null>(null);

  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter states
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState<string>('ALL');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<string>('ALL');

  // Active Modals State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  // Phase 4 Modals State
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceRequest | null>(null);
  const [isCreateMaintenanceOpen, setIsCreateMaintenanceOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isCreateComplaintOpen, setIsCreateComplaintOpen] = useState(false);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Dynamic greeting based on current local device time and language
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.goodMorning || 'Good morning';
    if (hour < 17) return t.goodAfternoon || 'Good afternoon';
    return t.goodEvening || 'Good evening';
  };

  const greeting = getGreeting();

  const tenantId = user?.id || 'mock-tenant-001';

  const loadTenantData = async () => {
    setLoading(true);
    try {
      const [tenanciesRes, leasesRes, invRes, payRes, rctRes, finRes, maintRes, compRes, notifRes, unreadRes] =
        await Promise.all([
          api.tenants.getMyTenancies().catch(() => []),
          api.leases.listMine().catch(() => []),
          api.invoices.getTenantInvoices().catch(() => []),
          api.payments.getTenantPayments().catch(() => []),
          api.receipts.getTenantReceipts().catch(() => []),
          api.financials.getTenantFinancials().catch(() => null),
          api.maintenance.getTenantRequests().catch(() => []),
          api.complaints.getTenantComplaints().catch(() => []),
          api.notifications.getUserNotifications(tenantId).catch(() => []),
          api.notifications.getUnreadCount().catch(() => ({ unread_count: 0 })),
        ]);

      const loadedTenancies = Array.isArray(tenanciesRes) ? tenanciesRes : ((tenanciesRes as any)?.tenancies || []);
      const loadedLeases = Array.isArray(leasesRes) ? leasesRes : [];
      const loadedInvoices = Array.isArray(invRes) ? invRes : ((invRes as any)?.invoices || []);
      const loadedPayments = Array.isArray(payRes) ? payRes : ((payRes as any)?.payments || []);
      const loadedReceipts = Array.isArray(rctRes) ? rctRes : ((rctRes as any)?.receipts || []);
      const loadedMaint = Array.isArray(maintRes) ? maintRes : ((maintRes as any)?.requests || []);
      const loadedComp = Array.isArray(compRes) ? compRes : ((compRes as any)?.complaints || []);
      const loadedNotif = Array.isArray(notifRes) ? notifRes : ((notifRes as any)?.notifications || []);

      setTenancies(loadedTenancies);
      setLeases(loadedLeases);
      setInvoices(loadedInvoices);
      setPayments(loadedPayments);
      setReceipts(loadedReceipts);
      setFinancials(finRes && !(finRes as any).detail ? finRes : null);
      setMaintenanceRequests(loadedMaint);
      setComplaints(loadedComp);
      setNotifications(loadedNotif);
      setUnreadCount(unreadRes?.unread_count ?? (Array.isArray(notifRes) ? notifRes.filter((n: any) => !n.is_read).length : 0));

      // Synchronize active chat objects if open
      setActiveComplaintChat((prev) => {
        if (!prev) return null;
        return loadedComp.find((c: Complaint) => c.id === prev.id) || prev;
      });
      setActiveMaintenanceChat((prev) => {
        if (!prev) return null;
        return loadedMaint.find((m: MaintenanceRequest) => m.id === prev.id) || prev;
      });
    } catch (err) {
      console.error('Error loading tenant data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenantData();
  }, [tenantId]);

  const activeTenancy = tenancies.length > 0 ? tenancies[0] : null;
  // `leases` is already scoped server-side to this tenant, so we only need to
  // pick the most relevant one. Accepting an invitation auto-creates a default
  // lease, so a tenancy can carry more than one: prefer the lease that actually
  // has an agreement document on file, then the most recently created.
  const pickMostRelevantLease = (candidates: Lease[]): Lease | null => {
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => {
      const byDocument = (b.agreement_document ? 1 : 0) - (a.agreement_document ? 1 : 0);
      if (byDocument !== 0) return byDocument;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    })[0];
  };

  const activeLease =
    pickMostRelevantLease(leases.filter((l) => !!activeTenancy?.id && l.tenancy_id === activeTenancy.id)) ||
    pickMostRelevantLease(leases.filter((l) => l.status === 'ACTIVE' || l.status === 'EXPIRING_SOON')) ||
    pickMostRelevantLease(leases);

  // A tenant can hold several leases (several units, or a renewal). One entry
  // per tenancy keeps each countdown tied to a distinct property/unit rather
  // than repeating a unit whose tenancy also carries an auto-created lease.
  const leasesForCountdown = useMemo(() => {
    const byTenancy = new Map<string, Lease[]>();
    leases.forEach((l) => {
      const key = l.tenancy_id || l.id;
      byTenancy.set(key, [...(byTenancy.get(key) || []), l]);
    });
    return Array.from(byTenancy.values())
      .map((group) => pickMostRelevantLease(group))
      .filter((l): l is Lease => l !== null);
  }, [leases]);

  // Lease Handlers
  const handleUploadTenantLeaseDocument = async (leaseId: string, docData: any) => {
    const updated = await api.leases.uploadDocumentMine(leaseId, docData);
    setSelectedLeaseDocForTenant(updated);
    setLeases((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSuccessMsg('Signed lease copy uploaded successfully!');
    setTimeout(() => setSuccessMsg(null), 4000);
    loadTenantData();
  };

  const handleSignTenantLease = async (leaseId: string, signatureNameValue: string) => {
    const updated = await api.leases.signMine(leaseId, signatureNameValue);
    setSelectedLeaseDocForTenant(updated);
    setLeases((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSuccessMsg('Lease signed successfully!');
    setTimeout(() => setSuccessMsg(null), 4000);
    loadTenantData();
  };

  // Maintenance Handlers
  const handleCreateMaintenance = async (data: {
    title: string;
    description: string;
    category: string;
    priority: string;
  }) => {
    try {
      await api.maintenance.createRequest({
        ...data,
        tenancy_id: activeTenancy?.id || 'tenancy-001',
      });
      setIsCreateMaintenanceOpen(false);
      setSuccessMsg('Maintenance request submitted successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
      loadTenantData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit maintenance request');
    }
  };

  const handleConfirmResolution = async (id: string, data?: { tenant_notes?: string }) => {
    try {
      await api.maintenance.tenantConfirmClose(id, data);
      setIsMaintenanceModalOpen(false);
      setSelectedMaintenance(null);
      setSuccessMsg('Maintenance resolution confirmed and closed!');
      setTimeout(() => setSuccessMsg(null), 4000);
      loadTenantData();
    } catch (err: any) {
      alert(err.message || 'Failed to confirm resolution');
    }
  };

  const handleReopenMaintenance = async (id: string, data: { tenant_notes: string }) => {
    try {
      await api.maintenance.tenantReopen(id, data);
      setIsMaintenanceModalOpen(false);
      setSelectedMaintenance(null);
      setSuccessMsg('Maintenance request reopened and sent to landlord.');
      setTimeout(() => setSuccessMsg(null), 4000);
      loadTenantData();
    } catch (err: any) {
      alert(err.message || 'Failed to reopen request');
    }
  };

  const handleAddMaintenanceComment = async (id: string, message: string) => {
    try {
      await api.maintenance.addComment(id, message);
      loadTenantData();
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    }
  };

  // Complaint Handlers
  const handleCreateComplaint = async (data: {
    subject: string;
    description: string;
    category: string;
    priority: string;
  }) => {
    try {
      await api.complaints.createComplaint({
        ...data,
        tenancy_id: activeTenancy?.id || 'tenancy-001',
      });
      setIsCreateComplaintOpen(false);
      setSuccessMsg('Complaint filed successfully with landlord management.');
      setTimeout(() => setSuccessMsg(null), 4000);
      loadTenantData();
    } catch (err: any) {
      alert(err.message || 'Failed to file complaint');
    }
  };

  const handleAddComplaintComment = async (id: string, message: string) => {
    try {
      await api.complaints.addComment(id, message);
      loadTenantData();
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    }
  };

  const handleCloseComplaint = async (id: string) => {
    try {
      await api.complaints.closeComplaint(id);
      setSuccessMsg('Complaint marked as resolved/closed.');
      setTimeout(() => setSuccessMsg(null), 4000);
      loadTenantData();
    } catch (err: any) {
      alert(err.message || 'Failed to close complaint');
    }
  };

  // Notification Handlers
  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      await api.notifications.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true, status: 'READ' } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, status: 'READ' })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const switchTab = (tab: TenantTab) => {
    if (tab === 'invoices') {
      setActiveTab('payments');
      setPaymentSubTab('invoices');
    } else if (tab === 'receipts') {
      setActiveTab('payments');
      setPaymentSubTab('history');
    } else {
      setActiveTab(tab);
    }
    setActiveComplaintChat(null);
    setActiveMaintenanceChat(null);
    setMobileMenuOpen(false);
  };

  const handleSelectNotificationEntity = (entityType: string, entityId: string) => {
    setIsNotificationModalOpen(false);
    if (entityType === 'MAINTENANCE' || entityType === 'COMPLAINT' || entityType === 'MESSAGE') {
      setMessagesMaintenanceMode(entityType === 'MAINTENANCE');
      switchTab('messages');
    } else if (entityType === 'INVOICE') {
      const match = invoices.find((i) => i.id === entityId);
      if (match) {
        setSelectedInvoice(match);
      } else {
        setPaymentSubTab('invoices');
        switchTab('payments');
      }
    } else if (entityType === 'PAYMENT' || entityType === 'RECEIPT') {
      const match = receipts.find((r) => r.id === entityId || r.payment_id === entityId);
      if (match) {
        setSelectedReceipt(match);
      } else {
        setPaymentSubTab('history');
        switchTab('payments');
      }
    }
  };

  // Filtered lists
  const filteredMaintenance = maintenanceRequests.filter((m) => {
    if (maintenanceStatusFilter === 'ALL') return true;
    return m.status === maintenanceStatusFilter;
  });

  const filteredComplaints = complaints.filter((c) => {
    if (complaintStatusFilter === 'ALL') return true;
    return c.status === complaintStatusFilter;
  });

  const activeMaintenanceCount = maintenanceRequests.filter(
    (m) => m.status !== 'CLOSED' && m.status !== 'REJECTED' && m.status !== 'CANCELLED'
  ).length;

  const activeComplaintCount = complaints.filter(
    (c) => c.status !== 'CLOSED' && c.status !== 'RESOLVED' && c.status !== 'REJECTED'
  ).length;

  const getMaintenanceStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">SUBMITTED</span>;
      case 'ACKNOWLEDGED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">ACKNOWLEDGED</span>;
      case 'SCHEDULED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">SCHEDULED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse">IN PROGRESS</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">RESOLVED (ACTION REQUIRED)</span>;
      case 'REOPENED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">REOPENED</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">CLOSED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200">{status}</span>;
    }
  };

  const getComplaintStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">SUBMITTED</span>;
      case 'ACKNOWLEDGED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">ACKNOWLEDGED</span>;
      case 'UNDER_REVIEW':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">UNDER REVIEW</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">RESOLVED</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">CLOSED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="h-screen w-full bg-[#F8FAFC] text-slate-900 font-poppins flex flex-col md:flex-row overflow-hidden">
      {/* Desktop & Tablet Sidebar - Clean, modern, minimalist style consistent with Notify */}
      <aside className="hidden md:flex flex-col w-56 lg:w-64 h-full bg-[#331A6F] text-white border-r border-purple-900/30 shrink-0 select-none">
        {/* Logo & Portal Badge */}
        <div className="p-4 lg:p-6 pb-3 lg:pb-4 shrink-0 border-b border-purple-800/30">
          <div className="flex items-center gap-3">
            <img src="/src/assets/images/white_logo.png" alt="Notify" className="h-12 w-auto object-contain" />
          </div>
        </div>

        {/* Navigation Links - 5 core functions: Home | Lease | Payments | Messages | Profile & Settings */}
        <nav className="flex-1 overflow-y-auto scrollbar-subtle px-3 lg:px-4 py-4 space-y-1.5">
          <button
            onClick={() => switchTab('home')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs lg:text-sm transition-all cursor-pointer ${activeTab === 'home'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
              }`}
          >
            <Home className="w-4 h-4 shrink-0" />
            <span className="truncate">{t.tenantMyHome || 'Home'}</span>
          </button>

          <button
            onClick={() => switchTab('lease')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs lg:text-sm transition-all cursor-pointer ${activeTab === 'lease'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
              }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">{t.tenantLease || 'Lease'}</span>
          </button>

          <button
            onClick={() => switchTab('payments')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs lg:text-sm transition-all cursor-pointer ${activeTab === 'payments'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
              }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <CreditCard className="w-4 h-4 shrink-0" />
              <span className="truncate">{t.navPayments || 'Payments'}</span>
            </div>
            {financials?.amount_due && financials.amount_due > 0 ? (
              <span className="bg-rose-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-xs shrink-0">
                {t.due || 'Due'}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => {
              setMessagesMaintenanceMode(false);
              switchTab('messages');
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs lg:text-sm transition-all cursor-pointer ${activeTab === 'messages'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
              }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="truncate">{t.navMessages || 'Messages'}</span>
            </div>
            {activeMaintenanceCount > 0 && (
              <span className="bg-amber-400 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 shrink-0">
                <Wrench className="w-2.5 h-2.5" />
                {activeMaintenanceCount}
              </span>
            )}
          </button>

          <button
            onClick={() => switchTab('profile')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs lg:text-sm transition-all cursor-pointer ${activeTab === 'profile'
                ? 'bg-white text-[#331A6F] font-bold shadow-xs'
                : 'text-purple-100/90 hover:bg-white/10 hover:text-white font-medium'
              }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate">{t.profileDetails || 'Profile & Settings'}</span>
          </button>
        </nav>

        {/* Subtle User Quick Info Footer in Sidebar */}
        <div className="p-4 lg:p-5 pt-3 shrink-0 border-t border-purple-800/30 bg-[#2b155e]/60">
          <div
            onClick={() => switchTab('profile')}
            className="flex items-center gap-3 cursor-pointer p-1.5 rounded-xl hover:bg-white/10 transition-colors"
            title={t.profileDetails || 'Open Profile & Settings'}
          >
            <div className="w-8 h-8 rounded-full bg-purple-200/20 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
              {user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'T'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {user?.first_name} {user?.last_name}
              </div>
              <div className="text-[10px] text-purple-200/70 truncate">{user?.email}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top App Bar - Clean, modern, minimalist */}
      <header className="md:hidden bg-[#331A6F] text-white px-4 py-3 flex items-center justify-between border-b border-purple-800/40 shrink-0 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <img src="/src/assets/images/white_logo.png" alt="Notify" className="h-8 w-auto object-contain" />
        </div>

        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <button
            onClick={() => setIsNotificationModalOpen(true)}
            className="relative p-2 text-purple-100 hover:text-white transition-colors cursor-pointer"
            title={t.notifications || 'Notifications'}
          >
            <Bell className="w-5 h-5 stroke-[2]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-rose-500 text-white font-bold text-[10px] min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Initial */}
          <button
            onClick={() => switchTab('profile')}
            className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${activeTab === 'profile'
                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300/80'
                : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            title={t.profileDetails || 'Profile & Settings'}
          >
            {user?.first_name ? user.first_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar - Clean, modern, minimalist */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.04)] px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around select-none">
        {/* 1. Home */}
        <button
          onClick={() => switchTab('home')}
          className={`flex-1 min-h-[48px] py-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${activeTab === 'home'
              ? 'text-[#331A6F] font-bold'
              : 'text-slate-400 font-medium hover:text-slate-600'
            }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'home' ? 'bg-purple-100 text-[#331A6F]' : ''}`}>
            <Home className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[10px] tracking-tight">{t.tenantMyHome || 'Home'}</span>
        </button>

        {/* 2. Lease */}
        <button
          onClick={() => switchTab('lease')}
          className={`flex-1 min-h-[48px] py-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${activeTab === 'lease'
              ? 'text-[#331A6F] font-bold'
              : 'text-slate-400 font-medium hover:text-slate-600'
            }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'lease' ? 'bg-purple-100 text-[#331A6F]' : ''}`}>
            <FileText className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[10px] tracking-tight">{t.tenantLease || 'Lease'}</span>
        </button>

        {/* 3. Payments */}
        <button
          onClick={() => switchTab('payments')}
          className={`flex-1 min-h-[48px] py-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${activeTab === 'payments'
              ? 'text-[#331A6F] font-bold'
              : 'text-slate-400 font-medium hover:text-slate-600'
            }`}
        >
          <div className={`p-1.5 rounded-xl transition-all relative ${activeTab === 'payments' ? 'bg-purple-100 text-[#331A6F]' : ''}`}>
            <CreditCard className="w-5 h-5 stroke-[2.2]" />
            {financials?.amount_due && financials.amount_due > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            ) : null}
          </div>
          <span className="text-[10px] tracking-tight">{t.navPayments || 'Payments'}</span>
        </button>

        {/* 4. Messages */}
        <button
          onClick={() => {
            setMessagesMaintenanceMode(false);
            switchTab('messages');
          }}
          className={`flex-1 min-h-[48px] py-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${activeTab === 'messages'
              ? 'text-[#331A6F] font-bold'
              : 'text-slate-400 font-medium hover:text-slate-600'
            }`}
        >
          <div className={`p-1.5 rounded-xl transition-all relative ${activeTab === 'messages' ? 'bg-purple-100 text-[#331A6F]' : ''}`}>
            <MessageSquare className="w-5 h-5 stroke-[2.2]" />
            {activeMaintenanceCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-bold text-[9px] px-1.5 py-0.2 rounded-full shadow-xs flex items-center gap-0.5">
                {activeMaintenanceCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">{t.navMessages || 'Messages'}</span>
        </button>

        {/* 5. Profile & Settings */}
        <button
          onClick={() => switchTab('profile')}
          className={`flex-1 min-h-[48px] py-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${activeTab === 'profile'
              ? 'text-[#331A6F] font-bold'
              : 'text-slate-400 font-medium hover:text-slate-600'
            }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-purple-100 text-[#331A6F]' : ''}`}>
            <User className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[10px] tracking-tight">{t.navProfile || 'Profile'}</span>
        </button>
      </nav>

      {/* Main Content or Dedicated Full-Page Chat View */}
      {activeComplaintChat ? (
        <TenantComplaintChatView
          complaint={activeComplaintChat}
          onBack={() => setActiveComplaintChat(null)}
          onAddComment={handleAddComplaintComment}
          onCloseComplaint={handleCloseComplaint}
          activeTenancy={activeTenancy}
          user={user}
        />
      ) : activeMaintenanceChat ? (
        <TenantMaintenanceChatView
          request={activeMaintenanceChat}
          onBack={() => setActiveMaintenanceChat(null)}
          onAddComment={handleAddMaintenanceComment}
          onConfirmResolution={handleConfirmResolution}
          onReopen={handleReopenMaintenance}
          activeTenancy={activeTenancy}
          user={user}
        />
      ) : (
        /* Main Content Area - Clean SaaS Design */
        <main className="flex-1 h-full overflow-y-auto max-w-5xl mx-auto w-full p-4 sm:p-6 md:p-8 flex flex-col justify-between scrollbar-subtle-dark pb-24 md:pb-8">
          <div>
            {/* Success Toast */}
            {successMsg && (
              <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{successMsg}</span>
                </div>
                <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-950 font-bold text-xs cursor-pointer">
                  ✕
                </button>
              </div>
            )}

            {/* Top Title Banner & Quick Actions */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {greeting}, {user?.first_name || (t.verifiedTenant || 'Tenant')}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  {t.tenantSubtitle || 'Manage your rental agreement, maintenance requests, and payments.'}
                </p>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                {/* Notification Bell (Desktop) */}
                <button
                  onClick={() => setIsNotificationModalOpen(true)}
                  className="hidden md:flex relative p-2 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  title={t.notifications || 'Notifications'}
                >
                  <Bell className="w-5 h-5 stroke-[2]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-rose-500 text-white font-bold text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-xs">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* User Profile Initial (Desktop) */}
                <button
                  onClick={() => switchTab('profile')}
                  className={`hidden md:flex w-8 h-8 rounded-full font-bold text-xs items-center justify-center transition-all cursor-pointer ${activeTab === 'profile'
                      ? 'bg-purple-100 text-[#331A6F] ring-2 ring-[#331A6F]/30'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  title={t.profileDetails || 'Profile & Settings'}
                >
                  {user?.first_name ? user.first_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                </button>

              </div>
            </div>

            {/* HOME TAB */}
            {activeTab === 'home' && (
              <div className="space-y-6">
                {/* PROMINENT LEASE COUNTDOWN (HERO FOCUS) */}
                <TenantLeaseCountdownCard
                  leases={leasesForCountdown}
                  tenancy={activeTenancy}
                  onViewLeaseDetails={() => switchTab('lease')}
                  onViewDocument={setSelectedLeaseDocForTenant}
                />

                {/* APP-STYLE QUICK ACTIONS & STATUS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Rent & Invoices Summary */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-[#331A6F]" />
                          <h3 className="font-bold text-slate-900 text-sm">{t.rentAndInvoices || 'Rent & Invoices'}</h3>
                        </div>
                        {financials?.amount_due && financials.amount_due > 0 ? (
                          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                            {t.due || 'Due'} Sep 05
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            {t.allCaughtUp || 'All Caught Up'}
                          </span>
                        )}
                      </div>

                      <div className="my-2">
                        <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
                          {financials?.amount_due && financials.amount_due > 0
                            ? `RWF ${financials.amount_due.toLocaleString()}`
                            : `RWF 0 ${t.balance || 'Balance'}`}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {financials?.amount_due && financials.amount_due > 0
                            ? `${t.invoiceNumber || 'Invoice #'} ${financials?.invoice_number || 'INV-2026-000001'} ${t.awaitingVerification || 'awaiting settlement.'}`
                            : (t.noPendingRentCharges || 'No pending rent charges on your account.')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 pt-3 border-t border-slate-100">
                      {financials?.amount_due && financials.amount_due > 0 ? (
                        <button
                          onClick={() => {
                            const activeInv = invoices.find((i) => i.balance_due > 0) || invoices[0];
                            if (activeInv) setPayingInvoice(activeInv);
                          }}
                          className="flex-1 min-h-[40px] py-2 px-3 bg-[#331A6F] hover:bg-[#281458] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> {t.payRentOnline || 'Pay Rent Online'}
                        </button>
                      ) : (
                        <button
                          onClick={() => switchTab('payments')}
                          className="flex-1 min-h-[40px] py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-slate-500" /> {t.viewPaymentRecords || 'View Payment Records'}
                        </button>
                      )}

                      <button
                        onClick={() => switchTab('payments')}
                        className="min-h-[40px] py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> {t.invoices || 'Invoices'}
                      </button>
                    </div>
                  </div>

                  {/* Messages & Support Card */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-[#008069]" />
                          <h3 className="font-bold text-slate-900 text-sm">{t.messagesSupport || 'Messages & Support'}</h3>
                        </div>
                        {activeMaintenanceCount > 0 ? (
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            {activeMaintenanceCount} {t.activeLease || 'Active'}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                            Online
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 my-2">
                        {activeMaintenanceCount > 0
                          ? `${activeMaintenanceCount} ${t.activeRequests || 'active maintenance requests in progress with property managers.'}`
                          : (t.chatDirectDesc || 'Direct WhatsApp-style chat with your property manager and maintenance team.')}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setMessagesMaintenanceMode(false);
                          switchTab('messages');
                        }}
                        className="flex-1 min-h-[40px] py-2 px-3 bg-[#008069] hover:bg-[#00705a] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> {t.chatLandlord || 'Chat Landlord'}
                      </button>
                      <button
                        onClick={() => {
                          setMessagesMaintenanceMode(true);
                          switchTab('messages');
                        }}
                        className="min-h-[40px] py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs border border-amber-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Wrench className="w-3.5 h-3.5 text-amber-700" /> {t.navMaintenance || 'Maintenance'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* RECENT MAINTENANCE SNIPPETS */}
                {maintenanceRequests.length > 0 && (
                  <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-900">{t.recentMaintenanceRequests || 'Recent Maintenance Requests'}</h3>
                      <button
                        onClick={() => {
                          setMessagesMaintenanceMode(true);
                          switchTab('messages');
                        }}
                        className="text-xs font-bold text-[#331A6F] hover:underline cursor-pointer"
                      >
                        {t.viewInChat || 'View in Chat'} ({maintenanceRequests.length})
                      </button>
                    </div>
                    <div className="space-y-3">
                      {maintenanceRequests.slice(0, 3).map((req) => (
                        <div
                          key={req.id}
                          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono font-bold text-xs text-slate-900">{req.request_number}</span>
                              {getMaintenanceStatusBadge(req.status)}
                              <span className="text-[10px] font-semibold text-slate-500 uppercase">{req.category}</span>
                            </div>
                            <p className="font-semibold text-xs text-slate-800">{req.title}</p>
                            {req.assigned_to && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {t.assignedWorker || 'Assigned worker'}: <span className="font-medium text-slate-700">{req.assigned_to}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {req.status === 'RESOLVED' && (
                              <button
                                onClick={() => setActiveMaintenanceChat(req)}
                                className="min-h-[36px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                              >
                                {t.confirmResolution || 'Confirm Resolution'}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setMessagesMaintenanceMode(true);
                                switchTab('messages');
                              }}
                              className="min-h-[36px] px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3 text-[#008069]" /> {t.chat || 'Chat'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* RECENT INVOICES SUMMARY */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900">{t.recentRentInvoices || 'Recent Rent Invoices'}</h3>
                    <button
                      onClick={() => switchTab('payments')}
                      className="text-xs font-bold text-[#331A6F] hover:underline cursor-pointer"
                    >
                      {t.viewAll || 'View All'}
                    </button>
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                          <th className="py-2.5 px-3 font-semibold">{t.invoiceNumber || 'Invoice #'}</th>
                          <th className="py-2.5 px-3 font-semibold">{t.billingPeriod || 'Billing Period'}</th>
                          <th className="py-2.5 px-3 font-semibold">{t.amount || 'Amount'}</th>
                          <th className="py-2.5 px-3 font-semibold">{t.balance || 'Balance'}</th>
                          <th className="py-2.5 px-3 font-semibold">{t.status || 'Status'}</th>
                          <th className="py-2.5 px-3 font-semibold text-right">{t.action || 'Action'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invoices.slice(0, 3).map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/60">
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                            <td className="py-3 px-3 text-slate-600">{inv.billing_period_start} - {inv.billing_period_end}</td>
                            <td className="py-3 px-3 font-semibold text-slate-800">{inv.total_amount?.toLocaleString()} RWF</td>
                            <td className="py-3 px-3 font-bold text-rose-600">{inv.balance_due?.toLocaleString()} RWF</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.status === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right space-x-2">
                              <button
                                onClick={() => setSelectedInvoice(inv)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md transition-colors cursor-pointer"
                              >
                                {t.view || 'View'}
                              </button>
                              {inv.balance_due > 0 && (
                                <button
                                  onClick={() => setPayingInvoice(inv)}
                                  className="px-2.5 py-1 bg-[#331A6F] text-white font-bold rounded-md transition-colors cursor-pointer"
                                >
                                  {t.pay || 'Pay'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3">
                    {invoices.slice(0, 3).map((inv) => (
                      <div key={inv.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-slate-900">{inv.invoice_number}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                            {inv.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {t.period || 'Period'}: <span className="text-slate-700 font-medium">{inv.billing_period_start} to {inv.billing_period_end}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <span className="text-[11px] text-slate-400">{t.total || 'Total'}: </span>
                            <span className="font-bold text-slate-800 text-xs">{inv.total_amount?.toLocaleString()} RWF</span>
                          </div>
                          {inv.balance_due > 0 && (
                            <div>
                              <span className="text-[11px] text-slate-400">{t.due || 'Due'}: </span>
                              <span className="font-bold text-rose-600 text-xs">{inv.balance_due?.toLocaleString()} RWF</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="flex-1 min-h-[38px] py-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            {t.viewInvoice || 'View Invoice'}
                          </button>
                          {inv.balance_due > 0 && (
                            <button
                              onClick={() => setPayingInvoice(inv)}
                              className="flex-1 min-h-[38px] py-1.5 px-3 bg-[#331A6F] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              {t.payNow || 'Pay Now'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* LEASE TAB */}
            {activeTab === 'lease' && (
              <div className="space-y-6">
                {!activeLease ? (
                  <div className="p-12 rounded-2xl bg-white border border-slate-200 shadow-xs text-center">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-900">{'No lease on file yet'}</h3>
                  </div>
                ) : (
                  <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-8">
                    {/* Title, status & primary action */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                      <div className="space-y-2">
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                          {t.residentialTenancyAgreement || 'Lease Agreement'}
                        </h2>
                        <p className="text-sm text-slate-500">
                          {activeLease.property_name || 'Property'} • {t.unitLabel || 'Unit'} {activeLease.unit_number || '—'}
                        </p>
                        <span
                          className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            (TENANT_DOC_STATUS_META[activeLease.tenant_document_status || 'NO_DOCUMENT'] || TENANT_DOC_STATUS_META.NO_DOCUMENT).className
                          }`}
                        >
                          {(TENANT_DOC_STATUS_META[activeLease.tenant_document_status || 'NO_DOCUMENT'] || TENANT_DOC_STATUS_META.NO_DOCUMENT).label}
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedLeaseDocForTenant(activeLease)}
                        className="min-h-[44px] px-5 py-2.5 bg-[#331A6F] hover:bg-[#281458] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer self-start shrink-0"
                      >
                        <FileCheck className="w-4 h-4" />
                        {t.viewSignedAgreement || 'View Lease'}
                      </button>
                    </div>

                    {/* Essential terms */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-400">{t.leaseTerm || 'Lease Term'}</p>
                        <p className="text-sm font-bold text-slate-900">
                          {activeLease.start_date} — {activeLease.end_date}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-400">{t.monthlyRent || 'Monthly Rent'}</p>
                        <p className="text-sm font-bold text-slate-900">
                          {activeLease.currency || 'RWF'} {activeLease.monthly_rent?.toLocaleString() ?? '—'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-400">{t.securityDeposit || 'Security Deposit'}</p>
                        <p className="text-sm font-bold text-slate-900">
                          {activeLease.currency || 'RWF'} {activeLease.security_deposit?.toLocaleString() ?? '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PAYMENTS TAB (Unified Invoices & Payment History) */}
            {activeTab === 'payments' && (
              <div className="space-y-6">
                {/* Balance Summary Card */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[#331A6F] bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                      {t.currentOutstandingBalance || 'CURRENT OUTSTANDING BALANCE'}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                      RWF {financials?.amount_due?.toLocaleString() ?? '350,000'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {t.dueDate || 'Due Date'}: <span className="font-semibold text-slate-800">{financials?.due_date || '2026-09-05'}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const activeInv = invoices.find((i) => i.balance_due > 0) || invoices[0];
                      if (activeInv) setPayingInvoice(activeInv);
                    }}
                    disabled={!financials?.amount_due}
                    className="min-h-[44px] px-5 py-2.5 bg-[#331A6F] hover:bg-[#281458] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
                  >
                    <CreditCard className="w-4 h-4" /> {t.payRentOnline || 'Pay Rent Online Now'}
                  </button>
                </div>

                {/* Sub-tab Switcher Pills */}
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl max-w-md">
                  <button
                    onClick={() => setPaymentSubTab('invoices')}
                    className={`flex-1 min-h-[38px] py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${paymentSubTab === 'invoices'
                        ? 'bg-white text-[#331A6F] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    {t.rentInvoices || 'Rent Invoices'} ({invoices.length})
                  </button>
                  <button
                    onClick={() => setPaymentSubTab('history')}
                    className={`flex-1 min-h-[38px] py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${paymentSubTab === 'history'
                        ? 'bg-white text-[#331A6F] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    {t.paymentReceipts || 'Payment Receipts'} ({receipts.length})
                  </button>
                </div>

                {/* INVOICES SUB-VIEW */}
                {paymentSubTab === 'invoices' && (
                  <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-slate-900">{t.allRentInvoices || 'All Rent Invoices'}</h3>

                    {/* Desktop Invoices Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <th className="py-3 px-4 font-semibold">{t.invoiceNumber || 'Invoice Number'}</th>
                            <th className="py-3 px-4 font-semibold">{t.invoiceType || 'Type'}</th>
                            <th className="py-3 px-4 font-semibold">{t.billingPeriod || 'Billing Period'}</th>
                            <th className="py-3 px-4 font-semibold">{t.dueDate || 'Due Date'}</th>
                            <th className="py-3 px-4 font-semibold">{t.totalAmount || 'Total Amount'}</th>
                            <th className="py-3 px-4 font-semibold">{t.balanceDue || 'Balance Due'}</th>
                            <th className="py-3 px-4 font-semibold">{t.status || 'Status'}</th>
                            <th className="py-3 px-4 font-semibold text-right">{t.actions || 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(invoices || []).length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-8 text-center text-slate-400">
                                {t.noRentInvoicesFound || 'No rent invoices found.'}
                              </td>
                            </tr>
                          ) : (
                            (invoices || []).map((inv) => (
                              <tr key={inv.id} className="hover:bg-slate-50/60">
                                <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                                <td className="py-3.5 px-4 text-slate-600">{inv.invoice_type}</td>
                                <td className="py-3.5 px-4 text-slate-600">{inv.billing_period_start} to {inv.billing_period_end}</td>
                                <td className="py-3.5 px-4 font-semibold text-slate-800">{inv.due_date || '—'}</td>
                                <td className="py-3.5 px-4 font-semibold text-slate-900">{inv.total_amount?.toLocaleString()} RWF</td>
                                <td className="py-3.5 px-4 font-bold text-rose-600">{inv.balance_due?.toLocaleString()} RWF</td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${inv.status === 'PAID'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}>
                                    {inv.status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right space-x-2">
                                  <button
                                    onClick={() => setSelectedInvoice(inv)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                                  >
                                    {t.viewInvoice || 'View Invoice'}
                                  </button>
                                  {inv.balance_due > 0 && (
                                    <button
                                      onClick={() => setPayingInvoice(inv)}
                                      className="px-3 py-1.5 bg-[#331A6F] hover:bg-[#281458] text-white font-bold rounded-lg transition-colors cursor-pointer"
                                    >
                                      {t.payNow || 'Pay Now'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Invoices Card List */}
                    <div className="md:hidden space-y-3">
                      {(invoices || []).length === 0 ? (
                        <p className="py-8 text-center text-slate-400 text-xs">{t.noRentInvoicesFound || 'No rent invoices found.'}</p>
                      ) : (
                        (invoices || []).map((inv) => (
                          <div key={inv.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-sm text-slate-900">{inv.invoice_number}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${inv.status === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                {inv.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">
                              {t.period || 'Period'}: <span className="text-slate-800 font-medium">{inv.billing_period_start} to {inv.billing_period_end}</span>
                            </div>
                            <div className="text-xs text-slate-500">
                              {t.dueDate || 'Due Date'}: <span className="text-slate-800 font-medium">{inv.due_date || '—'}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs pt-1">
                              <div>
                                <span className="text-slate-400">{t.total || 'Total'}: </span>
                                <span className="font-bold text-slate-900">{inv.total_amount?.toLocaleString()} RWF</span>
                              </div>
                              <div>
                                <span className="text-slate-400">{t.balance || 'Balance'}: </span>
                                <span className="font-bold text-rose-600">{inv.balance_due?.toLocaleString()} RWF</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
                              <button
                                onClick={() => setSelectedInvoice(inv)}
                                className="flex-1 min-h-[40px] py-2 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                              >
                                {t.viewDetails || 'View Details'}
                              </button>
                              {inv.balance_due > 0 && (
                                <button
                                  onClick={() => setPayingInvoice(inv)}
                                  className="flex-1 min-h-[40px] py-2 px-3 bg-[#331A6F] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                                >
                                  {t.payNow || 'Pay Now'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* RECEIPTS & PAYMENTS SUB-VIEW */}
                {paymentSubTab === 'history' && (
                  <div className="space-y-6">
                    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                      <h3 className="text-base font-bold text-slate-900">{t.officialPaymentReceipts || 'Official Rental Payment Receipts'}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(receipts || []).length === 0 ? (
                          <div className="col-span-2 py-8 text-center text-slate-400 text-xs">
                            {t.noPaymentReceiptsYet || 'No payment receipts generated yet. Receipts will appear here automatically upon payment verification.'}
                          </div>
                        ) : (
                          (receipts || []).map((r) => (
                            <div key={r.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  {t.verifiedReceipt || 'VERIFIED RECEIPT'}
                                </span>
                                <p className="font-mono font-bold text-slate-900 text-sm mt-1">{r.receipt_number}</p>
                                <p className="text-xs text-slate-500">{t.amount || 'Amount'}: <span className="font-bold text-slate-800">RWF {r.amount?.toLocaleString()}</span></p>
                                <p className="text-[11px] text-slate-400">{t.issued || 'Issued'}: {new Date(r.issued_at).toLocaleDateString()}</p>
                              </div>
                              <button
                                onClick={() => setSelectedReceipt(r)}
                                className="min-h-[38px] px-3.5 py-2 bg-[#331A6F] hover:bg-[#281458] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                              >
                                <Download className="w-3.5 h-3.5" /> {t.viewAndPrint || 'View & Print'}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Transactions Log */}
                    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                      <h3 className="text-base font-bold text-slate-900">{t.paymentTransactionsRecord || 'Payment Transactions Record'}</h3>

                      {/* Desktop Table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                              <th className="py-3 px-4 font-semibold">{t.paymentRef || 'Payment Ref'}</th>
                              <th className="py-3 px-4 font-semibold">{t.transactionRef || 'Transaction Ref'}</th>
                              <th className="py-3 px-4 font-semibold">{t.method || 'Method'}</th>
                              <th className="py-3 px-4 font-semibold">{t.amount || 'Amount'}</th>
                              <th className="py-3 px-4 font-semibold">{t.status || 'Status'}</th>
                              <th className="py-3 px-4 font-semibold">{t.date || 'Date'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(payments || []).length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-slate-400">
                                  {t.noPaymentTransactionsRecorded || 'No payment transactions recorded yet.'}
                                </td>
                              </tr>
                            ) : (
                              (payments || []).map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/60">
                                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{p.payment_reference}</td>
                                  <td className="py-3.5 px-4 font-mono text-slate-600">{p.transaction_reference || 'N/A'}</td>
                                  <td className="py-3.5 px-4 font-medium text-slate-800">{p.payment_method}</td>
                                  <td className="py-3.5 px-4 font-bold text-emerald-700">{p.amount?.toLocaleString()} {p.currency}</td>
                                  <td className="py-3.5 px-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${p.status === 'COMPLETED'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : p.status === 'AWAITING_VERIFICATION'
                                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                                      }`}>
                                      {p.status}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-500">
                                    {p.created_at ? new Date(p.created_at).toLocaleDateString() : (t.today || 'Today')}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Cards */}
                      <div className="md:hidden space-y-3">
                        {(payments || []).length === 0 ? (
                          <p className="py-8 text-center text-slate-400 text-xs">{t.noPaymentTransactionsRecorded || 'No transactions recorded yet.'}</p>
                        ) : (
                          (payments || []).map((p) => (
                            <div key={p.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-xs text-slate-900">{p.payment_reference}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status === 'COMPLETED'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : p.status === 'AWAITING_VERIFICATION'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                  {p.status}
                                </span>
                              </div>
                              <div className="text-xs text-slate-600 flex items-center justify-between">
                                <span>{t.method || 'Method'}: {p.payment_method}</span>
                                <span className="font-bold text-emerald-700">{p.amount?.toLocaleString()} {p.currency}</span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {t.date || 'Date'}: {p.created_at ? new Date(p.created_at).toLocaleDateString() : (t.today || 'Today')}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MESSAGES TAB (WhatsApp-inspired Unified Messages & Maintenance) */}
            {activeTab === 'messages' && (
              <TenantMessagesTab
                initialMaintenanceMode={messagesMaintenanceMode}
                activeTenancies={tenancies}
                onOpenMaintenanceDetails={(mId) => {
                  const match = maintenanceRequests.find((m) => m.id === mId);
                  if (match) setSelectedMaintenance(match);
                }}
                onRefreshData={loadTenantData}
              />
            )}

            {/* PROFILE & SETTINGS TAB */}
            {activeTab === 'profile' && (
              <TenantProfileSettingsTab
                activeTenancy={activeTenancy}
                activeLease={activeLease}
                onLogout={onLogout}
              />
            )}
          </div>

          {/* Footer */}
          <footer className="mt-8 pt-6 border-t border-slate-200/80 text-center text-xs text-slate-500 font-medium">
            © 2026 Notify Rental Property Management Kigali. All rights reserved.
          </footer>
        </main>
      )}

      {/* Financial Modals */}
      <InvoiceModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onPayNow={(inv) => {
          setSelectedInvoice(null);
          setPayingInvoice(inv);
        }}
      />

      <ReceiptModal
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />

      <PaymentModal
        invoice={payingInvoice}
        onClose={() => setPayingInvoice(null)}
        onPaymentSuccess={() => {
          loadTenantData();
        }}
      />

      {/* Phase 4 Maintenance Modal */}
      <MaintenanceModal
        isOpen={isMaintenanceModalOpen || isCreateMaintenanceOpen}
        onClose={() => {
          setIsMaintenanceModalOpen(false);
          setIsCreateMaintenanceOpen(false);
          setSelectedMaintenance(null);
        }}
        request={selectedMaintenance}
        isCreating={isCreateMaintenanceOpen}
        isLandlord={false}
        onCreate={handleCreateMaintenance}
        onConfirmResolution={handleConfirmResolution}
        onReopen={handleReopenMaintenance}
        onAddComment={handleAddMaintenanceComment}
      />

      {/* Phase 4 Complaint Modal */}
      <ComplaintModal
        isOpen={isComplaintModalOpen || isCreateComplaintOpen}
        onClose={() => {
          setIsComplaintModalOpen(false);
          setIsCreateComplaintOpen(false);
          setSelectedComplaint(null);
        }}
        complaint={selectedComplaint}
        isCreating={isCreateComplaintOpen}
        isLandlord={false}
        onCreate={handleCreateComplaint}
        onAddComment={handleAddComplaintComment}
      />

      {/* Phase 4 Notification Center Modal */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkNotificationRead}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onSelectEntity={handleSelectNotificationEntity}
      />

      {/* Official Signed Lease Document Viewer Modal */}
      {selectedLeaseDocForTenant && (
        <TenantLeaseDocumentModal
          lease={selectedLeaseDocForTenant}
          isOpen={!!selectedLeaseDocForTenant}
          onClose={() => setSelectedLeaseDocForTenant(null)}
          onUploadSignedCopy={handleUploadTenantLeaseDocument}
          onSignLease={handleSignTenantLease}
        />
      )}
    </div>
  );
};


