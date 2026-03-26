import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import SignUp from './apps/booking/SignUp';
import BookingPage from './apps/booking/BookingPage';
import BookingAuth from './apps/booking/BookingAuth';
import './services/firebase';

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
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
