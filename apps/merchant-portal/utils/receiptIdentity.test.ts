import { describe, expect, it } from 'vitest';
import { resolveReceiptIdentity } from './receiptIdentity';

describe('resolveReceiptIdentity', () => {
  const contact = { phone: '+60 16-992 9123', address: 'D-1-30, Razak Residence' };

  it('inherits the shop name and contact details when nothing is overridden', () => {
    expect(
      resolveReceiptIdentity({ shopName: 'Harbour Spa', contact }),
    ).toEqual({
      companyName: 'Harbour Spa',
      phone: '+60 16-992 9123',
      address: 'D-1-30, Razak Residence',
    });
  });

  it('prefers an override the merchant typed', () => {
    expect(
      resolveReceiptIdentity({
        shopName: 'Harbour Spa',
        receiptCompanyName: 'Harbour Enterprise Sdn Bhd',
        receiptPhone: '03-1234 5678',
        receiptAddress: 'Lot 5, Jalan Besar',
        contact,
      }),
    ).toEqual({
      companyName: 'Harbour Enterprise Sdn Bhd',
      phone: '03-1234 5678',
      address: 'Lot 5, Jalan Besar',
    });
  });

  it('treats a blank override as inheriting again', () => {
    const resolved = resolveReceiptIdentity({
      shopName: 'Harbour Spa',
      receiptCompanyName: '   ',
      receiptPhone: '',
      receiptAddress: '\n',
      contact,
    });
    expect(resolved.companyName).toBe('Harbour Spa');
    expect(resolved.phone).toBe('+60 16-992 9123');
    expect(resolved.address).toBe('D-1-30, Razak Residence');
  });

  it('overrides each line independently', () => {
    const resolved = resolveReceiptIdentity({
      shopName: 'Harbour Spa',
      receiptPhone: '03-1234 5678',
      contact,
    });
    expect(resolved).toEqual({
      companyName: 'Harbour Spa',
      phone: '03-1234 5678',
      address: 'D-1-30, Razak Residence',
    });
  });

  it('returns empty strings rather than a placeholder when there is nothing to show', () => {
    expect(resolveReceiptIdentity({})).toEqual({ companyName: '', phone: '', address: '' });
    expect(resolveReceiptIdentity({ contact: null })).toEqual({ companyName: '', phone: '', address: '' });
  });

  it('keeps a CJK shop name, which cannot form a booking path but prints fine', () => {
    expect(resolveReceiptIdentity({ shopName: '白金卡' }).companyName).toBe('白金卡');
  });
});
