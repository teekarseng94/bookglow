/**
 * Protected Route Component
 *
 * Wraps routes that require authentication and outlet assignment
 */

import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserContext } from '../contexts/UserContext';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { loading: authLoading, isAuthenticated, user } = useAuth();
  const { loading: userDataLoading, outletId, error } = useUserContext();

  // Show loading spinner while checking authentication and user data
  if (authLoading || userDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600">Loading...</p>
          {authLoading && <p className="text-sm text-slate-400 mt-2">Checking authentication...</p>}
          {userDataLoading && <p className="text-sm text-slate-400 mt-2">Loading outlet information...</p>}
        </div>
      </div>
    );
  }

  // Public paths: /book/* must be accessible without a login token (guest booking).
  const onBookingPath = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/book/') || window.location.hash.includes('/book/')
  );
  if (!isAuthenticated && !onBookingPath) {
    return <Navigate to="/login" replace />;
  }

  const email = (user?.email || '').toLowerCase();
  const ownerEmail = 'teekarseng94@gmail.com';
  const isOwner = email === ownerEmail.toLowerCase();

  // If user has no outletId, show unauthorized message (except for true owner super-admin)
  if (!outletId && !isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 border border-red-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-600 mb-2">Unauthorized</h2>
            <p className="text-slate-600 mb-4">
              {error || 'You do not have an outlet assigned. Please contact your administrator.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated and has outletId - render protected content
  return <>{children}</>;
};
