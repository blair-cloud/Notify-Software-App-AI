import type {
  BulkSendResult,
  ExpenseSummary,
  LocalizedMessages,
  MessageTemplate,
  TranslateResult,
} from '../types';


import { supabase, getAccessToken, clearAccessTokenCache } from './supabase';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api/v1';
/** Abort hung requests so one slow endpoint cannot block a parallel batch forever. */
const REQUEST_TIMEOUT_MS = 25000;

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/** Headers for a call made outside `request` (file uploads, streaming). */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// --- Demo-mode fixtures for the communication endpoints ---------------------
const MOCK_COMM_LANGUAGES = [
  { code: 'EN', label: 'English' },
  { code: 'FR', label: 'Français' },
  { code: 'RW', label: 'Kinyarwanda' },
];

const MOCK_MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    code: 'RENT_DUE_3D',
    label: 'Rent due in 3 days',
    category: 'RENT_DUE',
    priority: 'HIGH',
    title: {
      EN: 'Rent due in 3 days: {{unit_number}}',
      FR: 'Loyer dû dans 3 jours : {{unit_number}}',
      RW: "Ubukode bugomba kwishyurwa mu minsi 3: {{unit_number}}",
    },
    body: {
      EN: 'Hello {{tenant_name}}, rent of {{currency}} {{amount}} for Unit {{unit_number}} is due in 3 days, on {{due_date}}. Please arrange payment in good time. Thank you.',
      FR: "Bonjour {{tenant_name}}, le loyer de {{currency}} {{amount}} pour l'unité {{unit_number}} est dû dans 3 jours, le {{due_date}}. Merci d'effectuer le paiement à temps.",
      RW: "Muraho {{tenant_name}}, ubukode bwa {{currency}} {{amount}} bw'inzu {{unit_number}} bugomba kwishyurwa mu minsi 3, ku itariki {{due_date}}. Mwakwitegura kwishyura ku gihe. Murakoze.",
    },
  },
  {
    code: 'RENT_OVERDUE_3D',
    label: 'Rent 3 days overdue',
    category: 'RENT_DUE',
    priority: 'CRITICAL',
    title: {
      EN: 'Second notice - overdue rent: {{unit_number}}',
      FR: 'Deuxième avis - loyer en retard : {{unit_number}}',
      RW: 'Itangazo rya kabiri - ubukode butarishyuwe: {{unit_number}}',
    },
    body: {
      EN: 'Dear {{tenant_name}}, rent of {{currency}} {{amount}} for Unit {{unit_number}} is 3 days overdue. Please pay today or contact property management to agree on a plan.',
      FR: "Cher/Chère {{tenant_name}}, le loyer de {{currency}} {{amount}} pour l'unité {{unit_number}} a 3 jours de retard. Merci de payer aujourd'hui ou de contacter la gestion.",
      RW: "Muraho {{tenant_name}}, ubukode bwa {{currency}} {{amount}} bw'inzu {{unit_number}} bumaze iminsi 3 butishyuwe. Mwishyure uyu munsi cyangwa muvugane n'ubuyobozi.",
    },
  },
  {
    code: 'LEASE_EXPIRY_30D',
    label: 'Lease expiring in 30 days',
    category: 'LEASE_EXPIRY',
    priority: 'MEDIUM',
    title: {
      EN: 'Lease expiring soon: {{unit_number}}',
      FR: 'Bail bientôt expiré : {{unit_number}}',
      RW: "Amasezerano y'ubukode agiye kurangira: {{unit_number}}",
    },
    body: {
      EN: 'Dear {{tenant_name}}, your lease for Unit {{unit_number}} at {{property_name}} ends on {{end_date}} (in 30 days). Please let us know whether you intend to renew.',
      FR: "Cher/Chère {{tenant_name}}, votre bail pour l'unité {{unit_number}} à {{property_name}} se termine le {{end_date}} (dans 30 jours). Merci de nous indiquer si vous souhaitez le renouveler.",
      RW: "Muraho {{tenant_name}}, amasezerano y'ubukode bw'inzu {{unit_number}} muri {{property_name}} arangira ku itariki {{end_date}} (mu minsi 30). Mutumenyeshe niba mwifuza kuyavugurura.",
    },
  },
  {
    code: 'CUSTOM',
    label: 'Custom message',
    category: 'SYSTEM',
    priority: 'MEDIUM',
    title: {
      EN: 'Message from {{property_name}}',
      FR: 'Message de {{property_name}}',
      RW: 'Ubutumwa buturuka {{property_name}}',
    },
    body: { EN: '{{custom_note}}', FR: '{{custom_note}}', RW: '{{custom_note}}' },
  },
];

