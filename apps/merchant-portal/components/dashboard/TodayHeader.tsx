import React from 'react';
import { cx } from '../ui/cx';

export interface TodayHeaderProps {
  title?: React.ReactNode;
  dateLabel?: React.ReactNode;
  actions?: React.ReactNode;
  /** Override the desktop h1 size — e.g. a personalized greeting reads better a little smaller than the default hero page title. */
  titleClassName?: string;
  className?: string;
}

export const TodayHeader: React.FC<TodayHeaderProps> = ({
  title = 'Today',
  dateLabel,
  actions,
  titleClassName,
  className,
}) => (
  <div className={cx(className)}>
    <div className="dashboard-mobile-topbar lg:hidden flex items-center justify-between gap-3" aria-label="Today overview">
      {dateLabel ? <p className="m-page-header-description min-w-0 text-[var(--text-secondary)]">{dateLabel}</p> : null}
      {actions ? <div className="dashboard-mobile-header-actions flex min-w-0 flex-1 items-center gap-2">{actions}</div> : null}
    </div>
    <div className="hidden lg:flex items-end justify-between gap-4 pb-2 border-b border-[var(--line)]">
      <div>
        <h1 className={cx('font-bold tracking-tight text-[var(--text-primary)]', titleClassName || 'ui-page-title')}>
          {title}
        </h1>
        {dateLabel ? <p className="ui-muted mt-0.5">{dateLabel}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  </div>
);

export default TodayHeader;
