import { beforeEach, describe, expect, it, vi } from 'vitest';

const remoteAccess = vi.hoisted(() => vi.fn());
vi.mock('./platformOperationsService', () => ({ platformOperationsService: { remoteAccess } }));
import { remoteAccessService } from './remoteAccessService';

describe('remoteAccessService', () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); remoteAccess.mockReset(); });

  it('stores a selection only after the server validates entry', async () => {
    remoteAccess.mockResolvedValue({ outletId: 'outlet-bali', outletName: 'Bali Wellness', accessStatus: 'active' });
    await remoteAccessService.enter('outlet-bali');
    expect(remoteAccess).toHaveBeenCalledWith('outlet-bali', 'enter');
    expect(sessionStorage.getItem('bookglow_platform_remote_outlet')).toBe('outlet-bali');
  });

  it('clears stale state when server validation fails', async () => {
    sessionStorage.setItem('bookglow_platform_remote_outlet', 'missing');
    remoteAccess.mockRejectedValue(new Error('not found'));
    await expect(remoteAccessService.validate()).rejects.toThrow('no longer valid');
    expect(remoteAccessService.selectedOutletId()).toBe('');
  });

  it('audits exit before clearing the selected outlet', async () => {
    sessionStorage.setItem('bookglow_platform_remote_outlet', 'outlet-sohokaki');
    remoteAccess.mockResolvedValue({});
    await remoteAccessService.exit();
    expect(remoteAccess).toHaveBeenCalledWith('outlet-sohokaki', 'exit');
    expect(remoteAccessService.selectedOutletId()).toBe('');
  });
});
