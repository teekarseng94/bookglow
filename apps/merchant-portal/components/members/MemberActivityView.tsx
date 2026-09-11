import React from 'react';
import { cx } from '../ui/cx';

/** Shared desktop activity content width for Member Details subviews. */
export const MEMBER_ACTIVITY_MAX_WIDTH_CLASS = 'max-w-[1040px]';

export interface MemberActivitySegmentOption<T extends string> {
  value: T;
  label: string;
}

interface MemberActivitySegmentedProps<T extends string> {
  options: MemberActivitySegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Full-width segmented control aligned to the activity content edges. */
export function MemberActivitySegmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: MemberActivitySegmentedProps<T>) {
  return (
    <div
      className={cx(
        'grid w-full gap-1 p-1 rounded-xl bg-slate-200',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cx(
              'm-member-filter-chip min-w-0 truncate transition-colors',
              active
                ? 'bg-[var(--bg-surface)] text-[var(--brand)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface MemberActivityViewProps {
  title: string;
  onBack: () => void;
  controls?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Shared shell for Member Details activity subviews (Recent / Sales / Appointments).
 * Mobile: full available width. Desktop/tablet: centered content capped ~1040px.
 * Header, controls, and body share the same horizontal padding so edges align.
 */
export const MemberActivityView: React.FC<MemberActivityViewProps> = ({
  title,
  onBack,
  controls,
  children,
  footer,
  className,
}) => (
  <div className={cx('bg-[var(--bg-canvas)]', className)}>
    <div className={cx('m-member-activity w-full mx-auto pb-8', MEMBER_ACTIVITY_MAX_WIDTH_CLASS)}>
      <div className="m-member-subview-header flex items-center justify-between bg-[var(--bg-surface)] border-b border-[var(--line)] sticky top-0 z-10">
        <button
          type="button"
          onClick={onBack}
          className="m-member-details-back grid place-items-center -ml-1 hover:bg-[var(--bg-soft)] text-[var(--brand)] transition-colors"
          aria-label="Back"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="m-member-subview-title text-[var(--text-primary)]">{title}</h2>
        <div className="w-10" aria-hidden />
      </div>

      <div className="px-4 pt-4 pb-2 space-y-4">
        {controls ? <div className="m-member-activity__controls w-full">{controls}</div> : null}
        <div className="m-member-activity__body w-full">{children}</div>
      </div>

      {footer}
    </div>
  </div>
);

export default MemberActivityView;
