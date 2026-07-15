import React from 'react';
import { cx } from '../ui/cx';

export interface MemberHistorySectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onOpen?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/** History / navigation row for visits, sales, appointments, notes. */
export const MemberHistorySection: React.FC<MemberHistorySectionProps> = ({
  title,
  description,
  icon,
  onOpen,
  className,
  children,
}) => {
  if (children) {
    return (
      <section
        className={cx(
          'bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs overflow-hidden',
          className,
        )}
      >
        <div className="px-4 py-3 border-b border-[var(--line)]">
          <h4 className="text-sm font-bold text-[var(--text-primary)]">{title}</h4>
          {description ? <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p> : null}
        </div>
        <div className="p-4">{children}</div>
      </section>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx(
        'w-full flex items-center gap-4 p-4 text-left hover:bg-[var(--bg-soft)] transition-colors',
        'bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-md shadow-ui-xs',
        className,
      )}
    >
      {icon ? (
        <div className="w-10 h-10 rounded-ui-sm bg-[var(--bg-soft)] text-[var(--text-secondary)] flex items-center justify-center shrink-0">
          {icon}
        </div>
      ) : null}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[var(--text-primary)]">{title}</p>
        {description ? <p className="text-sm text-[var(--text-muted)] truncate">{description}</p> : null}
      </div>
      <svg className="w-5 h-5 text-[var(--text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
};

export default MemberHistorySection;
