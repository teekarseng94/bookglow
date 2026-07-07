/**
 * Unified Firebase setup for BookGlow production project.
 */
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, collection, doc, setDoc } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyDZ2mARLr07WyhCcKGljEZZi7S6nvBdpbQ",
  authDomain: "bookglow-83fb3.firebaseapp.com",
  projectId: "bookglow-83fb3",
  storageBucket: "bookglow-83fb3.firebasestorage.app",
  messagingSenderId: "27124152215",
  appId: "1:27124152215:web:669828b79c302697c136d2",
  measurementId: "G-R25VJZ4TSE",
};

export const app: FirebaseApp =
  getApps().find((a) => a.name === "[DEFAULT]") ?? initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const functions = getFunctions(app, "asia-southeast1");

// Backward-compatible aliases used across existing files
export const adminApp = app;
export const customerApp = app;
export const adminAuth = auth;
export const customerAuth = auth;
export const customerDb = db;

/** Booking-portal customer profiles (register via /book/.../auth). Staff accounts use `users` only. */
export const FRONTEND_CUSTOMER_COLLECTION = "frontend_customer";

export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
  try {
    analytics = getAnalytics(app);
  } catch {
    analytics = null;
  }
}

export { collection, doc, setDoc };
