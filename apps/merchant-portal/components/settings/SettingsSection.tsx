import React, { useState } from 'react';
import { cx } from '../ui/cx';

export interface SettingsSectionProps {
  id?: string;
  icon?: React.ReactNode;
  iconWrap?: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  /** When true, always expanded on desktop (lg+). Mobile remains accordion. */
  desktopAlwaysOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Section boundary for related settings.
 * Mobile: accordion. Desktop: always open when desktopAlwaysOpen (default true).
 */
export const SettingsSection: React.FC<SettingsSectionProps> = ({
  id,
  icon,
  iconWrap = 'bg-[var(--brand-soft)] text-[var(--brand)]',
  title,
  description,
  defaultOpen = false,
  desktopAlwaysOpen = true,
  className,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      id={id}
      className={cx(
        'bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs scroll-mt-4',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cx(
          'w-full flex items-center gap-3 sm:gap-4 text-left p-4 sm:p-5',
          desktopAlwaysOpen && 'lg:cursor-default lg:pb-0',
        )}
      >
        {icon ? (
          <div className={cx('p-2 sm:p-2.5 rounded-ui-sm flex-shrink-0', iconWrap)}>{icon}</div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-app-section font-bold text-[var(--text-primary)] leading-tight">
            {title}
          </h3>
          {description ? (
            <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5 truncate lg:whitespace-normal lg:overflow-visible">
              {description}
            </p>
          ) : null}
        </div>
        <svg
          className={cx(
            'w-5 h-5 text-[var(--text-muted)] flex-shrink-0 transition-transform',
            desktopAlwaysOpen && 'lg:hidden',
            open && 'rotate-180',
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={cx(
          'px-4 pb-4 sm:px-5 sm:pb-5',
          open ? 'block' : 'hidden',
          desktopAlwaysOpen && 'lg:block lg:pt-4',
        )}
      >
        {children}
      </div>
    </section>
  );
};

export default SettingsSection;
