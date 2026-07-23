/**
 * Outstanding Transaction Service — dual provider (Firestore / Supabase Phase 2).
 */
import { resolveDataProvider } from "@bookglow/shared-types";
import {
  collection,
  doc,
  getDocs,
  runTransaction,
  increment,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import { OutstandingTransaction } from "../types";
import * as supabaseMerchant from "./supabaseMerchant";

function useSupabase(): boolean {
  return (
    resolveDataProvider(
      import.meta.env as unknown as Record<string, string | undefined>
    ) === "supabase"
  );
}

let currentOutletID = "";

export const setCurrentOutletID = (outletID: string) => {
  currentOutletID = outletID || "";
  supabaseMerchant.setCurrentOutletID(outletID);
};

export const getCurrentOutletID = () =>
  useSupabase() ? supabaseMerchant.getCurrentOutletID() : currentOutletID;

function hasValidOutlet(outletID: string | undefined): boolean {
  return outletID != null && String(outletID).trim().length > 0;
}

const firestoreOutstandingTransactionService = {
  getAll: async (
    clientId: string,
    outletID: string = currentOutletID
  ): Promise<OutstandingTransaction[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const q = query(
      collection(db, "clients", clientId, "outstandingTransactions"),
      orderBy("timestamp", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as OutstandingTransaction
    );
  },

  add: async (
    clientId: string,
    type: "Add" | "Minus",
    amount: number,
    outletID: string = currentOutletID,
    timestamp?: string
  ): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    if (amount <= 0) throw new Error("Amount must be positive.");

    const clientRef = doc(db, "clients", clientId);
    const outstandingTransactionsRef = collection(
      db,
      "clients",
      clientId,
      "outstandingTransactions"
    );

    return await runTransaction(db, async (transaction) => {
      const clientDoc = await transaction.get(clientRef);
      if (!clientDoc.exists()) throw new Error("Client not found");

      const clientData = clientDoc.data();
      if (clientData.outletID !== outletID) {
        throw new Error("Client does not belong to this outlet");
      }

      const currentBalance = clientData.outstanding ?? 0;
      const previousBalance = currentBalance;
      const change = type === "Add" ? amount : -amount;
      const newBalance = Math.max(0, currentBalance + change);

      transaction.update(clientRef, { outstanding: increment(change) });

      const transactionData: Omit<OutstandingTransaction, "id"> = {
        clientId,
        outletID,
        type,
        amount,
        previousBalance,
        newBalance,
        timestamp: timestamp || new Date().toISOString(),
        isManual: true,
      };

      const docRef = doc(outstandingTransactionsRef);
      transaction.set(docRef, transactionData);
      return docRef.id;
    });
  },
};

export const outstandingTransactionService = useSupabase()
  ? supabaseMerchant.outstandingTransactionService
  : firestoreOutstandingTransactionService;
