/**
 * Firebase setup for Booking + Backend.
 *
 * - adminApp  : razak-residence-2026  (POS/CRM & all data)
 * - customerApp: zenspabookingsystem  (customer Authentication only)
 */
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, collection, doc, setDoc } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Backend / data project (razak-residence-2026)
const adminConfig = {
  apiKey: "AIzaSyDZlhfduAlMPY3UpeCyyjWEWtv84uesB3A",
  authDomain: "razak-residence-2026.firebaseapp.com",
  projectId: "razak-residence-2026",
  storageBucket: "razak-residence-2026.firebasestorage.app",
  messagingSenderId: "665831615654",
  appId: "1:665831615654:web:34f9f1042f1a5e4da85867",
  measurementId: "G-HKYYY0TB8Y",
};

const customerConfig = {
  apiKey: "AIzaSyBG5etQNdtg_rTSjwx0M2k6UZ-H5F4Knpw",
  authDomain: "zenspabookingsystem.firebaseapp.com",
  projectId: "zenspabookingsystem",
  storageBucket: "zenspabookingsystem.firebasestorage.app",
  messagingSenderId: "8032725723",
  appId: "1:8032725723:web:e1729c0c4eefe6c2913afe",
  measurementId: "G-CDEWS4XEB2",
};

// Initialize / reuse admin app (data)
export const adminApp: FirebaseApp =
  getApps().find((a) => a.name === "adminApp") ??
  initializeApp(adminConfig, "adminApp");

// Initialize / reuse customer app (auth)
export const customerApp: FirebaseApp =
  getApps().find((a) => a.name === "customerApp") ??
  initializeApp(customerConfig, "customerApp");

// Authentication for customers uses the customerApp
export const adminAuth: Auth = getAuth(adminApp);
export const customerAuth: Auth = getAuth(customerApp);

// Back-compat: most booking/customer code imports `auth`
export const auth: Auth = customerAuth;

// Firestore + Functions continue to use the adminApp
export const db: Firestore = getFirestore(adminApp);
export const customerDb: Firestore = getFirestore(customerApp);
export const functions = getFunctions(adminApp, "asia-southeast1");

export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
  try {
    analytics = getAnalytics(adminApp);
  } catch {
    analytics = null;
  }
}

export { collection, doc, setDoc };
