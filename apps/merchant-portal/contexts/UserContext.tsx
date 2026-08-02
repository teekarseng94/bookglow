/**
 * User Context
 *
 * Provides global access to authenticated user's outlet information.
 * Loads from public.users (Supabase auth).
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { PortalAuthUser } from "../services/authService";
import { fetchPortalUserProfile } from "../services/supabaseMerchant";
import { outletService } from "../services/databaseService";

export type UserRole = "admin" | "manager" | "cashier";

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
  onboardingRequired: boolean;
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
  const [onboardingRequired, setOnboardingRequired] = useState(false);

  const fetchUserData = async (user: PortalAuthUser) => {
    try {
      setLoading(true);
      setError(null);
      setOnboardingRequired(false);
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

      const profile = await fetchPortalUserProfile(user.uid);
      if (!profile) {
        setUserData({
          uid: user.uid,
          email: user.email,
          outletId: null,
          role: null,
          displayName: user.displayName || null,
        });
        setOnboardingRequired(true);
        return;
      }
      const outletId = profile.outletId?.trim() || "";
      if (!outletId && profile.role !== "platform_admin") {
        setUserData({
          uid: profile.uid,
          email: profile.email || user.email,
          outletId: null,
          role: null,
          displayName: profile.displayName || user.displayName || null,
        });
        setOnboardingRequired(true);
        return;
      }
      if (outletId) {
        const outlet = await outletService.getById(outletId);
        if (outlet && outlet.isActive === false) {
          throw new Error("This merchant workspace has been suspended. Please contact platform support.");
        }
      }
      const rawRole = (profile.role || "cashier").toLowerCase();
      const role: UserRole =
        rawRole === "admin" || rawRole === "platform_admin"
          ? "admin"
          : rawRole === "manager"
          ? "manager"
          : "cashier";
      setUserData({
        uid: profile.uid,
        email: profile.email || user.email,
        outletId: outletId || null,
        role,
        outletName: profile.outletName || undefined,
        displayName: profile.displayName || user.displayName || null,
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
      setOnboardingRequired(false);
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
    onboardingRequired,
    refreshUserData,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
