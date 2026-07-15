import React from 'react';
import { cx } from '../ui/cx';

function formatTime12(hhmm: string): string {
  if (!hhmm || !hhmm.includes(':')) return hhmm || '—';
  const [hh = '0', mm = '0'] = hhmm.split(':');
  const hours = Number(hh);
  const mins = Number(mm);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return hhmm;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(mins).padStart(2, '0')} ${ampm}`;
}

export interface OperatingHoursRowProps {
  day: string;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
  onChangeOpenTime: (v: string) => void;
  onChangeCloseTime: (v: string) => void;
  onToggleOpen: (v: boolean) => void;
  className?: string;
}

/**
 * One-line operating hours row:
 * Sunday | 11:00 AM – 11:00 PM | Open
 * Time inputs remain editable; values are not renamed.
 */
export const OperatingHoursRow: React.FC<OperatingHoursRowProps> = ({
  day,
  openTime,
  closeTime,
  isOpen,
  onChangeOpenTime,
  onChangeCloseTime,
  onToggleOpen,
  className,
}) => {
  const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
  const rangeLabel = isOpen
    ? `${formatTime12(openTime)} – ${formatTime12(closeTime)}`
    : 'Closed';
  const statusLabel = isOpen ? 'Open' : 'Closed';

  return (
    <div
      className={cx(
        'flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-1.5 py-2 border-b border-[var(--line)] last:border-b-0',
        className,
      )}
    >
      <span className="w-[72px] sm:w-24 flex-shrink-0 text-sm font-semibold text-[var(--text-primary)] capitalize">
        {dayLabel}
      </span>
      <span className="hidden sm:inline text-[var(--text-muted)] flex-shrink-0" aria-hidden>
        |
      </span>
      {isOpen ? (
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <input
            type="time"
            value={openTime}
            onChange={(e) => onChangeOpenTime(e.target.value)}
            className="flex-1 min-w-0 h-9 px-2 bg-[var(--bg-soft)] border border-[var(--line)] rounded-ui-sm text-sm outline-none focus-visible:shadow-ui-focus-strong"
            aria-label={`${dayLabel} opening time`}
          />
          <span className="text-[var(--text-muted)] text-xs flex-shrink-0">–</span>
          <input
            type="time"
            value={closeTime}
            onChange={(e) => onChangeCloseTime(e.target.value)}
            className="flex-1 min-w-0 h-9 px-2 bg-[var(--bg-soft)] border border-[var(--line)] rounded-ui-sm text-sm outline-none focus-visible:shadow-ui-focus-strong"
            aria-label={`${dayLabel} closing time`}
          />
          <span className="hidden md:inline text-xs text-[var(--text-muted)] whitespace-nowrap ml-1">
            {rangeLabel}
          </span>
        </div>
      ) : (
        <span className="flex-1 text-sm text-[var(--text-muted)] italic">{rangeLabel}</span>
      )}
      <span className="hidden sm:inline text-[var(--text-muted)] flex-shrink-0" aria-hidden>
        |
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isOpen}
        aria-label={`Toggle ${dayLabel} ${statusLabel}`}
        onClick={() => onToggleOpen(!isOpen)}
        className={cx(
          'relative flex-shrink-0 w-10 h-6 rounded-full transition-colors',
          isOpen ? 'bg-[var(--brand)]' : 'bg-[var(--line-strong)]',
        )}
      >
        <span
          className={cx(
            'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all',
            isOpen ? 'left-5' : 'left-1',
          )}
        />
      </button>
      <span
        className={cx(
          'w-12 text-right text-xs font-bold uppercase tracking-wide',
          isOpen ? 'text-[var(--success)]' : 'text-[var(--text-muted)]',
        )}
      >
        {statusLabel}
      </span>
    </div>
  );
};

export default OperatingHoursRow;
