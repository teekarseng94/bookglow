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

function HoursTimeField({
  value,
  ariaLabel,
  onChange,
  className,
}: {
  value: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={cx('m-time-field', className)}>
      <span className="m-time-field__face" aria-hidden>
        <span className="m-time-field__value">{formatTime12(value)}</span>
        <svg className="m-time-field__caret" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M5.8 7.5a1 1 0 011.4 0L10 10.3l2.8-2.8a1 1 0 111.4 1.4l-3.5 3.5a1 1 0 01-1.4 0L5.8 8.9a1 1 0 010-1.4z" />
        </svg>
      </span>
      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="m-time-field__native"
        aria-label={ariaLabel}
      />
    </label>
  );
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
 * Phone row is always one line at 360–427px:
 * Sun | 9:00 AM | – | 5:00 PM | Toggle | OPEN
 * Native Android time widgets are covered by a compact BookGlow field.
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
  const compactDayLabel = dayLabel.slice(0, 3);
  const statusLabel = isOpen ? 'Open' : 'Closed';

  return (
    <div className={cx('m-hours-row', className)}>
      <span className="m-hours-row__day" title={dayLabel} aria-label={dayLabel}>
        <span className="m-hours-row__day-short" aria-hidden>
          {compactDayLabel}
        </span>
        <span className="m-hours-row__day-full" aria-hidden>
          {dayLabel}
        </span>
      </span>
      {isOpen ? (
        <>
          <HoursTimeField className="m-hours-row__start" value={openTime} ariaLabel={`${dayLabel} opening time`} onChange={onChangeOpenTime} />
          <span className="m-hours-row__dash" aria-hidden>
            –
          </span>
          <HoursTimeField className="m-hours-row__end" value={closeTime} ariaLabel={`${dayLabel} closing time`} onChange={onChangeCloseTime} />
        </>
      ) : (
        <span className="m-hours-row__closed">Closed</span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={isOpen}
        aria-label={`Toggle ${dayLabel} ${statusLabel}`}
        onClick={() => onToggleOpen(!isOpen)}
        className="m-hours-row__toggle"
      >
        <span className={cx('m-hours-row__switch', isOpen && 'm-hours-row__switch--on')}>
          <span className="m-hours-row__knob" />
        </span>
      </button>
      <span className={cx('m-hours-row__status', isOpen ? 'is-open' : 'is-closed')}>{statusLabel}</span>
    </div>
  );
};

export default OperatingHoursRow;
