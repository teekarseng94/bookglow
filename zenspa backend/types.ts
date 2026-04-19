
export enum TransactionType {
  SALE = 'SALE',
  EXPENSE = 'EXPENSE'
}

export interface Service {
  id: string;
  outletID: string; // Required: Service belongs to outlet
  name: string;
  price: number;
  duration: number; // in minutes
  category: string;
  points: number;
  isCommissionable: boolean;
  description?: string;
  imageUrl?: string; // Optional: URL to service image in Firebase Storage
  createdAt?: string;
  /** Optional: normalized category id for filters (same as category by default) */
  categoryId?: string;
  /** Optional: Lucide/custom icon id for menu and booking UIs */
  iconId?: string;
  /** If true, this service can be redeemed for free using member points in POS */
  redeemPointsEnabled?: boolean;
  /** Points required to redeem this service for free (per unit) */
  redeemPoints?: number;
  /** If false, service is hidden from customer-facing booking page; default true */
  isVisible?: boolean;
}

export interface RoleCommission {
  role: string;
  rate: number; // Percentage
}

export interface Product {
  id: string;
  outletID: string; // Required: Product belongs to outlet
  name: string;
  price: number;
  stock: number;
  category: string;
  /** Optional: fixed commission amount for this product (in outlet currency). When set and a staff member is assigned, this overrides percentage-based role commission for this line item. */
  fixedCommissionAmount?: number;
}

export interface PackageService {
  serviceId: string;
  quantity: number;
}

export interface Package {
  id: string;
  outletID: string; // Required: Package belongs to outlet
  name: string;
  price: number;
  points: number;
  category: string;
  services: PackageService[];
  description?: string;
  createdAt?: string;
}

export interface Reward {
  id: string;
  outletID: string; // Required: Reward belongs to outlet
  name: string;
  cost: number;
  icon: string;
}

export interface Staff {
  id: string;
  outletID: string; // Required: Staff belongs to specific outlet
  name: string;
  role: string;
  email: string;
  phone: string;
  createdAt: string;
  profilePicture?: string; // Base64 or URL
  photoURL?: string; // Download URL (same as profilePicture; stored for compatibility)
  /** List of service IDs this staff member is qualified to perform. If omitted/empty, treated as qualified for all services. */
  qualifiedServices?: string[];
}

export interface Client {
  id: string;
  outletID: string; // Required: Client is scoped to outlet
  name: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: string;
  points: number; // Points are outlet-specific
  /** Optional: additional profile fields configurable from Member form settings */
  birthday?: string;
  gender?: string;
  source?: string;
  ic?: string;
  marital?: string;
  tag?: string;
  ethnic?: string;
  memberTier?: string;
  /** Optional: voucher count for loyalty display (default 0) */
  voucherCount?: number;
  /** Optional: credit balance for display (default 0) */
  credit?: number;
  /** Optional: outstanding balance (amount owed) for display (default 0) */
  outstanding?: number;
  /** Set during CSV import; used to undo a batch via Undo Import */
  lastImportId?: string;
}

export interface Appointment {
  id: string;
  outletID: string; // Required: Appointment belongs to outlet
  clientId: string;
  staffId: string;
  serviceId: string;
  date: string; // ISO Date string (YYYY-MM-DD)
  time: string; // HH:mm
  endTime?: string; // HH:mm - calculated end time based on service duration
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  reminderSent?: boolean;
  isOnDuty?: boolean; // Flag to mark "On Duty" entries created from POS sales
  /** Optional: Firestore transaction document ID that created this on-duty slot (used to clean up when sale is voided/deleted) */
  sourceSaleId?: string;
  /** Optional: Same as sourceSaleId; stored in bookings collection for triggers and queries */
  saleId?: string;
}

export interface CartItem {
  id: string; // Service/product/package id from catalog
  /** Unique id for this cart line (each row = one entry); use for key, remove, staff assignment */
  cartItemId?: string;
  name: string;
  price: number;
  quantity: number;
  type: 'service' | 'product' | 'package';
  points?: number;
  staffId?: string; // Assigned staff for services
  commissionEarned?: number; // Calculated commission for this line item
  /** If true, this line is being redeemed for free with member points */
  redeemedWithPoints?: boolean;
  /** Points required to redeem this line (per unit); copied from service.redeemPoints */
  redeemPoints?: number;
  /** Convenience flag copied from catalog item to know if redemption is allowed */
  redeemPointsEnabled?: boolean;
  /** If true, this line was added via voucher redemption flow; price is 0, originalPrice holds face value for display */
  voucherRedemption?: boolean;
  /** Face value of item when voucherRedemption is true (e.g. $35); used for display only */
  originalPrice?: number;
}

