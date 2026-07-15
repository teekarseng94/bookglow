/**
 * useStaff — loads the outlet's public staff via the data adapter (never
 * Firestore directly). Exposes a discriminated load status and a retry action.
 * Cancels safely on unmount / outlet change.
 */
import { useCallback, useEffect, useState } from 'react';
import type { PublicStaff } from '../data/publicBookingTypes';
import { publicBookingAdapter } from '../data/publicBookingAdapter';

type StaffStatus = 'loading' | 'ok' | 'error';

interface StaffState {
  status: StaffStatus;
  staff: PublicStaff[];
  retry: () => void;
}

export function useStaff(outletId: string | null): StaffState {
  const [status, setStatus] = useState<StaffStatus>('loading');
  const [staff, setStaff] = useState<PublicStaff[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!outletId) return;
    let cancelled = false;
    setStatus('loading');

    publicBookingAdapter
      .loadStaff(outletId)
      .then((result) => {
        if (cancelled) return;
        if (result.status === 'ok') {
          setStaff(result.staff);
          setStatus('ok');
        } else {
          setStatus('error');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('[booking-v2] loadStaff', err);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [outletId, reloadToken]);

  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

  return { status, staff, retry };
}
