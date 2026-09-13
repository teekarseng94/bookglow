import { platformOperationsService, type RemoteAccessContext } from './platformOperationsService';

const KEY = 'bookglow_platform_remote_outlet';

export const remoteAccessService = {
  selectedOutletId: (): string => {
    try { return window.sessionStorage.getItem(KEY) || ''; } catch { return ''; }
  },

  enter: async (outletId: string): Promise<RemoteAccessContext> => {
    const context = await platformOperationsService.remoteAccess(outletId, 'enter');
    window.sessionStorage.setItem(KEY, context.outletId);
    return context;
  },

  validate: async (): Promise<RemoteAccessContext | null> => {
    const outletId = remoteAccessService.selectedOutletId();
    if (!outletId) return null;
    try { return await platformOperationsService.remoteAccess(outletId, 'validate'); }
    catch {
      remoteAccessService.clear();
      throw new Error('Remote access selection is no longer valid. Return to superadmin and choose the outlet again.');
    }
  },

  exit: async (): Promise<void> => {
    const outletId = remoteAccessService.selectedOutletId();
    try { if (outletId) await platformOperationsService.remoteAccess(outletId, 'exit'); }
    finally { remoteAccessService.clear(); }
  },

  clear: () => {
    try {
      window.sessionStorage.removeItem(KEY);
      window.localStorage.removeItem('adminOverrideOutletId');
    } catch { /* storage may be unavailable; server authorization remains authoritative */ }
  },
};
