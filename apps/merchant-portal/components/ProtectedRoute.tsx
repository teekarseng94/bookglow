/**
 * Protected Route Component
 *
 * Wraps routes that require authentication and outlet assignment
 */

import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserContext } from '../contexts/UserContext';
import { useAuth } from '../hooks/useAuth';
import { Button, ErrorState, LoadingSkeleton } from './ui';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { loading: userDataLoading, outletId, error, onboardingRequired, isPlatformAdmin } = useUserContext();

  // Show loading spinner while checking authentication and user data
  if (authLoading || userDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)] p-6">
        <div className="w-full max-w-md rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] p-6 shadow-ui-sm">
          <p className="font-semibold text-[var(--text-primary)]">Preparing your workspace</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {authLoading ? 'Checking authentication…' : 'Loading outlet information…'}
          </p>
          <LoadingSkeleton rows={3} className="mt-5" />
        </div>
      </div>
    );
  }

  // Public paths: /book/* redirects to customer booking without requiring login.
  const onBookingPath = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/book/') || window.location.hash.includes('/book/')
  );
  if (!isAuthenticated && !onBookingPath) {
    return <Navigate to="/login" replace />;
  }

  if (error && /suspend/i.test(error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)] p-4">
        <div className="max-w-md w-full bg-[var(--bg-surface)] rounded-ui-md shadow-ui-md p-6 border border-[var(--line)]">
          <ErrorState title="Access unavailable" message={error} />
          <Button className="mt-4 w-full" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    );
  }

  // New or unfinished merchant accounts resume setup instead of a dead-end permission screen.
  if (!isPlatformAdmin && (onboardingRequired || !outletId)) {
    return <Navigate to="/onboarding" replace />;
  }

  // User is authenticated and has outletId - render protected content
  return <>{children}</>;
};
