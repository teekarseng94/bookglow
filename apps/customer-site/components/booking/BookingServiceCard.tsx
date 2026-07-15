import React from "react";

export interface BookingServiceCardProps {
  name: string;
  durationMinutes: number;
  category?: string;
  priceLabel: string;
  selectedCount?: number;
  onSelect: () => void;
}

/** Service discovery card — name, duration, and price are always visible. */
export const BookingServiceCard: React.FC<BookingServiceCardProps> = ({
  name,
  durationMinutes,
  category,
  priceLabel,
  selectedCount = 0,
  onSelect,
}) => {
  const isSelected = selectedCount > 0;
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
    >
      <div className="booking-service-card__body">
        <div className="booking-service-card__icon">{isSelected ? "✓" : "+"}</div>
        <div>
          <p className="booking-service-card__name">{name}</p>
          <p className="booking-service-card__meta">
            {durationMinutes} min{category ? ` · ${category}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {selectedCount > 1 ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 border border-teal-200">
            x{selectedCount}
          </span>
        ) : null}
        <span className="booking-service-card__price">{priceLabel}</span>
        {isSelected ? (
          <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </div>
  );
};

export default BookingServiceCard;
