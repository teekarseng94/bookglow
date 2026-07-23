/**
 * User Context
 *
 * Provides global access to authenticated user's outlet information.
 * Loads from Firestore users/{uid} (Firebase auth) or public.users (Supabase auth).
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { doc, getDoc, getDocFromServer } from "firebase/firestore";
import { resolveAuthProvider } from "@bookglow/shared-types";
import { db } from "../firebase";
import type { PortalAuthUser } from "../services/authService";
import { fetchPortalUserProfile } from "../services/supabaseMerchant";

export type UserRole = "admin" | "cashier";

export interface UserData {
  uid: string;
  email: string | null;
  outletId: string | null;
  role: UserRole | null;
  outletName?: string;
  displayName?: string | null;
}

interface UserContextType {
  user: PortalAuthUser | null;
  userData: UserData | null;
  outletId: string | null;
  outletName: string | null;
  /** Role from users profile: admin (full access) or cashier (limited). */
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within UserContextProvider");
  }
  return context;
};

interface UserContextProviderProps {
  children: ReactNode;
  /** Renamed conceptually to authUser; kept prop name for AppBootstrap compatibility. */
  firebaseUser: PortalAuthUser | null;
}

const OWNER_EMAIL = "teekarseng94@gmail.com";

export const UserContextProvider: React.FC<UserContextProviderProps> = ({
  children,
  firebaseUser: authUser,
}) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = async (user: PortalAuthUser) => {
    try {
      setLoading(true);
      setError(null);
      const email = (user.email || "").toLowerCase();
      if (email === OWNER_EMAIL.toLowerCase()) {
        setUserData({
          uid: user.uid,
          email: user.email,
          outletId: null,
          role: "admin",
          outletName: undefined,
          displayName: user.displayName || null,
        });
        setLoading(false);
        return;
      }

      const useSupabase =
        resolveAuthProvider(
          import.meta.env as unknown as Record<string, string | undefined>
        ) === "supabase";

      if (useSupabase) {
        const profile = await fetchPortalUserProfile(user.uid);
        if (!profile) {
          throw new Error(
            "Your account is not linked to an outlet. " +
              "An administrator must insert a row in public.users with uid = your Supabase Auth user id, " +
              "outlet_id, and role (admin|cashier)."
          );
        }
        const outletId = profile.outletId?.trim() || "";
        if (!outletId && profile.role !== "platform_admin" && profile.role !== "admin") {
          throw new Error(
            "Your user profile does not have an outlet assigned (public.users.outlet_id)."
          );
        }
        const rawRole = (profile.role || "cashier").toLowerCase();
        const role: UserRole =
          rawRole === "admin" || rawRole === "platform_admin" ? "admin" : "cashier";
        setUserData({
          uid: profile.uid,
          email: profile.email || user.email,
          outletId: outletId || null,
          role,
          outletName: profile.outletName || undefined,
          displayName: profile.displayName || user.displayName || null,
        });
        return;
      }

      console.log("Fetching user data for UID:", user.uid);
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDocFromServer(userDocRef);

      if (!userDoc.exists()) {
        throw new Error(
          "Your account is not linked to an outlet. " +
            "An administrator must create a user profile in Firestore (collection: users, document id: your Firebase Auth UID) with field \"outletId\" set to your assigned outlet. " +
            "See USERS_AND_OUTLETS.md for setup."
        );
      }

      const data = userDoc.data();
      const outletId = data.outletId != null ? String(data.outletId).trim() : "";
      if (!outletId) {
        throw new Error(
          "Your user profile does not have an outlet assigned. " +
            "Each user must be mapped to one outlet in the users collection (field: outletId)."
        );
      }

      let outletName = null;
      try {
        const outletDoc = await getDoc(doc(db, "outlets", outletId));
        if (outletDoc.exists()) {
          outletName = outletDoc.data().name || null;
        }
      } catch (outletError) {
        console.warn("Could not fetch outlet name:", outletError);
      }

      const rawRole = (data.role || "cashier").toString().toLowerCase();
      const role: UserRole = rawRole === "admin" ? "admin" : "cashier";

      setUserData({
        uid: user.uid,
        email: user.email,
        outletId,
        role,
        outletName: outletName || undefined,
        displayName: user.displayName || data.displayName || null,
      });
    } catch (err: any) {
      console.error("❌ Error fetching user data:", err);
      setError(err.message || "Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (authUser) {
      await fetchUserData(authUser);
    }
  };

  useEffect(() => {
    if (authUser) {
      fetchUserData(authUser);
    } else {
      setUserData(null);
      setLoading(false);
      setError(null);
    }
  }, [authUser]);

  const value: UserContextType = {
    user: authUser,
    userData,
    outletId: userData?.outletId || null,
    outletName: userData?.outletName || null,
    role: userData?.role ?? null,
    loading,
    error,
    refreshUserData,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
