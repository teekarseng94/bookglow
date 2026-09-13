import React from 'react';
import { Eye, LogOut } from 'lucide-react';
import { Button } from '../ui';

export const RemoteAccessBanner: React.FC<{ outletName: string; outletId: string; onExit: () => void; busy?: boolean }> = ({ outletName, outletId, onExit, busy }) => (
  <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50 px-3 py-2 text-amber-950 shadow-sm" role="status">
    <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <Eye className="h-4 w-4 shrink-0" aria-hidden />
        <p className="truncate text-xs sm:text-sm"><strong>Platform remote access:</strong> {outletName} <span className="font-mono text-[10px] opacity-70">({outletId})</span> · real admin identity retained · privileged edits enabled</p>
      </div>
      <Button size="sm" variant="secondary" onClick={onExit} disabled={busy}><LogOut className="h-4 w-4" /> {busy ? 'Exiting…' : 'Exit to superadmin'}</Button>
    </div>
  </div>
);
