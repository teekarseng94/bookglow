import { describe, it, expect } from 'vitest';
import {
  mapRawStaff,
  buildStaffList,
  isStaffQualified,
  filterQualifiedStaff,
  staffInitials,
} from './staffCatalogue';
import type { RawStaffDoc } from './publicBookingApi';
import type { PublicStaff } from './publicBookingTypes';

function raw(overrides: Partial<RawStaffDoc> & { id: string }): RawStaffDoc {
  return { name: 'Susi', role: 'Therapist', ...overrides };
}

function staff(overrides: Partial<PublicStaff> & { id: string }): PublicStaff {
  return { name: 'S', role: null, photoUrl: null, qualifiedServices: [], ...overrides };
}

describe('mapRawStaff', () => {
  it('maps only public fields (id, name, role, photoUrl, qualifiedServices)', () => {
    const s = mapRawStaff(
      raw({ id: 's1', profilePicture: 'pic.jpg', qualifiedServices: ['svc-1', 'svc-2'] }),
    );
    expect(s).toEqual({
      id: 's1',
      name: 'Susi',
      role: 'Therapist',
      photoUrl: 'pic.jpg',
      qualifiedServices: ['svc-1', 'svc-2'],
    });
  });

  it('never exposes email/phone/internal fields even if present on the raw doc', () => {
    const withPrivate = {
      id: 's1',
      name: 'Susi',
      role: 'Therapist',
      email: 'susi@example.com',
      phone: '0123',
      createdAt: 'x',
    } as unknown as RawStaffDoc;
    const s = mapRawStaff(withPrivate)!;
    expect(Object.keys(s).sort()).toEqual(
      ['id', 'name', 'photoUrl', 'qualifiedServices', 'role'].sort(),
    );
    expect(JSON.stringify(s)).not.toContain('susi@example.com');
    expect(JSON.stringify(s)).not.toContain('0123');
  });

  it('falls back to photoURL when profilePicture is absent, else null', () => {
    expect(mapRawStaff(raw({ id: 'a', photoURL: 'u.jpg' }))?.photoUrl).toBe('u.jpg');
    expect(mapRawStaff(raw({ id: 'b' }))?.photoUrl).toBeNull();
  });

  it('defaults role to null and qualifiedServices to an empty array', () => {
    const s = mapRawStaff(raw({ id: 'a', role: undefined, qualifiedServices: undefined }))!;
    expect(s.role).toBeNull();
    expect(s.qualifiedServices).toEqual([]);
  });

  it('drops non-string entries from qualifiedServices', () => {
    const s = mapRawStaff(raw({ id: 'a', qualifiedServices: ['svc-1', 2, null, '', 'svc-2'] }))!;
    expect(s.qualifiedServices).toEqual(['svc-1', 'svc-2']);
  });

  it('rejects a staff record with no usable name', () => {
    expect(mapRawStaff(raw({ id: 'a', name: '' }))).toBeNull();
    expect(mapRawStaff(raw({ id: 'b', name: undefined }))).toBeNull();
  });
});

describe('buildStaffList', () => {
  it('maps, drops invalid, and sorts by name', () => {
    const list = buildStaffList([
      raw({ id: 'z', name: 'Zara' }),
      raw({ id: 'bad', name: '' }),
      raw({ id: 'a', name: 'Anie' }),
    ]);
    expect(list.map((s) => s.id)).toEqual(['a', 'z']);
  });
});

describe('isStaffQualified / filterQualifiedStaff', () => {
  const all = staff({ id: 'all', qualifiedServices: [] }); // qualified for everything
  const only1 = staff({ id: 'only1', qualifiedServices: ['svc-1'] });
  const only2 = staff({ id: 'only2', qualifiedServices: ['svc-2'] });

  it('treats empty qualifiedServices as qualified for all services', () => {
    expect(isStaffQualified(all, 'svc-1')).toBe(true);
    expect(isStaffQualified(all, 'svc-999')).toBe(true);
  });

  it('includes only staff listing the selected service ID', () => {
    expect(isStaffQualified(only1, 'svc-1')).toBe(true);
    expect(isStaffQualified(only1, 'svc-2')).toBe(false);
  });

  it('filters a list to staff qualified for the selected service', () => {
    const filtered = filterQualifiedStaff([all, only1, only2], 'svc-1');
    expect(filtered.map((s) => s.id).sort()).toEqual(['all', 'only1']);
  });

  it('returns all staff when no service is selected', () => {
    expect(filterQualifiedStaff([all, only1, only2], null)).toHaveLength(3);
  });
});

describe('staffInitials', () => {
  it('produces up to two uppercase initials', () => {
    expect(staffInitials('Susi')).toBe('S');
    expect(staffInitials('Anie Wong')).toBe('AW');
    expect(staffInitials('  jane mary doe ')).toBe('JM');
    expect(staffInitials('')).toBe('?');
  });
});
