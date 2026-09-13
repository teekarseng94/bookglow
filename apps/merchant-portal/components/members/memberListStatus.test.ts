import { describe, expect, it } from 'vitest';
import { memberListStatusLabel } from './memberListStatus';

describe('memberListStatusLabel', () => {
  it('keeps the outlet total when only the first page is loaded', () => {
    expect(
      memberListStatusLabel({ searching: false, shownCount: 50, loadedCount: 50, totalCount: 137 }),
    ).toBe('50 of 137 members shown');
  });

  it('does not let search matches overwrite the outlet total in this helper', () => {
    expect(
      memberListStatusLabel({ searching: true, shownCount: 3, loadedCount: 50, totalCount: 137 }),
    ).toBe('3 matches');
  });

  it('drops the page fragment once every member is loaded', () => {
    expect(
      memberListStatusLabel({ searching: false, shownCount: 12, loadedCount: 12, totalCount: 12 }),
    ).toBe('12 members');
  });
});
