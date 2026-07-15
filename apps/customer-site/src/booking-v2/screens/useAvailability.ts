/**
 * useAvailability — loads the day's time slots through the availability
 * adapter (currently sample data; see data/availability.ts). Cancels safely on
 * date/selection change and exposes a retry action.
 */
import { useCallback, useEffect, useState } from 'react';
import { availabilityAdapter, type TimeSlotOption } from '../data/availability';

type AvailabilityStatus = 'idle' | 'loading' | 'ok' | 'error';

interface AvailabilityState {
  status: AvailabilityStatus;
  slots: TimeSlotOption[];
  closed: boolean;
  isSample: boolean;
  retry: () => void;
}

export function useAvailability(
  outletId: string | null,
  serviceId: string | null,
  staffId: string | null,
  date: string | null,
): AvailabilityState {
  const [status, setStatus] = useState<AvailabilityStatus>('idle');
  const [slots, setSlots] = useState<TimeSlotOption[]>([]);
  const [closed, setClosed] = useState(false);
  const [isSample, setIsSample] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!outletId || !serviceId || !date) {
      setStatus('idle');
      setSlots([]);
      return;
    }
    let cancelled = false;
    setStatus('loading');

    availabilityAdapter
      .loadDaySlots({ outletId, serviceId, staffId, date })
      .then((result) => {
        if (cancelled) return;
        if (result.status === 'ok') {
          setSlots(result.slots);
          setClosed(result.closed);
          setIsSample(result.isSample);
          setStatus('ok');
        } else {
          setStatus('error');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('[booking-v2] loadDaySlots', err);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [outletId, serviceId, staffId, date, reloadToken]);

  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

  return { status, slots, closed, isSample, retry };
}
