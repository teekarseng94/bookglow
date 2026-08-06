/**
 * Root routes: legacy /book/:id redirects to the customer-site booking host;
 * public voucher routes; /login; then protected dashboard.
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import LegacyBookingRedirect from './components/LegacyBookingRedirect';
import BuyVoucher from './pages/BuyVoucher';
import RedeemVoucher from './pages/RedeemVoucher';
import MerchantAuthCallback from './src/auth/MerchantAuthCallback';
import AccessStatePage from './src/auth/AccessStatePage';

const RouteSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="inline-block w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const RootRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [AppComponent, setAppComponent] = React.useState<React.ComponentType | null>(null);

  React.useEffect(() => {
    import('./App').then((m) => setAppComponent(() => m.default));
  }, []);

  return (
    <Routes>
      {/* Legacy public booking URL — redirects to customer site; never behind auth */}
      <Route path="/book/:id" element={<LegacyBookingRedirect />} />
      <Route path="/buy-voucher/:slug" element={<BuyVoucher />} />
      <Route path="/redeem/:unique_id" element={<RedeemVoucher />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/auth/callback/merchant" element={<MerchantAuthCallback />} />
      <Route path="/access/no-workspace" element={<AccessStatePage title="No merchant workspace found" message="This identity is valid, but it has no active outlet membership. Ask an owner to invite you, or start merchant signup intentionally." />} />
      <Route path="/access/account-suspended" element={<AccessStatePage title="Account suspended" message="Your outlet membership is suspended. Contact the outlet owner." />} />
      <Route path="/access/workspace-suspended" element={<AccessStatePage title="Workspace access suspended" message="This outlet is currently unavailable. Contact Bookglow support." />} />
      <Route path="*" element={AppComponent ? <AppComponent /> : <RouteSpinner />} />
    </Routes>
  );
};

export default RootRoutes;
