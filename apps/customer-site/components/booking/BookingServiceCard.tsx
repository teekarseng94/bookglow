import React from "react";

export interface BookingServiceCardProps {
  name: string;
  durationMinutes: number;
  category?: string;
  priceLabel: string;
  selectedCount?: number;
  onSelect: () => void;
}

/** Service discovery row — name, duration, and price are always visible. */
export const BookingServiceCard: React.FC<BookingServiceCardProps> = ({
  name,
  durationMinutes,
  category,
  priceLabel,
  selectedCount = 0,
  onSelect,
}) => {
  const isSelected = selectedCount > 0;
  const label = isSelected
    ? `${name}, selected${selectedCount > 1 ? ` ${selectedCount} times` : ""}. Add another.`
    : `Add ${name}`;

  return (
    <div
      role="button"
      tabIndex={0}
      className={`booking-service-card ${isSelected ? "booking-service-card--selected" : ""}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={isSelected}
      aria-label={label}
    >
      <div className="booking-service-card__body">
        <div className="booking-service-card__icon" aria-hidden>
          {isSelected ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v14M5 12h14" />
            </svg>
          )}
        </div>
        <div className="booking-service-card__copy">
          <p className="booking-service-card__name" title={name}>
            {name}
          </p>
          <p className="booking-service-card__meta">
            {durationMinutes} min{category ? ` · ${category}` : ""}
            {selectedCount > 1 ? (
              <span className="booking-service-card__count"> · x{selectedCount}</span>
            ) : null}
          </p>
        </div>
      </div>
      <div className="booking-service-card__aside">
        {selectedCount > 1 ? (
          <span className="booking-service-card__badge" aria-hidden>
            x{selectedCount}
          </span>
        ) : null}
        <span className="booking-service-card__price">{priceLabel}</span>
        {isSelected ? (
          <svg className="booking-service-card__chevron booking-service-card__chevron--selected" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="booking-service-card__chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </div>
  );
};

export default BookingServiceCard;
