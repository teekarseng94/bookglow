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
      <Route path="*" element={AppComponent ? <AppComponent /> : <RouteSpinner />} />
    </Routes>
  );
};

export default RootRoutes;
