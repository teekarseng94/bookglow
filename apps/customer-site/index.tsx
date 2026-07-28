import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App from './App';
import BookingAuth from './apps/booking/BookingAuth';
import BookingPage from './apps/booking/BookingPage';
import SignUp from './apps/booking/SignUp';
<<<<<<< HEAD
import './services/firebase';
=======
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
import './src/styles/global.css';

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
