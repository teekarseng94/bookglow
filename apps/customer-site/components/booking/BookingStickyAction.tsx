import React from "react";

export interface BookingStickyActionProps {
  /** Merchant summary shown before any service is selected. */
  merchantName: string;
  isOpen?: boolean;
  address?: string;
  selectedCount: number;
  totalPriceLabel: string;
  totalDurationMinutes?: number;
  actionLabel?: string;
  onAction: () => void;
  disabled?: boolean;
  /** Optional secondary action (e.g. Choose staff later). */
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/** Compact sticky booking dock for mobile / tablet service selection. */
export const BookingStickyAction: React.FC<BookingStickyActionProps> = ({
  merchantName,
  isOpen,
  address,
  selectedCount,
  totalPriceLabel,
  totalDurationMinutes,
  actionLabel = "Continue",
  onAction,
  disabled,
  secondaryLabel,
  onSecondary,
}) => {
  const hasSelection = selectedCount > 0;
  const shortAddress =
    address && address.length > 42 ? `${address.slice(0, 40).trimEnd()}…` : address;

  return (
    <div className="booking-mobile-dock lg:hidden" role="region" aria-label="Booking summary">
      <div className="booking-mobile-dock__handle" aria-hidden />
      <div className="booking-mobile-dock__body">
        <div className="booking-mobile-dock__summary min-w-0">
          {hasSelection ? (
            <>
              <p className="booking-mobile-dock__title">
                {selectedCount} service{selectedCount === 1 ? "" : "s"} selected
              </p>
              <p className="booking-mobile-dock__meta">
                {totalPriceLabel}
                {typeof totalDurationMinutes === "number" && totalDurationMinutes > 0
                  ? ` · ${totalDurationMinutes} min`
                  : ""}
              </p>
            </>
          ) : (
            <div className="booking-mobile-dock__merchant">
              <span className="booking-mobile-dock__mark" aria-hidden>
                {(merchantName || "B").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="booking-mobile-dock__title" title={merchantName}>
                  {merchantName}
                </p>
                <p className="booking-mobile-dock__status">
                  <span
                    className={`booking-status ${isOpen === false ? "booking-status--closed" : ""}`}
                  >
                    {isOpen === false ? "Closed" : "Open now"}
                  </span>
                </p>
                {shortAddress ? (
                  <p className="booking-mobile-dock__address" title={address}>
                    <svg
                      className="booking-mobile-dock__pin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="truncate">{shortAddress}</span>
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>
        <div className="booking-mobile-dock__actions">
          <button
            type="button"
            onClick={onAction}
            disabled={disabled}
            className="booking-primary-button booking-mobile-dock__continue"
          >
            {actionLabel}
          </button>
          {secondaryLabel && onSecondary ? (
            <button
              type="button"
              onClick={onSecondary}
              className="booking-mobile-dock__secondary"
              disabled={disabled}
            >
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default BookingStickyAction;
