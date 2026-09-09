import enum


class UserRole(str, enum.Enum):
    SYSTEM_ADMIN = "SYSTEM_ADMIN"
    LANDLORD = "LANDLORD"
    TENANT = "TENANT"


class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PENDING = "PENDING"
    SUSPENDED = "SUSPENDED"
    DEACTIVATED = "DEACTIVATED"


class UserLanguage(str, enum.Enum):
    EN = "EN"
    RW = "RW"
    FR = "FR"


class BusinessType(str, enum.Enum):
    INDIVIDUAL = "INDIVIDUAL"
    COMPANY = "COMPANY"


class VerificationStatus(str, enum.Enum):
    UNVERIFIED = "UNVERIFIED"
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class PropertyType(str, enum.Enum):
    APARTMENT = "APARTMENT"
    HOUSE = "HOUSE"
    COMMERCIAL = "COMMERCIAL"
    OFFICE = "OFFICE"
    MIXED_USE = "MIXED_USE"
    ROOM = "ROOM"
    OTHER = "OTHER"


class PropertyStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ARCHIVED = "ARCHIVED"
    MAINTENANCE = "MAINTENANCE"


class UnitStatus(str, enum.Enum):
    VACANT = "VACANT"
    OCCUPIED = "OCCUPIED"
    MAINTENANCE = "MAINTENANCE"
    RESERVED = "RESERVED"
    INACTIVE = "INACTIVE"
    UNDER_REPAIR = "UNDER_REPAIR"


class TenancyStatus(str, enum.Enum):
    INVITED = "INVITED"
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    ENDED = "ENDED"
    TERMINATED = "TERMINATED"


class LeaseStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    EXPIRING_SOON = "EXPIRING_SOON"
    EXPIRED = "EXPIRED"
    TERMINATED = "TERMINATED"


class InvitationStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class NotificationChannel(str, enum.Enum):
    IN_APP = "IN_APP"
    EMAIL = "EMAIL"
    SMS = "SMS"
    PUSH = "PUSH"
    WHATSAPP = "WHATSAPP"


