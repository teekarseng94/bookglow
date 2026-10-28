/** Malaysia local calendar used for membership validity. */
export const MEMBERSHIP_TIMEZONE = 'Asia/Kuala_Lumpur';
export const MEMBERSHIP_TERM_YEARS = 1;
export const EXPIRING_SOON_DAYS = 30;

export type MembershipStatus = 'active' | 'expiring_soon' | 'expired';

export interface MembershipValidity {
  status: MembershipStatus;
  /** YYYY-MM-DD in Asia/Kuala_Lumpur. Null when no membership start exists. */
  expiryYmd: string | null;
  startYmd: string | null;
  canRedeemPoints: boolean;
}

const ymdFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: MEMBERSHIP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Local calendar date in Asia/Kuala_Lumpur as YYYY-MM-DD. */
export function malaysiaCalendarDate(instant: Date = new Date()): string {
  return ymdFormatter.format(instant);
}

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Add whole calendar years, clamping the day when the target month is shorter (e.g. 29 Feb). */
export function addCalendarYears(ymd: string, years: number): string {
  const parts = parseYmd(ymd);
  if (!parts) return ymd;
  const y = parts.y + years;
  const d = Math.min(parts.d, daysInMonth(y, parts.m));
  return `${String(y).padStart(4, '0')}-${String(parts.m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function diffDays(fromYmd: string, toYmd: string): number {
  const from = parseYmd(fromYmd);
  const to = parseYmd(toYmd);
  if (!from || !to) return 0;
  const a = Date.UTC(from.y, from.m - 1, from.d);
  const b = Date.UTC(to.y, to.m - 1, to.d);
  return Math.round((b - a) / 86_400_000);
}

/**
 * Membership start is the last renewal, or join date when never renewed.
 * Expiry is one calendar year later; still valid through that local date.
 */
export function membershipStartIso(lastRenewedAt?: string | null, createdAt?: string | null): string | null {
  const start = (lastRenewedAt && lastRenewedAt.trim()) || (createdAt && createdAt.trim()) || '';
  return start || null;
}

export function membershipExpiryYmd(startIso: string): string {
  return addCalendarYears(malaysiaCalendarDate(new Date(startIso)), MEMBERSHIP_TERM_YEARS);
}

export function resolveMembershipValidity(args: {
  lastRenewedAt?: string | null;
  createdAt?: string | null;
  now?: Date;
}): MembershipValidity {
  const startIso = membershipStartIso(args.lastRenewedAt, args.createdAt);
  if (!startIso) {
    return { status: 'expired', expiryYmd: null, startYmd: null, canRedeemPoints: false };
  }
  const startYmd = malaysiaCalendarDate(new Date(startIso));
  const expiryYmd = addCalendarYears(startYmd, MEMBERSHIP_TERM_YEARS);
  const todayYmd = malaysiaCalendarDate(args.now ?? new Date());
  if (todayYmd > expiryYmd) {
    return { status: 'expired', expiryYmd, startYmd, canRedeemPoints: false };
  }
  const daysLeft = diffDays(todayYmd, expiryYmd);
  if (daysLeft <= EXPIRING_SOON_DAYS) {
    return { status: 'expiring_soon', expiryYmd, startYmd, canRedeemPoints: true };
  }
  return { status: 'active', expiryYmd, startYmd, canRedeemPoints: true };
}

export function membershipStatusLabel(status: MembershipStatus): string {
  if (status === 'expiring_soon') return 'Expiring Soon';
  if (status === 'expired') return 'Expired';
  return 'Active';
}

export function formatMembershipDate(ymd: string | null | undefined): string {
  if (!ymd) return '—';
  const parts = parseYmd(ymd);
  if (!parts) return ymd;
  const day = String(parts.d).padStart(2, '0');
  const month = String(parts.m).padStart(2, '0');
  return `${day}/${month}/${parts.y}`;
}
