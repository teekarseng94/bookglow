/**
 * Member Details data: sales + appointments for a single client (Supabase).
 * Loads only that client's rows — never the full outlet tables.
 */

import { useState, useEffect, useMemo } from "react";
import { Transaction, TransactionType, Appointment } from "../types";
import { appointmentService, transactionService } from "../services/databaseService";
import { setTelemetryTrigger } from "../services/queryTelemetry";

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
        setTelemetryTrigger("route_change");
        const [appts, txns] = await Promise.all([
          appointmentService.getByClient(clientId, outletId, 50),
          transactionService.getByClient(clientId, outletId, 50),
        ]);
        if (cancelled) return;
        const forClient = appts.sort((a, b) => {
          const aDate = a.date ? new Date(a.date + "T" + (a.time || "00:00")).getTime() : 0;
          const bDate = b.date ? new Date(b.date + "T" + (b.time || "00:00")).getTime() : 0;
          return bDate - aDate;
        });
        const sales = txns
          .filter((t) => t.type === TransactionType.SALE)
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
    // Soft refresh every 2 minutes (was 15s full-outlet getAll).
    const timer = window.setInterval(() => void load(), 120000);
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
