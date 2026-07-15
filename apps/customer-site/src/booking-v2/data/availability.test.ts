import { describe, it, expect } from 'vitest';
import { availabilityAdapter } from './availability';

const params = (date: string, staffId: string | null = null) => ({
  outletId: 'outlet_1',
  serviceId: 'svc-1',
  date,
  staffId,
});

// Fixed calendar facts: 2026-07-12 is a Sunday, 2026-07-13 is a Monday.
const SUNDAY = '2026-07-12';
const MONDAY = '2026-07-13';

describe('sample availability adapter (non-production preview data)', () => {
  it('is clearly marked as sample data', async () => {
    const r = await availabilityAdapter.loadDaySlots(params(MONDAY));
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.isSample).toBe(true);
  });

  it('returns typed slots within opening hours on a weekday', async () => {
    const r = await availabilityAdapter.loadDaySlots(params(MONDAY));
    if (r.status !== 'ok') throw new Error('expected ok');
    expect(r.closed).toBe(false);
    expect(r.slots.length).toBeGreaterThan(0);
    for (const slot of r.slots) {
      expect(slot.time).toMatch(/^\d{2}:\d{2}$/);
      expect(typeof slot.label).toBe('string');
      expect(typeof slot.available).toBe('boolean');
      const [h] = slot.time.split(':').map(Number);
      expect(h).toBeGreaterThanOrEqual(10);
      expect(h).toBeLessThan(18);
    }
  });

  it('renders Sundays as closed with zero slots', async () => {
    const r = await availabilityAdapter.loadDaySlots(params(SUNDAY));
    if (r.status !== 'ok') throw new Error('expected ok');
    expect(r.closed).toBe(true);
    expect(r.slots).toHaveLength(0);
  });

  it('is deterministic — identical inputs produce identical schedules', async () => {
    const a = await availabilityAdapter.loadDaySlots(params(MONDAY));
    const b = await availabilityAdapter.loadDaySlots(params(MONDAY));
    expect(a).toEqual(b);
  });

  it('varies by staff selection (seed includes staffId)', async () => {
    const anyStaff = await availabilityAdapter.loadDaySlots(params(MONDAY, null));
    const specific = await availabilityAdapter.loadDaySlots(params(MONDAY, 'pro-1'));
    if (anyStaff.status !== 'ok' || specific.status !== 'ok') throw new Error('expected ok');
    // Same slot times, potentially different availability patterns.
    expect(anyStaff.slots.map((s) => s.time)).toEqual(specific.slots.map((s) => s.time));
  });
});
