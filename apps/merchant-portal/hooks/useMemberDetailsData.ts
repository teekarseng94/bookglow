/**
 * Member Details data: sales + appointments for a single client.
 * Firestore realtime by default; Supabase loads both appointments and SALE transactions.
 */

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { resolveDataProvider } from "@bookglow/shared-types";
import { db } from "../firebase";
import { Transaction, TransactionType, Appointment } from "../types";
import { appointmentService, transactionService, DB_PROVIDER } from "../services/databaseService";

function normalizeDate(raw: unknown): string {
  if (raw instanceof Timestamp) return raw.toDate().toISOString();
  if (typeof raw === "string") return raw;
  if (raw && typeof (raw as any).toDate === "function") return (raw as any).toDate().toISOString();
  return "";
}

function useSupabaseData(): boolean {
  return (
    DB_PROVIDER === "supabase" ||
    resolveDataProvider(
      import.meta.env as unknown as Record<string, string | undefined>
    ) === "supabase"
  );
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

    if (useSupabaseData()) {
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
    }

    const salesQuery = query(
      collection(db, "transactions"),
      where("outletID", "==", outletId),
      where("clientId", "==", clientId),
      where("type", "==", TransactionType.SALE),
      orderBy("date", "desc")
    );

    const unsubSales = onSnapshot(
      salesQuery,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => {
          const raw = docSnap.data();
          const date = normalizeDate(raw.date);
          return { id: docSnap.id, ...raw, date } as Transaction;
        });
        const nonVoided = list.filter((t) => {
          const status = (t as Transaction & { status?: string }).status;
          const statusStr = (status ?? "").toString().toLowerCase();
          const isVoidedFlag = (t as any).voided === true;
          return statusStr !== "voided" && statusStr !== "void" && !isVoidedFlag;
        });
        setClientSales(nonVoided);
        setLoading((prev) => (prev ? false : prev));
      },
      (err) => {
        console.error("MemberDetails sales listener error:", err);
        setError(err.message || "Failed to load sales");
        setLoading(false);
      }
    );

    const appointmentsQuery = query(
      collection(db, "appointments"),
      where("outletID", "==", outletId),
      where("clientId", "==", clientId)
    );

    const unsubAppts = onSnapshot(
      appointmentsQuery,
      (snapshot) => {
        const list = snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Appointment
        );
        setClientAppointments(list);
        setLoading(false);
      },
      (err) => {
        console.error("MemberDetails appointments listener error:", err);
        setError(err.message || "Failed to load appointments");
        setLoading(false);
      }
    );

    return () => {
      unsubSales();
      unsubAppts();
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
