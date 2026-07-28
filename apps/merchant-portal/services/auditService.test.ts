import { beforeEach, describe, expect, it } from 'vitest';
import { auditService } from './auditService';

describe('auditService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns consolidated events newest first', async () => {
    localStorage.setItem('bookglow_audit_logs', JSON.stringify([
      { id: 'old', outletId: 'one', action: 'created', affectedTarget: 'outlet', actor: 'Admin', timestamp: '2026-01-01T00:00:00.000Z' },
      { id: 'new', outletId: 'two', action: 'updated', affectedTarget: 'access', actor: 'Admin', timestamp: '2026-02-01T00:00:00.000Z' },
    ]));

    const events = await auditService.getAllEvents();
    expect(events.map((event) => event.id)).toEqual(['new', 'old']);
  });
});
