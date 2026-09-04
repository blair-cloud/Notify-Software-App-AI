export type Language = 'en' | 'rw' | 'fr';

export interface Translations {
  // Navigation
  features: string;
  pricing: string;
  support: string;
  getStarted: string;
  selectLanguage: string;
  kigaliLocation: string;
  navigation: string;
  faqs: string;

  // Hero Section
  heroTitle1: string;
  heroTitle2: string;
  heroSubtitle: string;
  downloadApp: string;
  liveMallOS: string;
  kigaliHeights: string;
  activeTenantUnit: string;
  switchUnit: string;
  groundFloor: string;
  baseRent: string;
  serviceFee: string;
  totalDue: string;
  confirmAndLog: string;
  paymentLogged: string;
  reconciliationNote: string;

  // Features / Value Proposition
  everythingInOnePlace: string;
  yourMallUnderControl: string;
  valuePropSubtitle: string;
  openFeaturePage: string;
  featureManageUnitsTitle: string;
  featureManageUnitsDesc: string;
  featureCollectRentTitle: string;
  featureCollectRentDesc: string;
  featureStayNotifiedTitle: string;
  featureStayNotifiedDesc: string;

  // Dedicated Pages Common
  backToHome: string;
  actions: string;
  status: string;
  searchPlaceholder: string;
  allFloors: string;
  allStatus: string;
  occupied: string;
  vacant: string;

  // Manage Units Page
  manageUnitsTitle: string;
  manageUnitsSubtitle: string;
  addNewUnit: string;
  addUnit: string;
  totalUnits: string;
  occupiedUnits: string;
  vacantUnits: string;
  allUnits: string;
  searchUnits: string;
  occupancyRate: string;
  totalBaseRevenue: string;
  vacantUnitsAvailable: string;
  floorLabel: string;
  leaseEnds: string;
  monthlyRent: string;
  editUnit: string;
  viewLease: string;
  unitAddedSuccess: string;

  // Collect Rent Page
  collectRentTitle: string;
  collectRentSubtitle: string;
  recordPayment: string;
  collectedThisMonth: string;
  outstandingBalance: string;
  collectionRate: string;
  tenantName: string;
  paymentMethod: string;
  amountPaid: string;
  paymentDate: string;
  paid: string;
  pending: string;
  overdue: string;
  downloadReceipt: string;
  sendReminder: string;
  triggerMoMoPrompt: string;
  promptSentTo: string;
  awaitingTenantPin: string;
  tenantPhone: string;
  amountRwf: string;
  sendPrompt: string;
  tenantAndUnit: string;
  amount: string;
  method: string;
  searchTenantUnit: string;
  collected: string;

  // Stay Notified Page
  stayNotifiedTitle: string;
  stayNotifiedSubtitle: string;
  sendBulkNotice: string;
  activeAutomatedRules: string;
  noticesSentThisMonth: string;
  deliverySuccessRate: string;
  channel: string;
  triggerEvent: string;
  recipients: string;
  recentLogs: string;
  delivered: string;
  failed: string;
  testNotice: string;
  sendBroadcastNotice: string;
  broadcastDispatched: string;
  typeNoticeMessage: string;
  sendBroadcast: string;
  activeAutomations: string;
  recentSentLog: string;
  recipient: string;
  message: string;
  time: string;
  activeRule: string;
  offRule: string;
  liveStatus: string;

  // Support Page
  supportTitle: string;
  supportSubtitle: string;
  searchSupportPlaceholder: string;
  directContactChannels: string;
  whatsAppSupport: string;
  kigaliPhoneLine: string;
  emailDesk: string;
  sendUsAMessage: string;
  yourName: string;
  emailAddress: string;
  phoneNumber: string;
  subjectCategory: string;
  describeInquiry: string;
  sendMessage: string;
  messageSentSuccess: string;
  instantReplies: string;
  responseTime: string;
  within2hrs: string;
  location: string;

  // Pricing Page
  pricingTitle: string;
  pricingSubtitle: string;
  monthlyBilling: string;
  annualBilling: string;
  starterMall: string;
  commercialArcade: string;
  enterpriseComplex: string;
  upTo15Units: string;
  upTo60Units: string;
  unlimitedUnits: string;
  choosePlan: string;
  mostPopular: string;
  perMonth: string;
  perYear: string;
  capabilities: string;
  customDeploymentNote: string;
  talkToKigaliTeam: string;

  // Footer
  footerRights: string;

  // Modals
  getStartedWithNotify: string;
  modalTitle: string;
  modalSubtitle: string;
  propertyNameLabel: string;
  customMallLocation: string;
  totalUnitsLabel: string;
  fullNameLabel: string;
  phoneLabel: string;
  emailLabel: string;
  requestOnboarding: string;
  noCreditCardNote: string;
  requestReceived: string;
  returnToWebsite: string;
  needPersonalOnboarding: string;
  notifySupportFaqs: string;
  dedicatedAssistance: string;
  frequentlyAskedQuestions: string;
  simplifyMallOps: string;
  tellUsAboutProperty: string;
  propertyOrMallName: string;
  customMallName: string;
  totalCommercialUnitsLabel: string;
  unitsLabel: string;
  yourFullName: string;
  phoneWhatsapp: string;
  emailAddressLabel: string;
  noCreditCardRequired: string;
  thankYouMessage: string;
  kigaliTeamReachOut: string;
  toSetupWorkspace: string;

  // Tenant Interface
  tenantMyHome: string;
  tenantLandlord: string;
  tenantProperty: string;
  tenantUnit: string;
  tenantTenancy: string;
  tenantAcceptInvitation: string;
  tenantCreateAccount: string;
  tenantWelcome: string;
  tenantGoToMyHome: string;

  // Phase 4 Maintenance, Complaints & Communication
  maintenance: string;
  maintenanceRequests: string;
  reportIssue: string;
  newMaintenanceRequest: string;
  issueTitle: string;
  issueDescription: string;
  category: string;
  priority: string;
  urgent: string;
  high: string;
  medium: string;
  low: string;
  submitted: string;
  acknowledged: string;
  inProgress: string;
  scheduled: string;
  resolved: string;
  closed: string;
  reopened: string;
  rejected: string;
  plumbing: string;
  electrical: string;
  water: string;
  heatingCooling: string;
  structural: string;
  appliance: string;
  securityCategory: string;
  cleaning: string;
  internet: string;
  otherCategory: string;
  assignedTechnician: string;
  scheduledFor: string;
  estimatedCost: string;
  actualCost: string;
  addToExpenses: string;
  addedToExpenses: string;
  confirmResolution: string;
  confirmResolutionPrompt: string;
  reopenRequest: string;
  reopenPrompt: string;
  tenantNotes: string;
  landlordNotes: string;
  conversation: string;
  assignWorker: string;
  scheduleVisit: string;
  markResolved: string;
  workersTechnicians: string;
  addWorker: string;
  workerName: string;
  workerPhone: string;
  specialization: string;
  complaints: string;
  fileComplaint: string;
  newComplaint: string;
  complaintSubject: string;
  underReview: string;
  landlordResponse: string;
  noise: string;
  neighbor: string;
  propertyCondition: string;
  landlordService: string;
  utility: string;
  payment: string;
  leaseCategory: string;
  notificationCenter: string;
  notifications: string;
  markAllAsRead: string;
  noNotifications: string;
  unread: string;

  // Comprehensive Tenant Experience
  navHome: string;
  navLease: string;
  navPayments: string;
  navMessages: string;
  navProfile: string;
  verifiedTenant: string;
  activeTenancy: string;
  rentalUnit: string;
  unitLabel: string;
  floor: string;
  welcomeBack: string;
  rentUpToDate: string;
  rentDueWarning: string;
  rentOverdueWarning: string;
  payRent: string;
  viewLeaseDetails: string;
  reportMaintenance: string;
  messageLandlord: string;
  outstandingRent: string;
  nextDueDate: string;
  openRequests: string;
  daysRemaining: string;
  daysTotalLease: string;
  leaseExpires: string;
  leaseCountdown: string;
  signedDocument: string;
  activeLeaseStatus: string;
  leaseExpiredStatus: string;
  expiringSoonStatus: string;
  expiringTwoMonths: string;
  recentInvoices: string;
  recentReceipts: string;
  noInvoices: string;
  noReceipts: string;
  viewAll: string;
  leaseAgreementOverview: string;
  contractReference: string;
  startDate: string;
  endDate: string;
  leaseDuration: string;
  financialTerms: string;
  baseRentAmount: string;
  securityDeposit: string;
  serviceCharge: string;
  paymentFrequency: string;
  latePenalty: string;
  keyTermsClauses: string;
  requestRenewal: string;
  downloadAgreement: string;
  viewSignedPdf: string;
  rentalInvoices: string;
  paymentReceiptsHistory: string;
  totalOutstandingBalance: string;
  payFullBalance: string;
  invoiceNumber: string;
  period: string;
  totalAmount: string;
  balanceDue: string;
  viewInvoice: string;
  payNow: string;
  verifiedReceipt: string;
  viewAndPrint: string;
  paymentTransactionsRecord: string;
  paymentRef: string;
  transactionRef: string;
  date: string;
  noTransactions: string;
  landlordSupport: string;
  chat: string;
  online: string;
  typeMessage: string;
  describeMaintenance: string;
  noChatsFound: string;
  startConversation: string;
  searchChats: string;
  attachedFile: string;
  photoAttached: string;
  profileDetails: string;
  passwordSecurity: string;
  notificationChannels: string;
  appLanguage: string;
  firstName: string;
  lastName: string;
  nationalIdPassport: string;
  occupationBusiness: string;
  saveChanges: string;
  saving: string;
  profileSavedSuccess: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  updatePassword: string;
  passwordSavedSuccess: string;
  notificationAlertChannels: string;
  configureAlertsDesc: string;
  rentInvoicesReceipts: string;
  rentInvoicesReceiptsDesc: string;
  maintenanceChat: string;
  maintenanceChatDesc: string;
  leaseTermsExpiry: string;
  leaseTermsExpiryDesc: string;
  inApp: string;
  email: string;
  sms: string;
  whatsapp: string;
  saveNotificationPrefs: string;
  appLanguagePref: string;
  appLanguagePrefDesc: string;
  english: string;
  kinyarwanda: string;
  french: string;
  englishDesc: string;
  kinyarwandaDesc: string;
  frenchDesc: string;
  emergencyContacts: string;
  emergencyContactsDesc: string;
  securityEmergency: string;
  buildingCaretaker: string;
  signOutTenant: string;
  signOutTenantDesc: string;
  logOut: string;
  rentPaymentPortal: string;
  paymentSuccessful: string;
  paymentPendingVerification: string;
  selectPaymentMethod: string;
  mobileMoney: string;
  bankTransfer: string;
  creditDebitCard: string;
  enterMobileNumber: string;
  momoPromptDesc: string;
  confirmAndPay: string;
  officialPaymentReceipt: string;
  printSaveReceipt: string;
  close: string;
  rentalInvoice: string;
  billedTo: string;
  billingPeriod: string;
  itemDescription: string;
  monthlyRentItem: string;
  discountApplied: string;
  latePaymentFee: string;
  subtotal: string;
  totalDueNow: string;
  partiallyPaid: string;
  invoiceDetails: string;
  downloadInvoice: string;
  issueDate: string;
  dueDate: string;
  property: string;
  to: string;
  type: string;
  payRentNow: string;
  invalidAmount: string;
  amountExceedsBalance: string;
  payRentOnline: string;
  invoices: string;
  paymentSubmittedVerification: string;
  paymentConfirmedNotice: string;
  hasBeenConfirmed: string;
  offlineSlipSubmittedNotice: string;
  submittedVerification: string;
  transactionReference: string;
  viewReceipt: string;
  creditCard: string;
  offlinePaymentMethod: string;
  cash: string;
  amountToPay: string;
  maximumAllowed: string;
  cancel: string;
  processingPayment: string;
  officialReceipt: string;
  paymentVerifiedConfirmed: string;
  issuedOn: string;
  receiptNumber: string;
  paymentId: string;
  propertyUnit: string;
  issuedBy: string;
  digitalReceiptDisclaimer: string;
  chats: string;
  loadingConversations: string;
  startConversationManagement: string;
  tapToChat: string;
  back: string;
  landlordPropertySupport: string;
  describeMaintenanceIssue: string;
  goodMorning: string;
  goodAfternoon: string;
  goodEvening: string;
  tenantSubtitle: string;
  rentAndInvoices: string;
  allCaughtUp: string;
  noPendingRentCharges: string;
  viewPaymentRecords: string;
  messagesSupport: string;
  chatLandlord: string;
  recentMaintenanceRequests: string;
  viewInChat: string;
  recentRentInvoices: string;
  residentialTenancyAgreement: string;
  tenancyGovernedRwanda: string;
  viewSignedAgreement: string;
  unitAllocated: string;
  leaseTerm: string;
  financialTermsSchedule: string;
  paidHeldEscrow: string;
  paymentMethodsAccepted: string;
  instantDigitalReceipts: string;
  buildingGuidelines: string;
  quietHours: string;
  currentOutstandingBalance: string;
  allRentInvoices: string;
  officialPaymentReceipts: string;
  reopenMaintenanceRequest: string;
  reopenExplanationPlaceholder: string;
  submitReopen: string;
  propertyManagement: string;
  maintenanceSupport: string;
  confirmDone: string;
  reopen: string;
  days: string;
  tenantLease: string;
  maintenanceInquiry: string;
  submittedMaintenancePhoto: string;
  sentAnAttachment: string;
  removeAttachment: string;
  attachPhotoDocument: string;
  attachSamplePhoto: string;
  photoAttachment: string;
  backToDashboard: string;
  ticketInfo: string;
  complaintSubmitted: string;
  complaintAcknowledged: string;
  complaintUnderReview: string;
  complaintResolved: string;
  complaintClosed: string;
  attachFile: string;
  attachmentUploadReady: string;
  tenantLedger: string;
  totalInvoiced: string;
  invoicesGenerated: string;
  verifiedTransactions: string;
  currentBalanceDue: string;
  allSettled: string;
  paymentPending: string;
  overdueBalance: string;
  requiresImmediateAction: string;
  noOverdueCharges: string;
  quickActions: string;
  outstanding: string;
  sendRentReminder: string;
  chronologicalLedger: string;
  invoicesAndCharges: string;
  paymentsAndSlips: string;
  officialReceipts: string;
  reference: string;
  debitCharge: string;
  creditPayment: string;
  noLedgerRecordsFound: string;
  noReceiptsGenerated: string;
  closeLedger: string;
  exportCsv: string;
  monthlyRentInvoice: string;
  paymentVia: string;
  leaseAgreementDocument: string;
  currentDocument: string;
  versionHistory: string;
  uploadNewVersion: string;
  downloadAgreementDoc: string;
  storagePath: string;
  uploadedAt: string;
  uploadedBy: string;
  contractDetailsVerification: string;
  contractDetailsAndVerification: string;
  legalComplianceMet: string;
  noSignedLeaseUploaded: string;
  noSignedLeaseDocumentUploaded: string;
  noSignedLeaseDesc: string;
  draftLeaseNotice: string;
  uploadAgreementNow: string;
  uploadAgreementDocumentNow: string;
  versionHistoryDesc: string;
  auditLogVersionHistory: string;
  noVersionHistoryFound: string;
  noVersionHistory: string;
  uploadNewVersionDesc: string;
  uploadNewVersionNotice: string;
  savePublishNewVersion: string;
  saveAndPublishNewVersion: string;
  uploadingVersioning: string;
  uploadingAndVersioning: string;
  downloadThisVersion: string;
  pleaseSelectDocumentToUpload: string;
  newDocumentVersionUploadedSuccess: string;
  paymentFailed: string;
  due: string;
  balance: string;
  awaitingVerification: string;
  activeLease: string;
  activeRequests: string;
  chatDirectDesc: string;
  navMaintenance: string;
  assignedWorker: string;
  action: string;
  view: string;
  pay: string;
  total: string;
  dueOnOrBefore5th: string;
  maintenanceDirectReporting: string;
  garbageCollectionSchedule: string;
  propertyManagementAndLandlord: string;
  landlord: string;
  emergencyContact: string;
  emailSupport: string;
  messagePropertyManager: string;
  rentInvoices: string;
  paymentReceipts: string;
  invoiceType: string;
  noRentInvoicesFound: string;
  viewDetails: string;
  noPaymentReceiptsYet: string;
  issued: string;
  noPaymentTransactionsRecorded: string;
  today: string;
}