export interface Transaction {
  id: string;
  outletID: string; // Required: Transaction belongs to outlet
  date: string;
  type: TransactionType;
  clientId?: string;
  items?: CartItem[];
  amount: number;
  category: string;
  description: string;
  paymentMethod?: string;
  /** Set on commission expense docs to link back to the sale; used to avoid duplicate commissions for the same sale */
  parentSaleId?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  clientCount: number;
  recentTransactions: Transaction[];
}

export interface OutletSettings {
  shopName: string;
  isOutletModeEnabled: boolean;
  isAdminAuthenticated: boolean;
  lockedFeatures: string[]; // List of feature IDs that are restricted
  paymentMethods: string[];
  reminderEnabled: boolean;
  reminderTiming: number; // hours before
  reminderChannel: 'Email' | 'SMS' | 'Both';
  /** Receipt header title shown on print receipt (e.g. "Tax Invoice"). */
  receiptHeaderTitle?: string;
  /** Company name shown on receipt header. */
  receiptCompanyName?: string;
  /** Company phone shown on receipt. */
  receiptPhone?: string;
  /** Company address shown on receipt. */
  receiptAddress?: string;
  /** Footer note shown at bottom of receipt. */
  receiptFooterNote?: string;
  /** Optional: commission rates per staff role, configured from Staff page. */
  roleCommissions?: RoleCommission[];
}

/** Daily operating hours for booking page (e.g. "8:00" - "17:00") */
export interface OperatingHoursDay {
  open: string;  // HH:mm or "8 AM"
  close: string;
  isOpen?: boolean;
}

/** Review entry for booking page (optional) */
export interface OutletReview {
  author?: string;
  text?: string;
  rating?: number;
  createdAt?: string;
}

// Multi-Tenant Outlet Interface
export interface Outlet {
  outletID: string; // Unique identifier (e.g., "outlet_001", "outlet_002")
  name: string;
  /** Structured address (optional for backward compat) */
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  /** Single-line display address for booking page & sidebar */
  addressDisplay?: string;
  /** Phone number for booking page & contact */
  phoneNumber?: string;
  /** Operating hours by day (sunday, monday, ...); used for Open/Closed status */
  businessHours?: {
    [key: string]: {
      open: string;
      close: string;
      isOpen?: boolean;
    };
  };
  phone?: string;
  email?: string;
  timezone?: string; // e.g., "America/New_York"
  /** Reviews for booking page (array or empty) */
  reviews?: OutletReview[];
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  settings?: OutletSettings;
  /** Service/menu categories (e.g. Massage, Facial). Persisted per outlet. */
  serviceCategories?: string[];
  /**
   * Public booking URL segment under /book/:slug (e.g. baliWellness).
   * The Firestore document id (outletID) stays the canonical tenant key.
   */
  bookingSlug?: string;
}

/** Point transaction log entry (subcollection: clients/{id}/pointTransactions) */
export interface PointTransaction {
  id: string;
  clientId: string;
  outletID: string;
  type: 'Topup' | 'Redeem' | string;
  amount: number;
  previousBalance: number;
  newBalance: number;
  timestamp: string;
  isManual: boolean;
  description?: string;
}

/** Outstanding balance transaction log (subcollection: clients/{id}/outstandingTransactions) */
export interface OutstandingTransaction {
  id: string;
  clientId: string;
  outletID: string;
  type: 'Add' | 'Minus';
  amount: number;
  previousBalance: number;
  newBalance: number;
  timestamp: string;
  isManual: boolean;
  description?: string;
}

export interface CreditHistoryEntry {
  id: string;
  type: 'topup' | 'deduction';
  amount: number;
  newBalance: number;
  staffRemark: string;
  staffName: string;
  timestamp: string; // ISO date string
  /** Optional: link to POS sale (e.g. receipt number) */
  transactionId?: string;
}

/** AI schedule optimizer result (landing page) */
export interface OptimizationResult {
  strategy: string;
  tips: string[];
}

/** API Integration (chatbot / mychatbot.website) – one per outlet. Key stored as hash only. */
export interface ApiIntegration {
  outletID: string;
  /** SHA-256 hex of the API key; raw key never stored */
  apiKeyHash?: string;
  /** First 12 chars + "..." for display (e.g. zk_live_abc...) */
  keyPrefix?: string;
  /** Webhook URL the POS sends updates to */
  webhookUrl?: string;
  updatedAt?: string;
}
