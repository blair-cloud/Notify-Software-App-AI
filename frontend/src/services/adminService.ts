import {
  MOCK_USERS,
  MOCK_PROPERTIES,
  MOCK_UNITS,
  MOCK_TENANTS,
  MOCK_TENANCIES,
  MOCK_LEASES,
  MOCK_INVOICES,
  MOCK_PAYMENTS,
  MOCK_RECEIPTS,
  MOCK_EXPENSES,
  MOCK_ADMIN_STATS,
  MOCK_ADMIN_USERS,
  MOCK_ADMIN_AUDIT_LOGS,
  MOCK_NOTIFICATIONS,
  MOCK_NOTIFICATION_PREFERENCES,
  MOCK_DELIVERY_LOGS,
  MOCK_MAINTENANCE_REQUESTS,
  MOCK_COMPLAINTS,
  MOCK_WORKERS,
} from '../utils/mockAuth';

export type AdminTabKey =
  | 'overview'
  | 'landlords'
  | 'tenants'
  | 'users_roles'
  | 'properties'
  | 'units'
  | 'leases'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'maintenance'
  | 'notifications'
  | 'documents'
  | 'compliance'
  | 'reports'
  | 'settings'
  | 'audit_logs';

export interface PlatformSettings {
  platform_name: string;
  currency: string;
  timezone?: string;
  default_language?: string;
  rent_due_day?: number;
  grace_period_days: number;
  late_fee_percentage?: number;
  late_fee_fixed?: number;
  invoice_prefix?: string;
  auto_generate_invoices_days_before?: number;
  auto_invoice_generation?: boolean;
  sms_notifications_enabled?: boolean;
  require_signed_lease?: boolean;
  maintenance_auto_assignment?: boolean;
  support_email?: string;
  support_phone?: string;
  tax_rate_percent?: number;
  reminder_intervals_days?: number[];
  email_gateway_enabled?: boolean;
  sms_gateway_enabled?: boolean;
  whatsapp_gateway_enabled?: boolean;
  max_upload_size_mb?: number;
  allowed_file_types?: string[];
  maintenance_mode?: boolean;
  require_signed_lease_for_activation?: boolean;
}

// In-memory platform settings with persistence to localStorage
const SETTINGS_STORAGE_KEY = 'notify_platform_settings';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platform_name: 'Notify Kigali Property Management',
  currency: 'RWF',
  timezone: 'Africa/Kigali (UTC+2)',
  default_language: 'en',
  rent_due_day: 5,
  grace_period_days: 5,
  late_fee_percentage: 5,
  late_fee_fixed: 15000,
  invoice_prefix: 'INV-2026-',
  auto_generate_invoices_days_before: 5,
  reminder_intervals_days: [30, 14, 7, 3, 1, 0],
  email_gateway_enabled: true,
  sms_gateway_enabled: true,
  whatsapp_gateway_enabled: false,
  max_upload_size_mb: 25,
  allowed_file_types: ['application/pdf', 'image/jpeg', 'image/png', 'application/docx'],
  maintenance_mode: false,
  require_signed_lease_for_activation: true,
};

export function getPlatformSettings(): PlatformSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_PLATFORM_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to parse saved settings', e);
  }
  return DEFAULT_PLATFORM_SETTINGS;
}

export function savePlatformSettings(newSettings: Partial<PlatformSettings>, actorEmail = 'blaircloudy@gmail.com'): PlatformSettings {
  const current = getPlatformSettings();
  const updated = { ...current, ...newSettings };
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  recordAuditLog('SETTINGS_UPDATED', 'SYSTEM', 'platform_settings', `Updated platform configurations: ${Object.keys(newSettings).join(', ')}`, actorEmail);
  return updated;
}

// Audit log recorder
export function recordAuditLog(
  action: string,
  entity_type: string,
  entity_id: string,
  details: string,
  actor_email = 'blaircloudy@gmail.com',
  actor_role = 'SYSTEM_ADMIN'
) {
  const newLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    action,
    user_email: actor_email,
    performed_by_id: actor_email,
    actor_role,
    entity_type,
    entity_id,
    details,
    timestamp: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ip_address: '197.243.22.84 (Kigali, RW)',
  };
  MOCK_ADMIN_AUDIT_LOGS.unshift(newLog);
  return newLog;
}

// Global Search Interface
export interface SearchResultItem {
  id: string;
  category: 'Landlord' | 'Tenant' | 'User' | 'Property' | 'Unit' | 'Lease' | 'Invoice' | 'Payment' | 'Document' | 'Maintenance';
  title: string;
  subtitle: string;
  status?: string;
  targetTab: string;
  entityData: any;
}

