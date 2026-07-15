/**
 * Pure service-catalogue logic: mapping raw service docs to the public V2 type,
 * applying inclusion rules, stable sorting, category building, and local
 * search/filter. No React and no Firestore — trivially unit-testable.
 */
import type { PublicService } from '../state/bookingTypes';
import type { RawServiceDoc } from './publicBookingApi';
import { DEFAULT_CURRENCY, type ServiceCategory } from './publicBookingTypes';

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Normalized category key so filtering is stable and case/space-insensitive. */
export function categoryKey(name: string | null, categoryId: string | null): string | null {
  if (categoryId && categoryId.trim()) return categoryId.trim().toLowerCase();
  if (name && name.trim()) return name.trim().toLowerCase();
  return null;
}

/**
 * Map a raw service document to the public type. Returns null for structurally
 * invalid records (bad name/price/duration) so the page never renders garbage.
 * Visibility/active flags are captured but NOT filtered here.
 */
export function mapRawService(raw: RawServiceDoc, currency: string = DEFAULT_CURRENCY): PublicService | null {
  const name = asString(raw.name);
  if (!name || !name.trim()) return null;

  const price = asFiniteNumber(raw.price);
  const durationMinutes = asFiniteNumber(raw.duration);
  // Valid price (>= 0) and duration (> 0) are required.
  if (price === null || price < 0) return null;
  if (durationMinutes === null || durationMinutes <= 0) return null;

  const categoryName = asString(raw.category);
  const rawCategoryId = asString(raw.categoryId);

  return {
    id: raw.id,
    name: name.trim(),
    description: asString(raw.description),
    categoryId: rawCategoryId ?? (categoryName ? categoryName : null),
    categoryName: categoryName && categoryName.trim() ? categoryName.trim() : null,
    durationMinutes,
    price,
    currency: currency || DEFAULT_CURRENCY,
    imageUrl: asString(raw.imageUrl),
    // No explicit archive/delete field exists; a service is active unless the
    // backend explicitly marks it inactive.
    isActive: raw.isActive !== false,
    // `isVisible === false` hides a service from public booking (default true).
    isPubliclyBookable: raw.isVisible !== false,
    sortOrder: asFiniteNumber(raw.sortOrder),
  };
}

/** A service is shown to customers only when active AND publicly bookable. */
export function isServiceBookable(service: PublicService): boolean {
  return service.isActive && service.isPubliclyBookable;
}

function stableComparator(categoryOrder: string[]) {
  const orderIndex = (name: string | null): number => {
    if (!name) return Number.MAX_SAFE_INTEGER;
    const i = categoryOrder.findIndex((c) => c.trim().toLowerCase() === name.trim().toLowerCase());
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return (a: PublicService, b: PublicService): number => {
    // Services with an explicit numeric sortOrder come before those without.
    const aHasOrder = a.sortOrder !== null;
    const bHasOrder = b.sortOrder !== null;
    if (aHasOrder && !bHasOrder) return -1;
    if (!aHasOrder && bHasOrder) return 1;
    // Both have sortOrder -> compare numerically.
    if (aHasOrder && bHasOrder && a.sortOrder !== b.sortOrder) {
      return (a.sortOrder as number) - (b.sortOrder as number);
    }
    const ci = orderIndex(a.categoryName) - orderIndex(b.categoryName);
    if (ci !== 0) return ci;
    const byCat = (a.categoryName ?? '').localeCompare(b.categoryName ?? '');
    if (byCat !== 0) return byCat;
    const byName = a.name.localeCompare(b.name);
    if (byName !== 0) return byName;
    return a.id.localeCompare(b.id); // final tie-breaker for stability
  };
}

/**
 * Build the customer-facing catalogue: map, drop invalid/hidden records, and
 * sort by merchant category order then name (or explicit sortOrder).
 */
export function buildServiceCatalogue(
  raws: RawServiceDoc[],
  currency: string = DEFAULT_CURRENCY,
  categoryOrder: string[] = [],
): PublicService[] {
  const mapped = raws
    .map((r) => mapRawService(r, currency))
    .filter((s): s is PublicService => s !== null)
    .filter(isServiceBookable);
  return mapped.sort(stableComparator(categoryOrder));
}

/**
 * Distinct categories present in the (already-filtered) catalogue, ordered by
 * the merchant's category order then alphabetically. Empty categories are never
 * produced because they are derived from the services themselves.
 */
export function buildCategories(
  services: PublicService[],
  categoryOrder: string[] = [],
): ServiceCategory[] {
  const map = new Map<string, ServiceCategory>();
  for (const s of services) {
    const key = categoryKey(s.categoryName, s.categoryId);
    if (!key || !s.categoryName) continue;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { id: key, name: s.categoryName, count: 1 });
    }
  }
  const orderIndex = (name: string): number => {
    const i = categoryOrder.findIndex((c) => c.trim().toLowerCase() === name.trim().toLowerCase());
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...map.values()].sort((a, b) => {
    const oi = orderIndex(a.name) - orderIndex(b.name);
    return oi !== 0 ? oi : a.name.localeCompare(b.name);
  });
}

export interface ServiceFilter {
  /** Selected category key, or null / 'all' for all services. */
  categoryId: string | null;
  /** Free-text search; matched case-insensitively against name/desc/category. */
  query: string;
}

/** All-services sentinel category key. */
export const ALL_CATEGORY_ID = 'all';

/** Locally filter an already-loaded catalogue by category and search query. */
export function filterServices(services: PublicService[], filter: ServiceFilter): PublicService[] {
  const { categoryId } = filter;
  const q = filter.query.trim().toLowerCase();

  return services.filter((s) => {
    if (categoryId && categoryId !== ALL_CATEGORY_ID) {
      if (categoryKey(s.categoryName, s.categoryId) !== categoryId) return false;
    }
    if (q) {
      const haystack = [s.name, s.description ?? '', s.categoryName ?? '']
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

// ---- display formatting -----------------------------------------------------

/** Format a price with its currency. Zero renders as "Free". */
export function formatPrice(price: number, currency: string = DEFAULT_CURRENCY): string {
  if (!Number.isFinite(price) || price <= 0) return 'Free';
  const amount = Number.isInteger(price) ? String(price) : price.toFixed(2);
  if (currency === 'MYR') return `RM ${amount}`;
  return `${currency} ${amount}`;
}

/** Format a duration in minutes, e.g. 90 -> "1 h 30 min", 60 -> "1 h". */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
