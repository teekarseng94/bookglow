import React, { useEffect, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import SignUp from './apps/booking/SignUp';
import BookingPage from './apps/booking/BookingPage';
import BookingAuth from './apps/booking/BookingAuth';
import BookingV2RouteFallback from './src/booking-v2/routes/BookingV2RouteFallback';
import './services/firebase';

// Lazy-load the V2 booking app so its code is emitted as a SEPARATE chunk and
// is not shipped to visitors of /, /signup or the live /book route.
const BookingV2Routes = React.lazy(() => import('./src/booking-v2/routes/BookingV2Routes'));
// Single global stylesheet entry for the V2 foundation (scoped under .bg-v2;
// see src/styles/global.css). This replaces the missing /index.css reference.
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

  return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Redirecting to merchant login...</div>;
};

const isBookingV2Enabled = import.meta.env.VITE_ENABLE_BOOKING_V2 === 'true';

const BookingV2NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 p-4">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Page Not Found</h1>
      <p className="text-slate-600 text-center">The requested page does not exist or online booking V2 is disabled.</p>
    </div>
  );
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
        {/* Public booking portal — no auth; :bookingPath is outlet id or outlets.bookingSlug */}
        <Route path="/book/:bookingPath/auth" element={<BookingAuth />} />
        <Route path="/book/:bookingPath" element={<BookingPage />} />
        {/* Parallel V2 booking foundation (does NOT affect the live /book route).
            Lazily loaded; a lightweight fallback shows while the chunk loads. */}
        <Route
          path="/book-v2/:bookingPath/*"
          element={
            isBookingV2Enabled ? (
              <Suspense fallback={<BookingV2RouteFallback />}>
                <BookingV2Routes />
              </Suspense>
            ) : (
              <BookingV2NotFound />
            )
          }
        />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<MerchantRedirect />} />
        <Route path="/loginbackend" element={<Navigate to="/login" replace />} />
        <Route path="/admin/*" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
