/**
 * Database service — Supabase only (Phase D).
 */
import * as supabaseMerchant from "./supabaseMerchant";

console.log("🟢 Database provider: Supabase");

export const staffService = supabaseMerchant.staffService;
export const appointmentService = supabaseMerchant.appointmentService;
export const serviceService = supabaseMerchant.serviceService;
export const outletService = supabaseMerchant.outletService;
export const clientService = supabaseMerchant.clientService;
export const transactionService = supabaseMerchant.transactionService;
export const productService = supabaseMerchant.productService;
export const packageService = supabaseMerchant.packageService;
export const rewardService = supabaseMerchant.rewardService;
export const apiIntegrationService = supabaseMerchant.apiIntegrationService;

export const setCurrentOutletID = (outletID: string) => {
  supabaseMerchant.setCurrentOutletID(outletID);
};

export const getCurrentOutletID = () => supabaseMerchant.getCurrentOutletID();

export const DB_PROVIDER = "supabase" as const;
