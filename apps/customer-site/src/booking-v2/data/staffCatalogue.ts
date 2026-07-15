/**
 * Pure staff-catalogue logic: mapping raw staff docs to the public type,
 * qualification filtering by service, and display helpers. No React and no
 * Firestore — trivially unit-testable.
 */
import type { RawStaffDoc } from './publicBookingApi';
import type { PublicStaff } from './publicBookingTypes';

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
}

/**
 * Map a raw staff document to the public type, exposing ONLY id/name/role/
 * photoUrl/qualifiedServices. Returns null for records without a usable name.
 * Email/phone/internal fields are never read.
 */
export function mapRawStaff(raw: RawStaffDoc): PublicStaff | null {
  const name = asString(raw.name);
  if (!name || !name.trim()) return null;

  const role = asString(raw.role);
  // Photo may live under profilePicture (base64/URL) or photoURL (download URL).
  const photoUrl = asString(raw.profilePicture) ?? asString(raw.photoURL);

  return {
    id: raw.id,
    name: name.trim(),
    role: role && role.trim() ? role.trim() : null,
    photoUrl: photoUrl && photoUrl.trim() ? photoUrl : null,
    qualifiedServices: asStringArray(raw.qualifiedServices),
  };
}

/** Build the public staff list: map, drop invalid, sort by name (stable). */
export function buildStaffList(raws: RawStaffDoc[]): PublicStaff[] {
  return raws
    .map(mapRawStaff)
    .filter((s): s is PublicStaff => s !== null)
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

/**
 * Whether a staff member can perform a given service. Missing or empty
 * `qualifiedServices` means qualified for ALL services; otherwise the service
 * ID must be listed.
 */
export function isStaffQualified(staff: PublicStaff, serviceId: string | null): boolean {
  if (staff.qualifiedServices.length === 0) return true;
  if (!serviceId) return true;
  return staff.qualifiedServices.includes(serviceId);
}

/** Filter staff to those qualified for the selected service. */
export function filterQualifiedStaff(staff: PublicStaff[], serviceId: string | null): PublicStaff[] {
  return staff.filter((s) => isStaffQualified(s, serviceId));
}

/** Up to two initials from a name, for photo fallbacks. */
export function staffInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}
