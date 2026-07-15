/**
 * BookingProvider — the single typed state container for the V2 journey.
 *
 * Uses React Context + useReducer (no new state library). Responsibilities:
 *  - initialise/restore state for the current booking path (sessionStorage)
 *  - load the public merchant summary through the data adapter
 *  - persist a cleaned snapshot on every change
 *  - expose { state, dispatch } and the merchant-load status to the shell
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { BookingAction, BookingV2State } from './bookingTypes';
import { bookingReducer } from './bookingReducer';
import { bookingPersistence, loadOrInit } from './bookingPersistence';
import { publicBookingAdapter } from '../data/publicBookingAdapter';

export type MerchantLoadStatus =
  | 'loading'
  | 'ok'
  | 'not-found'
  | 'disabled'
  | 'error';

interface BookingContextValue {
  state: BookingV2State;
  dispatch: React.Dispatch<BookingAction>;
  merchantLoad: MerchantLoadStatus;
  merchantError: string | null;
  reloadMerchant: () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

interface BookingProviderProps {
  bookingPath: string;
  children: React.ReactNode;
}

export function BookingProvider({ bookingPath, children }: BookingProviderProps) {
  // Lazy init: restore a valid session snapshot for this path, else fresh.
  const [state, dispatch] = useReducer(
    bookingReducer,
    bookingPath,
    (path) => loadOrInit(path),
  );

  const [merchantLoad, setMerchantLoad] = useState<MerchantLoadStatus>('loading');
  const [merchantError, setMerchantError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Keep state aligned with the current path (handles path change / first run).
  useEffect(() => {
    dispatch({ type: 'INITIALIZE_BOOKING', bookingPath });
  }, [bookingPath]);

  // Load the public merchant summary through the adapter (no direct Firestore).
  useEffect(() => {
    let cancelled = false;
    setMerchantLoad('loading');
    setMerchantError(null);

    publicBookingAdapter
      .loadMerchantSummary(bookingPath)
      .then((result) => {
        if (cancelled) return;
        if (result.status === 'ok') {
          dispatch({ type: 'SET_MERCHANT', merchant: result.merchant });
          setMerchantLoad('ok');
        } else if (result.status === 'not-found') {
          setMerchantLoad('not-found');
        } else if (result.status === 'disabled') {
          // Keep merchant contact available for the disabled screen.
          dispatch({ type: 'SET_MERCHANT', merchant: result.merchant });
          setMerchantLoad('disabled');
        } else {
          setMerchantError(result.message);
          setMerchantLoad('error');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Log technical detail; never store raw error text for display.
        console.error('[booking-v2] loadMerchantSummary', err);
        setMerchantError('Something went wrong. Please try again.');
        setMerchantLoad('error');
      });

    return () => {
      cancelled = true;
    };
  }, [bookingPath, reloadToken]);

  // Persist a cleaned snapshot whenever state changes (skip the very first run
  // so we don't immediately rewrite what we just restored).
  const firstPersist = useRef(true);
  useEffect(() => {
    if (firstPersist.current) {
      firstPersist.current = false;
      return;
    }
    bookingPersistence.save(state);
  }, [state]);

  const value = useMemo<BookingContextValue>(
    () => ({
      state,
      dispatch,
      merchantLoad,
      merchantError,
      reloadMerchant: () => setReloadToken((n) => n + 1),
    }),
    [state, merchantLoad, merchantError],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return ctx;
}
