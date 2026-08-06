/**
 * Protected Route Component
 *
 * Wraps routes that require authentication and outlet assignment
 */

import React, { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserContext } from '../contexts/UserContext';
import { useAuth } from '../hooks/useAuth';
import { Button, ErrorState, LoadingSkeleton } from './ui';

interface ProtectedRouteProps {
  children: ReactNode;
}

const customerSiteUrl = ((import.meta.env as unknown as Record<string, string | undefined>).VITE_CUSTOMER_SITE_URL || 'http://localhost:5174').replace(/\/$/, '');

const OnboardingRedirect: React.FC<{ email?: string | null }> = ({ email }) => {
  const url = new URL('/signup', customerSiteUrl);
  url.searchParams.set('resume', '1');
  if (email) url.searchParams.set('email', email);
  const redirectUrl = url.toString();

  useEffect(() => {
    window.location.replace(redirectUrl);
  }, [redirectUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)] p-6">
      <div className="w-full max-w-md rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] p-6 shadow-ui-sm" role="status">
        <p className="font-semibold text-[var(--text-primary)]">Continue business setup</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Taking you back to your saved BookGlow onboarding progress…</p>
      </div>
    </div>
  );
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { loading: authLoading, isAuthenticated, user } = useAuth();
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

  if (onboardingRequired && !isPlatformAdmin) {
    return <OnboardingRedirect email={user?.email} />;
  }

  // If user has no outletId, show unauthorized message (except for true owner super-admin)
  if (!outletId && !isPlatformAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)] p-4">
        <div className="max-w-md w-full bg-[var(--bg-surface)] rounded-ui-md shadow-ui-md p-6 border border-[var(--line)]">
          <ErrorState
            title="Permission denied"
            message={error || 'Your account is not assigned to an outlet. Contact your administrator for access.'}
          />
          <Button className="mt-4 w-full" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    );
  }

  // User is authenticated and has outletId - render protected content
  return <>{children}</>;
};