export const adminService = {
  // Global platform metrics
  getPlatformMetrics() {
    const total_properties = MOCK_PROPERTIES.length;
    const total_units = MOCK_UNITS.length;
    const occupied_units = MOCK_UNITS.filter((u) => u.status === 'OCCUPIED').length;
    const vacant_units = MOCK_UNITS.filter((u) => u.status === 'VACANT').length;
    const maintenance_units = MOCK_UNITS.filter((u) => u.status === 'MAINTENANCE').length;
    const occupancy_rate = total_units > 0 ? Math.round((occupied_units / total_units) * 1000) / 10 : 0;

    const total_users = MOCK_ADMIN_USERS.length;
    const landlords_count = MOCK_ADMIN_USERS.filter((u) => u.role === 'LANDLORD').length;
    const tenants_count = MOCK_ADMIN_USERS.filter((u) => u.role === 'TENANT').length;
    const active_users = MOCK_ADMIN_USERS.filter((u) => u.status === 'ACTIVE').length;
    const suspended_users = MOCK_ADMIN_USERS.filter((u) => u.status === 'SUSPENDED' || !u.status).length;

    const expected_rent = MOCK_INVOICES.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const collected_rent = MOCK_INVOICES.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
    const outstanding_rent = MOCK_INVOICES.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
    const overdue_rent = MOCK_INVOICES.filter((inv) => inv.status === 'OVERDUE').reduce(
      (sum, inv) => sum + (inv.balance_due || 0),
      0
    );
    const total_expenses = MOCK_EXPENSES.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const net_income = collected_rent - total_expenses;
    const collection_rate = expected_rent > 0 ? Math.round((collected_rent / expected_rent) * 1000) / 10 : 0;

    const active_leases = MOCK_LEASES.filter((l) => l.status === 'ACTIVE').length;
    const expiring_leases = MOCK_LEASES.filter((l) => l.status === 'EXPIRING_SOON').length;
    const expired_leases = MOCK_LEASES.filter((l) => l.status === 'EXPIRED').length;
    const draft_leases = MOCK_LEASES.filter((l) => l.status === 'DRAFT').length;

    const pending_payments = MOCK_PAYMENTS.filter((p) => p.status === 'AWAITING_VERIFICATION' || p.status === 'PENDING').length;
    const open_maintenance = MOCK_MAINTENANCE_REQUESTS.filter((m) => m.status !== 'CLOSED' && m.status !== 'RESOLVED').length;

    // Document compliance calculations
    let missing_docs_count = 0;
    let expired_docs_count = 0;
    let expiring_docs_count = 0;
    let total_required_docs = MOCK_LEASES.length;

    MOCK_LEASES.forEach((l) => {
      if (!l.has_signed_document || l.compliance_status === 'INCOMPLETE') {
        missing_docs_count++;
      }
      if (l.status === 'EXPIRED') {
        expired_docs_count++;
      }
      if (l.status === 'EXPIRING_SOON') {
        expiring_docs_count++;
      }
    });

    const compliant_leases = MOCK_LEASES.filter((l) => l.has_signed_document && l.compliance_status === 'COMPLETE').length;
    const compliance_rate = total_required_docs > 0 ? Math.round((compliant_leases / total_required_docs) * 1000) / 10 : 100;

    return {
      // Users
      total_users,
      landlords_count,
      tenants_count,
      active_users,
      suspended_users,
      // Properties
      total_properties,
      total_units,
      occupied_units,
      vacant_units,
      maintenance_units,
      occupancy_rate,
      // Financials
      expected_rent,
      collected_rent,
      outstanding_rent,
      overdue_rent,
      total_expenses,
      net_income,
      collection_rate,
      currency: 'RWF',
      // Leasing
      total_leases: MOCK_LEASES.length,
      active_leases,
      expiring_leases,
      expired_leases,
      draft_leases,
      // Operations
      pending_payments,
      open_maintenance,
      // Compliance
      missing_docs_count,
      expired_docs_count,
      expiring_docs_count,
      compliance_rate,
      total_required_docs,
    };
  },

  // GLOBAL SEARCH
  searchEverything(query: string): SearchResultItem[] {
    if (!query || query.trim().length === 0) return [];
    const q = query.toLowerCase().trim();
    const results: SearchResultItem[] = [];

    // Search Landlords
    MOCK_ADMIN_USERS.filter((u) => u.role === 'LANDLORD').forEach((landlord) => {
      const match =
        landlord.first_name?.toLowerCase().includes(q) ||
        landlord.last_name?.toLowerCase().includes(q) ||
        landlord.email?.toLowerCase().includes(q) ||
        landlord.phone?.toLowerCase().includes(q) ||
        landlord.business_name?.toLowerCase().includes(q);
      if (match) {
        results.push({
          id: landlord.id,
          category: 'Landlord',
          title: `${landlord.first_name} ${landlord.last_name} ${landlord.business_name ? `(${landlord.business_name})` : ''}`,
          subtitle: `Landlord • ${landlord.email} • ${landlord.phone || 'No phone'}`,
          status: landlord.status,
          targetTab: 'landlords',
          entityData: landlord,
        });
      }
    });

    // Search Tenants
    MOCK_TENANTS.forEach((tenant) => {
      const match =
        tenant.first_name?.toLowerCase().includes(q) ||
        tenant.last_name?.toLowerCase().includes(q) ||
        tenant.email?.toLowerCase().includes(q) ||
        tenant.phone?.toLowerCase().includes(q) ||
        tenant.property_name?.toLowerCase().includes(q) ||
        tenant.unit_number?.toLowerCase().includes(q) ||
        tenant.national_id?.toLowerCase().includes(q);
      if (match) {
        results.push({
          id: tenant.id,
          category: 'Tenant',
          title: `${tenant.first_name} ${tenant.last_name}`,
          subtitle: `Tenant • ${tenant.property_name || 'Unassigned'} Unit ${tenant.unit_number || 'N/A'} • ${tenant.email}`,
          status: tenant.lease_status || tenant.status,
          targetTab: 'tenants',
          entityData: tenant,
        });
      }
    });

    // Search Properties
    MOCK_PROPERTIES.forEach((prop) => {
      const match =
        prop.name?.toLowerCase().includes(q) ||
        prop.address?.toLowerCase().includes(q) ||
        prop.district?.toLowerCase().includes(q) ||
        prop.sector?.toLowerCase().includes(q) ||
        prop.property_type?.toLowerCase().includes(q);
      if (match) {
        results.push({
          id: prop.id,
          category: 'Property',
          title: prop.name,
          subtitle: `${prop.property_type || 'Property'} • ${prop.district || ''}, ${prop.address || ''} • ${prop.total_units || 0} units`,
          status: prop.status,
          targetTab: 'properties',
          entityData: prop,
        });
      }
    });

    // Search Units
    MOCK_UNITS.forEach((unit) => {
      const match =
        unit.unit_number?.toLowerCase().includes(q) ||
        unit.unit_type?.toLowerCase().includes(q) ||
        unit.current_tenant_name?.toLowerCase().includes(q);
      if (match) {
        const parentProp = MOCK_PROPERTIES.find((p) => p.id === unit.property_id);
        results.push({
          id: unit.id,
          category: 'Unit',
          title: `Unit ${unit.unit_number} (${parentProp?.name || 'Property'})`,
          subtitle: `${unit.unit_type || 'Unit'} • Rent: RWF ${unit.monthly_rent?.toLocaleString()} • Tenant: ${unit.current_tenant_name || 'Vacant'}`,
          status: unit.status,
          targetTab: 'units',
          entityData: unit,
        });
      }
    });

    // Search Leases
    MOCK_LEASES.forEach((lease) => {
      const match =
        lease.tenant_name?.toLowerCase().includes(q) ||
        lease.property_name?.toLowerCase().includes(q) ||
        lease.unit_number?.toLowerCase().includes(q) ||
        lease.notes?.toLowerCase().includes(q) ||
        lease.id?.toLowerCase().includes(q);
      if (match) {
        results.push({
          id: lease.id,
          category: 'Lease',
          title: `Lease: ${lease.tenant_name} (${lease.unit_number})`,
          subtitle: `${lease.property_name} • ${lease.start_date} to ${lease.end_date} • RWF ${lease.monthly_rent?.toLocaleString()}/mo`,
          status: lease.status,
          targetTab: 'leases',
          entityData: lease,
        });
      }
    });

    // Search Invoices
    MOCK_INVOICES.forEach((inv) => {
      const match =
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.tenant_name?.toLowerCase().includes(q) ||
        inv.property_name?.toLowerCase().includes(q) ||
        inv.unit_number?.toLowerCase().includes(q);
      if (match) {
        results.push({
          id: inv.id,
          category: 'Invoice',
          title: `${inv.invoice_number} (${inv.tenant_name})`,
          subtitle: `${inv.property_name} Unit ${inv.unit_number} • Total: RWF ${inv.total_amount?.toLocaleString()} • Bal: RWF ${inv.balance_due?.toLocaleString()}`,
          status: inv.status,
          targetTab: 'invoices',
          entityData: inv,
        });
      }
    });

    // Search Payments
    MOCK_PAYMENTS.forEach((pay) => {
      const match =
        pay.payment_reference?.toLowerCase().includes(q) ||
        pay.transaction_reference?.toLowerCase().includes(q) ||
        pay.tenant_name?.toLowerCase().includes(q) ||
        pay.invoice_number?.toLowerCase().includes(q) ||
        pay.notes?.toLowerCase().includes(q);
      if (match) {
        results.push({
          id: pay.id,
          category: 'Payment',
          title: `${pay.payment_reference} (${pay.tenant_name})`,
          subtitle: `Ref: ${pay.transaction_reference || 'N/A'} • Amount: RWF ${pay.amount?.toLocaleString()} • Method: ${pay.payment_method}`,
          status: pay.status,
          targetTab: 'payments_verification',
          entityData: pay,
        });
      }
    });

    // Search Maintenance
    MOCK_MAINTENANCE_REQUESTS.forEach((mr) => {
      const match =
        mr.request_number?.toLowerCase().includes(q) ||
        mr.title?.toLowerCase().includes(q) ||
        mr.description?.toLowerCase().includes(q) ||
        mr.tenant_name?.toLowerCase().includes(q) ||
        mr.assigned_to?.toLowerCase().includes(q);
      if (match) {
        results.push({
          id: mr.id,
          category: 'Maintenance',
          title: `${mr.request_number}: ${mr.title}`,
          subtitle: `${mr.category} • Unit ${mr.unit_number} • Priority: ${mr.priority} • Assigned: ${mr.assigned_to || 'Unassigned'}`,
          status: mr.status,
          targetTab: 'maintenance',
          entityData: mr,
        });
      }
    });

    // Search Documents
    MOCK_LEASES.filter((l) => l.agreement_document).forEach((l) => {
      const doc = l.agreement_document;
      const match =
        doc.document_name?.toLowerCase().includes(q) ||
        doc.file_name?.toLowerCase().includes(q) ||
        l.tenant_name?.toLowerCase().includes(q) ||
        l.property_name?.toLowerCase().includes(q);
      if (match) {
        results.push({
          id: doc.id || l.id,
          category: 'Document',
          title: doc.document_name || doc.file_name,
          subtitle: `Lease Agreement • ${l.property_name} Unit ${l.unit_number} • ${l.tenant_name}`,
          status: doc.status,
          targetTab: 'documents',
          entityData: { ...doc, lease: l },
        });
      }
    });

    return results;
  },

  // USERS & ROLES
  getAllUsers() {
    return [...MOCK_ADMIN_USERS];
  },

  createUser(userData: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    role: 'SYSTEM_ADMIN' | 'LANDLORD' | 'TENANT';
    business_name?: string;
  }) {
    const newUser = {
      id: `usr-${Date.now()}`,
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email,
      phone: userData.phone,
      role: userData.role,
      status: 'ACTIVE',
      is_active: true,
      business_name: userData.business_name || (userData.role === 'LANDLORD' ? `${userData.last_name} Properties Ltd` : undefined),
      created_at: new Date().toISOString(),
    };
    MOCK_ADMIN_USERS.unshift(newUser);

    // If landlord, initialize landlord profile
    if (userData.role === 'LANDLORD') {
      // also ensure can login
      (MOCK_USERS as any)[`LANDLORD_${newUser.id}`] = {
        id: newUser.id,
        email: newUser.email,
        phone: newUser.phone,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        role: 'LANDLORD',
        status: 'ACTIVE',
        landlord_profile: {
          id: `lp-${newUser.id}`,
          business_name: newUser.business_name || `${newUser.last_name} Properties Ltd`,
          city: 'Kigali',
        },
      };
    } else if (userData.role === 'TENANT') {
      const newTenant = {
        id: newUser.id,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        email: newUser.email,
        phone: newUser.phone,
        status: 'ACTIVE',
        lease_status: 'DRAFT',
        property_id: '',
        property_name: 'Unassigned',
        unit_id: '',
        unit_number: 'Unassigned',
        history: [],
      };
      MOCK_TENANTS.unshift(newTenant);
    }

    recordAuditLog('USER_CREATED', 'USER', newUser.id, `Created new ${userData.role}: ${userData.email}`);
    return newUser;
  },

  updateUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED') {
    const user = MOCK_ADMIN_USERS.find((u) => u.id === userId) as any;
    if (user) {
      user.status = status;
      user.is_active = status === 'ACTIVE';
      recordAuditLog(
        status === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_SUSPENDED',
        'USER',
        userId,
        `Set user status to ${status} for ${user.email}`
      );
    }
    return user;
  },

  deleteProperty(propId: string) {
    const index = MOCK_PROPERTIES.findIndex((p) => p.id === propId);
    if (index !== -1) {
      const removed = MOCK_PROPERTIES.splice(index, 1)[0];
      recordAuditLog('PROPERTY_DELETED', 'PROPERTY', propId, `Deleted property: ${removed.name}`);
      return true;
    }
    return false;
  },

  deleteUnit(unitId: string) {
    const index = MOCK_UNITS.findIndex((u) => u.id === unitId);
    if (index !== -1) {
      const removed = MOCK_UNITS.splice(index, 1)[0];
      recordAuditLog('UNIT_DELETED', 'UNIT', unitId, `Deleted unit: ${removed.unit_number}`);
      return true;
    }
    return false;
  },

  recordPayment(paymentData: any) {
    const inv = MOCK_INVOICES.find((i) => i.id === paymentData.invoice_id);
    const newPay = {
      id: `pay-${Date.now()}`,
      payment_reference: paymentData.transaction_reference || `PAY-${Date.now().toString().slice(-6)}`,
      transaction_reference: paymentData.transaction_reference || `TX-MOMO-${Date.now().toString().slice(-4)}`,
      invoice_id: paymentData.invoice_id,
      invoice_number: inv?.invoice_number || 'INV-DIRECT',
      tenant_id: inv?.tenant_id || 'usr-003',
      tenant_name: inv?.tenant_name || 'Tenant',
      property_id: inv?.property_id || '',
      property_name: inv?.property_name || '',
      unit_id: inv?.unit_id || '',
      unit_number: inv?.unit_number || '',
      landlord_id: inv?.landlord_id || '',
      amount: Number(paymentData.amount),
      currency: 'RWF',
      payment_method: paymentData.payment_method || 'MOMO',
      payment_date: new Date().toISOString().split('T')[0],
      status: 'VERIFIED',
      verification_status: 'VERIFIED',
      verified_at: new Date().toISOString(),
      verified_by: 'Platform Administrator',
    };
    MOCK_PAYMENTS.unshift(newPay);

    if (inv) {
      inv.amount_paid = (inv.amount_paid || 0) + Number(paymentData.amount);
      inv.balance_due = Math.max(0, (inv.total_amount || 0) - inv.amount_paid);
      inv.status = inv.balance_due === 0 ? 'PAID' : 'PARTIALLY_PAID';
    }

    recordAuditLog('PAYMENT_RECONCILED', 'PAYMENT', newPay.id, `Recorded direct payment of RWF ${newPay.amount.toLocaleString()} for ${newPay.tenant_name}`);
    return newPay;
  },

  createMaintenanceRequest(data: any) {
    const prop = MOCK_PROPERTIES.find((p) => p.id === data.property_id);
    const newReq = {
      id: `req-${Date.now().toString().slice(-6)}`,
      request_number: `MR-2026-${Date.now().toString().slice(-4)}`,
      property_id: data.property_id,
      property_name: prop?.name || 'Property',
      unit_id: data.unit_id || 'unit-001',
      unit_number: '101',
      tenant_name: 'Resident',
      title: data.title,
      description: data.description,
      priority: data.priority || 'MEDIUM',
      category: data.category || 'PLUMBING',
      status: 'REPORTED',
      created_at: new Date().toISOString(),
    };
    MOCK_MAINTENANCE_REQUESTS.unshift(newReq);
    recordAuditLog('MAINTENANCE_CREATED', 'MAINTENANCE', newReq.id, `Created work order: ${newReq.title}`);
    return newReq;
  },

  updateMaintenanceStatus(reqId: string, status: string) {
    const mr = MOCK_MAINTENANCE_REQUESTS.find((m) => m.id === reqId);
    if (mr) {
      mr.status = status;
      recordAuditLog('MAINTENANCE_STATUS_UPDATED', 'MAINTENANCE', reqId, `Set status to ${status}`);
    }
    return mr;
  },

  sendBroadcastNotification(data: { title: string; message: string; target_audience: string }) {
    return this.broadcastNotification({
      title: data.title,
      message: data.message,
      target_role: data.target_audience as any,
      category: 'SYSTEM',
      priority: 'MEDIUM',
      channel: 'IN_APP',
    });
  },

  uploadDocument(docData: any) {
    const newDoc = {
      id: `doc-${Date.now()}`,
      document_name: docData.document_name,
      file_name: `${docData.document_name.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      category: docData.category || 'LEASE_AGREEMENT',
      entity_type: docData.entity_type || 'PROPERTY',
      entity_id: docData.entity_id || '',
      entity_name: docData.entity_name || 'Notify Complex',
      file_url: docData.file_url || '/documents/sample.pdf',
      version: 1,
      uploaded_at: new Date().toISOString(),
      status: 'VERIFIED',
    };
    if (!(window as any).__NOTIFY_DOCS) {
      (window as any).__NOTIFY_DOCS = [];
    }
    (window as any).__NOTIFY_DOCS.unshift(newDoc);
    recordAuditLog('DOCUMENT_UPLOADED', 'DOCUMENT', newDoc.id, `Uploaded ${newDoc.document_name}`);
    return newDoc;
  },

  getDocuments() {
    const initialDocs = [
      {
        id: 'doc-001',
        document_name: 'Countersigned Standard Tenancy Agreement 2026',
        file_name: 'Lease_Agreement_Aline_Uwase.pdf',
        category: 'LEASE_AGREEMENT',
        entity_type: 'LEASE',
        entity_id: 'lease-001',
        entity_name: 'Aline Uwase (Unit 101)',
        version: 1,
        uploaded_at: '2026-08-10',
        status: 'VERIFIED',
      },
      {
        id: 'doc-002',
        document_name: 'Kigali City Title Deed Certificate',
        file_name: 'Title_Deed_Notify_Heights.pdf',
        category: 'TITLE_DEED',
        entity_type: 'PROPERTY',
        entity_id: 'prop-001',
        entity_name: 'Notify Heights Kigali',
        version: 1,
        uploaded_at: '2026-08-01',
        status: 'VERIFIED',
      },
      {
        id: 'doc-003',
        document_name: 'RRA Annual Property Tax Clearance 2025-2026',
        file_name: 'Tax_Clearance_RRA_2026.pdf',
        category: 'TAX_CLEARANCE',
        entity_type: 'PROPERTY',
        entity_id: 'prop-001',
        entity_name: 'Notify Heights Kigali',
        version: 1,
        uploaded_at: '2026-07-28',
        status: 'VERIFIED',
      },
    ];
    return [...((window as any).__NOTIFY_DOCS || []), ...initialDocs];
  },

  getSettings() {
    return getPlatformSettings();
  },

  updateSettings(settingsData: Partial<PlatformSettings>) {
    return savePlatformSettings(settingsData);
  },

  // Direct getters aliases
  getLandlords() {
    return this.getAllLandlords();
  },

  getTenants() {
    return this.getAllTenants();
  },

  getUsers() {
    return this.getAllUsers();
  },

  getProperties() {
    return this.getAllProperties();
  },

  getUnits() {
    return this.getAllUnits();
  },

  getLeases() {
    return this.getAllLeases();
  },

  getInvoices() {
    return this.getAllInvoices();
  },

  getPayments() {
    return this.getAllPayments();
  },

  getExpenses() {
    return this.getAllExpenses();
  },

  getMaintenanceRequests() {
    return this.getAllMaintenance();
  },

  getNotifications() {
    return this.getAllNotifications();
  },

  updateUserRole(userId: string, newRole: 'SYSTEM_ADMIN' | 'LANDLORD' | 'TENANT') {
    const user = MOCK_ADMIN_USERS.find((u) => u.id === userId);
    if (user) {
      const oldRole = user.role;
      user.role = newRole;
      recordAuditLog('USER_ROLE_CHANGED', 'USER', userId, `Changed role from ${oldRole} to ${newRole} for ${user.email}`);
    }
    return user;
  },

  // LANDLORDS
  getAllLandlords() {
    return MOCK_ADMIN_USERS.filter((u) => u.role === 'LANDLORD').map((l) => {
      const properties = MOCK_PROPERTIES.filter((p) => p.landlord_id === l.id || p.landlord_id === 'mock-lp-001');
      const propIds = properties.map((p) => p.id);
      const units = MOCK_UNITS.filter((u) => propIds.includes(u.property_id));
      const leases = MOCK_LEASES.filter((ls) => propIds.includes(ls.property_id));
      const activeLeases = leases.filter((ls) => ls.status === 'ACTIVE' || ls.status === 'EXPIRING_SOON');
      const totalExpected = units.reduce((sum, u) => sum + (u.monthly_rent || 0), 0);
      const invoices = MOCK_INVOICES.filter((inv) => propIds.includes(inv.property_id));
      const outstanding = invoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
      const collected = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);

      return {
        ...l,
        properties_count: properties.length,
        units_count: units.length,
        occupied_units: units.filter((u) => u.status === 'OCCUPIED').length,
        vacant_units: units.filter((u) => u.status === 'VACANT').length,
        active_leases_count: activeLeases.length,
        expected_monthly_rent: totalExpected,
        collected_rent: collected,
        outstanding_rent: outstanding,
        properties_list: properties,
      };
    });
  },

  // TENANTS
  getAllTenants() {
    return MOCK_TENANTS.map((t) => {
      const currentLease = MOCK_LEASES.find((l) => l.tenant_id === t.id || l.tenant_name === `${t.first_name} ${t.last_name}`);
      const invoices = MOCK_INVOICES.filter((inv) => inv.tenant_id === t.id);
      const balance = invoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
      const parentProperty = MOCK_PROPERTIES.find((p) => p.id === t.property_id);
      const landlord = parentProperty ? MOCK_ADMIN_USERS.find((u) => u.id === parentProperty.landlord_id) : null;

      return {
        ...t,
        lease: currentLease,
        outstanding_balance: balance,
        landlord_name: landlord ? `${landlord.first_name} ${landlord.last_name}` : 'Notify Properties Ltd',
        invoices,
      };
    });
  },

  // PROPERTIES
  getAllProperties() {
    return MOCK_PROPERTIES.map((p) => {
      const units = MOCK_UNITS.filter((u) => u.property_id === p.id);
      const occupied = units.filter((u) => u.status === 'OCCUPIED').length;
      const vacant = units.filter((u) => u.status === 'VACANT').length;
      const maintenance = units.filter((u) => u.status === 'MAINTENANCE').length;
      const totalRent = units.reduce((acc, u) => acc + (u.monthly_rent || 0), 0);
      const invoices = MOCK_INVOICES.filter((inv) => inv.property_id === p.id);
      const collected = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
      const outstanding = invoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
      const landlord = MOCK_ADMIN_USERS.find((u) => u.id === p.landlord_id) || {
        first_name: 'Notify',
        last_name: 'Properties Ltd',
        email: 'landlord@notify.test',
      };

      return {
        ...p,
        total_units: units.length,
        occupied_units: occupied,
        vacant_units: vacant,
        maintenance_units: maintenance,
        occupancy_rate: units.length > 0 ? Math.round((occupied / units.length) * 100) : 0,
        expected_monthly_rent: totalRent,
        collected_rent: collected,
        outstanding_rent: outstanding,
        landlord_name: `${landlord.first_name} ${landlord.last_name}`,
        landlord_email: landlord.email,
        units_list: units,
      };
    });
  },

  createProperty(data: any) {
    const newProp = {
      id: `prop-${Date.now()}`,
      name: data.name,
      property_type: data.property_type || 'COMMERCIAL',
      description: data.description || '',
      address: data.address,
      district: data.district || 'Gasabo',
      sector: data.sector || 'Kigali',
      status: 'ACTIVE',
      landlord_id: data.landlord_id || 'usr-002',
      total_units: 0,
      occupied_units: 0,
      vacant_units: 0,
      expected_monthly_rent: 0,
    };
    MOCK_PROPERTIES.unshift(newProp);
    recordAuditLog('PROPERTY_CREATED', 'PROPERTY', newProp.id, `Created property: ${newProp.name} in ${newProp.district}`);
    return newProp;
  },

  updateProperty(propId: string, data: any) {
    const index = MOCK_PROPERTIES.findIndex((p) => p.id === propId);
    if (index !== -1) {
      MOCK_PROPERTIES[index] = { ...MOCK_PROPERTIES[index], ...data };
      recordAuditLog('PROPERTY_UPDATED', 'PROPERTY', propId, `Updated property details for ${MOCK_PROPERTIES[index].name}`);
      return MOCK_PROPERTIES[index];
    }
    return null;
  },

  reassignLandlord(propertyId: string, newLandlordId: string) {
    const prop = MOCK_PROPERTIES.find((p) => p.id === propertyId);
    const landlord = MOCK_ADMIN_USERS.find((u) => u.id === newLandlordId);
    if (prop && landlord) {
      const oldLandlord = prop.landlord_id;
      prop.landlord_id = newLandlordId;
      recordAuditLog('PROPERTY_REASSIGNED', 'PROPERTY', propertyId, `Reassigned property ${prop.name} from ${oldLandlord} to ${landlord.email}`);
    }
    return prop;
  },

  // UNITS
  getAllUnits() {
    return MOCK_UNITS.map((u) => {
      const parentProperty = MOCK_PROPERTIES.find((p) => p.id === u.property_id);
      const landlord = parentProperty ? MOCK_ADMIN_USERS.find((usr) => usr.id === parentProperty.landlord_id) : null;
      const currentLease = MOCK_LEASES.find((l) => l.unit_id === u.id && (l.status === 'ACTIVE' || l.status === 'EXPIRING_SOON'));

      return {
        ...u,
        property_name: parentProperty?.name || 'Unassigned Property',
        property_address: parentProperty?.address || '',
        landlord_name: landlord ? `${landlord.first_name} ${landlord.last_name}` : 'Notify Properties Ltd',
        lease: currentLease,
      };
    });
  },

  createUnit(data: any) {
    const newUnit = {
      id: `unit-${Date.now()}`,
      property_id: data.property_id,
      unit_number: data.unit_number,
      floor: Number(data.floor || 1),
      unit_type: data.unit_type || 'Standard Unit',
      monthly_rent: Number(data.monthly_rent || 250000),
      currency: data.currency || 'RWF',
      status: data.status || 'VACANT',
      description: data.description || '',
    };
    MOCK_UNITS.unshift(newUnit);

    // Update parent property unit counters
    const parentProp = MOCK_PROPERTIES.find((p) => p.id === data.property_id);
    if (parentProp) {
      parentProp.total_units = (parentProp.total_units || 0) + 1;
      if (newUnit.status === 'VACANT') {
        parentProp.vacant_units = (parentProp.vacant_units || 0) + 1;
      }
    }

    recordAuditLog('UNIT_CREATED', 'UNIT', newUnit.id, `Created Unit ${newUnit.unit_number} for property ${parentProp?.name || data.property_id}`);
    return newUnit;
  },

  updateUnit(unitId: string, data: any) {
    const index = MOCK_UNITS.findIndex((u) => u.id === unitId);
    if (index !== -1) {
      MOCK_UNITS[index] = { ...MOCK_UNITS[index], ...data };
      recordAuditLog('UNIT_UPDATED', 'UNIT', unitId, `Updated Unit ${MOCK_UNITS[index].unit_number}`);
      return MOCK_UNITS[index];
    }
    return null;
  },

  assignTenantToUnit(unitId: string, tenantId: string, rentAmount?: number) {
    const unit = MOCK_UNITS.find((u) => u.id === unitId);
    const tenant = MOCK_TENANTS.find((t) => t.id === tenantId);
    const prop = unit ? MOCK_PROPERTIES.find((p) => p.id === unit.property_id) : null;

    if (unit && tenant) {
      unit.status = 'OCCUPIED';
      unit.current_tenant_id = tenant.id;
      unit.current_tenant_name = `${tenant.first_name} ${tenant.last_name}`;
      if (rentAmount) unit.monthly_rent = rentAmount;

      tenant.property_id = unit.property_id;
      tenant.property_name = prop?.name || 'Notify Property';
      tenant.unit_id = unit.id;
      tenant.unit_number = unit.unit_number;
      tenant.status = 'ACTIVE';
      tenant.lease_status = 'ACTIVE';

      recordAuditLog('TENANT_ASSIGNED_UNIT', 'UNIT', unitId, `Assigned tenant ${tenant.first_name} ${tenant.last_name} to Unit ${unit.unit_number}`);
    }
    return { unit, tenant };
  },

  // LEASES
  getAllLeases() {
    return [...MOCK_LEASES];
  },

  createLease(leaseData: any) {
    const newLease = {
      id: `lease-${Date.now()}`,
      tenancy_id: `tenancy-${Date.now()}`,
      tenant_id: leaseData.tenant_id,
      tenant_name: leaseData.tenant_name,
      property_id: leaseData.property_id,
      property_name: leaseData.property_name,
      unit_id: leaseData.unit_id,
      unit_number: leaseData.unit_number,
      start_date: leaseData.start_date,
      end_date: leaseData.end_date,
      monthly_rent: Number(leaseData.monthly_rent),
      security_deposit: Number(leaseData.security_deposit || leaseData.monthly_rent),
      payment_due_day: Number(leaseData.payment_due_day || 5),
      late_fee: Number(leaseData.late_fee || 15000),
      currency: leaseData.currency || 'RWF',
      status: leaseData.status || 'ACTIVE',
      notes: leaseData.notes || '',
      has_signed_document: Boolean(leaseData.agreement_document),
      compliance_status: leaseData.agreement_document ? 'COMPLETE' : 'INCOMPLETE',
      agreement_document: leaseData.agreement_document || null,
      document_history: leaseData.agreement_document ? [leaseData.agreement_document] : [],
    };
    MOCK_LEASES.unshift(newLease);

    // Update unit status to occupied
    const unit = MOCK_UNITS.find((u) => u.id === leaseData.unit_id);
    if (unit) {
      unit.status = 'OCCUPIED';
      unit.current_tenant_name = leaseData.tenant_name;
      unit.lease_status = newLease.status;
      unit.lease_end_date = newLease.end_date;
    }

    recordAuditLog('LEASE_CREATED', 'LEASE', newLease.id, `Created lease for ${newLease.tenant_name} (${newLease.unit_number})`);
    return newLease;
  },

  updateLeaseStatus(leaseId: string, status: string, notes?: string) {
    const lease = MOCK_LEASES.find((l) => l.id === leaseId);
    if (lease) {
      const oldStatus = lease.status;
      lease.status = status;
      if (notes) lease.notes = notes;
      recordAuditLog('LEASE_STATUS_CHANGED', 'LEASE', leaseId, `Changed lease status from ${oldStatus} to ${status}`);
    }
    return lease;
  },

  terminateLease(leaseId: string, notes = 'Terminated by administrator') {
    const lease = MOCK_LEASES.find((l) => l.id === leaseId);
    if (lease) {
      lease.status = 'TERMINATED';
      lease.notes = notes;
      const unit = MOCK_UNITS.find((u) => u.id === lease.unit_id);
      if (unit) {
        unit.status = 'VACANT';
        unit.current_tenant_id = undefined;
        unit.current_tenant_name = undefined;
        unit.lease_status = 'TERMINATED';
      }
      recordAuditLog('LEASE_TERMINATED', 'LEASE', leaseId, `Terminated lease for ${lease.tenant_name} (${lease.unit_number})`);
    }
    return lease;
  },

  uploadLeaseAgreement(leaseId: string, documentInfo: any) {
    const lease = MOCK_LEASES.find((l) => l.id === leaseId);
    if (lease) {
      const versionNum = (lease.document_history?.length || 0) + 1;
      const docEntry = {
        id: `doc-${Date.now()}`,
        version: versionNum,
        document_name: documentInfo.document_name || `${lease.tenant_name} Lease Agreement v${versionNum}.pdf`,
        file_name: documentInfo.file_name || 'Lease_Agreement_Signed.pdf',
        file_type: documentInfo.file_type || 'application/pdf',
        file_size: documentInfo.file_size || 2500000,
        storage_path: `leases/${lease.id}/agreement/v${versionNum}/${documentInfo.file_name || 'signed.pdf'}`,
        uploaded_by: 'Platform Administrator',
        uploaded_by_role: 'SYSTEM_ADMIN',
        uploaded_at: new Date().toISOString(),
        version_notes: documentInfo.version_notes || 'Uploaded via Platform Administration Center',
        status: 'ACTIVE',
        is_verified: true,
      };

      lease.has_signed_document = true;
      lease.compliance_status = 'COMPLETE';
      lease.agreement_document = docEntry;
      if (!lease.document_history) lease.document_history = [];
      lease.document_history.unshift(docEntry);

      recordAuditLog('LEASE_DOCUMENT_UPLOADED', 'LEASE', leaseId, `Uploaded signed agreement v${versionNum} for ${lease.tenant_name}`);
      return docEntry;
    }
    return null;
  },

  // INVOICES
  getAllInvoices() {
    return [...MOCK_INVOICES];
  },

  createInvoice(invData: any) {
    const settings = getPlatformSettings();
    const invCount = MOCK_INVOICES.length + 1;
    const invNumber = `${settings.invoice_prefix}${String(invCount).padStart(6, '0')}`;

    const newInv = {
      id: `inv-${Date.now()}`,
      invoice_number: invNumber,
      landlord_id: invData.landlord_id || 'mock-lp-001',
      tenant_id: invData.tenant_id,
      tenant_name: invData.tenant_name,
      property_id: invData.property_id,
      property_name: invData.property_name,
      unit_id: invData.unit_id,
      unit_number: invData.unit_number,
      invoice_type: invData.invoice_type || 'RENT',
      issue_date: invData.issue_date || new Date().toISOString().split('T')[0],
      due_date: invData.due_date,
      subtotal: Number(invData.subtotal || invData.total_amount),
      discount: Number(invData.discount || 0),
      late_fee: Number(invData.late_fee || 0),
      total_amount: Number(invData.total_amount),
      amount_paid: 0,
      balance_due: Number(invData.total_amount),
      currency: invData.currency || 'RWF',
      status: 'ISSUED',
      created_at: new Date().toISOString(),
    };
    MOCK_INVOICES.unshift(newInv);
    recordAuditLog('INVOICE_CREATED', 'INVOICE', newInv.id, `Created invoice ${newInv.invoice_number} (RWF ${newInv.total_amount.toLocaleString()}) for ${newInv.tenant_name}`);
    return newInv;
  },

  cancelInvoice(invoiceId: string, reason: string) {
    const inv = MOCK_INVOICES.find((i) => i.id === invoiceId);
    if (inv) {
      inv.status = 'CANCELLED';
      inv.cancellation_reason = reason;
      recordAuditLog('INVOICE_CANCELLED', 'INVOICE', invoiceId, `Cancelled invoice ${inv.invoice_number}: ${reason}`);
    }
    return inv;
  },

  // PAYMENTS & VERIFICATION (FINANCIAL CORE)
  getAllPayments() {
    return [...MOCK_PAYMENTS];
  },

  verifyPayment(paymentId: string, notes?: string, verifiedBy = 'Platform Administrator') {
    const payment = MOCK_PAYMENTS.find((p) => p.id === paymentId);
    if (!payment) return null;

    // 1. Update payment record
    payment.status = 'COMPLETED';
    payment.verified_at = new Date().toISOString();
    payment.verified_by = verifiedBy;
    if (notes) payment.verification_notes = notes;

    // 2. Update linked invoice
    const invoice = MOCK_INVOICES.find((i) => i.id === payment.invoice_id);
    if (invoice) {
      invoice.amount_paid = (invoice.amount_paid || 0) + (payment.amount || 0);
      invoice.balance_due = Math.max(0, (invoice.total_amount || 0) - invoice.amount_paid);
      invoice.status = invoice.balance_due === 0 ? 'PAID' : invoice.amount_paid > 0 ? 'PARTIALLY_PAID' : invoice.status;
    }

    // 3. Generate official receipt
    const rctCount = MOCK_RECEIPTS.length + 1;
    const newReceipt = {
      id: `rct-${Date.now()}`,
      receipt_number: `RCT-2026-${String(rctCount).padStart(6, '0')}`,
      payment_id: payment.id,
      invoice_id: payment.invoice_id,
      tenant_id: payment.tenant_id,
      tenant_name: payment.tenant_name,
      landlord_id: payment.landlord_id,
      landlord_name: 'Notify Dev Properties Ltd',
      property_id: payment.property_id,
      property_name: payment.property_name,
      unit_id: payment.unit_id,
      unit_number: payment.unit_number,
      amount: payment.amount,
      currency: payment.currency || 'RWF',
      issued_at: new Date().toISOString(),
      payment_method: payment.payment_method,
    };
    MOCK_RECEIPTS.unshift(newReceipt);

    // 4. Send Confirmation Notification to Tenant
    const notif = {
      id: `notif-pay-${Date.now()}`,
      user_id: payment.tenant_id,
      type: 'PAYMENT_VERIFIED',
      title: 'Payment Verified & Confirmed',
      message: `Your payment of RWF ${payment.amount.toLocaleString()} for ${invoice?.invoice_number || 'rent'} has been verified by platform admin. Receipt #${newReceipt.receipt_number} is ready.`,
      channel: 'IN_APP',
      priority: 'MEDIUM',
      category: 'PAYMENT',
      status: 'SENT',
      is_read: false,
      reference_type: 'RECEIPT',
      reference_id: newReceipt.id,
      created_at: new Date().toISOString(),
    };
    MOCK_NOTIFICATIONS.unshift(notif);

    // 5. Record Audit Log
    recordAuditLog(
      'PAYMENT_VERIFIED',
      'PAYMENT',
      paymentId,
      `Verified payment ${payment.payment_reference} of RWF ${payment.amount.toLocaleString()} for Invoice ${invoice?.invoice_number || payment.invoice_id}`
    );

    return { payment, invoice, receipt: newReceipt };
  },

  rejectPayment(paymentId: string, rejectionReason: string, rejectedBy = 'Platform Administrator') {
    const payment = MOCK_PAYMENTS.find((p) => p.id === paymentId);
    if (!payment) return null;

    payment.status = 'REJECTED';
    payment.rejection_reason = rejectionReason;
    payment.rejected_at = new Date().toISOString();
    payment.rejected_by = rejectedBy;

    // Send Notification to Tenant
    const notif = {
      id: `notif-pay-rej-${Date.now()}`,
      user_id: payment.tenant_id,
      type: 'PAYMENT_REJECTED',
      title: 'Payment Proof Rejected',
      message: `Your payment reference ${payment.payment_reference} (RWF ${payment.amount.toLocaleString()}) could not be verified. Reason: ${rejectionReason}. Please resubmit valid proof.`,
      channel: 'IN_APP',
      priority: 'HIGH',
      category: 'PAYMENT',
      status: 'SENT',
      is_read: false,
      reference_type: 'PAYMENT',
      reference_id: payment.id,
      created_at: new Date().toISOString(),
    };
    MOCK_NOTIFICATIONS.unshift(notif);

    recordAuditLog('PAYMENT_REJECTED', 'PAYMENT', paymentId, `Rejected payment ${payment.payment_reference}. Reason: ${rejectionReason}`);
    return payment;
  },

  // EXPENSES
  getAllExpenses() {
    return [...MOCK_EXPENSES];
  },

  createExpense(expenseData: any) {
    const newExp = {
      id: `exp-${Date.now()}`,
      landlord_id: expenseData.landlord_id || 'mock-lp-001',
      property_id: expenseData.property_id,
      property_name: expenseData.property_name || 'Notify Heights',
      unit_id: expenseData.unit_id || null,
      unit_number: expenseData.unit_number || null,
      category: expenseData.category || 'MAINTENANCE',
      description: expenseData.description,
      amount: Number(expenseData.amount),
      currency: expenseData.currency || 'RWF',
      expense_date: expenseData.expense_date || new Date().toISOString().split('T')[0],
      vendor: expenseData.vendor || '',
      reference: expenseData.reference || `EXP-${Date.now().toString().slice(-4)}`,
      status: 'RECORDED',
      notes: expenseData.notes || '',
    };
    MOCK_EXPENSES.unshift(newExp);
    recordAuditLog('EXPENSE_RECORDED', 'EXPENSE', newExp.id, `Recorded expense: ${newExp.description} (RWF ${newExp.amount.toLocaleString()})`);
    return newExp;
  },

  updateExpense(expenseId: string, data: any) {
    const index = MOCK_EXPENSES.findIndex((e) => e.id === expenseId);
    if (index !== -1) {
      MOCK_EXPENSES[index] = { ...MOCK_EXPENSES[index], ...data };
      recordAuditLog('EXPENSE_UPDATED', 'EXPENSE', expenseId, `Updated expense: ${MOCK_EXPENSES[index].description}`);
      return MOCK_EXPENSES[index];
    }
    return null;
  },

  deleteExpense(expenseId: string) {
    const index = MOCK_EXPENSES.findIndex((e) => e.id === expenseId);
    if (index !== -1) {
      const removed = MOCK_EXPENSES.splice(index, 1)[0];
      recordAuditLog('EXPENSE_DELETED', 'EXPENSE', expenseId, `Deleted expense: ${removed.description}`);
      return true;
    }
    return false;
  },

  // MAINTENANCE
  getAllMaintenance() {
    return [...MOCK_MAINTENANCE_REQUESTS];
  },

  updateMaintenance(id: string, data: any) {
    const mr = MOCK_MAINTENANCE_REQUESTS.find((m) => m.id === id);
    if (mr) {
      Object.assign(mr, data);
      recordAuditLog('MAINTENANCE_UPDATED', 'MAINTENANCE', id, `Updated maintenance request ${mr.request_number} to status ${mr.status}`);
    }
    return mr;
  },

  convertMaintenanceToExpense(mrId: string, actualCost: number) {
    const mr = MOCK_MAINTENANCE_REQUESTS.find((m) => m.id === mrId);
    if (!mr) return null;

    mr.actual_cost = actualCost;
    const newExp = {
      id: `exp-${Date.now()}`,
      landlord_id: mr.landlord_id || 'mock-lp-001',
      property_id: mr.property_id,
      property_name: mr.property_name || 'Notify Complex',
      unit_id: mr.unit_id,
      unit_number: mr.unit_number,
      category: 'MAINTENANCE',
      description: `Maintenance repair (${mr.request_number}): ${mr.title}`,
      amount: actualCost,
      currency: mr.currency || 'RWF',
      expense_date: new Date().toISOString().split('T')[0],
      vendor: mr.assigned_to || 'Certified Technician',
      reference: mr.request_number,
      status: 'RECORDED',
    };
    MOCK_EXPENSES.unshift(newExp);
    recordAuditLog('MAINTENANCE_CONVERTED_TO_EXPENSE', 'EXPENSE', newExp.id, `Converted maintenance ${mr.request_number} to expense RWF ${actualCost.toLocaleString()}`);
    return newExp;
  },

  // NOTIFICATIONS & BROADCAST
  getAllNotifications() {
    return [...MOCK_NOTIFICATIONS];
  },

  getDeliveryLogs() {
    return [...MOCK_DELIVERY_LOGS];
  },

  broadcastNotification(payload: {
    title: string;
    message: string;
    target_role: 'ALL' | 'LANDLORD' | 'TENANT';
    category: string;
    priority: string;
    channel: string;
  }) {
    let targetUsers = MOCK_ADMIN_USERS;
    if (payload.target_role !== 'ALL') {
      targetUsers = MOCK_ADMIN_USERS.filter((u) => u.role === payload.target_role);
    }

    const createdNotifs: any[] = [];
    targetUsers.forEach((u) => {
      const notif = {
        id: `notif-bcast-${Date.now()}-${u.id}`,
        user_id: u.id,
        type: 'SYSTEM_BROADCAST',
        title: payload.title,
        message: payload.message,
        channel: payload.channel || 'IN_APP',
        priority: payload.priority || 'MEDIUM',
        category: payload.category || 'SYSTEM',
        status: 'SENT',
        is_read: false,
        created_at: new Date().toISOString(),
      };
      MOCK_NOTIFICATIONS.unshift(notif);
      createdNotifs.push(notif);

      // Add delivery log entry
      MOCK_DELIVERY_LOGS.unshift({
        id: `log-bcast-${Date.now()}-${u.id}`,
        notification_id: notif.id,
        user_id: u.id,
        channel: payload.channel || 'IN_APP',
        recipient: u.email,
        subject: payload.title,
        status: 'SENT',
        metadata_info: JSON.stringify({ target_role: payload.target_role, user_role: u.role }),
        created_at: new Date().toISOString(),
      });
    });

    recordAuditLog('NOTIFICATION_BROADCAST', 'NOTIFICATION', 'system_broadcast', `Broadcasted '${payload.title}' to ${targetUsers.length} users (${payload.target_role})`);
    return createdNotifs;
  },

  // AUDIT LOGS
  getAuditLogs() {
    return [...MOCK_ADMIN_AUDIT_LOGS];
  },
};
