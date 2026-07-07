/**
 * User Context
 * 
 * Provides global access to authenticated user's outlet information
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, getDocFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import { logout } from '../services/authService';

export type UserRole = 'admin' | 'cashier';

export interface UserData {
  uid: string;
  email: string | null;
  outletId: string | null;
  role: UserRole | null;
  outletName?: string;
  displayName?: string | null;
}

interface UserContextType {
  user: User | null;
  userData: UserData | null;
  outletId: string | null;
  outletName: string | null;
  /** Role from users/{uid} document: admin (full access) or cashier (limited). */
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within UserContextProvider');
  }
  return context;
};

interface UserContextProviderProps {
  children: ReactNode;
  firebaseUser: User | null;
}

export const UserContextProvider: React.FC<UserContextProviderProps> = ({ 
  children, 
  firebaseUser 
}) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = async (user: User) => {
    try {
      setLoading(true);
      setError(null);
      const email = (user.email || '').toLowerCase();
      const ownerEmail = 'teekarseng94@gmail.com';
      // True outlet-less super admin: bypass outlet checks entirely
      if (email === ownerEmail.toLowerCase()) {
        const ownerData: UserData = {
          uid: user.uid,
          email: user.email,
          outletId: null,
          role: 'admin',
          outletName: undefined,
          displayName: user.displayName || null
        };
        setUserData(ownerData);
        setLoading(false);
        setError(null);
        return;
      }

      console.log('Fetching user data for UID:', user.uid);
      
      // Fetch user document from Firestore (server read to avoid stale cache so role updates apply immediately)
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDocFromServer(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error(
          'Your account is not linked to an outlet. ' +
          'An administrator must create a user profile in Firestore (collection: users, document id: your Firebase Auth UID) with field "outletId" set to your assigned outlet. ' +
          'See USERS_AND_OUTLETS.md for setup.'
        );
      }
      
      const data = userDoc.data();
      console.log('User document data:', data);
      
      // Validate required fields — each email/user must map to exactly one outlet for multi-tenant isolation
      const outletId = data.outletId != null ? String(data.outletId).trim() : '';
      if (!outletId) {
        throw new Error(
          'Your user profile does not have an outlet assigned. ' +
          'Each user must be mapped to one outlet in the users collection (field: outletId). ' +
          'Contact your administrator to set outletId for your account.'
        );
      }
      
      // Fetch outlet information
      let outletName = null;
      try {
        const outletDocRef = doc(db, 'outlets', outletId);
        const outletDoc = await getDoc(outletDocRef);
        if (outletDoc.exists()) {
          outletName = outletDoc.data().name || null;
        }
      } catch (outletError) {
        console.warn('Could not fetch outlet name:', outletError);
        // Continue without outlet name
      }
      
      // Normalize role: accept 'admin' | 'cashier' | 'staff' (legacy) from Firestore; default to cashier
      const rawRole = (data.role || 'cashier').toString().toLowerCase();
      const role: UserRole = rawRole === 'admin' ? 'admin' : 'cashier';

      const userData: UserData = {
        uid: user.uid,
        email: user.email,
        outletId,
        role,
        outletName: outletName || undefined,
        displayName: user.displayName || data.displayName || null
      };
      
      console.log('✅ User data loaded:', userData);
      setUserData(userData);
      
    } catch (err: any) {
      console.error('❌ Error fetching user data:', err);
      // Surface the message but do not auto-logout; ProtectedRoute will handle access control
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (firebaseUser) {
      await fetchUserData(firebaseUser);
    }
  };

  useEffect(() => {
    if (firebaseUser) {
      fetchUserData(firebaseUser);
    } else {
      // User logged out
      setUserData(null);
      setLoading(false);
      setError(null);
    }
  }, [firebaseUser]);

  const value: UserContextType = {
    user: firebaseUser,
    userData,
    outletId: userData?.outletId || null,
    outletName: userData?.outletName || null,
    role: userData?.role ?? null,
    loading,
    error,
    refreshUserData
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