export const translations: Record<Language, Translations> = {
  en: {
    // Navigation
    features: 'Features',
    pricing: 'Pricing',
    support: 'Support',
    getStarted: 'Get Started',
    selectLanguage: 'Select Language',
    kigaliLocation: 'Kigali 🇷🇼',
    navigation: 'Navigation',
    faqs: 'FAQs',

    // Hero Section
    heroTitle1: 'Rent management, ',
    heroTitle2: 'simplified.',
    heroSubtitle: 'One simple system for malls to manage tenants, collect rent, and stay on top of every payment in Kigali.',
    downloadApp: 'Download Notify App',
    liveMallOS: 'Live Mall OS',
    kigaliHeights: 'Kigali Heights',
    activeTenantUnit: 'Active Tenant Unit',
    switchUnit: 'Switch Unit',
    groundFloor: 'Ground Floor • Retail Space',
    baseRent: 'Monthly Base Rent:',
    serviceFee: 'Service Fee & Security:',
    totalDue: 'Total Due Today:',
    confirmAndLog: 'Confirm & Log Rent',
    paymentLogged: 'Payment Logged & Notice Sent!',
    reconciliationNote: 'Instant MoMo & Bank payment reconciliation',

    // Features / Value Proposition
    everythingInOnePlace: 'Everything in one place',
    yourMallUnderControl: 'Your mall, under control.',
    valuePropSubtitle: 'Notify brings your rental operations, tenants, payments, and reporting together in one simple workspace.',
    openFeaturePage: 'Open feature page',
    featureManageUnitsTitle: 'Manage Units',
    featureManageUnitsDesc: 'Track every shop, office, kiosk, and commercial space from one place.',
    featureCollectRentTitle: 'Collect Rent',
    featureCollectRentDesc: 'Track payments, outstanding balances, invoices, and rental schedules without manual follow-ups.',
    featureStayNotifiedTitle: 'Stay Notified',
    featureStayNotifiedDesc: 'Automatically stay informed about upcoming payments, overdue rent, and important tenant activity.',

    // Dedicated Pages Common
    backToHome: 'Back to Home',
    actions: 'Actions',
    status: 'Status',
    searchPlaceholder: 'Search...',
    allFloors: 'All Floors',
    allStatus: 'All Status',
    occupied: 'Occupied',
    vacant: 'Vacant',

    // Manage Units Page
    manageUnitsTitle: 'Commercial Units & Tenant Roster',
    manageUnitsSubtitle: 'Monitor occupancy, lease terms, and square footage across all floors in your commercial complex.',
    addNewUnit: 'Add New Unit',
    addUnit: 'Add Unit',
    totalUnits: 'Total Units',
    occupiedUnits: 'Occupied',
    vacantUnits: 'Vacant',
    allUnits: 'All Status',
    searchUnits: 'Search units or tenants...',
    occupancyRate: 'Occupancy Rate',
    totalBaseRevenue: 'Total Base Revenue',
    vacantUnitsAvailable: 'Vacant Units Available',
    floorLabel: 'Floor',
    leaseEnds: 'Lease Ends',
    monthlyRent: 'Monthly Rent',
    editUnit: 'Edit Unit',
    viewLease: 'View Lease',
    unitAddedSuccess: 'New unit successfully added to mall inventory!',

    // Collect Rent Page
    collectRentTitle: 'Rent Collection & Payment Log',
    collectRentSubtitle: 'Track real-time Mobile Money (MTN MoMo & Airtel) transfers, bank deposits, and outstanding invoices.',
    recordPayment: 'Record Manual Payment',
    collectedThisMonth: 'Collected This Month',
    outstandingBalance: 'Outstanding Balances',
    collectionRate: 'Collection Rate',
    tenantName: 'Tenant Name',
    paymentMethod: 'Payment Method',
    amountPaid: 'Amount Paid',
    paymentDate: 'Payment Date',
    paid: 'Paid',
    pending: 'Pending',
    overdue: 'Overdue',
    downloadReceipt: 'Download Receipt',
    sendReminder: 'Send Reminder',
    triggerMoMoPrompt: 'Trigger Live MoMo Payment Prompt',
    promptSentTo: 'Prompt sent to',
    awaitingTenantPin: 'Awaiting tenant PIN...',
    tenantPhone: 'Tenant Phone',
    amountRwf: 'Amount (RWF)',
    sendPrompt: 'Send Prompt',
    tenantAndUnit: 'Tenant & Unit',
    amount: 'Amount',
    method: 'Method',
    searchTenantUnit: 'Search tenant or unit...',
    collected: 'Collected',

    // Stay Notified Page
    stayNotifiedTitle: 'Automated Tenant Notifications & Alerts',
    stayNotifiedSubtitle: 'Configure automated WhatsApp, SMS, and Email payment reminders, maintenance notices, and lease renewal alerts.',
    sendBulkNotice: 'Send Bulk Notice',
    activeAutomatedRules: 'Active Automated Rules',
    noticesSentThisMonth: 'Notices Sent This Month',
    deliverySuccessRate: 'Delivery Success Rate',
    channel: 'Channel',
    triggerEvent: 'Trigger Event',
    recipients: 'Recipients',
    recentLogs: 'Recent Notification Logs',
    delivered: 'Delivered',
    failed: 'Failed',
    testNotice: 'Test Notification',
    sendBroadcastNotice: 'Send Broadcast Notice',
    broadcastDispatched: 'Broadcast dispatched to all commercial tenants.',
    typeNoticeMessage: 'Type notice message to send to all tenants...',
    sendBroadcast: 'Send Broadcast',
    activeAutomations: 'Active Automations',
    recentSentLog: 'Recent Sent Log',
    recipient: 'Recipient',
    message: 'Message',
    time: 'Time',
    activeRule: 'Active',
    offRule: 'Off',
    liveStatus: 'Live',

    // Support Page
    supportTitle: 'How can we help you?',
    supportSubtitle: 'Search our knowledge base or reach our dedicated Kigali support team for personalized assistance.',
    searchSupportPlaceholder: 'Search support articles, guide topics, or FAQs...',
    directContactChannels: 'Direct Contact Channels',
    whatsAppSupport: 'WhatsApp Support',
    kigaliPhoneLine: 'Kigali Phone Line',
    emailDesk: 'Email Desk',
    sendUsAMessage: 'Send Us a Message',
    yourName: 'Your Name',
    emailAddress: 'Email Address',
    phoneNumber: 'Phone Number',
    subjectCategory: 'Subject / Category',
    describeInquiry: 'Describe your inquiry or issue',
    sendMessage: 'Send Support Message',
    messageSentSuccess: 'Thank you! Our support team in Kigali will reply shortly.',
    instantReplies: 'Instant Replies',
    responseTime: 'Response Time',
    within2hrs: 'Within 2 hrs',
    location: 'Location',

    // Pricing Page
    pricingTitle: 'Simple, predictable pricing.',
    pricingSubtitle: 'Start with the tools your commercial property needs today. Scale seamlessly as you grow.',
    monthlyBilling: 'Monthly Billing',
    annualBilling: 'Annual Billing (Save 20%)',
    starterMall: 'Starter Mall',
    commercialArcade: 'Commercial Arcade',
    enterpriseComplex: 'Enterprise Complex',
    upTo15Units: 'Up to 15 commercial units',
    upTo60Units: 'Up to 60 commercial units',
    unlimitedUnits: 'Unlimited commercial units & multi-mall',
    choosePlan: 'Choose Plan',
    mostPopular: 'Most Popular',
    perMonth: '/ month',
    perYear: '/ year',
    capabilities: 'Capabilities',
    customDeploymentNote: 'Need a custom deployment for multiple shopping malls across Rwanda?',
    talkToKigaliTeam: 'Talk to our Kigali team',

    // Footer
    footerRights: '© 2026 Notify. All rights reserved.',

    // Modals
    getStartedWithNotify: 'Get Started with Notify',
    modalTitle: 'Simplify your mall operations',
    modalSubtitle: 'Tell us about your property in Kigali. Our team will configure your custom workspace within 24 hours.',
    propertyNameLabel: 'Property or Mall Name',
    customMallLocation: 'Custom Mall Name & Location',
    totalUnitsLabel: 'Total Commercial Units',
    fullNameLabel: 'Your Full Name',
    phoneLabel: 'Phone / WhatsApp',
    emailLabel: 'Email Address',
    requestOnboarding: 'Request Custom Mall Onboarding',
    noCreditCardNote: 'No credit card required • Onboarding supported in English, Kinyarwanda & French',
    requestReceived: 'Request Received!',
    returnToWebsite: 'Return to Website',
    needPersonalOnboarding: 'Need personal onboarding for your mall?',
    notifySupportFaqs: 'Notify Support & FAQs',
    dedicatedAssistance: 'Dedicated assistance for Kigali property managers',
    frequentlyAskedQuestions: 'Frequently Asked Questions',
    simplifyMallOps: 'Simplify your mall operations',
    tellUsAboutProperty: 'Tell us about your property in Kigali. Our team will configure your custom workspace within 24 hours.',
    propertyOrMallName: 'Property or Mall Name',
    customMallName: 'Custom Mall Name & Location',
    totalCommercialUnitsLabel: 'Total Commercial Units',
    unitsLabel: 'Units',
    yourFullName: 'Your Full Name',
    phoneWhatsapp: 'Phone / WhatsApp',
    emailAddressLabel: 'Email Address',
    noCreditCardRequired: 'No credit card required • Onboarding supported in English, Kinyarwanda & French',
    thankYouMessage: 'Thank you',
    kigaliTeamReachOut: 'Our local Kigali team will reach out on',
    toSetupWorkspace: 'to setup your workspace for',

    // Tenant Interface
    tenantMyHome: 'My Home',
    tenantLandlord: 'Landlord',
    tenantProperty: 'Property',
    tenantUnit: 'Unit',
    tenantTenancy: 'Tenancy Status',
    tenantAcceptInvitation: 'Accept Invitation',
    tenantCreateAccount: 'Create Account',
    tenantWelcome: 'Welcome to Notify',
    tenantGoToMyHome: 'Go to My Home',

    // Phase 4 Maintenance, Complaints & Communication
    maintenance: 'Maintenance',
    maintenanceRequests: 'Maintenance Requests',
    reportIssue: 'Report an Issue',
    newMaintenanceRequest: 'New Maintenance Request',
    issueTitle: 'Issue Title',
    issueDescription: 'Description of the Issue',
    category: 'Category',
    priority: 'Priority',
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    submitted: 'Submitted',
    acknowledged: 'Acknowledged',
    inProgress: 'In Progress',
    scheduled: 'Scheduled',
    resolved: 'Resolved',
    closed: 'Closed',
    reopened: 'Reopened',
    rejected: 'Rejected',
    plumbing: 'Plumbing & Pipes',
    electrical: 'Electrical & Power',
    water: 'Water Supply',
    heatingCooling: 'HVAC & Cooling',
    structural: 'Structural & Walls',
    appliance: 'Appliances & Fittings',
    securityCategory: 'Locks & Security',
    cleaning: 'Cleaning & Sanitation',
    internet: 'Internet & Telecom',
    otherCategory: 'General / Other',
    assignedTechnician: 'Assigned Technician',
    scheduledFor: 'Scheduled For',
    estimatedCost: 'Estimated Cost',
    actualCost: 'Actual Cost',
    addToExpenses: 'Add to Expenses',
    addedToExpenses: 'Added to Expenses',
    confirmResolution: 'Confirm Resolution',
    confirmResolutionPrompt: 'Has this issue been completely fixed to your satisfaction?',
    reopenRequest: 'Reopen Request',
    reopenPrompt: 'Explain what still needs attention',
    tenantNotes: 'Tenant Notes',
    landlordNotes: 'Landlord Notes',
    conversation: 'Conversation Thread',
    assignWorker: 'Assign & Schedule',
    scheduleVisit: 'Schedule Visit',
    markResolved: 'Mark as Resolved',
    workersTechnicians: 'Technicians & Workers',
    addWorker: 'Add Technician',
    workerName: 'Technician Name',
    workerPhone: 'Phone Number',
    specialization: 'Specialization',
    complaints: 'Complaints & Inquiries',
    fileComplaint: 'Submit Complaint',
    newComplaint: 'New Complaint / Inquiry',
    complaintSubject: 'Subject',
    underReview: 'Under Review',
    landlordResponse: 'Landlord Response',
    noise: 'Noise Disturbance',
    neighbor: 'Neighbor Dispute',
    propertyCondition: 'Property Condition',
    landlordService: 'Management & Service',
    utility: 'Utility Bills',
    payment: 'Payment & Billing',
    leaseCategory: 'Lease & Contract',
    notificationCenter: 'Notification Center',
    notifications: 'Notifications',
    markAllAsRead: 'Mark All as Read',
    noNotifications: 'No notifications at this time',
    unread: 'Unread',

    // Comprehensive Tenant Experience
    navHome: 'Home',
    navLease: 'Lease',
    navPayments: 'Payments',
    navMessages: 'Messages',
    navProfile: 'Profile & Settings',
    verifiedTenant: 'VERIFIED TENANT',
    activeTenancy: 'Active Tenancy',
    rentalUnit: 'Rental Unit',
    unitLabel: 'Unit',
    floor: 'Floor',
    welcomeBack: 'Welcome back',
    rentUpToDate: 'Your rent payments are fully up to date.',
    rentDueWarning: 'Rent is due. Please make a payment before the due date.',
    rentOverdueWarning: 'Rent is overdue. Please settle your outstanding balance.',
    payRent: 'Pay Rent',
    viewLeaseDetails: 'View Lease Details',
    reportMaintenance: 'Report Maintenance',
    messageLandlord: 'Message Landlord',
    outstandingRent: 'Outstanding Rent',
    nextDueDate: 'Next Due Date',
    openRequests: 'Open Requests',
    daysRemaining: 'days remaining',
    daysTotalLease: 'days total lease duration',
    leaseExpires: 'Lease expires',
    leaseCountdown: 'Lease Duration & Countdown',
    signedDocument: 'Signed Document',
    activeLeaseStatus: 'Active Lease',
    leaseExpiredStatus: 'Lease Expired',
    expiringSoonStatus: 'Expiring Soon',
    expiringTwoMonths: 'Expiring in ~2 Months',
    recentInvoices: 'Recent Rent Invoices',
    recentReceipts: 'Official Rental Payment Receipts',
    noInvoices: 'No rent invoices found.',
    noReceipts: 'No payment receipts generated yet. Receipts will appear here automatically upon payment verification.',
    viewAll: 'View All',
    leaseAgreementOverview: 'Lease Agreement Overview',
    contractReference: 'Contract Reference',
    startDate: 'Start Date',
    endDate: 'End Date',
    leaseDuration: 'Duration',
    financialTerms: 'Financial Terms & Breakdown',
    baseRentAmount: 'Monthly Base Rent',
    securityDeposit: 'Security Deposit (Garanti)',
    serviceCharge: 'Service & Maintenance Fee',
    paymentFrequency: 'Payment Frequency',
    latePenalty: 'Late Payment Penalty',
    keyTermsClauses: 'Key Terms & Special Clauses',
    requestRenewal: 'Request Lease Renewal',
    downloadAgreement: 'Download Signed Lease (PDF)',
    viewSignedPdf: 'View Signed Agreement',
    rentalInvoices: 'Rental Invoices',
    paymentReceiptsHistory: 'Receipts & History',
    totalOutstandingBalance: 'Total Outstanding Balance',
    payFullBalance: 'Pay Full Balance',
    invoiceNumber: 'Invoice #',
    period: 'Period',
    totalAmount: 'Total Amount',
    balanceDue: 'Balance Due',
    viewInvoice: 'View Invoice',
    payNow: 'Pay Now',
    verifiedReceipt: 'VERIFIED RECEIPT',
    viewAndPrint: 'View & Print',
    paymentTransactionsRecord: 'Payment Transactions Record',
    paymentRef: 'Payment Ref',
    transactionRef: 'Transaction Ref',
    date: 'Date',
    noTransactions: 'No payment transactions recorded yet.',
    landlordSupport: 'Landlord & Property Support',
    chat: 'Chat',
    online: 'Online',
    typeMessage: 'Type a message...',
    describeMaintenance: 'Describe your maintenance issue...',
    noChatsFound: 'No chats found',
    startConversation: 'Start a conversation with management.',
    searchChats: 'Search conversations...',
    attachedFile: 'Attached File',
    photoAttached: 'Photo Attached',
    profileDetails: 'Profile Details',
    passwordSecurity: 'Password & Security',
    notificationChannels: 'Notification Channels',
    appLanguage: 'App Language',
    firstName: 'First Name',
    lastName: 'Last Name',
    nationalIdPassport: 'National ID / Passport Number',
    occupationBusiness: 'Occupation / Business Description',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    profileSavedSuccess: 'Your profile details have been saved successfully.',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
    updatePassword: 'Update Password',
    passwordSavedSuccess: 'Your password has been changed successfully.',
    notificationAlertChannels: 'Notification & Alert Channels',
    configureAlertsDesc: 'Configure how and when you receive rent reminders, invoices, and maintenance updates.',
    rentInvoicesReceipts: 'Rent Invoices & Payment Receipts',
    rentInvoicesReceiptsDesc: 'Alerts for new monthly invoices, due date reminders, and confirmed receipts.',
    maintenanceChat: 'Maintenance & Landlord Chat',
    maintenanceChatDesc: 'Live technician scheduling updates, chat replies, and work orders.',
    leaseTermsExpiry: 'Lease Terms & Expiry Warnings',
    leaseTermsExpiryDesc: '60-day, 30-day, and 14-day automated contract milestone alerts.',
    inApp: 'In-App',
    email: 'Email',
    sms: 'SMS',
    whatsapp: 'WhatsApp',
    saveNotificationPrefs: 'Save Notification Preferences',
    appLanguagePref: 'App Language Preference',
    appLanguagePrefDesc: 'Select your preferred language. All tenant portal views, messages, and invoices will adapt automatically.',
    english: 'English (EN)',
    kinyarwanda: 'Ikinyarwanda (RW)',
    french: 'Français (FR)',
    englishDesc: 'Primary commercial and official language',
    kinyarwandaDesc: 'Ururimi rw\'igihugu n\'itumanaho i Kigali',
    frenchDesc: 'Langue officielle et correspondance',
    emergencyContacts: 'Emergency & Management Contacts',
    emergencyContactsDesc: '24/7 dedicated contact numbers for immediate building assistance.',
    securityEmergency: '24/7 Security & Emergency',
    buildingCaretaker: 'Building Caretaker & Maintenance',
    signOutTenant: 'Sign Out of Tenant Account',
    signOutTenantDesc: 'Terminate your active tenant portal session on this device. You will need your login credentials to sign back in.',
    logOut: 'Log Out',
    rentPaymentPortal: 'Rent Payment Portal',
    paymentSuccessful: 'Payment Successful!',
    paymentPendingVerification: 'Payment Submitted for Verification',
    selectPaymentMethod: 'Select Payment Method',
    mobileMoney: 'Mobile Money (MTN / Airtel)',
    bankTransfer: 'Bank Transfer / Deposit',
    creditDebitCard: 'Credit / Debit Card',
    enterMobileNumber: 'Enter Mobile Money Phone Number',
    momoPromptDesc: 'A secure USSD payment prompt will be triggered directly to your phone. Enter your PIN to approve.',
    confirmAndPay: 'Confirm & Pay',
    officialPaymentReceipt: 'Official Payment Receipt',
    printSaveReceipt: 'Print / Save PDF Receipt',
    close: 'Close',
    rentalInvoice: 'Rental Invoice',
    billedTo: 'Billed To (Tenant)',
    billingPeriod: 'Billing Period',
    itemDescription: 'Item Description',
    monthlyRentItem: 'Monthly Rent',
    discountApplied: 'Discount Applied',
    latePaymentFee: 'Late Payment Penalty',
    subtotal: 'Subtotal',
    totalDueNow: 'Total Balance Due',
    partiallyPaid: 'Partially Paid',
    invoiceDetails: 'Rental Invoice',
    downloadInvoice: 'Print / Save Invoice',
    issueDate: 'Issue Date',
    dueDate: 'Due Date',
    property: 'Property',
    to: 'to',
    type: 'Type',
    payRentNow: 'Pay Rent Now',
    invalidAmount: 'Payment amount must be greater than zero.',
    amountExceedsBalance: 'Amount cannot exceed invoice balance due of',
    payRentOnline: 'Rent Payment Portal',
    invoices: 'Invoice',
    paymentSubmittedVerification: 'Payment Submitted for Verification',
    paymentConfirmedNotice: 'Your payment of',
    hasBeenConfirmed: 'has been confirmed. Receipt generated.',
    offlineSlipSubmittedNotice: 'Your offline payment slip for',
    submittedVerification: 'was submitted. Your landlord will verify and issue your receipt.',
    transactionReference: 'Reference',
    viewReceipt: 'View Official Receipt',
    creditCard: 'Credit/Debit Card',
    offlinePaymentMethod: 'Offline Payment Method',
    cash: 'Direct Cash Payment',
    amountToPay: 'Amount to Pay (RWF)',
    maximumAllowed: 'Maximum allowed',
    cancel: 'Cancel',
    processingPayment: 'Processing Payment...',
    officialReceipt: 'Official Payment Receipt',
    paymentVerifiedConfirmed: 'Payment Verified & Confirmed',
    issuedOn: 'Issued on',
    receiptNumber: 'Receipt Number',
    paymentId: 'Payment ID',
    propertyUnit: 'Property & Unit',
    issuedBy: 'Issued By',
    digitalReceiptDisclaimer: 'This is an officially generated digital receipt from Notify Property Management Kigali.',
    chats: 'Chats',
    loadingConversations: 'Loading conversations...',
    startConversationManagement: 'Start a conversation with management.',
    tapToChat: 'Tap to chat',
    back: 'Back to conversations',
    landlordPropertySupport: 'Landlord & Property Support',
    describeMaintenanceIssue: 'Describe your maintenance issue...',
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    tenantSubtitle: 'Manage your rental agreement, maintenance requests, and payments.',
    rentAndInvoices: 'Rent & Invoices',
    allCaughtUp: 'All Caught Up',
    noPendingRentCharges: 'No pending rent charges on your account.',
    viewPaymentRecords: 'View Payment Records',
    messagesSupport: 'Messages & Support',
    chatLandlord: 'Chat Landlord',
    recentMaintenanceRequests: 'Recent Maintenance Requests',
    viewInChat: 'View in Chat',
    recentRentInvoices: 'Recent Rent Invoices',
    residentialTenancyAgreement: 'Residential Tenancy Agreement',
    tenancyGovernedRwanda: 'Standard residential tenancy governed by the laws of the Republic of Rwanda.',
    viewSignedAgreement: 'View Signed Agreement Document',
    unitAllocated: 'Unit Allocated',
    leaseTerm: 'Lease Term',
    financialTermsSchedule: 'Financial Terms & Payment Schedule',
    paidHeldEscrow: 'Paid & Held in Escrow',
    paymentMethodsAccepted: 'Payment Methods Accepted',
    instantDigitalReceipts: 'Instant digital receipts issued',
    buildingGuidelines: 'Essential Building Guidelines',
    quietHours: 'Quiet Hours: 10:00 PM – 7:00 AM daily.',
    currentOutstandingBalance: 'Current Outstanding Balance',
    allRentInvoices: 'All Rent Invoices',
    officialPaymentReceipts: 'Official Rental Payment Receipts',
    reopenMaintenanceRequest: 'Reopen Maintenance Request',
    reopenExplanationPlaceholder: 'Explain why the issue requires further attention...',
    submitReopen: 'Submit Reopen',
    propertyManagement: 'Property Management',
    maintenanceSupport: 'Maintenance Support',
    confirmDone: 'Confirm Done',
    reopen: 'Reopen',
    days: 'Days',
    tenantLease: 'Lease',
    maintenanceInquiry: 'Maintenance Inquiry',
    submittedMaintenancePhoto: 'Submitted maintenance photo',
    sentAnAttachment: 'Sent an attachment',
    removeAttachment: 'Remove attachment',
    attachPhotoDocument: 'Attach photo or document',
    attachSamplePhoto: 'Attach sample photo',
    photoAttachment: 'Photo attachment',
    backToDashboard: 'Back to dashboard',
    ticketInfo: 'Ticket info',
    complaintSubmitted: 'Submitted',
    complaintAcknowledged: 'Acknowledged',
    complaintUnderReview: 'Under Review',
    complaintResolved: 'Resolved',
    complaintClosed: 'Closed',
    attachFile: 'Attach file',
    attachmentUploadReady: 'Attachment upload ready.',
    tenantLedger: 'Tenant Ledger',
    totalInvoiced: 'Total Invoiced',
    invoicesGenerated: 'invoices generated',
    verifiedTransactions: 'verified transactions',
    currentBalanceDue: 'Current Balance Due',
    allSettled: 'All settled',
    paymentPending: 'Payment pending',
    overdueBalance: 'Overdue Balance',
    requiresImmediateAction: 'Requires immediate action',
    noOverdueCharges: 'No overdue charges',
    quickActions: 'Quick Actions',
    outstanding: 'Outstanding',
    sendRentReminder: 'Send Rent Reminder',
    chronologicalLedger: 'Chronological Ledger',
    invoicesAndCharges: 'Invoices & Charges',
    paymentsAndSlips: 'Payments & Slips',
    officialReceipts: 'Official Receipts',
    reference: 'Reference',
    debitCharge: 'Debit (Charge)',
    creditPayment: 'Credit (Payment)',
    noLedgerRecordsFound: 'No financial ledger records found for this tenant.',
    noReceiptsGenerated: 'No receipts generated yet for this tenant.',
    closeLedger: 'Close Ledger',
    exportCsv: 'Export CSV',
    monthlyRentInvoice: 'Monthly Rent Invoice',
    paymentVia: 'Payment via',
    leaseAgreementDocument: 'Lease Agreement Document',
    currentDocument: 'Current Document',
    versionHistory: 'Version History',
    uploadNewVersion: 'Upload New Version',
    downloadAgreementDoc: 'Download Agreement',
    storagePath: 'Storage Path',
    uploadedAt: 'Uploaded At',
    contractDetailsVerification: 'Contract Details & Verification',
    legalComplianceMet: 'Legal Compliance Met',
    noSignedLeaseUploaded: 'No Signed Lease Document Uploaded',
    noSignedLeaseDesc: 'This lease is currently in draft or incomplete state. A signed lease agreement document is required before this lease can be activated.',
    uploadAgreementNow: 'Upload Agreement Document Now',
    uploadAgreementDocumentNow: 'Upload Agreement Document Now',
    uploadedBy: 'Uploaded by',
    contractDetailsAndVerification: 'Contract Details & Verification',
    noSignedLeaseDocumentUploaded: 'No Signed Lease Document Uploaded',
    draftLeaseNotice: 'This lease is currently in draft or incomplete state. A signed lease agreement document is required before this lease can be activated.',
    auditLogVersionHistory: 'Audit log of all uploaded versions and amendments for this lease agreement.',
    noVersionHistory: 'No version history records found.',
    uploadNewVersionNotice: 'Uploading a new file will create a new version, archive the current agreement, and update legal compliance records.',
    saveAndPublishNewVersion: 'Save & Publish New Version',
    uploadingAndVersioning: 'Uploading & Versioning...',
    downloadThisVersion: 'Download this version',
    pleaseSelectDocumentToUpload: 'Please select a document to upload.',
    newDocumentVersionUploadedSuccess: 'New document version uploaded successfully!',
    paymentFailed: 'Payment processing failed. Please try again.',
    due: 'Due',
    balance: 'Balance',
    awaitingVerification: 'Awaiting landlord / bank verification',
    activeLease: 'Active Lease',
    activeRequests: 'Active Requests',
    chatDirectDesc: 'Chat directly with your landlord and submit maintenance tickets.',
    navMaintenance: 'Maintenance',
    assignedWorker: 'Assigned Worker',
    action: 'Action',
    view: 'View',
    pay: 'Pay',
    total: 'Total',
    dueOnOrBefore5th: 'Due on or before the 5th of each calendar month.',
    maintenanceDirectReporting: 'Report plumbing, electrical, or structural repairs directly via the maintenance chat.',
    garbageCollectionSchedule: 'Garbage collection every Tuesday and Friday morning.',
    propertyManagementAndLandlord: 'Property Management & Landlord',
    landlord: 'Landlord',
    emergencyContact: 'Emergency Contact',
    emailSupport: 'Email Support',
    messagePropertyManager: 'Message Property Manager',
    rentInvoices: 'Rent Invoices',
    paymentReceipts: 'Payment Receipts',
    invoiceType: 'Invoice Type',
    noRentInvoicesFound: 'No rent invoices found.',
    viewDetails: 'View Details',
    noPaymentReceiptsYet: 'No payment receipts found yet.',
    issued: 'Issued',
    noPaymentTransactionsRecorded: 'No payment transactions recorded yet.',
    today: 'Today',
    versionHistoryDesc: 'Audit log of all uploaded versions and amendments for this lease agreement.',
    noVersionHistoryFound: 'No version history records found.',
    uploadNewVersionDesc: 'Uploading a new file will create a new version, archive the current agreement, and update legal compliance records.',
    savePublishNewVersion: 'Save & Publish New Version',
    uploadingVersioning: 'Uploading & Versioning...',
  },

  rw: {

    // Navigation
    features: 'Ibiranga Notify',
    pricing: 'Ibiciro',
    support: 'Ufashijwe gute?',
    getStarted: 'Tangira Sawa',
    selectLanguage: 'Hitamo Ururimi',
    kigaliLocation: 'Kigali 🇷🇼',
    navigation: 'Gushakisha',
    faqs: 'Ibibazo bijibijwe',

    // Hero Section
    heroTitle1: 'Gucunga ubukode, ',
    heroTitle2: 'byoroshye.',
    heroSubtitle: 'Sisitemu imwe yoroshye ifasha inzu z\'ubucuruzi gucunga abakodesha, kwakira ubukode, no gukurikirana ibyishyuwe byose i Kigali.',
    downloadApp: 'Manura Porogaramu ya Notify',
    liveMallOS: 'Muri Rusange',
    kigaliHeights: 'Kigali Heights',
    activeTenantUnit: 'Inzu ikodeshwa',
    switchUnit: 'Hindura inzu',
    groundFloor: 'Pasi • Inzu y\'ubucuruzi',
    baseRent: 'Ubukode bw\'ukwezi:',
    serviceFee: 'Amafaranga y\'isuku n\'umutekano:',
    totalDue: 'Ayishyurwa yose ubuminsi:',
    confirmAndLog: 'Emeza no kwandika ubukode',
    paymentLogged: 'Ibyishyuriwe byanditswe n\'ubutumwa bwagiye!',
    reconciliationNote: 'Igenzura ryihuse rya MoMo n\'amabanki',

    // Features / Value Proposition
    everythingInOnePlace: 'Byose mu kiganza kimwe',
    yourMallUnderControl: 'Inzu yawe y\'ubucuruzi iratekanye.',
    valuePropSubtitle: 'Notify ihuza ibikorwa by\'ubukode, abakodesha, ubwishyu, no gutanga raporo mu rugendo rworoshye.',
    openFeaturePage: 'Fungura iyi paji',
    featureManageUnitsTitle: 'Gucunga Inzu',
    featureManageUnitsDesc: 'Kurikirana buri iduka, ibiro, kiyosike, n\'ubucuruzi bwose mu hantu hamwe.',
    featureCollectRentTitle: 'Kwakira Ubukode',
    featureCollectRentDesc: 'Kurikirana ibyishyuwe, ibirimo, fagitire, n\'iminsi y\'ubukode nta guhora wibutsa n\'intoki.',
    featureStayNotifiedTitle: 'Boresha Ubutumwa',
    featureStayNotifiedDesc: 'Menya mu buryo bwipfasha ubukode bugiye kurangira, ubwakererewe, n\'ibindi bikorwa by\'abakodesha.',

    // Dedicated Pages Common
    backToHome: 'Subira ku rubuga nyamukuru',
    actions: 'Ibyakorwa',
    status: 'Imiterere',
    searchPlaceholder: 'Shakisha...',
    allFloors: 'Etaje zose',
    allStatus: 'Imiterere yose',
    occupied: 'Irabyigwa',
    vacant: 'Irashaka umukodesha',

    // Manage Units Page
    manageUnitsTitle: 'Inzu z\'ubucuruzi n\'Urutonde rw\'abakodesha',
    manageUnitsSubtitle: 'Gukurikirana abakodesha, amasezerano, n\'ingano y\'inzu ku migabane yose y\'inzu yawe y\'ubucuruzi.',
    addNewUnit: 'Ongeraho inzu nshya',
    addUnit: 'Ongeraho inzu',
    totalUnits: 'Inzu zose',
    occupiedUnits: 'Zikodeshejwe',
    vacantUnits: 'Zitegereje',
    allUnits: 'Imiterere yose',
    searchUnits: 'Shakisha inzu cyangwa umukodesha...',
    occupancyRate: 'Igipimo cy\'inzu zikodeshwa',
    totalBaseRevenue: 'Inyungu y\'ubukode yose',
    vacantUnitsAvailable: 'Inzu zitegereje abakodesha',
    floorLabel: 'Etaje',
    leaseEnds: 'Amasezerano arangira',
    monthlyRent: 'Ubukode bw\'ukwezi',
    editUnit: 'Hindura inzu',
    viewLease: 'Reba amasezerano',
    unitAddedSuccess: 'Inzu nshya yongewe mu mutungo w\'inzu neza!',

    // Collect Rent Page
    collectRentTitle: 'Kwakira Ubukode no Kwandika Ibyishyuriwe',
    collectRentSubtitle: 'Kurikirana ku gihe ubwishyu bwa Mobile Money (MTN MoMo & Airtel), banki, no kwandika fagitire zitarishyurwa.',
    recordPayment: 'Kwandika ubwishyu bw\'intoki',
    collectedThisMonth: 'Ibyakiriwe mur\'uyu mwezi',
    outstandingBalance: 'Amafaranga aberewemo',
    collectionRate: 'Igipimo cy\'ibyisbyuwe',
    tenantName: 'Izina ry\'umukodesha',
    paymentMethod: 'Uburyo bwo kwishyura',
    amountPaid: 'Ayishyuwe',
    paymentDate: 'Itariki yo kwishyura',
    paid: 'Yarishyuye',
    pending: 'Biri mu nzira',
    overdue: 'Ikirimo',
    downloadReceipt: 'Manura inyemezabwishyu',
    sendReminder: 'Ohereza ubutumwa bwibutsa',
    triggerMoMoPrompt: 'Yoherereza ubusabe bwa MoMo',
    promptSentTo: 'Ubusabe bwoherejwe kuri',
    awaitingTenantPin: 'Guhagarara pin y\'umukodesha...',
    tenantPhone: 'Telifoni y\'umukodesha',
    amountRwf: 'Amafaranga (RWF)',
    sendPrompt: 'Ohereza Ubusabe',
    tenantAndUnit: 'Umukodesha n\'Inzu',
    amount: 'Amafaranga',
    method: 'Uburyo',
    searchTenantUnit: 'Shakisha umukodesha cyangwa inzu...',
    collected: 'Ibyakiriwe',

    // Stay Notified Page
    stayNotifiedTitle: 'Ubutumwa bwikora n\'Ibyibutsa Abakodesha',
    stayNotifiedSubtitle: 'Tegura ubutumwa bwikora bwa WhatsApp, SMS, na Email bwyibutsa ubukode, ibikoresho, no kuvugurura amasezerano.',
    sendBulkNotice: 'Ohereza ubutumwa rusange',
    activeAutomatedRules: 'Amategeko y\'ubutumwa bwikora',
    noticesSentThisMonth: 'Ubutumwa bwoherejwe mur\'uyu mwezi',
    deliverySuccessRate: 'Igipimo cy\'ubutumwa bwagezeho',
    channel: 'Uburyo bwo koherereza',
    triggerEvent: 'Igihe bwitegura',
    recipients: 'Abazabuhabwa',
    recentLogs: 'Ibyakozwe mu koherereza ubutumwa',
    delivered: 'Bwagezeho',
    failed: 'Ntabwo bwagiye',
    testNotice: 'Gerageza ubutumwa',
    sendBroadcastNotice: 'Ohereza ubutumwa rusange',
    broadcastDispatched: 'Ubutumwa rusange bwoherejwe ku bakodesha bose.',
    typeNoticeMessage: 'Andika ubutumwa ushaka koherereza abakodesha bose...',
    sendBroadcast: 'Ohereza ubutumwa',
    activeAutomations: 'Ubutumwa bwikora buri gukora',
    recentSentLog: 'Ibyohejejwe vuba',
    recipient: 'Uwo bwagereyeho',
    message: 'Ubutumwa',
    time: 'Igihe',
    activeRule: 'Irakora',
    offRule: 'Dahagaritswe',
    liveStatus: 'Ku gihe',

    // Support Page
    supportTitle: 'Tugufashe gute?',
    supportSubtitle: 'Shakisha mu bisubizo cyangwa uvugane n\'itsinda ryacu i Kigali kugira ngo ugufashe.',
    searchSupportPlaceholder: 'Shakisha ibisubizo, amabwiriza, cyangwa ibibazo bijibijwe...',
    directContactChannels: 'Uburyo bwo kutuvugisha biziguye',
    whatsAppSupport: 'Icyicaro cya WhatsApp',
    kigaliPhoneLine: 'Telifoni y\'i Kigali',
    emailDesk: 'Imeri y\'ubufasha',
    sendUsAMessage: 'Twoherereze ubutumwa',
    yourName: 'Izina ryawe',
    emailAddress: 'Imeri yawe',
    phoneNumber: 'Telifoni yawe',
    subjectCategory: 'Icyo ubaza',
    describeInquiry: 'Sobanura icyo ubaza cyangwa ikibazo ufite',
    sendMessage: 'Ohereza ubutumwa',
    messageSentSuccess: 'Murakoze! Itsinda ry\'ubufasha i Kigali rirakubwira vuba.',
    instantReplies: 'Ibisubizo byihuse',
    responseTime: 'Igihe cyo gubona igisubizo',
    within2hrs: 'Mu masaha 2',
    location: 'Aho giherereye',

    // Pricing Page
    pricingTitle: 'Ibiciro bisobanutse kandi byoroshye.',
    pricingSubtitle: 'Tangira n\'ibitanda n\'ibipimo inzu yawe ikeneye ubuminsi. Wagura uko utera imbere.',
    monthlyBilling: 'Kwishyura ku mwezi',
    annualBilling: 'Kwishyura ku mwaka (Gabanuka 20%)',
    starterMall: 'Inzu Nto',
    commercialArcade: 'Inzu Yisumbuye',
    enterpriseComplex: 'Inzu Nini Cyber',
    upTo15Units: 'Inzu zigeze kuri 15',
    upTo60Units: 'Inzu zigeze kuri 60',
    unlimitedUnits: 'Inzu zitagira umubare & inzu nyinshi',
    choosePlan: 'Hitamo iyi gahunda',
    mostPopular: 'Igikundwa cyane',
    perMonth: '/ ukwezi',
    perYear: '/ umwaka',
    capabilities: 'Ibyo ishoboye',
    customDeploymentNote: 'Ukeneye sisitemu yisumbuye ku nzu z\'ubucuruzi zitandukanye mu Rwanda?',
    talkToKigaliTeam: 'Vugana n\'itsinda ryacu i Kigali',

    // Footer
    footerRights: '© 2026 Notify. Uburenganzira bwose buraguzwe.',

    // Modals
    getStartedWithNotify: 'Tangira gukoresha Notify',
    modalTitle: 'Orosya gucunga inzu yawe y\'ubucuruzi',
    modalSubtitle: 'Tubwire ibya inzu yawe i Kigali. Itsinda ryacu riragutegurira icyicaro mu masaha 24.',
    propertyNameLabel: 'Izina ry\'inzu y\'ubucuruzi',
    customMallLocation: 'Izina ry\'inzu n\'aho iherereye',
    totalUnitsLabel: 'Umubare w\'inzu z\'ubucuruzi',
    fullNameLabel: 'Izina ryose',
    phoneLabel: 'Telifoni / WhatsApp',
    emailLabel: 'Imeri yawe',
    requestOnboarding: 'Saba gutangira gukoresha Notify',
    noCreditCardNote: 'Nta karita ya banki ikenewe • Ubufasha mu Cyongereza, Kinyarwanda & Igifaransa',
    requestReceived: 'Ubusabe bwatsinze!',
    returnToWebsite: 'Subira ku rubuga',
    needPersonalOnboarding: 'Ukeneye ubufasha bwite bwo gutangira?',
    notifySupportFaqs: 'Ubufasha bwa Notify & Ibibazo bijibijwe',
    dedicatedAssistance: 'Ubufasha bwiharike kubacunga inzu i Kigali',
    frequentlyAskedQuestions: 'Ibibazo bijibijwe kenshi',
    simplifyMallOps: 'Orosya gucunga inzu yawe y\'ubucuruzi',
    tellUsAboutProperty: 'Tubwire ibya inzu yawe i Kigali. Itsinda ryacu riragutegurira icyicaro mu masaha 24.',
    propertyOrMallName: 'Izina ry\'inzu y\'ubucuruzi',
    customMallName: 'Izina ry\'inzu n\'aho iherereye',
    totalCommercialUnitsLabel: 'Umubare w\'inzu z\'ubucuruzi',
    unitsLabel: 'Inzu',
    yourFullName: 'Izina ryose',
    phoneWhatsapp: 'Telifoni / WhatsApp',
    emailAddressLabel: 'Imeri yawe',
    noCreditCardRequired: 'Nta karita ya banki ikenewe • Ubufasha mu Cyongereza, Kinyarwanda & Igifaransa',
    thankYouMessage: 'Murakoze',
    kigaliTeamReachOut: 'Itsinda ryacu i Kigali rirakuvugisha kuri',
    toSetupWorkspace: 'kugira ngo bagutegurire icyicaro kuri',

    // Tenant Interface
    tenantMyHome: 'Urugo Rwange',
    tenantLandlord: 'Nyir\'inyubako',
    tenantProperty: 'Inyubako',
    tenantUnit: 'Shami / Chambre',
    tenantTenancy: 'Imiterere y\'Ubukode',
    tenantAcceptInvitation: 'Kwemera Ubutumire',
    tenantCreateAccount: 'Kurema Konti',
    tenantWelcome: 'Murakaza neza kuri Notify',
    tenantGoToMyHome: 'Jya mu Rugo Rwange',

    // Phase 4 Maintenance, Complaints & Communication
    maintenance: 'Gusana & Kwita ku Nzu',
    maintenanceRequests: 'Ubusabe bwo Gusana',
    reportIssue: 'Tanga Ikibazo Cyangiritse',
    newMaintenanceRequest: 'Ubusabe Bushya bwo Gusana',
    issueTitle: 'Umutwe w\'Ikibazo',
    issueDescription: 'Ubusobanuro bw\'Ikibazo',
    category: 'Icyiciro',
    priority: 'Ubwihutirwe',
    urgent: 'Byihutirwa Cyane',
    high: 'Bihanitse',
    medium: 'Biringaniye',
    low: 'Bito',
    submitted: 'Byatanzwe',
    acknowledged: 'Byakiriwe',
    inProgress: 'Biri Gusanwa',
    scheduled: 'Byateganyijwe',
    resolved: 'Byakemutse',
    closed: 'Biroshijwe',
    reopened: 'Byongeye Gufungurwa',
    rejected: 'Byanzwe',
    plumbing: 'Amatiyo n\'Imiyoboro y\'Amazi',
    electrical: 'Amashanyarazi n\'Amatara',
    water: 'Ibibazo by\'Amazi',
    heatingCooling: 'Ubukonje & Umwuka',
    structural: 'Inkuta & Ibisenge',
    appliance: 'Ibikoresho by\'Inzu',
    securityCategory: 'Ingufuri & Umutekano',
    cleaning: 'Isuku n\'Isukura',
    internet: 'Interineti n\'Iminara',
    otherCategory: 'Ibindi Rusange',
    assignedTechnician: 'Umusanazi Ushinzwe',
    scheduledFor: 'Biteganyijwe Kuwa',
    estimatedCost: 'Igiciro Giteganyijwe',
    actualCost: 'Igiciro Nyakuri',
    addToExpenses: 'Ongeraho mu Mabwiriza y\'Amafaranga',
    addedToExpenses: 'Byongewe mu Mabwiriza',
    confirmResolution: 'Emeza ko Byakize',
    confirmResolutionPrompt: 'Ese iki kibazo cyakosowe neza ku buryo wishimiye?',
    reopenRequest: 'Ongera Ufungure Ubusabe',
    reopenPrompt: 'Sobanura ibitarakemuka neza',
    tenantNotes: 'Ibisobanuro by\'Umukode',
    landlordNotes: 'Ibisobanuro bya Nyir\'inzu',
    conversation: 'Ibiganiro kuri iki kibazo',
    assignWorker: 'Gena Umukanishi & Igihe',
    scheduleVisit: 'Teganya Umunsi wo Gusura',
    markResolved: 'Emeza ko Byakemutse',
    workersTechnicians: 'Abakanishi n\'Abasanazi',
    addWorker: 'Ongeramo Umukanishi',
    workerName: 'Izina ry\'Umukanishi',
    workerPhone: 'Nimero ya Telifoni',
    specialization: 'Umwuga Asanzwe Akora',
    complaints: 'Ibyifuzo & Ibitagenze Neza',
    fileComplaint: 'Tanga Icyifuzo cyangwa Ikirego',
    newComplaint: 'Ikirego Bushya',
    complaintSubject: 'Umutwe w\'Ikirego',
    underReview: 'Biri Gusuzumwa',
    landlordResponse: 'Igisubizo cya Nyir\'inzu',
    noise: 'Urusaku rurenze urugero',
    neighbor: 'Ibibazo n\'Abaturanyi',
    propertyCondition: 'Imiterere y\'Inyubako',
    landlordService: 'Imicungire n\'Ubufasha',
    utility: 'Fagitire z\'Amazi/Amashanyarazi',
    payment: 'Ibibazo by\'Ubwishyu',
    leaseCategory: 'Amasezerano y\'Ubukode',
    notificationCenter: 'Ikigo cy\'Ubutumwa',
    notifications: 'Ubutumwa',
    markAllAsRead: 'Bishyire ko Byose Byasomwe',
    noNotifications: 'Nta butumwa bushya muri iki gihe',
    unread: 'Bitarasomwa',

    // Comprehensive Tenant Experience
    navHome: 'Ahabanza',
    navLease: 'Amasezerano',
    navPayments: 'Kwishyura',
    navMessages: 'Ubutumwa',
    navProfile: 'Umwirondoro & Igenamiterere',
    verifiedTenant: 'UMUKODESHA WEMEWE',
    activeTenancy: 'Ubukode Bukora',
    rentalUnit: 'Inzu Ikodeshwa',
    unitLabel: 'Inzu',
    floor: 'Etaje',
    welcomeBack: 'Murakaza neza',
    rentUpToDate: 'Ubwishyu bw\'ubukode bwawe buhagaze neza.',
    rentDueWarning: 'Ubukode bugomba kwishyurwa mbere y\'itariki ntarengwa.',
    rentOverdueWarning: 'Ubukode bwararenze. Nyamuneka yishyura ikirarane cyawe.',
    payRent: 'Kwishyura Ubukode',
    viewLeaseDetails: 'Kureba Amasezerano',
    reportMaintenance: 'Kumenyesha Ikibazo',
    messageLandlord: 'Kwandikira Nyirinzu',
    outstandingRent: 'Ikirarane cy\'Ubukode',
    nextDueDate: 'Itariki yo Kwishyura',
    openRequests: 'Ibibazo Bitegerejwe',
    daysRemaining: 'iminsi isigaye',
    daysTotalLease: 'yose hamwe y\'amasezerano',
    leaseExpires: 'Amasezerano arangira',
    leaseCountdown: 'Igihe cy\'Amasezerano n\'Iminsi Isigaye',
    signedDocument: 'Inyandiko Yasinywe',
    activeLeaseStatus: 'Amasezerano Akora',
    leaseExpiredStatus: 'Amasezerano Yarangiye',
    expiringSoonStatus: 'Arangira Vuba',
    expiringTwoMonths: 'Arangira mu mezi ~2',
    recentInvoices: 'Fagitire z\'Ubukode Za Vuba',
    recentReceipts: 'Inyemezabwishyu Zemejwe ku Mugaragaro',
    noInvoices: 'Nta fagitire z\'ubukode zibonetse.',
    noReceipts: 'Nta nyemezabwishyu ziremezwa. Zizahita zigaragara hano umaze kwishyura.',
    viewAll: 'Reba Byose',
    leaseAgreementOverview: 'Incamake y\'Amasezerano y\'Ubukode',
    contractReference: 'Nimero y\'Amasezerano',
    startDate: 'Itariki yo Gutangira',
    endDate: 'Itariki yo Gusoza',
    leaseDuration: 'Igihe Cyose',
    financialTerms: 'Amafaranga n\'Uburyo bwo Kwishyura',
    baseRentAmount: 'Ubukode bw\'Ukwezi',
    securityDeposit: 'Amafaranga y\'Ingwate (Garanti)',
    serviceCharge: 'Amafaranga y\'Isuku n\'Umutekano',
    paymentFrequency: 'Uburyo bwo Kwishyura',
    latePenalty: 'Ibihano by\'Ubwishyu Bukererewe',
    keyTermsClauses: 'Ingingo z\'Ingenzi n\'Amabwiriza',
    requestRenewal: 'Saba Kuvugurura Amasezerano',
    downloadAgreement: 'Manura Amasezerano Yasinywe (PDF)',
    viewSignedPdf: 'Reba Amasezerano Yasinywe',
    rentalInvoices: 'Fagitire z\'Ubukode',
    paymentReceiptsHistory: 'Inyemezabwishyu & Amateka',
    totalOutstandingBalance: 'Amafaranga Yose Asigaye Kwishyurwa',
    payFullBalance: 'Ishyura Byose',
    invoiceNumber: 'Fagitire #',
    period: 'Igihe',
    totalAmount: 'Ayose Hamwe',
    balanceDue: 'Asigaye Kwishyurwa',
    viewInvoice: 'Reba Fagitire',
    payNow: 'Ishyura Nonaha',
    verifiedReceipt: 'INYEMEZABWISHYU YEMEWE',
    viewAndPrint: 'Reba & Icape',
    paymentTransactionsRecord: 'Urutonde rw\'Ibyishyuwe Byose',
    paymentRef: 'Nimero y\'Ubwishyu',
    transactionRef: 'Nimero ya Transakisiyo',
    date: 'Itariki',
    noTransactions: 'Nta byishyuwe birandikwa muri iki gihe.',
    landlordSupport: 'Ubuyobozi bw\'Inyubako & Ubufasha',
    chat: 'Ibiganiro',
    online: 'Arahari',
    typeMessage: 'Andika ubutumwa hano...',
    describeMaintenance: 'Sobanura ikibazo cyo gusana...',
    noChatsFound: 'Nta biganiro bibonetse',
    startConversation: 'Tangira kuganira n\'ubuyobozi bw\'inyubako.',
    searchChats: 'Shakisha mu biganiro...',
    attachedFile: 'Dosiye Yashyizweho',
    photoAttached: 'Ifoto Yashyizweho',
    profileDetails: 'Umwirondoro',
    passwordSecurity: 'Ijambobanga & Umutekano',
    notificationChannels: 'Uburyo bw\'Ubutumwa',
    appLanguage: 'Ururimi rwa Porogaramu',
    firstName: 'Izina ry\'iribondo',
    lastName: 'Izina ry\'umuryango',
    nationalIdPassport: 'Indangamuntu / Pasiporo',
    occupationBusiness: 'Umwuga / Ubucuruzi Ukora',
    saveChanges: 'Bika Impinduka',
    saving: 'Birabikwa...',
    profileSavedSuccess: 'Umwirondoro wawe wabitswe neza.',
    currentPassword: 'Ijambobanga Ririho',
    newPassword: 'Ijambobanga Rishya',
    confirmNewPassword: 'Emeza Ijambobanga Rishya',
    updatePassword: 'Hindura Ijambobanga',
    passwordSavedSuccess: 'Ijambobanga ryawe ryahinduwe neza.',
    notificationAlertChannels: 'Uburyo bwo Kwakira Ubutumwa n\'Imenyekanisha',
    configureAlertsDesc: 'Hitamo uburyo wifuza kwakiramo ubutumwa bwibutsa ubukode, fagitire, n\'amakuru yo gusana.',
    rentInvoicesReceipts: 'Fagitire z\'Ubukode & Inyemezabwishyu',
    rentInvoicesReceiptsDesc: 'Ubutumwa bw\'igihe fagitire nshya zasohotse, kwibutsa kwishyura, n\'inyemezabwishyu zemejwe.',
    maintenanceChat: 'Gusana & Ibiganiro na Nyirinzu',
    maintenanceChatDesc: 'Amakuru y\'abakanishi, ibisubizo by\'ubutumwa, no gukurikirana ibirimo gusanwa.',
    leaseTermsExpiry: 'Amasezerano & Ibyibutsa Kurangira',
    leaseTermsExpiryDesc: 'Ubutumwa bwikora bukumvikanisha iminsi 60, 30, na 14 mbere y\'uko amasezerano arangira.',
    inApp: 'Muri Porogaramu',
    email: 'Imeri',
    sms: 'SMS',
    whatsapp: 'WhatsApp',
    saveNotificationPrefs: 'Bika Ibyo Wahisemo ku Butumwa',
    appLanguagePref: 'Ururimi Wahisemo muri Porogaramu',
    appLanguagePrefDesc: 'Hitamo ururimi wifuza. Paji zose z\'umukodesha, ubutumwa, na fagitire bihita bihinduka ako kanya.',
    english: 'English (EN)',
    kinyarwanda: 'Ikinyarwanda (RW)',
    french: 'Français (FR)',
    englishDesc: 'Ururimi rw\'ubucuruzi n\'akazi',
    kinyarwandaDesc: 'Ururimi rw\'igihugu n\'itumanaho i Kigali',
    frenchDesc: 'Ururimi rw\'akazi n\'itumanaho',
    emergencyContacts: 'Nimero z\'Ubutabazi n\'Ubuyobozi',
    emergencyContactsDesc: 'Nimero zihari amasaha 24/7 z\'ubufasha bwihuse mu nyubako.',
    securityEmergency: 'Umutekano & Ubutabazi 24/7',
    buildingCaretaker: 'Ushinzwe Inyubako & Gusana',
    signOutTenant: 'Sohoka muri Konti y\'Umukodesha',
    signOutTenantDesc: 'Gufunga uburyo bwo gukoresha iyi paji kuri iki gikoresho. Uzakenera ijambobanga ryawe kugira ngo wongere winjire.',
    logOut: 'Sohoka',
    rentPaymentPortal: 'Urubuga rwo Kwishyura Ubukode',
    paymentSuccessful: 'Ubwishyu Bwatsinze!',
    paymentPendingVerification: 'Ubwishyu Bwoherejwe Gusuzumwa',
    selectPaymentMethod: 'Hitamo Uburyo bwo Kwishyura',
    mobileMoney: 'Mobile Money (MTN / Airtel)',
    bankTransfer: 'Kwishyura binyuze muri Banki',
    creditDebitCard: 'Ikarita ya Banki (Card)',
    enterMobileNumber: 'Andika Nimero ya Telifoni ya MoMo',
    momoPromptDesc: 'Ubutumwa bw\'ibanga (USSD PIN) burahita buza kuri telifoni yawe ngo wemeze ubwishyu.',
    confirmAndPay: 'Emeza & Ishyura',
    officialPaymentReceipt: 'Inyemezabwishyu Yemejwe ku Mugaragaro',
    printSaveReceipt: 'Icape / Bika Inyemezabwishyu (PDF)',
    close: 'Funga',
    rentalInvoice: 'Fagitire y\'Ubukode',
    billedTo: 'Yandikiwe (Umukodesha)',
    billingPeriod: 'Igihe Cyishyuwe',
    itemDescription: 'Ibisobanuro by\'Ibyishyuwe',
    monthlyRentItem: 'Ubukode bw\'Ukwezi',
    discountApplied: 'Igabanyirizwa Ryatanzwe',
    latePaymentFee: 'Ibihano by\'Ubukode Bukererewe',
    subtotal: 'Amafaranga Yose Hamwe',
    totalDueNow: 'Amafaranga Asigaye Kwishyurwa',
    partiallyPaid: 'Iwishyuwe Igice',
    invoiceDetails: 'Fagitire y\'Ubukode',
    downloadInvoice: 'Icape / Bika Fagitire',
    issueDate: 'Itariki Yandikiweho',
    dueDate: 'Itariki Ntarengwa',
    property: 'Inzu / Umurindi',
    to: 'Kugeza',
    type: 'Ubwoko',
    payRentNow: 'Ishyura Ubukode Nonaha',
    invalidAmount: 'Amafaranga agomba kurenga zeru.',
    amountExceedsBalance: 'Amafaranga ntagomba kurenga asigaye angana na',
    payRentOnline: 'Urubuga rwo Kwishyura Ubukode',
    invoices: 'Fagitire',
    paymentSubmittedVerification: 'Ubwishyu Bwoherejwe Gusuzumwa',
    paymentConfirmedNotice: 'Ubwishyu bwawe bwa',
    hasBeenConfirmed: 'bwemejwe. Inyemezabwishyu yakozwe.',
    offlineSlipSubmittedNotice: 'Inyemezabwishyu yo muri banki ya',
    submittedVerification: 'yoherejwe. Nyir\'inzu azayisuzuma aguhe inyemezabwishyu.',
    transactionReference: 'Nomero y\'Ubwishyu',
    viewReceipt: 'Reba Inyemezabwishyu',
    creditCard: 'Ikarita ya Banki',
    offlinePaymentMethod: 'Uburyo bwo Kwishyura Bwa Kera',
    cash: 'Kwishyura Mu Ntoki (Kashi)',
    amountToPay: 'Amafaranga yo Kwishyura (RWF)',
    maximumAllowed: 'Ayemewe ntarengwa',
    cancel: 'Kureka',
    processingPayment: 'Turimo gukora ubwishyu...',
    officialReceipt: 'Inyemezabwishyu Yemejwe ku Mugaragaro',
    paymentVerifiedConfirmed: 'Ubwishyu Bwasuzumwe & Bwemejwe',
    issuedOn: 'Yatanzwe kuwa',
    receiptNumber: 'Nimero y\'Inyemezabwishyu',
    paymentId: 'ID y\'Ubwishyu',
    propertyUnit: 'Inzu & Umurongo',
    issuedBy: 'Yatanzwe na',
    digitalReceiptDisclaimer: 'Iyi ni inyemezabwishyu yemewe yakozwe na Notify Property Management Kigali.',
    chats: 'Ubutumwa',
    loadingConversations: 'Turimo gufungura ibiganiro...',
    startConversationManagement: 'Tangiza ikiganiro n\'ubuyobozi bw\'inzu.',
    tapToChat: 'Kanda hano wandike',
    back: 'Subira ku biganiro',
    landlordPropertySupport: 'Ubufasha bwa Nyir\'Inzu & Ubuyobozi',
    describeMaintenanceIssue: 'Sobanura ikibazo gikeneye gusanwa...',
    goodMorning: 'Mwaramutse',
    goodAfternoon: 'Mwiriwe',
    goodEvening: 'Mwiriwe neza',
    tenantSubtitle: 'Genzura amasezerano y\'ubukode, ibyo gusana, n\'ubwishyu bwawe.',
    rentAndInvoices: 'Ubukode & Fagitire',
    allCaughtUp: 'Nta Bukode Urangiza',
    noPendingRentCharges: 'Nta mafaranga y\'ubukode urimo.',
    viewPaymentRecords: 'Reba Amakuru y\'Ubwishyu',
    messagesSupport: 'Ubutumwa & Ubufasha',
    chatLandlord: 'Ganira na Nyir\'Inzu',
    recentMaintenanceRequests: 'Ibisabwa Gusana Biheruka',
    viewInChat: 'Reba mu Butumwa',
    recentRentInvoices: 'Fagitire z\'Ubukode Ziheruka',
    residentialTenancyAgreement: 'Amasezerano y\'Ubukode bw\'Inzu',
    tenancyGovernedRwanda: 'Amasezerano y\'ubukode agengwa n\'amategeko ya Repubulika y\'u Rwanda.',
    viewSignedAgreement: 'Reba Amasezerano Yashyizweho Umukono',
    unitAllocated: 'Inzu / Umuryango Uhabwa',
    leaseTerm: 'Igihe cy\'Amasezerano',
    financialTermsSchedule: 'Ibijyanye n\'Amafaranga & Gahunda yo Kwishyura',
    paidHeldEscrow: 'Yarishyuwe & Ibikanywe Umutekano',
    paymentMethodsAccepted: 'Uburyo bwo Kwishyura Bwemewe',
    instantDigitalReceipts: 'Inyemezabwishyu zihita zitangwa ako kanya',
    buildingGuidelines: 'Amabwiriza y\'Ingenzi y\'Inyubako',
    quietHours: 'Gutuza: Saa yine z\'ijoro – Saa moya za mugitondo buri munsi.',
    currentOutstandingBalance: 'Amafaranga Asigaye Kwishyurwa',
    allRentInvoices: 'Fagitire Zose z\'Ubukode',
    officialPaymentReceipts: 'Inyemezabwishyu Zemejwe z\'Ubukode',
    reopenMaintenanceRequest: 'Ongera Ufungure Ikibazo cyo Gusana',
    reopenExplanationPlaceholder: 'Sobanura impamvu iki kibazo kigikeneye kwitabwaho...',
    submitReopen: 'Ohereza Gusubiramo',
    propertyManagement: 'Ubuyobozi bw\'Inzu',
    maintenanceSupport: 'Ubufasha bwo Gusana',
    confirmDone: 'Emeza ko Byakozwe',
    reopen: 'Gufungura Nanone',
    days: 'Iminsi',
    tenantLease: 'Amasezerano',
    maintenanceInquiry: 'Ikibazo cyo Gusana',
    submittedMaintenancePhoto: 'Ifoto yo gusana yoherejwe',
    sentAnAttachment: 'Inyandiko yoherejwe',
    removeAttachment: 'Kura ifoto/inyandiko hano',
    attachPhotoDocument: 'Ongeraho ifoto cyangwa inyandiko',
    attachSamplePhoto: 'Ongeraho ifoto y\'urugero',
    photoAttachment: 'Ifoto yometseho',
    backToDashboard: 'Subira ku rubuga',
    ticketInfo: 'Amakuru y\'ikibazo',
    complaintSubmitted: 'Yoherejwe',
    complaintAcknowledged: 'Yakiriwe',
    complaintUnderReview: 'Irasuzumwa',
    complaintResolved: 'Yarakemutse',
    complaintClosed: 'Yafunzwe',
    attachFile: 'Omeraho dosiye',
    attachmentUploadReady: 'Dosiye yiteguye koherezwa.',
    tenantLedger: 'Igitabo cy\'Amafaranga y\'Umukodesha',
    totalInvoiced: 'Amafaranga Yose Yishyuwe',
    invoicesGenerated: 'fagitire zatanzwe',
    verifiedTransactions: 'ubwishyu bwemejwe',
    currentBalanceDue: 'Amafaranga Asigaye Kwishyurwa',
    allSettled: 'Byose byarishyuwe',
    paymentPending: 'Bitegereje kwishyurwa',
    overdueBalance: 'Ubukode Bwakererewe',
    requiresImmediateAction: 'Bikeneye kwishyurwa byihuse',
    noOverdueCharges: 'Nta bukode bwakererewe',
    quickActions: 'Ibikorwa Byihuse',
    outstanding: 'Ibisigaye',
    sendRentReminder: 'Ohereza Ubutumwa bwo Kwibutsa',
    chronologicalLedger: 'Igitabo cy\'Ibyishyuwe Byose',
    invoicesAndCharges: 'Fagitire n\'Amafaranga',
    paymentsAndSlips: 'Ubwishyu n\'Inyemezabwishyu',
    officialReceipts: 'Inyemezabwishyu Zemewe',
    reference: 'Nomero y\'Icyemezo',
    debitCharge: 'Amafaranga Asabwa (Debit)',
    creditPayment: 'Amafaranga Yishyuwe (Credit)',
    noLedgerRecordsFound: 'Nta makuru y\'ibaruramari aboneka kuri uyu mukodesha.',
    noReceiptsGenerated: 'Nta nyemezabwishyu ziraboneka kuri uyu mukodesha.',
    closeLedger: 'Funga Igitabo',
    exportCsv: 'Sohora CSV',
    monthlyRentInvoice: 'Fagitire y\'Ubukode bw\'Ukwezi',
    paymentVia: 'Kwishyura binyuze muri',
    leaseAgreementDocument: 'Inyandiko y\'Amasezerano y\'Ubukode',
    currentDocument: 'Inyandiko Iri Gukoreshwa',
    versionHistory: 'Amateka y\'Inyandiko',
    uploadNewVersion: 'Shyiraho Inyandiko Nshya',
    downloadAgreementDoc: 'Manura Amasezerano',
    storagePath: 'Aho Yabitswe',
    uploadedAt: 'Yashyizweho Kuwa',
    contractDetailsVerification: 'Amakuru y\'Amasezerano n\'Igenzura',
    legalComplianceMet: 'Amategeko Yubahirijwe',
    noSignedLeaseUploaded: 'Nta nyandiko y\'amasezerano yashyizweho umukono irashyirwaho',
    noSignedLeaseDesc: 'Aya masezerano aracyari mu mushinga. Inyandiko yashyizweho umukono irakenewe mbere yo kuyemeza.',
    uploadAgreementNow: 'Shyiraho Inyandiko y\'Amasezerano Nonaha',
    uploadAgreementDocumentNow: 'Shyiraho Inyandiko y\'Amasezerano Nonaha',
    uploadedBy: 'Yashyizweho na',
    contractDetailsAndVerification: 'Amakuru y\'Amasezerano n\'Igenzura',
    noSignedLeaseDocumentUploaded: 'Nta nyandiko y\'amasezerano yashyizweho umukono irashyirwaho',
    draftLeaseNotice: 'Aya masezerano aracyari mu mushinga. Inyandiko yashyizweho umukono irakenewe mbere yo kuyemeza.',
    auditLogVersionHistory: 'Urutonde rw\'inyandiko zose zashyizweho n\'amavugurura y\'aya masezerano.',
    noVersionHistory: 'Nta mateka y\'inyandiko zabanje ahari.',
    uploadNewVersionNotice: 'Gushyiraho inyandiko nshya bizakora verisiyo nshya, bibike iyari ihari, kandi bivugurure inyandiko z\'amategeko.',
    saveAndPublishNewVersion: 'Bika & Tangaza Inyandiko Nshya',
    uploadingAndVersioning: 'Inyandiko irashyirwaho...',
    downloadThisVersion: 'Manura iyi verisiyo',
    pleaseSelectDocumentToUpload: 'Hitamo inyandiko ushaka gushyiraho.',
    newDocumentVersionUploadedSuccess: 'Inyandiko nshya yashyizweho neza!',
    paymentFailed: 'Kwishyura byanze. Ongera ugerageze.',
    due: 'Igisabwa',
    balance: 'Asigaye',
    awaitingVerification: 'Bitegereje kwemezwa na nyir\'inzu cyangwa banki',
    activeLease: 'Amasezerano Ariho',
    activeRequests: 'Ubusabe Buri Gukorwa',
    chatDirectDesc: 'Vugana na nyir\'inzu mu buryo butaziguye kandi utange raporo y\'ibyangiritse.',
    navMaintenance: 'Ubusabe bwo Gusana',
    assignedWorker: 'Uwashinzwe Kubikora',
    action: 'Igikorwa',
    view: 'Reba',
    pay: 'Ishyura',
    total: 'Igiteranyo',
    dueOnOrBefore5th: 'Byishyurwa mbere cyangwa ku munsi wa 5 wa buri kwezi.',
    maintenanceDirectReporting: 'Tanga raporo y\'amazi, amashanyarazi cyangwa inyubako binyuze mu butumwa.',
    garbageCollectionSchedule: 'Gukusanya imyanda bikorwa kuwa kabiri no kuwa gatanu mugitondo.',
    propertyManagementAndLandlord: 'Ubuyobozi bw\'Inyubako & Nyir\'inzu',
    landlord: 'Nyir\'inzu',
    emergencyContact: 'Numero y\'Ubutabazi',
    emailSupport: 'Imeri yo Gutabara',
    messagePropertyManager: 'Andikira Umuyobozi w\'Inyubako',
    rentInvoices: 'Fagitire z\'Ubukode',
    paymentReceipts: 'Inyemezabwishyu',
    invoiceType: 'Ubwoko bwa Fagitire',
    noRentInvoicesFound: 'Nta fagitire z\'ubukode zibonetse.',
    viewDetails: 'Reba Birambuye',
    noPaymentReceiptsYet: 'Nta nyemezabwishyu zibonetse.',
    issued: 'Yatanzwe',
    noPaymentTransactionsRecorded: 'Nta bwishyu burandikwa.',
    today: 'Uyu munsi',
    versionHistoryDesc: 'Urutonde rw\'inyandiko zose zashyizweho n\'amavugurura y\'aya masezerano.',
    noVersionHistoryFound: 'Nta mateka y\'inyandiko zabanje ahari.',
    uploadNewVersionDesc: 'Gushyiraho inyandiko nshya bizakora verisiyo nshya, bibike iyari ihari, kandi bivugurure inyandiko z\'amategeko.',
    savePublishNewVersion: 'Bika & Tangaza Inyandiko Nshya',
    uploadingVersioning: 'Inyandiko irashyirwaho...',
  },


  fr: {
    // Navigation
    features: 'Fonctionnalités',
    pricing: 'Tarifs',
    support: 'Support',
    getStarted: 'Commencer',
    selectLanguage: 'Choisir la langue',
    kigaliLocation: 'Kigali 🇷🇼',
    navigation: 'Navigation',
    faqs: 'FAQs',

    // Hero Section
    heroTitle1: 'Gestion des loyers, ',
    heroTitle2: 'simplifiée.',
    heroSubtitle: 'Un système simple permettant aux centres commerciaux de gérer les locataires, de percevoir les loyers et de suivre chaque paiement à Kigali.',
    downloadApp: 'Télécharger l\'application Notify',
    liveMallOS: 'Système en direct',
    kigaliHeights: 'Kigali Heights',
    activeTenantUnit: 'Unité sous bail',
    switchUnit: 'Changer d\'unité',
    groundFloor: 'Rez-de-chaussée • Espace commercial',
    baseRent: 'Loyer mensuel de base :',
    serviceFee: 'Frais de service & Sécurité :',
    totalDue: 'Total dû aujourd\'hui :',
    confirmAndLog: 'Confirmer & Enregistrer',
    paymentLogged: 'Paiement enregistré & Avis envoyé !',
    reconciliationNote: 'Rapprochement instantané MoMo & Banque',

    // Features / Value Proposition
    everythingInOnePlace: 'Tout au même endroit',
    yourMallUnderControl: 'Votre centre commercial, sous contrôle.',
    valuePropSubtitle: 'Notify rassemble vos opérations de location, vos locataires, vos paiements et vos rapports dans un espace de travail unique.',
    openFeaturePage: 'Ouvrir la page',
    featureManageUnitsTitle: 'Gérer les Unités',
    featureManageUnitsDesc: 'Suivez chaque boutique, bureau, kiosque et espace commercial à partir d\'un seul endroit.',
    featureCollectRentTitle: 'Collecter les Loyers',
    featureCollectRentDesc: 'Suivez les paiements, les soldes impayés, les factures et les échéances sans relance manuelle.',
    featureStayNotifiedTitle: 'Rester Informé',
    featureStayNotifiedDesc: 'Soyez informé automatiquement des échéances à venir, des loyers en retard et des activités des locataires.',

    // Dedicated Pages Common
    backToHome: 'Retour à l\'accueil',
    actions: 'Actions',
    status: 'Statut',
    searchPlaceholder: 'Rechercher...',
    allFloors: 'Tous les étages',
    allStatus: 'Tous les statuts',
    occupied: 'Occupé',
    vacant: 'Vacant',

    // Manage Units Page
    manageUnitsTitle: 'Unités Commerciales & Liste des Locataires',
    manageUnitsSubtitle: 'Suivez l\'occupation, les baux et les superficies sur tous les étages de votre complexe commercial.',
    addNewUnit: 'Ajouter une Unité',
    addUnit: 'Ajouter une unité',
    totalUnits: 'Total Unités',
    occupiedUnits: 'Occupées',
    vacantUnits: 'Vacantes',
    allUnits: 'Tous les statuts',
    searchUnits: 'Rechercher une unité ou un locataire...',
    occupancyRate: 'Taux d\'occupation',
    totalBaseRevenue: 'Revenu mensuel total',
    vacantUnitsAvailable: 'Unités vacantes disponibles',
    floorLabel: 'Étage',
    leaseEnds: 'Fin du bail',
    monthlyRent: 'Loyer mensuel',
    editUnit: 'Modifier',
    viewLease: 'Voir le bail',
    unitAddedSuccess: 'Nouvelle unité ajoutée avec succès !',

    // Collect Rent Page
    collectRentTitle: 'Collecte des Loyers & Historique des Paiements',
    collectRentSubtitle: 'Suivez en temps réel les transferts Mobile Money (MTN MoMo & Airtel), les dépôts bancaires et les factures en attente.',
    recordPayment: 'Enregistrer un paiement manuel',
    collectedThisMonth: 'Collecté ce mois-ci',
    outstandingBalance: 'Solde impayé',
    collectionRate: 'Taux de recouvrement',
    tenantName: 'Nom du locataire',
    paymentMethod: 'Moyen de paiement',
    amountPaid: 'Montant payé',
    paymentDate: 'Date de paiement',
    paid: 'Payé',
    pending: 'En attente',
    overdue: 'En retard',
    downloadReceipt: 'Télécharger le reçu',
    sendReminder: 'Envoyer une relance',
    triggerMoMoPrompt: 'Lancer une demande de paiement MoMo',
    promptSentTo: 'Demande envoyée à',
    awaitingTenantPin: 'En attente du code PIN du locataire...',
    tenantPhone: 'Téléphone du locataire',
    amountRwf: 'Montant (RWF)',
    sendPrompt: 'Envoyer la demande',
    tenantAndUnit: 'Locataire & Unité',
    amount: 'Montant',
    method: 'Moyen',
    searchTenantUnit: 'Rechercher un locataire ou une unité...',
    collected: 'Collecté',

    // Stay Notified Page
    stayNotifiedTitle: 'Notifications Automatiques & Alertes Locataires',
    stayNotifiedSubtitle: 'Configurez des rappels automatiques par WhatsApp, SMS et e-mail pour les paiements, l\'entretien et le renouvellement des baux.',
    sendBulkNotice: 'Envoyer un message groupé',
    activeAutomatedRules: 'Règles automatiques actives',
    noticesSentThisMonth: 'Avis envoyés ce mois-ci',
    deliverySuccessRate: 'Taux de livraison réussi',
    channel: 'Canal',
    triggerEvent: 'Événement déclencheur',
    recipients: 'Destinataires',
    recentLogs: 'Journal des notifications récentes',
    delivered: 'Livré',
    failed: 'Échoué',
    testNotice: 'Tester la notification',
    sendBroadcastNotice: 'Envoyer un avis général',
    broadcastDispatched: 'Avis diffusé à tous les locataires commerciaux.',
    typeNoticeMessage: 'Saisissez le message à envoyer à tous les locataires...',
    sendBroadcast: 'Envoyer l\'avis',
    activeAutomations: 'Automatisations actives',
    recentSentLog: 'Journal des envois récents',
    recipient: 'Destinataire',
    message: 'Message',
    time: 'Heure',
    activeRule: 'Actif',
    offRule: 'Désactivé',
    liveStatus: 'En direct',

    // Support Page
    supportTitle: 'Comment pouvons-nous vous aider ?',
    supportSubtitle: 'Consultez nos articles ou contactez notre équipe de support à Kigali pour une assistance personnalisée.',
    searchSupportPlaceholder: 'Rechercher des articles, des guides ou des FAQ...',
    directContactChannels: 'Canaux de contact direct',
    whatsAppSupport: 'Support WhatsApp',
    kigaliPhoneLine: 'Ligne téléphonique Kigali',
    emailDesk: 'Support par e-mail',
    sendUsAMessage: 'Envoyez-nous un message',
    yourName: 'Votre nom',
    emailAddress: 'Adresse e-mail',
    phoneNumber: 'Numéro de téléphone',
    subjectCategory: 'Sujet / Catégorie',
    describeInquiry: 'Décrivez votre demande ou problème',
    sendMessage: 'Envoyer le message',
    messageSentSuccess: 'Merci ! Notre équipe de support à Kigali vous répondra sous peu.',
    instantReplies: 'Réponses instantanées',
    responseTime: 'Temps de réponse',
    within2hrs: 'En moins de 2h',
    location: 'Emplacement',

    // Pricing Page
    pricingTitle: 'Tarifs simples et prévisibles.',
    pricingSubtitle: 'Commencez avec les outils dont votre propriété commercial a besoin aujourd\'hui. Évoluez au rythme de votre croissance.',
    monthlyBilling: 'Facturation mensuelle',
    annualBilling: 'Facturation annuelle (-20%)',
    starterMall: 'Petit Centre',
    commercialArcade: 'Centre Commercial',
    enterpriseComplex: 'Grand Complexe',
    upTo15Units: 'Jusqu\'à 15 unités commerciales',
    upTo60Units: 'Jusqu\'à 60 unités commerciales',
    unlimitedUnits: 'Unités illimitées & multi-centres',
    choosePlan: 'Choisir ce forfait',
    mostPopular: 'Le plus populaire',
    perMonth: '/ mois',
    perYear: '/ an',
    capabilities: 'Fonctionnalités',
    customDeploymentNote: 'Besoin d\'un déploiement personnalisé pour plusieurs centres commerciaux au Rwanda ?',
    talkToKigaliTeam: 'Parlez à notre équipe à Kigali',

    // Footer
    footerRights: '© 2026 Notify. Tous droits réservés.',

    // Modals
    getStartedWithNotify: 'Commencer avec Notify',
    modalTitle: 'Simplifiez la gestion de votre centre',
    modalSubtitle: 'Parlez-nous de votre propriété à Kigali. Notre équipe configurera votre espace personnalisé en 24h.',
    propertyNameLabel: 'Nom de la propriété ou du centre',
    customMallLocation: 'Nom du centre & Emplacement',
    totalUnitsLabel: 'Nombre d\'unités commerciales',
    fullNameLabel: 'Votre nom complet',
    phoneLabel: 'Téléphone / WhatsApp',
    emailLabel: 'Adresse e-mail',
    requestOnboarding: 'Demander une démonstration',
    noCreditCardNote: 'Sans carte bancaire • Support en anglais, kinyarwanda & français',
    requestReceived: 'Demande reçue !',
    returnToWebsite: 'Retour au site',
    needPersonalOnboarding: 'Besoin d\'un accompagnement personnalisé ?',
    notifySupportFaqs: 'Support & FAQ Notify',
    dedicatedAssistance: 'Assistance dédiée aux gestionnaires immobiliers à Kigali',
    frequentlyAskedQuestions: 'Foire Aux Questions',
    simplifyMallOps: 'Simplifiez la gestion de votre centre',
    tellUsAboutProperty: 'Parlez-nous de votre propriété à Kigali. Notre équipe configurera votre espace personnalisé en 24h.',
    propertyOrMallName: 'Nom de la propriété ou du centre',
    customMallName: 'Nom du centre & Emplacement',
    totalCommercialUnitsLabel: 'Nombre d\'unités commerciales',
    unitsLabel: 'Unités',
    yourFullName: 'Votre nom complet',
    phoneWhatsapp: 'Téléphone / WhatsApp',
    emailAddressLabel: 'Adresse e-mail',
    noCreditCardRequired: 'Sans carte bancaire • Support en anglais, kinyarwanda & français',
    thankYouMessage: 'Merci',
    kigaliTeamReachOut: 'Notre équipe locale à Kigali vous contactera au',
    toSetupWorkspace: 'pour configurer votre espace pour',

    // Tenant Interface
    tenantMyHome: 'Mon Foyer',
    tenantLandlord: 'Bailleur',
    tenantProperty: 'Propriété',
    tenantUnit: 'Unité / Local',
    tenantTenancy: 'Statut du Bail',
    tenantAcceptInvitation: 'Accepter l\'invitation',
    tenantCreateAccount: 'Créer un compte',
    tenantWelcome: 'Bienvenue sur Notify',
    tenantGoToMyHome: 'Aller à Mon Foyer',

    // Phase 4 Maintenance, Complaints & Communication
    maintenance: 'Entretien & Maintenance',
    maintenanceRequests: 'Demandes d\'Entretien',
    reportIssue: 'Signaler un Problème',
    newMaintenanceRequest: 'Nouvelle Demande d\'Entretien',
    issueTitle: 'Titre du Problème',
    issueDescription: 'Description détaillée',
    category: 'Catégorie',
    priority: 'Priorité',
    urgent: 'Urgent',
    high: 'Élevée',
    medium: 'Moyenne',
    low: 'Faible',
    submitted: 'Soumis',
    acknowledged: 'Pris en charge',
    inProgress: 'En cours de réparation',
    scheduled: 'Planifié',
    resolved: 'Résolu',
    closed: 'Clôturé',
    reopened: 'Rouvert',
    rejected: 'Rejeté',
    plumbing: 'Plomberie & Canalisations',
    electrical: 'Électricité & Éclairage',
    water: 'Alimentation en Eau',
    heatingCooling: 'Climatisation & Ventilation',
    structural: 'Structure & Murs',
    appliance: 'Équipements & Appareils',
    securityCategory: 'Serrures & Sécurité',
    cleaning: 'Nettoyage & Assainissement',
    internet: 'Internet & Télécoms',
    otherCategory: 'Général / Autre',
    assignedTechnician: 'Technicien Assigné',
    scheduledFor: 'Planifié pour le',
    estimatedCost: 'Coût Estimé',
    actualCost: 'Coût Réel',
    addToExpenses: 'Ajouter aux Dépenses',
    addedToExpenses: 'Ajouté aux Dépenses',
    confirmResolution: 'Confirmer la Résolution',
    confirmResolutionPrompt: 'Ce problème a-t-il été résolu à votre entière satisfaction ?',
    reopenRequest: 'Rouvrir la Demande',
    reopenPrompt: 'Expliquez ce qui nécessite encore une intervention',
    tenantNotes: 'Remarques du Locataire',
    landlordNotes: 'Remarques du Bailleur',
    conversation: 'Fil de Discussion',
    assignWorker: 'Assigner & Planifier',
    scheduleVisit: 'Planifier la Visite',
    markResolved: 'Marquer comme Résolu',
    workersTechnicians: 'Techniciens & Prestataires',
    addWorker: 'Ajouter un Technicien',
    workerName: 'Nom du Technicien',
    workerPhone: 'Numéro de Téléphone',
    specialization: 'Spécialisation',
    complaints: 'Plaintes & Réclamations',
    fileComplaint: 'Déposer une Réclamation',
    newComplaint: 'Nouvelle Réclamation',
    complaintSubject: 'Objet de la Réclamation',
    underReview: 'En cours d\'examen',
    landlordResponse: 'Réponse du Bailleur',
    noise: 'Nuisances Sonores',
    neighbor: 'Conflit de Voisinage',
    propertyCondition: 'État des Lieux',
    landlordService: 'Gestion & Service',
    utility: 'Factures de Services',
    payment: 'Paiement & Facturation',
    leaseCategory: 'Bail & Contrat',
    notificationCenter: 'Centre de Notifications',
    notifications: 'Notifications',
    markAllAsRead: 'Tout marquer comme lu',
    noNotifications: 'Aucune notification pour le moment',
    unread: 'Non lu',

    // Comprehensive Tenant Experience
    navHome: 'Accueil',
    navLease: 'Bail',
    navPayments: 'Paiements',
    navMessages: 'Messages',
    navProfile: 'Profil & Paramètres',
    verifiedTenant: 'LOCATAIRE VÉRIFIÉ',
    activeTenancy: 'Bail Actif',
    rentalUnit: 'Unité Louée',
    unitLabel: 'Unité',
    floor: 'Étage',
    welcomeBack: 'Bienvenue',
    rentUpToDate: 'Vos paiements de loyer sont entièrement à jour.',
    rentDueWarning: 'Le loyer est dû. Veuillez effectuer votre paiement avant l\'échéance.',
    rentOverdueWarning: 'Le loyer est en retard. Veuillez régler votre solde impayé.',
    payRent: 'Payer le Loyer',
    viewLeaseDetails: 'Voir les Détails du Bail',
    reportMaintenance: 'Signaler un Problème',
    messageLandlord: 'Contacter le Propriétaire',
    outstandingRent: 'Solde Impayé',
    nextDueDate: 'Prochaine Échéance',
    openRequests: 'Demandes en Cours',
    daysRemaining: 'jours restants',
    daysTotalLease: 'durée totale du bail',
    leaseExpires: 'Expiration du bail',
    leaseCountdown: 'Durée du Bail & Compte à Rebours',
    signedDocument: 'Document Signé',
    activeLeaseStatus: 'Bail Actif',
    leaseExpiredStatus: 'Bail Expiré',
    expiringSoonStatus: 'Expire Bientôt',
    expiringTwoMonths: 'Expire dans ~2 Mois',
    recentInvoices: 'Factures de Loyer Récentes',
    recentReceipts: 'Reçus Officiels de Paiement',
    noInvoices: 'Aucune facture de loyer trouvée.',
    noReceipts: 'Aucun reçu généré pour le moment. Les reçus apparaîtront ici automatiquement dès confirmation du paiement.',
    viewAll: 'Voir Tout',
    leaseAgreementOverview: 'Aperçu du Contrat de Bail',
    contractReference: 'Référence du Contrat',
    startDate: 'Date de Début',
    endDate: 'Date de Fin',
    leaseDuration: 'Durée Totale',
    financialTerms: 'Conditions Financières & Détails',
    baseRentAmount: 'Loyer Mensuel de Base',
    securityDeposit: 'Dépôt de Garantie (Caution)',
    serviceCharge: 'Frais de Service & Entretien',
    paymentFrequency: 'Fréquence de Paiement',
    latePenalty: 'Pénalité de Retard',
    keyTermsClauses: 'Conditions Clés & Clauses',
    requestRenewal: 'Demander le Renouvellement',
    downloadAgreement: 'Télécharger le Bail Signé (PDF)',
    viewSignedPdf: 'Voir le Bail Signé',
    rentalInvoices: 'Factures de Loyer',
    paymentReceiptsHistory: 'Reçus & Historique',
    totalOutstandingBalance: 'Solde Total Impayé',
    payFullBalance: 'Payer la Totalité',
    invoiceNumber: 'N° Facture',
    period: 'Période',
    totalAmount: 'Montant Total',
    balanceDue: 'Solde Dû',
    viewInvoice: 'Voir la Facture',
    payNow: 'Payer Maintenant',
    verifiedReceipt: 'REÇU VÉRIFIÉ',
    viewAndPrint: 'Voir & Imprimer',
    paymentTransactionsRecord: 'Historique des Transactions',
    paymentRef: 'Réf. Paiement',
    transactionRef: 'Réf. Transaction',
    date: 'Date',
    noTransactions: 'Aucune transaction enregistrée pour le moment.',
    landlordSupport: 'Gestion & Support Propriétaire',
    chat: 'Discussion',
    online: 'En ligne',
    typeMessage: 'Écrivez un message...',
    describeMaintenance: 'Décrivez votre problème d\'entretien...',
    noChatsFound: 'Aucune discussion trouvée',
    startConversation: 'Démarrez une conversation avec la gestion.',
    searchChats: 'Rechercher des discussions...',
    attachedFile: 'Fichier Joint',
    photoAttached: 'Photo Jointe',
    profileDetails: 'Détails du Profil',
    passwordSecurity: 'Mot de Passe & Sécurité',
    notificationChannels: 'Canaux de Notification',
    appLanguage: 'Langue de l\'Application',
    firstName: 'Prénom',
    lastName: 'Nom de Famille',
    nationalIdPassport: 'Numéro CNI / Passeport',
    occupationBusiness: 'Profession / Activité',
    saveChanges: 'Enregistrer les Modifications',
    saving: 'Enregistrement...',
    profileSavedSuccess: 'Vos informations ont été enregistrées avec succès.',
    currentPassword: 'Mot de Passe Actuel',
    newPassword: 'Nouveau Mot de Passe',
    confirmNewPassword: 'Confirmer le Nouveau Mot de Passe',
    updatePassword: 'Mettre à Jour le Mot de Passe',
    passwordSavedSuccess: 'Votre mot de passe a été modifié avec succès.',
    notificationAlertChannels: 'Canaux d\'Alertes et de Notifications',
    configureAlertsDesc: 'Configurez comment et quand vous recevez vos rappels de loyer, factures et avis d\'entretien.',
    rentInvoicesReceipts: 'Factures de Loyer & Reçus',
    rentInvoicesReceiptsDesc: 'Alertes pour nouvelles factures mensuelles, rappels d\'échéance et reçus confirmés.',
    maintenanceChat: 'Entretien & Échanges avec le Propriétaire',
    maintenanceChatDesc: 'Mises à jour des techniciens, réponses aux messages et ordres de travail.',
    leaseTermsExpiry: 'Conditions du Bail & Alertes d\'Échéance',
    leaseTermsExpiryDesc: 'Alertes automatiques à 60, 30 et 14 jours avant l\'échéance du bail.',
    inApp: 'Dans l\'App',
    email: 'E-mail',
    sms: 'SMS',
    whatsapp: 'WhatsApp',
    saveNotificationPrefs: 'Enregistrer les Préférences',
    appLanguagePref: 'Langue Préférée de l\'Application',
    appLanguagePrefDesc: 'Sélectionnez votre langue. Toutes les pages du locataire, messages et factures s\'adapteront automatiquement.',
    english: 'English (EN)',
    kinyarwanda: 'Ikinyarwanda (RW)',
    french: 'Français (FR)',
    englishDesc: 'Langue commerciale et officielle',
    kinyarwandaDesc: 'Ururimi rw\'igihugu n\'itumanaho i Kigali',
    frenchDesc: 'Langue officielle et correspondance',
    emergencyContacts: 'Contacts d\'Urgence & de Gestion',
    emergencyContactsDesc: 'Numéros dédiés 24h/24 et 7j/7 pour toute assistance immédiate.',
    securityEmergency: 'Sécurité & Urgences 24/7',
    buildingCaretaker: 'Concierge & Entretien de l\'Immeuble',
    signOutTenant: 'Se Déconnecter du Compte Locataire',
    signOutTenantDesc: 'Mettre fin à votre session active sur cet appareil. Vous aurez besoin de vos identifiants pour vous reconnecter.',
    logOut: 'Se Déconnecter',
    rentPaymentPortal: 'Portail de Paiement de Loyer',
    paymentSuccessful: 'Paiement Réussi !',
    paymentPendingVerification: 'Paiement Soumis pour Vérification',
    selectPaymentMethod: 'Choisir le Moyen de Paiement',
    mobileMoney: 'Mobile Money (MTN / Airtel)',
    bankTransfer: 'Virement Bancaire / Dépôt',
    creditDebitCard: 'Carte Bancaire',
    enterMobileNumber: 'Numéro de Téléphone Mobile Money',
    momoPromptDesc: 'Une invite de paiement sécurisée sera envoyée directement sur votre téléphone. Saisissez votre code PIN.',
    confirmAndPay: 'Confirmer & Payer',
    officialPaymentReceipt: 'Reçu Officiel de Paiement',
    printSaveReceipt: 'Imprimer / Enregistrer le Reçu (PDF)',
    close: 'Fermer',
    rentalInvoice: 'Facture de Loyer',
    billedTo: 'Facturé à (Locataire)',
    billingPeriod: 'Période de Facturation',
    itemDescription: 'Description de l\'Élément',
    monthlyRentItem: 'Loyer Mensuel',
    discountApplied: 'Remise Appliquée',
    latePaymentFee: 'Pénalité de Retard',
    subtotal: 'Sous-total',
    totalDueNow: 'Total Solde Dû',
    partiallyPaid: 'Partiellement Payé',
    invoiceDetails: 'Facture de Loyer',
    downloadInvoice: 'Imprimer / Enregistrer la Facture',
    issueDate: 'Date d\'Émission',
    dueDate: 'Date d\'Échéance',
    property: 'Immeuble / Propriété',
    to: 'au',
    type: 'Type',
    payRentNow: 'Payer le Loyer Maintenant',
    invalidAmount: 'Le montant du paiement doit être supérieur à zéro.',
    amountExceedsBalance: 'Le montant ne peut pas dépasser le solde dû de',
    payRentOnline: 'Portail de Paiement de Loyer',
    invoices: 'Facture',
    paymentSubmittedVerification: 'Paiement Soumis pour Vérification',
    paymentConfirmedNotice: 'Votre paiement de',
    hasBeenConfirmed: 'a été confirmé. Reçu généré.',
    offlineSlipSubmittedNotice: 'Votre bordereau de paiement de',
    submittedVerification: 'a été soumis. Votre bailleur vérifiera et délivrera votre reçu.',
    transactionReference: 'Référence',
    viewReceipt: 'Voir le Reçu Officiel',
    creditCard: 'Carte Bancaire',
    offlinePaymentMethod: 'Moyen de Paiement Hors-ligne',
    cash: 'Paiement en Espèces',
    amountToPay: 'Montant à Payer (RWF)',
    maximumAllowed: 'Maximum autorisé',
    cancel: 'Annuler',
    processingPayment: 'Traitement du paiement en cours...',
    officialReceipt: 'Reçu Officiel de Paiement',
    paymentVerifiedConfirmed: 'Paiement Vérifié & Confirmé',
    issuedOn: 'Délivré le',
    receiptNumber: 'Numéro de Reçu',
    paymentId: 'ID Paiement',
    propertyUnit: 'Propriété & Unité',
    issuedBy: 'Délivré Par',
    digitalReceiptDisclaimer: 'Ceci est un reçu numérique officiel généré par Notify Property Management Kigali.',
    chats: 'Discussions',
    loadingConversations: 'Chargement des conversations...',
    startConversationManagement: 'Démarrer une conversation avec la gestion.',
    tapToChat: 'Appuyez pour discuter',
    back: 'Retour aux discussions',
    landlordPropertySupport: 'Support Bailleur & Propriété',
    describeMaintenanceIssue: 'Décrivez votre problème d\'entretien...',
    goodMorning: 'Bonjour',
    goodAfternoon: 'Bon après-midi',
    goodEvening: 'Bonsoir',
    tenantSubtitle: 'Gérez votre bail, vos demandes d\'entretien et vos paiements.',
    rentAndInvoices: 'Loyer & Factures',
    allCaughtUp: 'Tout est à jour',
    noPendingRentCharges: 'Aucun solde de loyer en attente sur votre compte.',
    viewPaymentRecords: 'Voir l\'Historique des Paiements',
    messagesSupport: 'Messages & Support',
    chatLandlord: 'Discuter avec le Bailleur',
    recentMaintenanceRequests: 'Demandes d\'Entretien Récentes',
    viewInChat: 'Voir dans la Discussion',
    recentRentInvoices: 'Factures de Loyer Récentes',
    residentialTenancyAgreement: 'Contrat de Bail Résidentiel',
    tenancyGovernedRwanda: 'Contrat de bail régi par les lois de la République du Rwanda.',
    viewSignedAgreement: 'Voir le Contrat de Bail Signé',
    unitAllocated: 'Unité Attribuée',
    leaseTerm: 'Durée du Bail',
    financialTermsSchedule: 'Conditions Financières & Calendrier de Paiement',
    paidHeldEscrow: 'Payé et Conservé en Sécurité',
    paymentMethodsAccepted: 'Moyens de Paiement Acceptés',
    instantDigitalReceipts: 'Reçus numériques instantanés délivrés',
    buildingGuidelines: 'Règlement Intérieur de l\'Immeuble',
    quietHours: 'Heures de silence : 22h00 – 07h00 tous les jours.',
    currentOutstandingBalance: 'Solde Actuel Restant Dû',
    allRentInvoices: 'Toutes les Factures de Loyer',
    officialPaymentReceipts: 'Reçus Officiels de Paiement de Loyer',
    reopenMaintenanceRequest: 'Rouvrir la Demande d\'Entretien',
    reopenExplanationPlaceholder: 'Expliquez pourquoi le problème nécessite une attention supplémentaire...',
    submitReopen: 'Soumettre la Réouverture',
    propertyManagement: 'Gestion Immobilière',
    maintenanceSupport: 'Support d\'Entretien',
    confirmDone: 'Confirmer Terminé',
    reopen: 'Rouvrir',
    days: 'Jours',
    tenantLease: 'Bail',
    maintenanceInquiry: 'Demande d\'Entretien',
    submittedMaintenancePhoto: 'Photo d\'entretien envoyée',
    sentAnAttachment: 'Pièce jointe envoyée',
    removeAttachment: 'Supprimer la pièce jointe',
    attachPhotoDocument: 'Joindre une photo ou un document',
    attachSamplePhoto: 'Joindre une photo d\'exemple',
    photoAttachment: 'Photo jointe',
    backToDashboard: 'Retour au tableau de bord',
    ticketInfo: 'Infos du ticket',
    complaintSubmitted: 'Soumise',
    complaintAcknowledged: 'Prise en compte',
    complaintUnderReview: 'En cours d\'examen',
    complaintResolved: 'Résolue',
    complaintClosed: 'Clôturée',
    attachFile: 'Joindre un fichier',
    attachmentUploadReady: 'Téléchargement de pièce jointe prêt.',
    tenantLedger: 'Grand Livre du Locataire',
    totalInvoiced: 'Total Facturé',
    invoicesGenerated: 'factures émises',
    verifiedTransactions: 'transactions vérifiées',
    currentBalanceDue: 'Solde Dû Actuel',
    allSettled: 'Tout est réglé',
    paymentPending: 'Paiement en attente',
    overdueBalance: 'Solde en Retard',
    requiresImmediateAction: 'Action immédiate requise',
    noOverdueCharges: 'Aucun retard de paiement',
    quickActions: 'Actions Rapides',
    outstanding: 'Restant Dû',
    sendRentReminder: 'Envoyer un Rappel de Loyer',
    chronologicalLedger: 'Grand Livre Chronologique',
    invoicesAndCharges: 'Factures & Frais',
    paymentsAndSlips: 'Paiements & Reçus',
    officialReceipts: 'Reçus Officiels',
    reference: 'Référence',
    debitCharge: 'Débit (Facturation)',
    creditPayment: 'Crédit (Paiement)',
    noLedgerRecordsFound: 'Aucun enregistrement financier trouvé pour ce locataire.',
    noReceiptsGenerated: 'Aucun reçu généré pour le moment pour ce locataire.',
    closeLedger: 'Fermer le Grand Livre',
    exportCsv: 'Exporter en CSV',
    monthlyRentInvoice: 'Facture Mensuelle de Loyer',
    paymentVia: 'Paiement par',
    leaseAgreementDocument: 'Document du Contrat de Bail',
    currentDocument: 'Document Actuel',
    versionHistory: 'Historique des Versions',
    uploadNewVersion: 'Téléverser une Nouvelle Version',
    downloadAgreementDoc: 'Télécharger le Bail',
    storagePath: 'Chemin de Stockage',
    uploadedAt: 'Téléversé le',
    contractDetailsVerification: 'Détails du Contrat & Vérification',
    legalComplianceMet: 'Conformité Juridique Validée',
    noSignedLeaseUploaded: 'Aucun Document de Bail Signé Téléversé',
    noSignedLeaseDesc: 'Ce bail est actuellement en état de brouillon. Un document de contrat signé est requis avant d\'activer ce bail.',
    uploadAgreementNow: 'Téléverser le Document de Bail Maintenant',
    uploadAgreementDocumentNow: 'Téléverser le Document de Bail Maintenant',
    uploadedBy: 'Téléversé par',
    contractDetailsAndVerification: 'Détails du Contrat & Vérification',
    noSignedLeaseDocumentUploaded: 'Aucun Document de Bail Signé Téléversé',
    draftLeaseNotice: 'Ce bail est actuellement en état de brouillon. Un document de contrat signé est requis avant d\'activer ce bail.',
    auditLogVersionHistory: 'Journal d\'audit de toutes les versions et avenants téléversés pour ce bail.',
    noVersionHistory: 'Aucun historique de version trouvé.',
    uploadNewVersionNotice: 'Le téléversement d\'un nouveau fichier créera une nouvelle version, archivera le contrat actuel et mettra à jour les registres légaux.',
    saveAndPublishNewVersion: 'Enregistrer & Publier la Version',
    uploadingAndVersioning: 'Téléversement & Versionnage en cours...',
    downloadThisVersion: 'Télécharger cette version',
    pleaseSelectDocumentToUpload: 'Veuillez sélectionner un document à téléverser.',
    newDocumentVersionUploadedSuccess: 'Nouvelle version du document téléversée avec succès !',
    paymentFailed: 'Le traitement du paiement a échoué. Veuillez réessayer.',
    due: 'Dû',
    balance: 'Solde',
    awaitingVerification: 'En attente de vérification par le bailleur / la banque',
    activeLease: 'Bail Actif',
    activeRequests: 'Demandes Actives',
    chatDirectDesc: 'Discutez directement avec votre bailleur et soumettez des demandes de maintenance.',
    navMaintenance: 'Maintenance',
    assignedWorker: 'Technicien Assigné',
    action: 'Action',
    view: 'Voir',
    pay: 'Payer',
    total: 'Total',
    dueOnOrBefore5th: 'Payable au plus tard le 5 de chaque mois calendaire.',
    maintenanceDirectReporting: 'Signalez vos réparations de plomberie, électricité ou structure directement par messagerie.',
    garbageCollectionSchedule: 'Collecte des ordures ménagères chaque mardi et vendredi matin.',
    propertyManagementAndLandlord: 'Gestion Immobilière & Bailleur',
    landlord: 'Bailleur',
    emergencyContact: 'Contact d\'Urgence',
    emailSupport: 'Support E-mail',
    messagePropertyManager: 'Envoyer un message au gestionnaire',
    rentInvoices: 'Factures de Loyer',
    paymentReceipts: 'Reçus de Paiement',
    invoiceType: 'Type de Facture',
    noRentInvoicesFound: 'Aucune facture de loyer trouvée.',
    viewDetails: 'Voir les Détails',
    noPaymentReceiptsYet: 'Aucun reçu de paiement trouvé pour le moment.',
    issued: 'Émis le',
    noPaymentTransactionsRecorded: 'Aucune transaction de paiement enregistrée pour le moment.',
    today: 'Aujourd\'hui',
    versionHistoryDesc: 'Journal d\'audit de toutes les versions et avenants téléversés pour ce bail.',
    noVersionHistoryFound: 'Aucun historique de version trouvé.',
    uploadNewVersionDesc: 'Le téléversement d\'un nouveau fichier créera une nouvelle version, archivera le contrat actuel et mettra à jour les registres légaux.',
    savePublishNewVersion: 'Enregistrer & Publier la Version',
    uploadingVersioning: 'Téléversement & Versionnage en cours...',
  },
};

