import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import MerchantOnboardingWizard from '../../customer-site/apps/merchant-onboarding/MerchantOnboardingWizard';
import { useAuth } from '../hooks/useAuth';
import { logout } from '../services/authService';
import { resolveMerchantAccess } from '../src/auth/accessResolver';

export default function MerchantOnboardingPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const [gate, setGate] = useState<'loading' | 'wizard' | 'app'>('loading');

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setGate('wizard');
      return;
    }
    let cancelled = false;
    void resolveMerchantAccess()
      .then((access) => {
        if (cancelled) return;
        const needsWizard = access.state === 'no_workspace' || access.registrationPending || !access.outletId;
        setGate(needsWizard ? 'wizard' : 'app');
      })
      .catch(() => {
        if (!cancelled) setGate('wizard');
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading]);

  if (loading || (isAuthenticated && gate === 'loading')) {
    return (
      <div className="merchant-onboarding__loading" role="status">
        Loading your setup…
      </div>
    );
  }

  if (!isAuthenticated || !user?.email) {
    return <Navigate to="/login" replace />;
  }

  if (gate === 'app') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <MerchantOnboardingWizard
      email={user.email}
      completeHref="/#/dashboard"
      onSavedExit={async () => {
        await logout();
        window.location.replace('/#/login');
      }}
    />
  );
}
