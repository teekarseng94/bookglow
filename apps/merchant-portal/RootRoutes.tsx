/**
 * Root routes: public /book/:id (Booking Portal, no auth), /login, then protected dashboard.
 * /book/:id is the very first route and is strictly outside ProtectedRoute / auth checks.
 * Path "/" only matches exactly "/", so it never triggers for /book/... .
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import PublicBookingPage from './pages/Book';
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
      {/* Public booking first — matches before *; never behind auth */}
      <Route path="/book/:id" element={<PublicBookingPage />} />
      <Route path="/buy-voucher/:slug" element={<BuyVoucher />} />
      <Route path="/redeem/:unique_id" element={<RedeemVoucher />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="*" element={AppComponent ? <AppComponent /> : <RouteSpinner />} />
    </Routes>
  );
};

export default RootRoutes;
