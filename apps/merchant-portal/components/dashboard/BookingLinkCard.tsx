import React, { useEffect, useState } from 'react';
import { CalendarHeart, Check, Copy } from 'lucide-react';
import { outletService } from '../../services/databaseService';
import { cx } from '../ui/cx';

// Matches the booking URL Settings.tsx already builds from the same outlet doc — kept as a local
// constant here rather than importing from Settings.tsx (a page module) to avoid a page-to-page dependency.
const BOOKING_BASE_URL = 'https://bookglow-83fb3.web.app/book';

export interface BookingLinkCardProps {
  outletId?: string | null;
  className?: string;
}

/** Promotional card — reads the outlet's real bookingSlug (falls back to the outlet id, same as Settings). */
export const BookingLinkCard: React.FC<BookingLinkCardProps> = ({ outletId, className }) => {
  const [bookingSlug, setBookingSlug] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!outletId) {
      setBookingSlug('');
      return;
    }
    let cancelled = false;
    outletService
      .getById(outletId)
      .then((outlet) => {
        if (!cancelled) setBookingSlug((outlet?.bookingSlug || '').trim());
      })
      .catch(() => {
        if (!cancelled) setBookingSlug('');
      });
    return () => {
      cancelled = true;
    };
  }, [outletId]);

  const bookingUrl = outletId ? `${BOOKING_BASE_URL}/${bookingSlug || outletId}` : '';

  const handleShare = async () => {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className={cx(
        'rounded-ui-lg border border-[var(--brand-border)] p-5 flex items-center justify-between gap-4',
        'bg-gradient-to-br from-[var(--brand-soft)] to-[var(--bg-surface)]',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-bold text-[var(--text-primary)]">Keep your schedule full</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Share your booking link to attract new clients.</p>
        <button
          type="button"
          onClick={handleShare}
          disabled={!bookingUrl}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-ui-sm bg-[var(--brand)] text-white text-xs font-bold hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Link copied' : 'Share Booking Link'}
        </button>
      </div>
      <CalendarHeart className="w-12 h-12 text-[var(--brand)]/30 shrink-0" aria-hidden />
    </div>
  );
};

export default BookingLinkCard;
