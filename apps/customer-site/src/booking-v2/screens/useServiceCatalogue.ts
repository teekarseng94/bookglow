/**
 * useServiceCatalogue — loads the public service catalogue for an outlet via the
 * data adapter (never Firestore directly). Exposes a discriminated load status
 * plus a retry action. Cancels safely on unmount / outlet change.
 */
import { useCallback, useEffect, useState } from 'react';
import type { PublicService } from '../state/bookingTypes';
import type { ServiceCategory } from '../data/publicBookingTypes';
import { publicBookingAdapter } from '../data/publicBookingAdapter';

type CatalogueStatus = 'loading' | 'ok' | 'error';

interface CatalogueState {
  status: CatalogueStatus;
  services: PublicService[];
  categories: ServiceCategory[];
  error: string | null;
  retry: () => void;
}

export function useServiceCatalogue(outletId: string | null): CatalogueState {
  const [status, setStatus] = useState<CatalogueStatus>('loading');
  const [services, setServices] = useState<PublicService[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!outletId) return;
    let cancelled = false;
    setStatus('loading');
    setError(null);

    publicBookingAdapter
      .loadServiceCatalogue(outletId)
      .then((result) => {
        if (cancelled) return;
        if (result.status === 'ok') {
          setServices(result.services);
          setCategories(result.categories);
          setStatus('ok');
        } else {
          setError(result.message);
          setStatus('error');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load services.');
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [outletId, reloadToken]);

  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

  return { status, services, categories, error, retry };
}
