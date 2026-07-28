/**
 * Authentication Hook
 *
 * Manages authentication state and provides auth methods.
 * Note: User outlet data is managed by UserContext, not this hook.
 */

import { useState, useEffect } from "react";
import {
  onAuthStateChange,
  getCurrentUser,
  logout as authLogout,
  type PortalAuthUser,
} from "../services/authService";

export const useAuth = () => {
  const [user, setUser] = useState<PortalAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setLoading(false);

    const unsubscribe = onAuthStateChange((authUser) => {
      console.log("Auth state changed:", authUser?.email || "logged out");
      setUser(authUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await authLogout();
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    logout: handleLogout,
  };
};
