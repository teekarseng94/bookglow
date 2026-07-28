/**
<<<<<<< HEAD
 * Database service — Firestore-only export layer.
 *
 * The merchant portal uses Firestore as its sole database. Import from this
 * module instead of `firestoreService` directly so call sites stay stable.
=======
 * Database service — Supabase only (Phase D).
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
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

<<<<<<< HEAD
export const clientService = firestoreServices.clientService;
export const staffService = firestoreServices.staffService;
export const appointmentService = firestoreServices.appointmentService;
export const transactionService = firestoreServices.transactionService;
export const serviceService = firestoreServices.serviceService;
export const productService = firestoreServices.productService;
export const packageService = firestoreServices.packageService;
export const rewardService = firestoreServices.rewardService;
export const outletService = firestoreServices.outletService;
export const apiIntegrationService = firestoreServices.apiIntegrationService;
=======
export const setCurrentOutletID = (outletID: string) => {
  supabaseMerchant.setCurrentOutletID(outletID);
};
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda

export const getCurrentOutletID = () => supabaseMerchant.getCurrentOutletID();

<<<<<<< HEAD
/** Active database provider */
export const DB_PROVIDER = 'firestore';
=======
export const DB_PROVIDER = "supabase" as const;
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
