import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from './App';
import BookingAuth from './apps/booking/BookingAuth';
import BookingPage from './apps/booking/BookingPage';
import SignUp from './apps/booking/SignUp';
import AccountDeletionPage from './apps/legal/AccountDeletionPage';
import PrivacyPolicyPage from './apps/legal/PrivacyPolicyPage';
import CustomerAuthCallback from './src/auth/CustomerAuthCallback';
import { merchantLoginHref, merchantLoginIsCrossOrigin } from './src/merchantPortalUrl';
import './src/styles/global.css';

// Backward compatibility for legacy hash URLs.
if (typeof window !== 'undefined' && window.location.hash) {
  const hashPath = window.location.hash.replace(/^#/, '');
  const legacyRouteMap: Record<string, string> = {
    '/login': '/login',
    '/loginbackend': '/login',
    '/dashboard': '/dashboard',
  };
  const mappedPath = legacyRouteMap[hashPath];
  if (mappedPath) {
    window.location.replace(mappedPath + window.location.search);
  }
}

/** Local split-port only. Production /login is proxied to the merchant app on bookglow.my. */
const MerchantLoginBridge: React.FC = () => {
  const href = merchantLoginHref();
  const crossOrigin = merchantLoginIsCrossOrigin();

  useEffect(() => {
    if (crossOrigin) window.location.replace(href);
  }, [crossOrigin, href]);

  if (!crossOrigin) {
    return (
      <div className="bookglow-state-screen">
        <div className="bookglow-state-card" role="status">
          <p>
            Merchant login lives at <a href="/login">/login</a> on this domain.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bookglow-state-screen">
      <div className="bookglow-state-card" role="status">
        <span className="bookglow-spinner" aria-hidden />
        <p>Opening merchant login…</p>
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
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/account-deletion" element={<AccountDeletionPage />} />
        <Route path="/login" element={<MerchantLoginBridge />} />
        <Route path="/loginbackend" element={<MerchantLoginBridge />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
