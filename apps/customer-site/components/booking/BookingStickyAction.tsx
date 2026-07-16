import React from "react";

export interface BookingStickyActionProps {
  title: string;
  meta: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
}

/** Single compact sticky action for mobile booking. */
export const BookingStickyAction: React.FC<BookingStickyActionProps> = ({
  title,
  meta,
  actionLabel,
  onAction,
  disabled,
}) => (
  <div className="booking-mobile-action lg:hidden">
    <div className="min-w-0">
      <p className="booking-mobile-action__title">{title}</p>
      <p className="booking-mobile-action__meta">{meta}</p>
    </div>
    <button type="button" onClick={onAction} disabled={disabled} className="booking-primary-button">
      {actionLabel}
    </button>
  </div>
);

export default BookingStickyAction;
