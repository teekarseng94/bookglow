/**
 * Authentication Hook
 * 
 * Manages authentication state and provides auth methods
 * Note: User outlet data is managed by UserContext, not this hook
 */

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange, getCurrentUser, logout as authLogout } from '../services/authService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set initial user
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setLoading(false);

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange((authUser) => {
      console.log('Auth state changed:', authUser?.email || 'logged out');
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
      console.error('Logout error:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    logout: handleLogout
  };
};
