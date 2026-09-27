import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureOutletBookingSlug } from './ensureOutletBookingSlug';

const getByBookingSlug = vi.fn();
const update = vi.fn();

vi.mock('../services/databaseService', () => ({
  outletService: {
    getByBookingSlug: (...args: unknown[]) => getByBookingSlug(...args),
    update: (...args: unknown[]) => update(...args),
  },
}));

describe('ensureOutletBookingSlug', () => {
  beforeEach(() => {
    getByBookingSlug.mockReset();
    update.mockReset();
    getByBookingSlug.mockResolvedValue(null);
    update.mockResolvedValue(undefined);
  });

  it('returns the stored slug without writing', async () => {
    await expect(
      ensureOutletBookingSlug({
        outletId: 'outlet_aaaaaaaaaaaaaaaaaaaaaaaaaa12ab34',
        existing: 'baliWellness',
        name: '白金卡',
      }),
    ).resolves.toBe('baliWellness');
    expect(update).not.toHaveBeenCalled();
  });

  it('persists business-<suffix> when the shop name has no ASCII slug', async () => {
    const outletId = 'outlet_aaaaaaaaaaaaaaaaaaaaaaaaaa12ab34';
    await expect(
      ensureOutletBookingSlug({ outletId, existing: '', name: '白金卡' }),
    ).resolves.toBe('business-12ab34');
    expect(update).toHaveBeenCalledWith(outletId, { bookingSlug: 'business-12ab34' });
  });
});
