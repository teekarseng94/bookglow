/**
 * Database service — dual provider (Firestore default, Supabase Phases 1–4).
 *
 * When VITE_DATA_PROVIDER=supabase:
 *   staff / services / appointments / outlets / clients /
 *   transactions / products / packages / rewards /
 *   apiIntegrations → Supabase
 *   (vouchers via voucherService; storage via storageService)
 */
import { resolveDataProvider } from "@bookglow/shared-types";
import * as firestoreServices from "./firestoreService";
import * as supabaseMerchant from "./supabaseMerchant";

function useSupabase(): boolean {
  return (
    resolveDataProvider(
      import.meta.env as unknown as Record<string, string | undefined>
    ) === "supabase"
  );
}

const supabaseOn = useSupabase();

console.log(
  supabaseOn
    ? "🟢 Database provider: Supabase (Phases 1–4: booking + CRM + POS + vouchers/API/storage)"
    : "🔵 Database provider: Firestore"
);

export const staffService = supabaseOn
  ? supabaseMerchant.staffService
  : firestoreServices.staffService;

export const appointmentService = supabaseOn
  ? supabaseMerchant.appointmentService
  : firestoreServices.appointmentService;

export const serviceService = supabaseOn
  ? supabaseMerchant.serviceService
  : firestoreServices.serviceService;

export const outletService = supabaseOn
  ? supabaseMerchant.outletService
  : firestoreServices.outletService;

export const clientService = supabaseOn
  ? supabaseMerchant.clientService
  : firestoreServices.clientService;

export const transactionService = supabaseOn
  ? supabaseMerchant.transactionService
  : firestoreServices.transactionService;

export const productService = supabaseOn
  ? supabaseMerchant.productService
  : firestoreServices.productService;

export const packageService = supabaseOn
  ? supabaseMerchant.packageService
  : firestoreServices.packageService;

export const rewardService = supabaseOn
  ? supabaseMerchant.rewardService
  : firestoreServices.rewardService;

export const apiIntegrationService = supabaseOn
  ? supabaseMerchant.apiIntegrationService
  : firestoreServices.apiIntegrationService;

export const setCurrentOutletID = (outletID: string) => {
  firestoreServices.setCurrentOutletID(outletID);
  supabaseMerchant.setCurrentOutletID(outletID);
};

export const getCurrentOutletID = () =>
  supabaseOn
    ? supabaseMerchant.getCurrentOutletID()
    : firestoreServices.getCurrentOutletID();

export const DB_PROVIDER = supabaseOn ? "supabase" : "firestore";