const MOCK_DELIVERY_HISTORY: any[] = [];

function renderMockPlaceholders(text: string, variables: Record<string, any>): string {
  let out = text || '';
  Object.entries(variables || {}).forEach(([key, value]) => {
    out = out.split(`{{${key}}}`).join(value === null || value === undefined ? '' : String(value));
  });
  while (out.includes('{{') && out.includes('}}')) {
    const start = out.indexOf('{{');
    const end = out.indexOf('}}', start);
    out = out.slice(0, start) + out.slice(end + 2);
  }
  return out.split(/\s+/).join(' ').trim();
}

/**
 * Session handling now belongs to Supabase Auth.
 *
 * `supabase.auth` keeps the tokens, refreshes them before they expire and
 * restores them after a reload, so there is no token storage or refresh
 * bookkeeping left in here. Every request simply asks the client for the
 * current access token.
 */
function isAuthEndpoint(endpoint: string): boolean {
  return endpoint.startsWith('/auth/bootstrap');
}

/** Forces Supabase to mint a fresh access token; used once after a 401. */
async function forceRefreshSession(): Promise<string | null> {
  try {
    clearAccessTokenCache();
    const { data, error } = await supabase.auth.refreshSession();
    if (error) return null;
    const token = data.session?.access_token ?? null;
    return token;
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  // Honour a caller-supplied signal as well as our timeout.
  const outerSignal = options.signal;
  if (outerSignal) {
    if (outerSignal.aborted) controller.abort();
    else outerSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(url, { ...options, headers, signal: controller.signal });

    // Supabase normally refreshes in the background, but a tab that has been
    // asleep can still present a stale token. Refresh once and replay.
    if (response.status === 401 && !isRetry && !isAuthEndpoint(endpoint)) {
      const fresh = await forceRefreshSession();
      if (fresh) {
        return request<T>(endpoint, options, true);
      }
    }

    let data: any = null;
    const contentType = response.headers.get('content-type');
    // A 204 (or otherwise empty) body must never be parsed as JSON - some
    // proxies/servers still attach a JSON content-type header with no body.
    if (response.status !== 204 && contentType && contentType.includes('application/json')) {
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
      }
    }

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;
      if (typeof data?.detail === 'string') {
        errorMessage = data.detail;
      } else if (Array.isArray(data?.detail) && data.detail.length > 0) {
        errorMessage = data.detail.map((d) => d?.msg || d?.message || JSON.stringify(d)).join(', ');
      } else if (data?.detail && typeof data.detail === 'object') {
        errorMessage = JSON.stringify(data.detail);
      } else if (data?.message) {
        errorMessage = data.message;
      }
      throw new ApiError(response.status, errorMessage, data);
    }

    return data as T;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ApiError(408, 'Request timed out. Please try again.');
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export const api = {
  // Account. Sign in / sign up / sign out / password reset all happen through
  // Supabase Auth in the browser (see services/supabase.ts) - these are only
  // the application's own profile endpoints.
  auth: {
    getMe: () => request<any>('/auth/me', { method: 'GET' }),

    getSession: () => request<any>('/auth/session', { method: 'GET' }),

    /** Completes a new account: role, names and the landlord/tenant profile. */
    bootstrap: (data: any) =>
      request<any>('/auth/bootstrap', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateProfile: (data: any) =>
      request<any>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    forgotPassword: (email: string) =>
      request<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
  },

  // Landlord Dashboard Stats
  landlord: {
    getStats: () => request<any>('/landlord/stats'),
  },

  // Properties
  properties: {
    list: () => request<any[]>('/properties'),
    get: (id: string) => request<any>(`/properties/${id}`),
    create: (data: any) =>
      request<any>('/properties', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/properties/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/properties/${id}`, {
        method: 'DELETE',
      }),
  },

  // Units
  units: {
    list: (propertyId?: string) =>
      request<any[]>(`/units${propertyId ? `?property_id=${propertyId}` : ''}`),
    get: (id: string) => request<any>(`/units/${id}`),
    create: (data: any) =>
      request<any>('/units', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/units/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/units/${id}`, {
        method: 'DELETE',
      }),
  },

  // Leases
  leases: {
    list: () => request<any[]>('/leases'),
    get: (id: string) => request<any>(`/leases/${id}`),
    create: (data: any) =>
      request<any>('/leases', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/leases/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    uploadDocument: (id: string, docData: any) =>
      request<any>(`/leases/${id}/document`, {
        method: 'POST',
        body: JSON.stringify(docData),
      }),
    activate: (id: string) =>
      request<any>(`/leases/${id}/activate`, {
        method: 'POST',
      }),
    terminate: (id: string) =>
      request<any>(`/leases/${id}/terminate`, {
        method: 'POST',
      }),
    renew: (id: string, renewData: any) =>
      request<any>(`/leases/${id}/renew`, {
        method: 'POST',
        body: JSON.stringify(renewData),
      }),
    // Tenant-facing "my lease" endpoints - scoped server-side to the caller.
    listMine: () => request<any[]>('/leases/me'),
    getMine: (id: string) => request<any>(`/leases/me/${id}`),
    uploadDocumentMine: (id: string, docData: any) =>
      request<any>(`/leases/me/${id}/document`, {
        method: 'POST',
        body: JSON.stringify(docData),
      }),
    signMine: (id: string, signatureName: string) =>
      request<any>(`/leases/me/${id}/sign`, {
        method: 'POST',
        body: JSON.stringify({ signature_name: signatureName }),
      }),
  },

  // Documents
  documents: {
    list: () => request<any[]>('/documents'),
  },

  // Tenancies
  tenancies: {
    list: () => request<any[]>('/tenancies'),
    create: (data: any) =>
      request<any>('/tenancies', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    end: (id: string) =>
      request<any>(`/tenancies/${id}/end`, {
        method: 'PATCH',
      }),
  },

  // Invitations
  invitations: {
    create: (data: any) =>
      request<any>('/invitations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: () => request<any[]>('/invitations'),
    getByToken: (token: string) => request<any>(`/invitations/token/${token}`),
    validateToken: (token: string) => request<any>(`/invitations/validate/${token}`),
    cancel: (id: string) =>
      request<any>(`/invitations/${id}/cancel`, {
        method: 'PATCH',
      }),
    accept: (token: string) =>
      request<any>('/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
  },

  // Tenants & Tenancies
  tenants: {
    getMyTenancies: () => request<any[]>('/tenants/me/tenancies'),
    getLandlordTenants: () => request<any[]>('/tenants'),
    getTenantProfile: (tenantId: string) => request<any>(`/tenants/${tenantId}`),
  },

  // System Admin
  admin: {
    getStats: () => request<any>('/admin/stats'),
    getUsers: () => request<any[]>('/admin/users'),
    createUser: (data: any) =>
      request<any>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateUserStatus: (userId: string, status: string) =>
      request<any>(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    updateUserRole: (userId: string, role: string) =>
      request<any>(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    suspendUser: (userId: string) =>
      request<any>(`/admin/users/${userId}/suspend`, {
        method: 'PATCH',
      }),
    activateUser: (userId: string) =>
      request<any>(`/admin/users/${userId}/activate`, {
        method: 'PATCH',
      }),
    getProperties: () => request<any[]>('/admin/properties'),
    reassignProperty: (propertyId: string, landlordId: string) =>
      request<any>(`/admin/properties/${propertyId}/reassign`, {
        method: 'POST',
        body: JSON.stringify({ landlord_id: landlordId }),
      }),
    getUnits: () => request<any[]>('/admin/units'),
    getTenants: () => request<any[]>('/admin/tenants'),
    getTenancies: () => request<any[]>('/admin/tenancies'),
    getLeases: () => request<any[]>('/admin/leases'),
    getInvitations: () => request<any[]>('/admin/invitations'),
    getAuditLogs: () => request<any[]>('/admin/audit-logs'),
    broadcastNotification: (data: any) =>
      request<any>('/admin/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // --- PHASE 3 FINANCIAL API SERVICES ---

  invoices: {
    list: () => request<any[]>('/invoices'),
    create: (data: any) =>
      request<any>('/invoices/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancel: (invoiceId: string) =>
      request<any>(`/invoices/${invoiceId}/cancel`, {
        method: 'POST',
      }),
    delete: (invoiceId: string) =>
      request<any>(`/invoices/${invoiceId}`, {
        method: 'DELETE',
      }),
    getLandlordInvoices: (landlordId: string) => request<any[]>(`/invoices/landlord/${landlordId}`),
    getTenantInvoices: () => request<any[]>('/invoices/tenant/me'),
    getDetails: (invoiceId: string) => request<any>(`/invoices/${invoiceId}`),
    generateMonthlyInvoices: () =>
      request<any[]>('/invoices/generate', {
        method: 'POST',
      }),
  },

  payments: {
    list: () => request<any[]>('/payments'),
    processPayment: (data: {
      invoice_id: string;
      amount: number;
      payment_method: string;
      payment_channel?: string;
      transaction_reference?: string;
      notes?: string;
      auto_verify?: boolean;
    }) =>
      request<any>('/payments/pay', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // The verifier is always the signed-in landlord, resolved server-side -
    // there is no verifier id for the caller to supply.
    verifyPayment: (paymentId: string, confirm: boolean, notes?: string) =>
      request<any>(`/payments/${paymentId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ confirm, notes }),
      }),

    getLandlordPayments: (landlordId: string) => request<any[]>(`/payments/landlord/${landlordId}`),
    getTenantPayments: () => request<any[]>('/payments/tenant/me'),
  },

  receipts: {
    list: () => request<any[]>('/receipts'),
    getReceipt: (receiptId: string) => request<any>(`/receipts/${receiptId}`),
    getReceiptByPayment: (paymentId: string) => request<any>(`/receipts/payment/${paymentId}`),
    getTenantReceipts: () => request<any[]>('/receipts/tenant/me'),
    getLandlordReceipts: (landlordId: string) => request<any[]>(`/receipts/landlord/${landlordId}`),
  },

  expenses: {
    list: () => request<any[]>('/expenses'),
    create: (data: any) =>
      request<any>('/expenses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createExpense: (data: any) =>
      request<any>('/expenses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/expenses/${id}`, {
        method: 'DELETE',
      }),
    // Scoped to the signed-in landlord by the backend; no id is passed.
    getLandlordExpenses: (propertyId?: string, category?: string) => {
      let query = '/expenses';
      const params = new URLSearchParams();
      if (propertyId) params.append('property_id', propertyId);
      if (category) params.append('category', category);
      if (params.toString()) query += `?${params.toString()}`;
      return request<any[]>(query);
    },
    getSummary: () => request<ExpenseSummary>('/expenses/summary'),
  },

  financials: {
    getLandlordFinancials: (landlordId: string) => request<any>(`/financials/landlord/${landlordId}`),
    getLandlordSummary: (landlordId?: string) => request<any>('/financials/landlord/me'),
    getTenantFinancials: () => request<any>('/financials/tenant/me'),
    getTenantSummary: () => request<any>('/financials/tenant/me'),
  },

  // --- PHASE 4 MAINTENANCE & COMPLAINT SERVICES ---

  maintenance: {
    getTenantRequests: () => request<any[]>('/maintenance/tenant/me'),
    getLandlordRequests: (params?: { property_id?: string; status?: string; priority?: string }) => {
      let query = '/maintenance/landlord/me';
      if (params) {
        const q = new URLSearchParams();
        if (params.property_id) q.append('property_id', params.property_id);
        if (params.status) q.append('status', params.status);
        if (params.priority) q.append('priority', params.priority);
        if (q.toString()) query += `?${q.toString()}`;
      }
      return request<any[]>(query);
    },
    getAllRequests: (params?: { status?: string; priority?: string }) => {
      let query = '/maintenance';
      if (params) {
        const q = new URLSearchParams();
        if (params.status) q.append('status', params.status);
        if (params.priority) q.append('priority', params.priority);
        if (q.toString()) query += `?${q.toString()}`;
      }
      return request<any[]>(query);
    },
    getLandlordStats: () => request<any>('/maintenance/landlord/stats'),
    getAllStats: () => request<any>('/maintenance/admin/stats'),
    getRequestDetails: (id: string) => request<any>(`/maintenance/${id}`),
    createRequest: (data: {
      title: string;
      description: string;
      category: string;
      priority?: string;
      tenancy_id?: string;
    }) =>
      request<any>('/maintenance', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    acknowledgeRequest: (id: string) =>
      request<any>(`/maintenance/${id}/acknowledge`, {
        method: 'POST',
      }),
    scheduleRequest: (
      id: string,
      data: {
        scheduled_date: string;
        scheduled_time?: string;
        assigned_to?: string;
        assigned_worker_id?: string;
        estimated_cost?: number;
      }
    ) =>
      request<any>(`/maintenance/${id}/schedule`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    markInProgress: (id: string) =>
      request<any>(`/maintenance/${id}/in-progress`, {
        method: 'POST',
      }),
    resolveRequest: (
      id: string,
      data: {
        actual_cost?: number;
        landlord_notes?: string;
      }
    ) =>
      request<any>(`/maintenance/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    addToExpenses: (id: string) =>
      request<any>(`/maintenance/${id}/to-expense`, {
        method: 'POST',
      }),
    tenantConfirmClose: (
      id: string,
      data?: {
        tenant_notes?: string;
        rating?: number;
      }
    ) =>
      request<any>(`/maintenance/${id}/confirm-resolution`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    confirmResolution: (
      id: string,
      options?: { rating?: number; tenant_notes?: string } | number,
      feedback?: string
    ) => {
      const payload =
        typeof options === 'object' && options !== null
          ? options
          : { rating: options, tenant_notes: feedback };
      return request<any>(`/maintenance/${id}/confirm-resolution`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    tenantReopen: (
      id: string,
      data: {
        tenant_notes: string;
      }
    ) =>
      request<any>(`/maintenance/${id}/reopen`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    reopen: (id: string, options?: { tenant_notes?: string } | string) => {
      const payload =
        typeof options === 'object' && options !== null
          ? options
          : { tenant_notes: options };
      return request<any>(`/maintenance/${id}/reopen`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    addComment: (id: string, message: string) =>
      request<any>(`/maintenance/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
    getWorkers: () => request<any[]>('/maintenance/workers'),
    createWorker: (data: {
      name: string;
      phone: string;
      specialization: string;
      notes?: string;
    }) =>
      request<any>('/maintenance/workers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  complaints: {
    getTenantComplaints: () => request<any[]>('/complaints/tenant/me'),
    getLandlordComplaints: (params?: { property_id?: string; status?: string }) => {
      let query = '/complaints/landlord/me';
      if (params) {
        const q = new URLSearchParams();
        if (params.property_id) q.append('property_id', params.property_id);
        if (params.status) q.append('status', params.status);
        if (q.toString()) query += `?${q.toString()}`;
      }
      return request<any[]>(query);
    },
    getAllComplaints: (params?: { status?: string }) => {
      let query = '/complaints';
      if (params) {
        const q = new URLSearchParams();
        if (params.status) q.append('status', params.status);
        if (q.toString()) query += `?${q.toString()}`;
      }
      return request<any[]>(query);
    },
    getLandlordStats: () => request<any>('/complaints/landlord/stats'),
    getAllStats: () => request<any>('/complaints/admin/stats'),
    getComplaintDetails: (id: string) => request<any>(`/complaints/${id}`),
    createComplaint: (data: {
      subject: string;
      description: string;
      category: string;
      priority?: string;
      tenancy_id?: string;
    }) =>
      request<any>('/complaints', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    acknowledgeComplaint: (id: string) =>
      request<any>(`/complaints/${id}/acknowledge`, {
        method: 'POST',
      }),
    markUnderReview: (id: string, data?: { landlord_response?: string }) =>
      request<any>(`/complaints/${id}/under-review`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    resolveComplaint: (id: string, data: { landlord_response: string }) =>
      request<any>(`/complaints/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    closeComplaint: (id: string) =>
      request<any>(`/complaints/${id}/close`, {
        method: 'POST',
      }),
    addComment: (id: string, message: string) =>
      request<any>(`/complaints/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
  },

  notifications: {
    // Note: there is no POST /notifications endpoint. Landlord-initiated
    // messages and reminders go through api.messages.sendBulk, which creates
    // the notification alongside the actual SMS/WhatsApp/email delivery.
    getUserNotifications: (userId: string) => request<any[]>('/notifications'),
    list: (params?: { channel?: string; status?: string; limit?: number; unread_only?: boolean }) => {
      let query = '/notifications';
      if (params) {
        const q = new URLSearchParams();
        if (params.channel) q.append('channel', params.channel);
        if (params.status) q.append('status', params.status);
        if (params.limit) q.append('limit', String(params.limit));
        if (params.unread_only) q.append('unread_only', 'true');
        if (q.toString()) query += `?${q.toString()}`;
      }
      return request<any[]>(query);
    },
    getAll: (params?: {
      category?: string;
      priority?: string;
      unread_only?: boolean;
      search?: string;
    }) => {
      let query = '/notifications';
      if (params) {
        const q = new URLSearchParams();
        if (params.category) q.append('category', params.category);
        if (params.priority) q.append('priority', params.priority);
        if (params.unread_only !== undefined) q.append('unread_only', String(params.unread_only));
        if (params.search) q.append('search', params.search);
        if (q.toString()) query += `?${q.toString()}`;
      }
      return request<any[]>(query);
    },
    getUnreadCount: () => request<{ unread_count: number }>('/notifications/unread-count'),
    markAsRead: (id: string) =>
      request<any>(`/notifications/${id}/read`, {
        method: 'PATCH',
      }),
    markAllAsRead: () =>
      request<any>('/notifications/mark-all-read', {
        method: 'POST',
      }),
    delete: (id: string) =>
      request<any>(`/notifications/${id}`, {
        method: 'DELETE',
      }),
    getPreferences: () => request<any>('/notifications/preferences'),
    updatePreferences: (data: any) =>
      request<any>('/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    processReminders: () =>
      request<any>('/notifications/process-reminders', {
        method: 'POST',
      }),
    sendTestEmail: (data: { email: string; days_remaining?: number; milestone?: string }) =>
      request<any>('/notifications/test-email', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getDeliveryLogs: () => request<any[]>('/notifications/logs'),
    getTemplates: () => request<any[]>('/notifications/templates'),
  },

  messages: {
    getAll: (partnerId?: string) => {
      const url = partnerId ? `/messages?partner_id=${partnerId}` : '/messages';
      return request<any[]>(url);
    },
    getConversations: () => request<any[]>('/messages/conversations'),
    send: (data: {
      recipient_id?: string;
      property_id?: string;
      unit_id?: string;
      tenancy_id?: string;
      message_type: 'GENERAL' | 'MAINTENANCE';
      content: string;
      attachment_url?: string;
      attachment_name?: string;
      attachment_size?: number;
      maintenance_title?: string;
      maintenance_category?: string;
      maintenance_priority?: string;
      maintenance_request_id?: string;
    }) =>
      request<any>('/messages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    markAsRead: (partnerId: string) =>
      request<any>(`/messages/read/${partnerId}`, {
        method: 'POST',
      }),

    // Landlord broadcast / reminders - same backend tables as the 1:1 chat.
    getTemplates: () =>
      request<{ languages: { code: string; label: string }[]; templates: MessageTemplate[] }>(
        '/messages/templates'
      ),
    preview: (data: { template_code: string; variables?: Record<string, any>; overrides?: LocalizedMessages }) =>
      request<{ messages: LocalizedMessages }>('/messages/preview', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    translate: (data: { text: string; source_language: string; target_languages?: string[] }) =>
      request<TranslateResult>('/messages/translate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    sendBulk: (data: {
      recipient_ids: string[];
      channels: string[];
      template_code: string;
      messages: LocalizedMessages;
      variables?: Record<string, any>;
      category?: string;
      priority?: string;
      entity_type?: string;
      entity_id?: string;
      force_language?: string | null;
    }) =>
      request<BulkSendResult>('/messages/bulk', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getDeliveryHistory: (limit = 200) => request<any[]>(`/messages/delivery-history?limit=${limit}`),
  },

  tracker: {
    getDashboard: (params?: {
      property_id?: string;
      period_type?: string;
      start_date?: string;
      end_date?: string;
    }) => {
      let query = '/tracker/dashboard';
      if (params) {
        const q = new URLSearchParams();
        if (params.property_id) q.append('property_id', params.property_id);
        if (params.period_type) q.append('period_type', params.period_type);
        if (params.start_date) q.append('start_date', params.start_date);
        if (params.end_date) q.append('end_date', params.end_date);
        if (q.toString()) query += `?${q.toString()}`;
      }
      return request<any>(query);
    },
    uploadContent: (data: {
      property_id?: string;
      bank_account_id?: string;
      file_name: string;
      content: string;
      auto_confirm?: boolean;
    }) =>
      request<any>('/tracker/upload-content', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    uploadFile: async (formData: FormData) => {
      // Multipart, so the Content-Type header must be left to the browser.
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/tracker/upload-file`, {
        method: 'POST',
        headers,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || 'Failed to upload bank statement');
      }
      return data;
    },
    uploadStatement: async (formData: FormData) => {
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/tracker/statements/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || 'Failed to upload bank statement');
      }
      return data;
    },
    analyzeStatement: (statementId: string) =>
      request<any>(`/tracker/statements/${statementId}/analyze`, { method: 'POST' }),
    getStatementTransactions: (statementId: string) =>
      request<any>(`/tracker/statements/${statementId}/transactions`),
    getStatementMatches: (statementId: string) =>
      request<any>(`/tracker/statements/${statementId}/matches`),
    confirmMatch: (matchId: string, data?: { notes?: string }) =>
      request<any>(`/tracker/matches/${matchId}/confirm`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    rejectMatchById: (matchId: string, data?: { reason?: string }) =>
      request<any>(`/tracker/matches/${matchId}/reject`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    approveMatch: (data: { transaction_id: string; notes?: string }) =>
      request<any>('/tracker/approve-match', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    manualMatch: (data: {
      transaction_id: string;
      invoice_id: string;
      notes?: string;
    }) =>
      request<any>('/tracker/manual-match', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    rejectMatch: (data: {
      transaction_id: string;
      reason?: string;
    }) =>
      request<any>('/tracker/reject-match', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getStatementAnalysis: (statementId: string) =>
      request<any>(`/tracker/statements/${statementId}/analysis`),
    getStatements: () => request<any[]>('/tracker/statements'),
    getAccounts: () => request<any[]>('/tracker/accounts'),
    createAccount: (data: {
      bank_name: string;
      account_name: string;
      account_number: string;
      currency?: string;
      is_primary?: boolean;
    }) =>
      request<any>('/tracker/accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};

