import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App from './App';
import BookingAuth from './apps/booking/BookingAuth';
import BookingPage from './apps/booking/BookingPage';
import SignUp from './apps/booking/SignUp';
import CustomerAuthCallback from './src/auth/CustomerAuthCallback';
import { customerPublicEnv } from './src/customerPublicEnv';
import './src/styles/global.css';

const merchantPortalOrigin =
  customerPublicEnv.VITE_MERCHANT_PORTAL_URL
    .trim()
    .replace(/\/+$/, '');

const MERCHANT_LOGIN_URL =
  merchantPortalOrigin
    ? `${merchantPortalOrigin}/login`
    : null;

// Backward compatibility for legacy hash URLs.
if (typeof window !== 'undefined' && window.location.hash) {
  const hashPath = window.location.hash.replace(/^#/, '');
  const legacyRouteMap: Record<string, string> = {
    '/login': '/login',
    '/loginbackend': '/login',
    '/dashboard': '/login',
  };
  const mappedPath = legacyRouteMap[hashPath];
  if (mappedPath) {
    window.history.replaceState(null, '', mappedPath + window.location.search);
  }
}

const MerchantRedirect: React.FC = () => {
  useEffect(() => {
    if (MERCHANT_LOGIN_URL) {
      window.location.replace(MERCHANT_LOGIN_URL);
    }
  }, []);

  if (!MERCHANT_LOGIN_URL) {
    return (
      <div className="bookglow-state-screen">
        <div className="bookglow-state-card" role="alert">
          <p>Merchant login is not configured.</p>
          <p>Set VITE_MERCHANT_PORTAL_URL to the merchant portal origin and rebuild the customer site.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bookglow-state-screen">
      <div className="bookglow-state-card" role="status">
        <span className="bookglow-spinner" aria-hidden />
        <p>Redirecting to merchant login…</p>
      </div>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/book/:bookingPath/auth" element={<BookingAuth />} />
        <Route path="/auth/callback/customer" element={<CustomerAuthCallback />} />
        <Route path="/book/:bookingPath" element={<BookingPage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<MerchantRedirect />} />
        <Route path="/loginbackend" element={<Navigate to="/login" replace />} />
        <Route path="/admin/*" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
