import React from "react";

export interface BookingStateScreenProps {
  title: string;
  description?: string;
  tone?: "loading" | "error" | "success" | "neutral";
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

/** Loading / invalid / success full-page states — no raw Firebase copy. */
export const BookingStateScreen: React.FC<BookingStateScreenProps> = ({
  title,
  description,
  tone = "neutral",
  children,
  icon,
}) => (
  <div className="bookglow-state-screen">
    <div className={tone === "success" ? "booking-success-card" : "bookglow-state-card"} role={tone === "loading" ? "status" : undefined}>
      {tone === "loading" ? <span className="bookglow-spinner" aria-hidden /> : null}
      {tone === "error" && !icon ? (
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600" aria-hidden>
          !
        </div>
      ) : null}
      {icon}
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
        {children}
      </div>
    </div>
  </div>
);

export default BookingStateScreen;
