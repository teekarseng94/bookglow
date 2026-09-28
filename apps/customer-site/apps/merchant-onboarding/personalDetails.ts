/** Malaysia is the only supported merchant country in this version. */
export const DEFAULT_CALLING_CODE = '+60';
export const DEFAULT_COUNTRY_ISO = 'MY';
export const DEFAULT_COUNTRY_NAME = 'Malaysia';

export const CALLING_CODES = [
  { iso: DEFAULT_COUNTRY_ISO, callingCode: DEFAULT_CALLING_CODE, name: DEFAULT_COUNTRY_NAME },
] as const;

export function splitDisplayName(name: string | null | undefined): { firstName: string; lastName: string } {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function namesFromAuthMetadata(meta: Record<string, unknown> | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const given = typeof meta?.given_name === 'string' ? meta.given_name.trim() : '';
  const family = typeof meta?.family_name === 'string' ? meta.family_name.trim() : '';
  if (given || family) return { firstName: given, lastName: family };
  const full =
    (typeof meta?.full_name === 'string' && meta.full_name) ||
    (typeof meta?.name === 'string' && meta.name) ||
    '';
  return splitDisplayName(full);
}

export function isGoogleAuthProvider(identities: Array<{ provider?: string }> | null | undefined): boolean {
  return (identities || []).some((identity) => identity.provider === 'google');
}

export function nationalDigits(value: string): string {
  return (value || '').replace(/\D/g, '');
}

/** Drop a leading trunk 0 used in local Malaysian numbers (e.g. 012 → 12). */
export function nationalNumberForE164(raw: string, callingCode = DEFAULT_CALLING_CODE): string {
  let digits = nationalDigits(raw);
  const codeDigits = nationalDigits(callingCode);
  if (digits.startsWith(codeDigits)) digits = digits.slice(codeDigits.length);
  if (callingCode === DEFAULT_CALLING_CODE && digits.startsWith('0')) digits = digits.replace(/^0+/, '');
  return digits;
}

export function toE164(raw: string, callingCode = DEFAULT_CALLING_CODE): string | null {
  const national = nationalNumberForE164(raw, callingCode);
  if (!national) return null;
  return `${callingCode}${national}`;
}

/**
 * Malaysian mobiles are 9–10 digits after +60 and start with 1 (01x locally).
 * Rejects empty, country-code-only, and obviously short/long values.
 */
export function isValidMobileNumber(raw: string, callingCode = DEFAULT_CALLING_CODE): boolean {
  const national = nationalNumberForE164(raw, callingCode);
  if (callingCode === DEFAULT_CALLING_CODE) {
    return /^1\d{8,9}$/.test(national);
  }
  return national.length >= 8 && national.length <= 12;
}

export function phoneValidationMessage(raw: string, callingCode = DEFAULT_CALLING_CODE): string | null {
  if (!nationalNumberForE164(raw, callingCode)) return 'Please enter a valid mobile number.';
  if (!isValidMobileNumber(raw, callingCode)) return 'Please enter a valid mobile number.';
  return null;
}

export function formatNationalDisplay(raw: string, callingCode = DEFAULT_CALLING_CODE): string {
  const national = nationalNumberForE164(raw, callingCode);
  if (national.length <= 3) return national;
  if (national.length <= 7) return `${national.slice(0, 2)} ${national.slice(2)}`;
  return `${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
}

export function composeFullName(firstName: string, lastName: string): string {
  return [firstName, lastName].map((part) => part.trim()).filter(Boolean).join(' ');
}

export function firstInvalidPersonalSelector(payload: {
  firstName: string;
  phoneNational: string;
  legalAccepted: boolean;
}): string | null {
  if (!payload.firstName.trim()) return 'input[name="given-name"]';
  if (phoneValidationMessage(payload.phoneNational)) return 'input[name="tel"]';
  if (!payload.legalAccepted) return 'input[name="legal"]';
  return null;
}
