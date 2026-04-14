/**
 * Registration and auth for Booking site.
 * On signup: create Firebase user, create Firestore users/{uid} doc with role 'client', redirect to Dashboard.
 */
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  AuthError,
  UserCredential,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { adminAuth, auth, customerDb, db } from "./firebase";

export const DASHBOARD_URL = "/login";

export interface SignUpCredentials {
  email: string;
  password: string;
}

interface CustomerProfileInput {
  uid: string;
  email: string;
}

/**
 * Register a new user with email/password, create their Firestore user doc, then redirect to Dashboard.
 */
export async function register(credentials: SignUpCredentials): Promise<void> {
  const email = credentials.email?.trim().toLowerCase() || "";
  const password = credentials.password || "";

  if (!email || !email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const userCredential = await createUserWithEmailAndPassword(adminAuth, email, password);
  const { uid } = userCredential.user;

  await setDoc(doc(db, "users", uid), {
    uid,
    email: userCredential.user.email || email,
    role: "client",
  });

  window.location.href = DASHBOARD_URL;
}

/**
 * Create Firestore users/{uid} doc and redirect to Dashboard.
 */
export async function createUserDocAndRedirect(uid: string, email: string | null): Promise<void> {
  await setDoc(doc(db, "users", uid), {
    uid,
    email: email || "",
    role: "client",
  });
  window.location.href = DASHBOARD_URL;
}

function getErrorMessage(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Try signing in.";
    case "auth/invalid-email":
      return "Invalid email address format.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/operation-not-allowed":
      return "Email/Password sign-up is not enabled for this app.";
    default:
      return `Sign-up failed: ${code}`;
  }
}

export function getAuthErrorMessage(error: unknown): string {
  const authError = error as AuthError & { code?: string };
  if (authError?.code) return getErrorMessage(authError.code);
  if (error instanceof Error) return error.message;
  return "Registration failed. Please try again.";
}

/**
 * Sign up with Google: create/update user doc and redirect to Dashboard.
 */
export async function registerWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  const userCredential: UserCredential = await signInWithPopup(adminAuth, provider);
  await createUserDocAndRedirect(
    userCredential.user.uid,
    userCredential.user.email ?? null
  );
}

/**
 * Sign up with Facebook: create/update user doc and redirect to Dashboard.
 */
export async function registerWithFacebook(): Promise<void> {
  const provider = new FacebookAuthProvider();
  const userCredential: UserCredential = await signInWithPopup(adminAuth, provider);
  await createUserDocAndRedirect(
    userCredential.user.uid,
    userCredential.user.email ?? null
  );
}

/**
 * Booking-site specific helpers: create user + Firestore doc, then redirect back to booking URL
 * instead of the backend dashboard.
 */
export async function registerForBooking(
  credentials: SignUpCredentials,
  redirectUrl: string
): Promise<void> {
  const email = credentials.email?.trim().toLowerCase() || "";
  const password = credentials.password || "";

  if (!email || !email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = userCredential.user;

  await upsertCustomerProfile({
    uid,
    email: userCredential.user.email || email,
  });

  window.location.href = redirectUrl;
}

export async function registerWithGoogleForBooking(redirectUrl: string): Promise<void> {
  const provider = new GoogleAuthProvider();
  const userCredential: UserCredential = await signInWithPopup(auth, provider);
  await upsertCustomerProfile({
    uid: userCredential.user.uid,
    email: userCredential.user.email ?? "",
  });
  window.location.href = redirectUrl;
}

export async function registerWithFacebookForBooking(redirectUrl: string): Promise<void> {
  const provider = new FacebookAuthProvider();
  const userCredential: UserCredential = await signInWithPopup(auth, provider);
  await upsertCustomerProfile({
    uid: userCredential.user.uid,
    email: userCredential.user.email ?? "",
  });
  window.location.href = redirectUrl;
}

async function upsertCustomerProfile(input: CustomerProfileInput): Promise<void> {
  await setDoc(
    doc(customerDb, "customers", input.uid),
    {
      uid: input.uid,
      email: input.email,
      role: "customer",
      bookingHistoryRefs: [],
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}
