/**
 * Per-field validation for the customer-details form. Rules match the
 * completeness selector (isCustomerDetailsValid): name ≥ 2 chars, phone ≥ 6
 * chars, email empty or valid. Each returns a message, or null when valid.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateFullNameField(value: string): string | null {
  return value.trim().length >= 2 ? null : 'Please enter your full name.';
}

export function validatePhoneField(value: string): string | null {
  return value.trim().length >= 6 ? null : 'Please enter a valid phone number.';
}

export function validateEmailField(value: string): string | null {
  const v = value.trim();
  if (v === '') return null; // optional
  return EMAIL_RE.test(v) ? null : 'Please enter a valid email address, or leave it empty.';
}
