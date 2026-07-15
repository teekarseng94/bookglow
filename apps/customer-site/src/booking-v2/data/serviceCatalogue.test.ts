import { describe, it, expect } from 'vitest';
import {
  mapRawService,
  isServiceBookable,
  buildServiceCatalogue,
  buildCategories,
  filterServices,
  formatPrice,
  formatDuration,
  ALL_CATEGORY_ID,
} from './serviceCatalogue';
import type { RawServiceDoc } from './publicBookingApi';

function raw(overrides: Partial<RawServiceDoc> & { id: string }): RawServiceDoc {
  return {
    name: 'Facial',
    price: 80,
    duration: 45,
    category: 'Face',
    ...overrides,
  };
}

describe('mapRawService', () => {
  it('maps a valid active publicly-bookable service', () => {
    const s = mapRawService(raw({ id: 's1', description: 'Nice', categoryId: 'face', imageUrl: 'x.jpg' }), 'MYR');
    expect(s).not.toBeNull();
    expect(s).toMatchObject({
      id: 's1',
      name: 'Facial',
      description: 'Nice',
      categoryId: 'face',
      categoryName: 'Face',
      durationMinutes: 45,
      price: 80,
      currency: 'MYR',
      imageUrl: 'x.jpg',
      isActive: true,
      isPubliclyBookable: true,
    });
    expect(isServiceBookable(s!)).toBe(true);
  });

  it('defaults optional fields to null', () => {
    const s = mapRawService(raw({ id: 's1', description: undefined, imageUrl: undefined }));
    expect(s?.description).toBeNull();
    expect(s?.imageUrl).toBeNull();
    expect(s?.sortOrder).toBeNull();
  });

  it('marks inactive / hidden services as not bookable', () => {
    expect(isServiceBookable(mapRawService(raw({ id: 'a', isActive: false }))!)).toBe(false);
    expect(isServiceBookable(mapRawService(raw({ id: 'b', isVisible: false }))!)).toBe(false);
  });

  it('rejects invalid records (returns null)', () => {
    expect(mapRawService(raw({ id: 'a', name: '' }))).toBeNull();
    expect(mapRawService(raw({ id: 'b', name: undefined }))).toBeNull();
    expect(mapRawService(raw({ id: 'c', price: -1 }))).toBeNull();
    expect(mapRawService(raw({ id: 'd', price: undefined }))).toBeNull();
    expect(mapRawService(raw({ id: 'e', price: Number.NaN }))).toBeNull();
    expect(mapRawService(raw({ id: 'f', duration: 0 }))).toBeNull();
    expect(mapRawService(raw({ id: 'g', duration: -5 }))).toBeNull();
    expect(mapRawService(raw({ id: 'h', duration: undefined }))).toBeNull();
  });

  it('accepts a free service (price 0)', () => {
    expect(mapRawService(raw({ id: 's', price: 0 }))?.price).toBe(0);
  });
});

