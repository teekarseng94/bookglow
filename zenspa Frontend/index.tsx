import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import SignUp from './apps/booking/SignUp';
import BookingPage from './apps/booking/BookingPage';
import BookingAuth from './apps/booking/BookingAuth';
import './services/firebase';

const MERCHANT_LOGIN_URL = 'https://bookglow-83fb3-dashboard.web.app/login';

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
    window.location.replace(MERCHANT_LOGIN_URL);
  }, []);

  return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Redirecting to merchant login...</div>;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public booking portal — no auth; must be before * so /book/:outletId matches */}
        <Route path="/book/:outletId/auth" element={<BookingAuth />} />
        <Route path="/book/:outletId" element={<BookingPage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<MerchantRedirect />} />
        <Route path="/loginbackend" element={<Navigate to="/login" replace />} />
        <Route path="/admin/*" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
