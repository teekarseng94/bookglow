import { describe, expect, it } from 'vitest';
import {
  countCategoryUsage,
  formatUsageSummary,
  itemCategory,
  mergeFilterCategories,
  normalizeLoadedCategories,
  usageTotal,
  validateCategoryName,
} from './categories';

describe('normalizeLoadedCategories', () => {
  it('does not inject Massage when the outlet has no categories', () => {
    expect(normalizeLoadedCategories(null)).toEqual([]);
    expect(normalizeLoadedCategories([])).toEqual([]);
    expect(normalizeLoadedCategories(undefined)).toEqual([]);
  });

  it('keeps merchant-defined names and trims blanks', () => {
    expect(normalizeLoadedCategories([' Nail Art ', '', 'Gel', 'Nail Art'])).toEqual([
      'Nail Art',
      'Gel',
    ]);
  });
});

describe('itemCategory', () => {
  it('prefers category then categoryId', () => {
    expect(itemCategory({ category: 'Facial', categoryId: 'Massage' })).toBe('Facial');
    expect(itemCategory({ categoryId: 'Nails' })).toBe('Nails');
    expect(itemCategory({})).toBe('');
  });
});

describe('mergeFilterCategories', () => {
  it('lists managed names plus orphan item categories', () => {
    expect(
      mergeFilterCategories(['Manicure'], [{ category: 'Legacy Promo' }, { category: 'Manicure' }]),
    ).toEqual(['Manicure', 'Legacy Promo']);
  });
});

describe('countCategoryUsage', () => {
  it('counts without deleting items', () => {
    const usage = countCategoryUsage(
      'Massage',
      [{ category: 'Massage' }, { category: 'Facial' }],
      [{ category: 'Massage' }],
      [],
    );
    expect(usage).toEqual({ services: 1, products: 1, packages: 0 });
    expect(usageTotal(usage)).toBe(2);
    expect(formatUsageSummary(usage)).toBe('1 service, 1 product');
  });
});

describe('validateCategoryName', () => {
  it('rejects empty and duplicate names', () => {
    expect(validateCategoryName('  ', ['Facial'])).toMatch(/Enter/);
    expect(validateCategoryName('facial', ['Facial'])).toMatch(/already exists/);
    expect(validateCategoryName('Facial', ['Facial'], { ignore: 'Facial' })).toBeNull();
    expect(validateCategoryName('Pedicure', ['Facial'])).toBeNull();
  });
});