describe('buildServiceCatalogue', () => {
  const raws: RawServiceDoc[] = [
    raw({ id: 'active-1', name: 'Deep Facial', category: 'Face' }),
    raw({ id: 'inactive', name: 'Old', isActive: false }),
    raw({ id: 'hidden', name: 'Secret', isVisible: false }),
    raw({ id: 'bad-price', name: 'Bad', price: -5 }),
    raw({ id: 'bad-duration', name: 'Bad2', duration: 0 }),
    raw({ id: 'active-2', name: 'Aromatherapy', category: 'Massage' }),
  ];

  it('includes only valid, active, publicly-bookable services', () => {
    const list = buildServiceCatalogue(raws, 'MYR');
    const ids = list.map((s) => s.id).sort();
    expect(ids).toEqual(['active-1', 'active-2']);
  });

  it('sorts by merchant category order then name', () => {
    const list = buildServiceCatalogue(raws, 'MYR', ['Massage', 'Face']);
    expect(list.map((s) => s.id)).toEqual(['active-2', 'active-1']);
  });

  it('honours explicit numeric sortOrder when present', () => {
    const withOrder: RawServiceDoc[] = [
      raw({ id: 'b', name: 'B', sortOrder: 2 }),
      raw({ id: 'a', name: 'A', sortOrder: 1 }),
    ];
    expect(buildServiceCatalogue(withOrder).map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('sorts services WITH a numeric sortOrder before services without one', () => {
    const mixed: RawServiceDoc[] = [
      raw({ id: 'no-order-z', name: 'Zeta', category: 'Face' }), // null sortOrder
      raw({ id: 'ordered-2', name: 'Beta', category: 'Face', sortOrder: 5 }),
      raw({ id: 'no-order-a', name: 'Alpha', category: 'Face' }), // null sortOrder
      raw({ id: 'ordered-1', name: 'Gamma', category: 'Face', sortOrder: 1 }),
    ];
    // Ordered ones first (by sortOrder), then the null-order ones (by name).
    expect(buildServiceCatalogue(mixed, 'MYR', ['Face']).map((s) => s.id)).toEqual([
      'ordered-1',
      'ordered-2',
      'no-order-a',
      'no-order-z',
    ]);
  });

  it('is stable/deterministic for equal keys', () => {
    const same: RawServiceDoc[] = [
      raw({ id: 'z', name: 'Same', category: 'Face' }),
      raw({ id: 'a', name: 'Same', category: 'Face' }),
    ];
    expect(buildServiceCatalogue(same).map((s) => s.id)).toEqual(['a', 'z']);
  });
});

describe('buildCategories', () => {
  it('produces distinct categories with counts, ordered by merchant order', () => {
    const services = buildServiceCatalogue(
      [
        raw({ id: '1', category: 'Face' }),
        raw({ id: '2', category: 'Massage' }),
        raw({ id: '3', category: 'Face' }),
      ],
      'MYR',
      ['Massage', 'Face'],
    );
    const cats = buildCategories(services, ['Massage', 'Face']);
    expect(cats.map((c) => c.name)).toEqual(['Massage', 'Face']);
    expect(cats.find((c) => c.name === 'Face')?.count).toBe(2);
  });

  it('never includes empty categories', () => {
    const services = buildServiceCatalogue([raw({ id: '1', category: 'Face' })], 'MYR');
    const cats = buildCategories(services, ['Massage', 'Face', 'Nails']);
    expect(cats.map((c) => c.name)).toEqual(['Face']);
  });

  it('ignores services with no category', () => {
    const services = buildServiceCatalogue([raw({ id: '1', category: '' })], 'MYR');
    expect(buildCategories(services)).toEqual([]);
  });
});

describe('filterServices', () => {
  const services = buildServiceCatalogue(
    [
      raw({ id: '1', name: 'Deep Facial', description: 'gentle glow', category: 'Face' }),
      raw({ id: '2', name: 'Swedish Massage', description: 'relaxing', category: 'Massage' }),
    ],
    'MYR',
  );

  it("'All services' returns everything", () => {
    expect(filterServices(services, { categoryId: ALL_CATEGORY_ID, query: '' })).toHaveLength(2);
    expect(filterServices(services, { categoryId: null, query: '' })).toHaveLength(2);
  });

  it('category filter returns only matching services', () => {
    const r = filterServices(services, { categoryId: 'face', query: '' });
    expect(r.map((s) => s.id)).toEqual(['1']);
  });

  it('search matches name (case-insensitive, trimmed)', () => {
    expect(filterServices(services, { categoryId: null, query: '  SWEDISH ' }).map((s) => s.id)).toEqual(['2']);
  });

  it('search matches description', () => {
    expect(filterServices(services, { categoryId: null, query: 'glow' }).map((s) => s.id)).toEqual(['1']);
  });

  it('search matches category name', () => {
    expect(filterServices(services, { categoryId: null, query: 'massage' }).map((s) => s.id)).toEqual(['2']);
  });

  it('clearing the query restores all services', () => {
    expect(filterServices(services, { categoryId: null, query: '' })).toHaveLength(2);
  });
});

describe('formatting', () => {
  it('formats price with currency and Free for zero', () => {
    expect(formatPrice(0, 'MYR')).toBe('Free');
    expect(formatPrice(80, 'MYR')).toBe('RM 80');
    expect(formatPrice(79.5, 'MYR')).toBe('RM 79.50');
    expect(formatPrice(50, 'SGD')).toBe('SGD 50');
  });

  it('formats duration', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(90)).toBe('1 h 30 min');
    expect(formatDuration(0)).toBe('');
  });
});
