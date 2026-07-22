/**
 * Repository interfaces for migration.
 * UI and hooks should depend on these contracts, not Firebase/Supabase SDKs directly.
 * Implementations remain Firebase until each domain is cut over.
 */

export type OutletId = string;

export interface PublicOutletSummary {
  id: OutletId;
  name: string;
  addressDisplay?: string;
  phoneNumber?: string;
  bookingSlug?: string;
  businessHours?: Record<string, { open: string; close: string; isOpen?: boolean }>;
}

export interface PublicServiceSummary {
  id: string;
  name: string;
  price: number;
  duration: number;
  category: string;
  isVisible?: boolean;
}

export interface PublicStaffSummary {
  id: string;
  name: string;
  profilePicture?: string;
  qualifiedServices?: string[];
}

export interface OutletRepository {
  getById(outletId: OutletId): Promise<PublicOutletSummary | null>;
  getByBookingSlug(slug: string): Promise<PublicOutletSummary | null>;
}

export interface ServiceRepository {
  listVisibleByOutlet(outletId: OutletId): Promise<PublicServiceSummary[]>;
}

export interface StaffRepository {
  listByOutlet(outletId: OutletId): Promise<PublicStaffSummary[]>;
}

export interface AuthRepository {
  getCurrentUserId(): Promise<string | null>;
  signOut(): Promise<void>;
}

export interface AppointmentRepository {
  // Intentionally minimal until booking RPC cutover.
  listByOutletDate?(outletId: OutletId, date: string): Promise<unknown[]>;
}

export interface CustomerRepository {
  getById?(customerId: string): Promise<unknown | null>;
}

export interface TransactionRepository {
  listByOutlet?(outletId: OutletId): Promise<unknown[]>;
}

export interface SettingsRepository {
  getOutletSettings?(outletId: OutletId): Promise<unknown | null>;
}
