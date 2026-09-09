export type PropertyType = 'APARTMENT' | 'HOUSE' | 'COMMERCIAL' | 'OFFICE' | 'MIXED_USE' | 'OTHER';
export type PropertyStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'MAINTENANCE';
export type UnitStatus = 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED' | 'INACTIVE';
export type TenancyStatus = 'PENDING' | 'ACTIVE' | 'ENDED' | 'TERMINATED';
export type LeaseStatus = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'TERMINATED';

export interface Property {
  id: string;
  landlord_id?: string;
  name: string;
  property_type: PropertyType;
  description?: string;
  address: string;
  district: string;
  sector?: string;
  cell?: string;
  village?: string;
  latitude?: number;
  longitude?: number;
  status: PropertyStatus;
  total_units?: number;
  occupied_units?: number;
  vacant_units?: number;
  expected_monthly_rent?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Unit {
  id: string;
  property_id: string;
  landlord_id?: string;
  unit_number: string;
  floor: number;
  unit_type: string;
  bedrooms?: number;
  rooms?: number;
  bathrooms?: number;
  square_meters?: number;
  monthly_rent: number;
  currency: string;
  status: UnitStatus;
  description?: string;
  current_tenant_name?: string;
  current_tenant_id?: string;
  lease_status?: LeaseStatus;
  lease_end_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Tenant {
  id: string;
  tenant_id?: string;
  user_id?: string;
  tenancy_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  preferred_language?: string;
  national_id?: string;
  occupation?: string;
  property_id?: string;
  property_name?: string;
  unit_id?: string;
  unit_number?: string;
  monthly_rent?: number;
  currency?: string;
  status?: string;
  // True while this tenant has been invited but has not signed up yet - there
  // is no account, lease or invoice history to act on until they accept.
  is_pending?: boolean;
  lease_status?: LeaseStatus;
  lease_end_date?: string;
  tenancy_start_date?: string;
  history?: TenancyHistoryItem[];
}

export interface TenancyHistoryItem {
  id: string;
  property_name: string;
  unit_number: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  currency: string;
  status: string;
}

export interface Tenancy {
  id: string;
  tenant_id: string;
  landlord_id: string;
  property_id: string;
  unit_id: string;
  status: TenancyStatus;
  start_date: string;
  end_date?: string;
  tenant?: Tenant;
  property?: Property;
  unit?: Unit;
  created_at?: string;
}

export type LeaseDocumentType = 'LEASE_AGREEMENT' | 'RENEWAL_ADDENDUM' | 'TERMINATION_NOTICE' | 'INSPECTION_REPORT' | 'OTHER';
export type LeaseDocumentStatus = 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED' | 'PENDING_SIGNATURE';

export interface LeaseDocumentVersion {
  version: number;
  document_name: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  file_data?: string;
  uploaded_by: string;
  uploaded_by_role?: string;
  uploaded_at: string;
  version_notes?: string;
  status: LeaseDocumentStatus;
}

export interface LeaseAgreementDocument {
  id: string;
  lease_id: string;
  tenant_id?: string;
  tenant_name?: string;
  property_id?: string;
  property_name?: string;
  unit_id?: string;
  unit_number?: string;
  doc_type: LeaseDocumentType;
  document_name: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  file_data?: string;
  uploaded_by: string;
  uploaded_by_role?: string;
  uploaded_at: string;
  version: number;
  status: LeaseDocumentStatus;
  is_verified?: boolean;
  history: LeaseDocumentVersion[];
}

export interface Lease {
  id: string;
  tenancy_id: string;
  landlord_id?: string;
  tenant_id?: string;
  property_id?: string;
  unit_id?: string;
  tenant_name?: string;
  tenant_email?: string;
  tenant_phone?: string;
  tenant_national_id?: string;
  property_name?: string;
  property_address?: string;
  property_district?: string;
  unit_number?: string;
  unit_floor?: number;
  landlord_name?: string;
  landlord_business_name?: string;
  landlord_phone?: string;
  landlord_email?: string;
  landlord_address?: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number;
  payment_due_day: number;
  late_fee: number;
  currency: string;
  status: LeaseStatus;
  notes?: string;
  days_remaining?: number;
  created_at?: string;
  // Integrated Document & Legal Compliance
  agreement_document?: LeaseAgreementDocument;
  has_signed_document?: boolean;
  compliance_status?: 'COMPLETE' | 'INCOMPLETE';
  compliance_notes?: string;
  document_history?: LeaseDocumentVersion[];
  renewal_of_lease_id?: string;
  renewal_count?: number;
  tenant_signed_at?: string;
  tenant_signature_name?: string;
  tenant_document_status?: 'NO_DOCUMENT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'UPLOADED';
}

export interface Invitation {
  id: string;
  tenant_email?: string;
  tenant_phone: string;
  property_id: string;
  property_name?: string;
  unit_id: string;
  unit_number?: string;
  token?: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
  created_at?: string;
  expires_at?: string;
}

export interface LandlordDashboardStats {
  total_properties: number;
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  maintenance_units: number;
  expected_monthly_rent: number;
  occupancy_rate: number;
  leases_expiring_soon_count: number;
}

export interface SystemAdminStats {
  total_users: number;
  total_landlords: number;
  total_tenants: number;
  total_properties: number;
  total_units: number;
  occupied_units?: number;
  vacant_units?: number;
  active_tenancies: number;
  active_leases?: number;
  expiring_leases?: number;
  pending_invitations: number;
  monthly_revenue_rwf: number;
}

export interface MallProperty {
  id: string;
  name: string;
  location: string;
  totalUnits: number;
  occupiedUnits: number;
  monthlyRevenueRwf: number;
  outstandingRwf: number;
  collectionRate: number;
  imageAccent?: string;
}

export interface UnitDetail {
  id: string;
  unitCode: string;
  floor: string;
  tenantName: string;
  businessType: string;
  sizeSqm: number;
  monthlyRentRwf: number;
  status: 'occupied' | 'vacant' | 'notice' | 'maintenance';
  lastPaymentDate: string;
  dueStatus: 'paid' | 'due_soon' | 'overdue';
}

export interface PaymentTransaction {
  id: string;
  tenantName: string;
  unitCode: string;
  amountRwf: number;
  date: string;
  method: 'MTN Mobile Money' | 'Airtel Money' | 'Bank Wire (I&M)' | 'BK Direct Deposit' | 'Cheque';
  status: 'completed' | 'pending' | 'overdue';
  receiptNo: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  tagline: string;
  /** List / standard monthly price in RWF (shown struck through during promo). */
  priceRwfMonthly?: number;
  /** Promotional monthly price in RWF (0 = free promo). */
  promoPriceRwf?: number;
  /** Price per additional unit beyond the plan base, in RWF. */
  additionalUnitPriceRwf?: number;
  priceRwfAnnualDiscount?: number;
  priceDisplay?: string;
  pricingStatus?: string;
  tenantsLimit: string;
  unitLimit: string;
  features: string[];
  recommended?: boolean;
  ctaText: string;
}

export interface FeatureItem {
  number: string;
  title: string;
  description: string;
  iconName: 'ManageUnits' | 'CollectRent' | 'StayNotified';
}

// --- PHASE 3 FINANCIAL TYPES ---

export type RentScheduleFrequency = 'MONTHLY' | 'WEEKLY' | 'QUARTERLY' | 'YEARLY';
export type RentScheduleStatus = 'ACTIVE' | 'INACTIVE' | 'PAUSED';

export type InvoiceType = 'RENT' | 'OTHER';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type PaymentMethod = 'MOBILE_MONEY' | 'BANK' | 'CARD' | 'CASH' | 'OTHER';
export type PaymentChannel = 'ONLINE' | 'OFFLINE';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REVERSED' | 'AWAITING_VERIFICATION';

export type ExpenseCategory = 'MAINTENANCE' | 'UTILITIES' | 'TAX' | 'INSURANCE' | 'SECURITY' | 'CLEANING' | 'STAFF' | 'OTHER';
export type ExpenseStatus = 'RECORDED' | 'CANCELLED';

export interface RentSchedule {
  id: string;
  tenancy_id: string;
  lease_id: string;
  landlord_id: string;
  tenant_id: string;
  property_id: string;
  unit_id: string;
  amount: number;
  currency: string;
  frequency: RentScheduleFrequency;
  due_day: number;
  effective_from: string;
  effective_to?: string;
  status: RentScheduleStatus;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  landlord_id: string;
  tenant_id: string;
  property_id: string;
  unit_id: string;
  tenancy_id: string;
  lease_id: string;
  invoice_type: InvoiceType;
  billing_period_start: string;
  billing_period_end: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  discount: number;
  late_fee: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
  status: InvoiceStatus;
  tenant_name?: string;
  property_name?: string;
  unit_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: string;
  payment_reference: string;
  transaction_reference?: string;
  invoice_id: string;
  tenancy_id: string;
  lease_id: string;
  landlord_id: string;
  tenant_id: string;
  property_id: string;
  unit_id: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  payment_channel: PaymentChannel;
  status: PaymentStatus;
  paid_at?: string;
  verified_at?: string;
  verified_by?: string;
  notes?: string;
  tenant_name?: string;
  property_name?: string;
  unit_number?: string;
  invoice_number?: string;
  created_at?: string;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  payment_id: string;
  invoice_id: string;
  tenant_id: string;
  landlord_id: string;
  property_id: string;
  unit_id: string;
  amount: number;
  currency: string;
  issued_at: string;
  tenant_name?: string;
  landlord_name?: string;
  property_name?: string;
  unit_number?: string;
  payment_method?: PaymentMethod;
  created_at?: string;
}

export interface Expense {
  id: string;
  landlord_id: string;
  property_id: string;
  unit_id?: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  vendor?: string;
  reference?: string;
  status: ExpenseStatus;
  property_name?: string;
  unit_number?: string;
  created_at?: string;
  // Set when the expense was posted from a maintenance job.
  maintenance_request_id?: string;
  maintenance_request_number?: string;
  maintenance_title?: string;
  source?: 'MANUAL' | 'MAINTENANCE';
}

export interface ExpenseSummary {
  total_expenses: number;
  expense_count: number;
  by_category: Record<string, number>;
  by_property: Record<string, number>;
  by_month: Record<string, number>;
  /** Everything filed under the Maintenance category. */
  maintenance_total: number;
  /** The portion of that which came from maintenance tickets. */
  maintenance_from_tickets: number;
  maintenance_ticket_count: number;
  /** Repair costs on tickets not yet posted as an expense. */
  maintenance_unposted: number;
  currency: string;
}

export interface LandlordFinancials {
  expected_rent: number;
  collected_rent: number;
  outstanding_rent: number;
  overdue_rent: number;
  collection_rate: number;
  total_expenses: number;
  net_income: number;
  currency: string;
  monthly_trends: {
    month: string;
    expected: number;
    collected: number;
    outstanding: number;
  }[];
}

export interface TenantFinancials {
  current_rent: number;
  amount_due: number;
  due_date: string | null;
  invoice_number: string | null;
  invoice_id: string | null;
  invoice_status: string;
  outstanding_balance: number;
  currency: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  language?: string;
  channel: 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';
  status: 'PENDING' | 'SENT' | 'FAILED' | 'READ';
  entity_type?: string;
  entity_id?: string;
  reference_type?: string;
  reference_id?: string;
  is_read?: boolean;
  read_at?: string;
  sent_at?: string;
  created_at: string;
}

export type MaintenanceCategory =
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'WATER'
  | 'HEATING_COOLING'
  | 'STRUCTURAL'
  | 'APPLIANCE'
  | 'SECURITY'
  | 'CLEANING'
  | 'INTERNET'
  | 'OTHER';

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type MaintenanceStatus =
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'SCHEDULED'
  | 'RESOLVED'
  | 'REOPENED'
  | 'CLOSED'
  | 'REJECTED'
  | 'CANCELLED';

export type WorkerSpecialization =
  | 'PLUMBER'
  | 'ELECTRICIAN'
  | 'CARPENTER'
  | 'CLEANER'
  | 'SECURITY'
  | 'GENERAL'
  | 'OTHER';

export interface MaintenanceAttachment {
  id: string;
  maintenance_request_id: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  size: number;
  uploaded_by: string;
  created_at: string;
}

export interface MaintenanceComment {
  id: string;
  maintenance_request_id: string;
  user_id: string;
  author_name?: string;
  author_role?: string;
  message: string;
  created_at: string;
}

export interface MaintenanceWorker {
  id: string;
  landlord_id: string;
  name: string;
  phone: string;
  specialization: WorkerSpecialization;
  status: string;
  notes?: string;
  created_at: string;
}

export interface MaintenanceRequest {
  id: string;
  request_number: string;
  tenant_id: string;
  landlord_id: string;
  property_id: string;
  unit_id: string;
  tenancy_id: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assigned_to?: string;
  assigned_worker_id?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  estimated_cost: number;
  actual_cost: number;
  currency: string;
  tenant_notes?: string;
  landlord_notes?: string;
  acknowledged_at?: string;
  scheduled_at?: string;
  resolved_at?: string;
  closed_at?: string;
  expense_id?: string;
  tenant_name?: string;
  property_name?: string;
  unit_number?: string;
  attachments?: MaintenanceAttachment[];
  comments?: MaintenanceComment[];
  created_at: string;
  updated_at: string;
}

export interface MaintenanceStats {
  total_requests: number;
  open_requests: number;
  urgent_requests: number;
  in_progress_requests: number;
  resolved_this_month: number;
  closed_requests: number;
  average_resolution_days: number;
  average_acknowledgement_hours: number;
  category_distribution: Record<string, number>;
}

export type ComplaintCategory =
  | 'NOISE'
  | 'NEIGHBOR'
  | 'PROPERTY_CONDITION'
  | 'LANDLORD_SERVICE'
  | 'SECURITY'
  | 'UTILITY'
  | 'PAYMENT'
  | 'LEASE'
  | 'OTHER';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type ComplaintStatus =
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED';

export interface ComplaintComment {
  id: string;
  complaint_id: string;
  user_id: string;
  author_name?: string;
  author_role?: string;
  message: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  complaint_number: string;
  tenant_id: string;
  landlord_id: string;
  property_id: string;
  unit_id: string;
  tenancy_id: string;
  subject: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  landlord_response?: string;
  attachment_path?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  closed_at?: string;
  tenant_name?: string;
  property_name?: string;
  unit_number?: string;
  comments?: ComplaintComment[];
  created_at: string;
  updated_at: string;
}

export interface ComplaintStats {
  total_complaints: number;
  open_complaints: number;
  under_review: number;
  resolved: number;
  closed: number;
  category_distribution: Record<string, number>;
}

// --- PHASE 5 NOTIFICATIONS & AUTOMATED REMINDERS ---

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH' | 'WHATSAPP';
export type NotificationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type NotificationCategory = 'LEASE_EXPIRY' | 'PAYMENT' | 'MAINTENANCE' | 'COMPLAINT' | 'SYSTEM';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'READ' | 'SKIPPED';

export interface Notification {
  id: string;
  user_id?: string;
  type: string;
  title: string;
  message?: string;
  body?: string;
  subject?: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  entity_type?: string;
  entity_id?: string;
  reference_type?: string;
  reference_id?: string;
  action_url?: string;
  action_label?: string;
  metadata_json?: string;
  is_read: boolean;
  read_at?: string;
  sent_at?: string;
  recipient_phone?: string;
  created_at: string;
}

export interface NotificationPreference {
  user_id?: string;
  lease_expiry_in_app: boolean;
  lease_expiry_email: boolean;
  lease_expiry_sms: boolean;
  lease_expiry_whatsapp: boolean;

  payment_in_app: boolean;
  payment_email: boolean;
  payment_sms: boolean;
  payment_whatsapp: boolean;

  maintenance_in_app: boolean;
  maintenance_email: boolean;
  maintenance_sms: boolean;
  maintenance_whatsapp: boolean;

  complaints_in_app: boolean;
  complaints_email: boolean;
  complaints_sms: boolean;
  complaints_whatsapp: boolean;

  system_in_app: boolean;
  system_email: boolean;
  system_sms: boolean;
  system_whatsapp: boolean;
}

export interface NotificationDeliveryLog {
  id: string;
  notification_id?: string;
  user_id?: string;
  channel: string;
  recipient: string;
  subject?: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  error_message?: string;
  metadata_info?: string;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  code: string;
  category: string;
  title_template: string;
  body_template: string;
  action_label?: string;
  action_url_template?: string;
  default_priority: string;
  created_at?: string;
}

export interface ProcessRemindersResult {
  checked_leases: number;
  reminders_created: number;
  reminders_skipped_duplicate: number;
  emails_sent: number;
  emails_skipped: number;
  whatsapp_sent?: number;
  whatsapp_skipped?: number;
  expired_leases_updated: number;
  details: Array<{
    lease_id: string;
    tenant_name?: string;
    unit?: string;
    milestone: string;
    days_remaining: number;
    in_app_sent?: boolean;
    email_sent?: boolean;
    landlord_whatsapp_sent?: boolean;
    tenant_whatsapp_sent?: boolean;
    status: string;
  }>;
}

// --- MESSAGES & CHAT INTERFACE ---

export type MessageType = 'GENERAL' | 'MAINTENANCE';

export interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  sender_role: 'TENANT' | 'LANDLORD' | 'SYSTEM_ADMIN';
  sender_name?: string;
  recipient_name?: string;
  property_id?: string;
  property_name?: string;
  unit_id?: string;
  unit_number?: string;
  tenancy_id?: string;
  message_type: MessageType;
  content: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
  maintenance_request_id?: string;
  maintenance_category?: MaintenanceCategory;
  maintenance_priority?: MaintenancePriority;
  maintenance_status?: MaintenanceStatus;
  maintenance_title?: string;
  maintenance_request?: MaintenanceRequest;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface MessageCreatePayload {
  recipient_id?: string;
  property_id?: string;
  unit_id?: string;
  tenancy_id?: string;
  message_type: MessageType;
  content: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
  maintenance_title?: string;
  maintenance_category?: MaintenanceCategory;
  maintenance_priority?: MaintenancePriority;
  maintenance_request_id?: string;
}

export interface ConversationSummary {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_role: string;
  partner_avatar?: string;
  property_id?: string;
  property_name?: string;
  unit_id?: string;
  unit_number?: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  message_type: MessageType;
  has_maintenance: boolean;
  maintenance_request_id?: string;
  maintenance_title?: string;
  maintenance_status?: string;
}

export type TrackerPaymentStatus =
  | 'PAID'
  | 'PAID_LATE'
  | 'PARTIAL'
  | 'NOT_PAID'
  | 'UPCOMING'
  | 'NEEDS_REVIEW';

export type TrackerMatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export type TrackerPeriodType = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';

export interface TrackerSummary {
  total_expected_amount: number;
  total_received_amount: number;
  total_outstanding_amount: number;
  total_expected_tenants: number;
  total_paid_tenants: number;
  total_unpaid_tenants: number;
  total_partial_tenants: number;
  collection_rate_percent: number;
}

export interface TodayTracking {
  date: string;
  received_today_amount: number;
  received_today_count: number;
  expected_today_amount: number;
  expected_today_count: number;
  paid_today_list: Array<{
    tenant_id: string;
    tenant_name: string;
    property_name: string;
    unit_number: string;
    paid_amount: number;
    paid_time?: string;
    payment_reference?: string;
    channel?: string;
  }>;
  expected_today_list: Array<{
    tenant_id: string;
    tenant_name: string;
    property_name: string;
    unit_number: string;
    expected_amount: number;
    status: TrackerPaymentStatus;
    paid_amount: number;
  }>;
}

export interface TenantTrackerRow {
  tenant_id: string;
  tenant_name: string;
  tenant_phone?: string;
  tenant_email?: string;
  property_id: string;
  property_name: string;
  unit_id: string;
  unit_number: string;
  lease_id: string;
  invoice_id?: string;
  invoice_number?: string;
  expected_amount: number;
  paid_amount: number;
  balance_due: number;
  due_date: string;
  paid_date?: string;
  status: TrackerPaymentStatus;
  match_confidence: TrackerMatchConfidence;
  payment_reference?: string;
  last_transaction_desc?: string;
}

export interface BankStatementItem {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  period_start?: string;
  period_end?: string;
  total_transactions_count: number;
  matched_count: number;
  unmatched_count: number;
  duplicate_count: number;
  total_incoming_amount: number;
  matched_amount: number;
  status: string;
  notes?: string;
}

export interface BankTransactionItem {
  id: string;
  statement_id: string;
  transaction_reference?: string;
  transaction_date: string;
  amount: number;
  payer_name?: string;
  description: string;
  matching_status: string;
  confidence_score: number;
  suggested_tenant_id?: string;
  suggested_invoice_id?: string;
  match_method?: string;
  matched_tenant_name?: string;
  property_name?: string;
  unit_number?: string;
  expected_amount?: number;
  confidence_label?: TrackerMatchConfidence;
  matching_signals?: string[];
  display_status?: string;
  pending_approval?: boolean;
  invoice_number?: string;
}

export type MatchingAnalysisStatus =
  | 'MATCHED'
  | 'NEEDS_REVIEW'
  | 'UNMATCHED'
  | 'DUPLICATE'
  | 'POSSIBLE_MISMATCH'
  | 'PARTIAL';

export interface MatchingAnalysisRow {
  id: string;
  statement_id: string;
  transaction_reference?: string;
  transaction_date: string;
  amount: number;
  currency?: string;
  payer_name?: string;
  bank_statement_name?: string;
  description: string;
  bank_reference_id?: string;
  matched_tenant_id?: string;
  matched_tenant_name?: string;
  property_name?: string;
  unit_number?: string;
  suggested_invoice_id?: string;
  invoice_number?: string;
  expected_amount?: number;
  /** FULLY_PAID | PARTIALLY_PAID | OVERPAID | AMOUNT_REVIEW */
  amount_kind?: string;
  /** Landlord-facing amount classification */
  amount_status?: string;
  payment_amount_status?: string;
  /** e.g. "This bank-statement name appears to match X. Why: similar name + …" */
  match_summary?: string;
  confidence_score: number;
  confidence_label: TrackerMatchConfidence;
  match_method?: string;
  matching_signals: string[];
  matching_status: string;
  display_status: MatchingAnalysisStatus | string;
  review_status?: string;
  pending_approval?: boolean;
  payment_id?: string;
}

export interface PaymentTimelineDay {
  date: string;
  day_number: number;
  is_today: boolean;
  expected_amount: number;
  paid_amount: number;
  tenants_count: number;
  has_overdue: boolean;
}

export interface TrackerDashboardData {
  period_start: string;
  period_end: string;
  period_type: string;
  summary: TrackerSummary;
  today_tracking: TodayTracking;
  tenant_tracking_list: TenantTrackerRow[];
  needs_review_transactions: BankTransactionItem[];
  matching_analysis_report?: MatchingAnalysisRow[];
  recent_statements: BankStatementItem[];
  payment_timeline: PaymentTimelineDay[];
}





// ---------------------------------------------------------------------------
// Communication: landlord -> tenant messages, reminders and delivery results.
// Mirrors backend/services/communication_service.py.
// ---------------------------------------------------------------------------
export type CommunicationLanguage = 'EN' | 'FR' | 'RW';
export type CommunicationChannel = 'IN_APP' | 'SMS' | 'WHATSAPP' | 'EMAIL';
export type DeliveryStatus = 'SENT' | 'FAILED' | 'SKIPPED';

export interface LocalizedMessage {
  title?: string;
  body?: string;
}

export type LocalizedMessages = Record<string, LocalizedMessage>;

export interface MessageTemplate {
  code: string;
  label: string;
  category: string;
  priority: string;
  title: Record<string, string>;
  body: Record<string, string>;
}

export interface TranslateResult {
  source_language: string;
  translations: Record<string, string | null>;
  untranslated_languages: string[];
  notice: string | null;
}

export interface ChannelDeliveryResult {
  channel: CommunicationChannel | string;
  recipient: string;
  status: DeliveryStatus;
  provider: string;
  simulated: boolean;
  attempts: number;
  error: string | null;
  provider_message_id?: string | null;
}

export interface RecipientDeliveryResult {
  tenant_id: string;
  user_id: string;
  name: string;
  language: string;
  phone?: string;
  email?: string;
  title: string;
  body: string;
  channels: ChannelDeliveryResult[];
  delivered: boolean;
}

export interface BulkSendResult {
  batch_id: string;
  template_code: string;
  channels: string[];
  total_recipients: number;
  recipients_delivered: number;
  recipients_failed: number;
  channel_sent: number;
  channel_failed: number;
  channel_skipped: number;
  results: RecipientDeliveryResult[];
}
