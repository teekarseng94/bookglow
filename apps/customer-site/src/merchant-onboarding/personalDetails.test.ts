import { describe, expect, it } from 'vitest';
import {
  composeFullName,
  firstInvalidPersonalSelector,
  isGoogleAuthProvider,
  isValidMobileNumber,
  namesFromAuthMetadata,
  nationalNumberForE164,
  phoneValidationMessage,
  toE164,
} from '../../apps/merchant-onboarding/personalDetails';

describe('personal details phone', () => {
  it('normalizes a Malaysian mobile to E.164', () => {
    expect(toE164('12 382 9709')).toBe('+60123829709');
    expect(toE164('0123829709')).toBe('+60123829709');
    expect(toE164('+60 12 382 9709')).toBe('+60123829709');
  });

  it('rejects empty, country-code-only, and incomplete numbers', () => {
    expect(isValidMobileNumber('')).toBe(false);
    expect(isValidMobileNumber('+60')).toBe(false);
    expect(isValidMobileNumber('   ')).toBe(false);
    expect(isValidMobileNumber('12')).toBe(false);
    expect(phoneValidationMessage('')).toMatch(/valid mobile number/i);
  });

  it('accepts a complete Malaysian mobile', () => {
    expect(isValidMobileNumber('123829709')).toBe(true);
    expect(nationalNumberForE164('012 382 9709')).toBe('123829709');
  });
});

describe('personal details names', () => {
  it('prefers given_name and family_name from Google metadata', () => {
    expect(namesFromAuthMetadata({ given_name: 'Desa', family_name: 'Petaling', name: 'Other' })).toEqual({
      firstName: 'Desa',
      lastName: 'Petaling',
    });
  });

  it('splits a single full_name when Google given/family are missing', () => {
    expect(namesFromAuthMetadata({ full_name: 'Desa Petaling' })).toEqual({
      firstName: 'Desa',
      lastName: 'Petaling',
    });
  });

  it('detects Google identities and composes a display name', () => {
    expect(isGoogleAuthProvider([{ provider: 'email' }, { provider: 'google' }])).toBe(true);
    expect(isGoogleAuthProvider([{ provider: 'email' }])).toBe(false);
    expect(composeFullName(' Desa ', '  ')).toBe('Desa');
  });

  it('focuses first name, then phone, then consent', () => {
    expect(firstInvalidPersonalSelector({ firstName: '', phoneNational: '', legalAccepted: false })).toBe('input[name="given-name"]');
    expect(firstInvalidPersonalSelector({ firstName: 'Desa', phoneNational: '', legalAccepted: false })).toBe('input[name="tel"]');
    expect(firstInvalidPersonalSelector({ firstName: 'Desa', phoneNational: '123829709', legalAccepted: false })).toBe('input[name="legal"]');
    expect(firstInvalidPersonalSelector({ firstName: 'Desa', phoneNational: '123829709', legalAccepted: true })).toBeNull();
  });
});
