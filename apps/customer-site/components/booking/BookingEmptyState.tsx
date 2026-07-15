import React from "react";

export interface BookingEmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const BookingEmptyState: React.FC<BookingEmptyStateProps> = ({
  title,
  description,
  action,
}) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
    <p className="text-sm font-semibold text-slate-600">{title}</p>
    {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
    {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
  </div>
);

export default BookingEmptyState;
