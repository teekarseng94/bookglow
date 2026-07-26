/**
 * Member Details data: sales + appointments for a single client (Supabase).
 */

import { useState, useEffect, useMemo } from "react";
import { Transaction, TransactionType, Appointment } from "../types";
import { appointmentService, transactionService } from "../services/databaseService";

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

    let cancelled = false;
    const load = async () => {
      try {
        const [allAppts, allTxns] = await Promise.all([
          appointmentService.getAll(outletId),
          transactionService.getAll(outletId),
        ]);
        if (cancelled) return;
        const forClient = allAppts
          .filter((a) => a.clientId === clientId)
          .sort((a, b) => {
            const aDate = a.date ? new Date(a.date + "T" + (a.time || "00:00")).getTime() : 0;
            const bDate = b.date ? new Date(b.date + "T" + (b.time || "00:00")).getTime() : 0;
            return bDate - aDate;
          });
        const sales = allTxns
          .filter((t) => t.clientId === clientId && t.type === TransactionType.SALE)
          .filter((t) => {
            const statusStr = (t.status ?? "").toString().toLowerCase();
            return statusStr !== "voided" && statusStr !== "void";
          })
          .sort((a, b) => {
            const aDate = a.date ? new Date(a.date).getTime() : 0;
            const bDate = b.date ? new Date(b.date).getTime() : 0;
            return bDate - aDate;
          });
        setClientAppointments(forClient);
        setClientSales(sales);
        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load member details");
          setLoading(false);
        }
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hasParams, clientId, outletId]);

  const sortedAppointments = useMemo(() => clientAppointments, [clientAppointments]);

  return {
    clientSales,
    clientAppointments: sortedAppointments,
    loading,
    error,
  };
}
