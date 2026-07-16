import React from "react";

export interface BookingMerchantHeaderProps {
  merchantName: string;
  currentUserEmail?: string | null;
  shareLoading?: boolean;
  onShare: () => void;
  onLogin: () => void;
}

/** Compact merchant identity — must not consume the full mobile viewport. */
export const BookingMerchantHeader: React.FC<BookingMerchantHeaderProps> = ({
  merchantName,
  currentUserEmail,
  shareLoading,
  onShare,
  onLogin,
}) => (
  <nav className="booking-nav" aria-label="Booking page navigation">
    <div className="booking-nav__inner">
      <div className="booking-nav__identity">
        <span className="booking-nav__mark" aria-hidden>
          {(merchantName || "B").charAt(0).toUpperCase()}
        </span>
        <span className="booking-nav__brand">{merchantName || "Bookglow booking"}</span>
      </div>
      <div className="booking-nav__links">
        <a href="#services">Services</a>
        <a href="#team">Team</a>
        <a href="#reviews">Reviews</a>
        <a href="#address">Address</a>
      </div>
      <div className="booking-nav__actions">
        {currentUserEmail ? (
          <span className="hidden text-xs font-medium text-slate-500 sm:inline">{currentUserEmail}</span>
        ) : null}
        <button
          type="button"
          onClick={onShare}
          disabled={shareLoading}
          className="booking-icon-button"
          aria-label="Share this page"
        >
          <svg
            className={`h-5 w-5 ${shareLoading ? "animate-pulse" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4m0 0L8 6m4-4v16"
            />
          </svg>
        </button>
        <button type="button" onClick={onLogin} className="booking-icon-button" aria-label="Customer login">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5.121 17.804A7 7 0 0112 15a7 7 0 016.879 2.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>
    </div>
  </nav>
);

export default BookingMerchantHeader;
