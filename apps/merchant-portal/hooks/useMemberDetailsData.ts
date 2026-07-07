/**
 * Real-time Firestore data for Member Details: sales and appointments for a single client.
 * Uses onSnapshot so Member Details update instantly when a cashier completes a sale or assigns a therapist.
 */

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, TransactionType, Appointment } from '../types';

function normalizeDate(raw: unknown): string {
  if (raw instanceof Timestamp) return raw.toDate().toISOString();
  if (typeof raw === 'string') return raw;
  if (raw && typeof (raw as any).toDate === 'function') return (raw as any).toDate().toISOString();
  return '';
}

export function useMemberDetailsData(clientId: string | undefined, outletId: string | undefined) {
  const [clientSales, setClientSales] = useState<Transaction[]>([]);
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasParams = Boolean(clientId && outletId);

  useEffect(() => {
    if (!hasParams || !clientId || !outletId) {
      setClientSales([]);
      setClientAppointments([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Sales: clientId == currentMemberId, type == SALE, sort by date descending
    // Composite index required: transactions: outletID (Asc), clientId (Asc), type (Asc), date (Desc)
    const salesQuery = query(
      collection(db, 'transactions'),
      where('outletID', '==', outletId),
      where('clientId', '==', clientId),
      where('type', '==', TransactionType.SALE),
      orderBy('date', 'desc')
    );

    const unsubSales = onSnapshot(
      salesQuery,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => {
          const raw = doc.data();
          const date = normalizeDate(raw.date);
          return { id: doc.id, ...raw, date } as Transaction;
        });
        // Exclude voided / deleted sales so Member Details matches Sales Reports / Sales History
        const nonVoided = list.filter((t) => {
          const status = (t as Transaction & { status?: string }).status;
          const statusStr = (status ?? '').toString().toLowerCase();
          const isVoidedFlag = (t as any).voided === true;
          return statusStr !== 'voided' && statusStr !== 'void' && !isVoidedFlag;
        });
        setClientSales(nonVoided);
        setLoading((prev) => (prev ? false : prev));
      },
      (err) => {
        console.error('MemberDetails sales listener error:', err);
        setError(err.message || 'Failed to load sales');
        setLoading(false);
        // If missing index, err.code === 'failed-precondition' and err.message often includes Firebase Console link
        if (err.message) setError(err.message);
      }
    );

    // Appointments: clientId == currentMemberId (no composite index needed for single where)
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('outletID', '==', outletId),
      where('clientId', '==', clientId)
    );

    const unsubAppointments = onSnapshot(
      appointmentsQuery,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => {
          const raw = doc.data();
          const date = typeof raw.date === 'string' ? raw.date : normalizeDate(raw.date);
          return { id: doc.id, ...raw, date } as Appointment;
        });
        setClientAppointments(list);
        setLoading((prev) => (prev ? false : prev));
      },
      (err) => {
        console.error('MemberDetails appointments listener error:', err);
        setError(err.message || 'Failed to load appointments');
        setLoading(false);
      }
    );

    return () => {
      unsubSales();
      unsubAppointments();
    };
  }, [clientId, outletId, hasParams]);

  return useMemo(
    () => ({
      clientSales,
      clientAppointments,
      loading,
      error
    }),
    [clientSales, clientAppointments, loading, error]
  );
}