class NotificationPriority(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class NotificationCategory(str, enum.Enum):
    LEASE_EXPIRY = "LEASE_EXPIRY"
    PAYMENT = "PAYMENT"
    MAINTENANCE = "MAINTENANCE"
    COMPLAINT = "COMPLAINT"
    SYSTEM = "SYSTEM"


class NotificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
    READ = "READ"
    SKIPPED = "SKIPPED"


class RentScheduleFrequency(str, enum.Enum):
    MONTHLY = "MONTHLY"
    WEEKLY = "WEEKLY"
    QUARTERLY = "QUARTERLY"
    YEARLY = "YEARLY"


class RentScheduleStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    PAUSED = "PAUSED"


class InvoiceType(str, enum.Enum):
    RENT = "RENT"
    OTHER = "OTHER"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ISSUED = "ISSUED"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


class PaymentMethod(str, enum.Enum):
    MOBILE_MONEY = "MOBILE_MONEY"
    BANK = "BANK"
    CARD = "CARD"
    CASH = "CASH"
    OTHER = "OTHER"


class PaymentChannel(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    REVERSED = "REVERSED"
    AWAITING_VERIFICATION = "AWAITING_VERIFICATION"


class ExpenseCategory(str, enum.Enum):
    MAINTENANCE = "MAINTENANCE"
    UTILITIES = "UTILITIES"
    TAX = "TAX"
    INSURANCE = "INSURANCE"
    SECURITY = "SECURITY"
    CLEANING = "CLEANING"
    STAFF = "STAFF"
    OTHER = "OTHER"


class ExpenseStatus(str, enum.Enum):
    RECORDED = "RECORDED"
    CANCELLED = "CANCELLED"


class MaintenanceCategory(str, enum.Enum):
    PLUMBING = "PLUMBING"
    ELECTRICAL = "ELECTRICAL"
    WATER = "WATER"
    HEATING_COOLING = "HEATING_COOLING"
    STRUCTURAL = "STRUCTURAL"
    APPLIANCE = "APPLIANCE"
    SECURITY = "SECURITY"
    CLEANING = "CLEANING"
    INTERNET = "INTERNET"
    OTHER = "OTHER"


class MaintenancePriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class MaintenanceStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    IN_PROGRESS = "IN_PROGRESS"
    SCHEDULED = "SCHEDULED"
    RESOLVED = "RESOLVED"
    REOPENED = "REOPENED"
    CLOSED = "CLOSED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class WorkerSpecialization(str, enum.Enum):
    PLUMBER = "PLUMBER"
    ELECTRICIAN = "ELECTRICIAN"
    CARPENTER = "CARPENTER"
    CLEANER = "CLEANER"
    SECURITY = "SECURITY"
    # Trades the technician directory already offers; kept within the column's
    # VARCHAR(11) so no migration is needed.
    HVAC = "HVAC"
    PAINTER = "PAINTER"
    LOCKSMITH = "LOCKSMITH"
    GENERAL = "GENERAL"
    OTHER = "OTHER"


class ComplaintCategory(str, enum.Enum):
    NOISE = "NOISE"
    NEIGHBOR = "NEIGHBOR"
    PROPERTY_CONDITION = "PROPERTY_CONDITION"
    LANDLORD_SERVICE = "LANDLORD_SERVICE"
    SECURITY = "SECURITY"
    UTILITY = "UTILITY"
    PAYMENT = "PAYMENT"
    LEASE = "LEASE"
    OTHER = "OTHER"


class ComplaintPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class ComplaintStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    REJECTED = "REJECTED"


class NotificationType(str, enum.Enum):
    MAINTENANCE_CREATED = "MAINTENANCE_CREATED"
    MAINTENANCE_ACKNOWLEDGED = "MAINTENANCE_ACKNOWLEDGED"
    MAINTENANCE_SCHEDULED = "MAINTENANCE_SCHEDULED"
    MAINTENANCE_RESOLVED = "MAINTENANCE_RESOLVED"
    MAINTENANCE_REOPENED = "MAINTENANCE_REOPENED"
    MAINTENANCE_CLOSED = "MAINTENANCE_CLOSED"
    COMPLAINT_CREATED = "COMPLAINT_CREATED"
    COMPLAINT_UPDATED = "COMPLAINT_UPDATED"
    COMPLAINT_RESOLVED = "COMPLAINT_RESOLVED"
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    INVOICE_CREATED = "INVOICE_CREATED"
    INVOICE_OVERDUE = "INVOICE_OVERDUE"
    LEASE_EXPIRING = "LEASE_EXPIRING"
    LEASE_EXPIRY_30D = "LEASE_EXPIRY_30D"
    LEASE_EXPIRY_14D = "LEASE_EXPIRY_14D"
    LEASE_EXPIRY_7D = "LEASE_EXPIRY_7D"
    LEASE_EXPIRY_3D = "LEASE_EXPIRY_3D"
    LEASE_EXPIRY_2D = "LEASE_EXPIRY_2D"
    LEASE_EXPIRY_1D = "LEASE_EXPIRY_1D"
    LEASE_EXPIRY_TODAY = "LEASE_EXPIRY_TODAY"
    LEASE_EXPIRED = "LEASE_EXPIRED"
    SYSTEM = "SYSTEM"


class WhatsAppMessageType(str, enum.Enum):
    """What a WhatsApp message was sent for - one per business trigger."""
    INVITATION = "INVITATION"
    RENT_DUE = "RENT_DUE"
    RENT_OVERDUE = "RENT_OVERDUE"
    LEASE_EXPIRY = "LEASE_EXPIRY"
    PAYMENT_CONFIRMATION = "PAYMENT_CONFIRMATION"
    TEST = "TEST"


class WhatsAppMessageStatus(str, enum.Enum):
    """
    Lifecycle of one WhatsApp message. QUEUED -> SENT happens in our own
    request; DELIVERED/READ/FAILED arrive later on Meta's status webhook.
    SIMULATED means no provider is configured, so nothing actually left here.
    """
    QUEUED = "QUEUED"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    READ = "READ"
    FAILED = "FAILED"
    SIMULATED = "SIMULATED"
    SKIPPED = "SKIPPED"
