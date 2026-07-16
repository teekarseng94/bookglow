import React from 'react';
import { PageHeader } from '../ui/PageHeader';
import { cx } from '../ui/cx';

export interface TodayHeaderProps {
  title?: string;
  dateLabel: string;
  actions?: React.ReactNode;
  className?: string;
}

export const TodayHeader: React.FC<TodayHeaderProps> = ({
  title = 'Today',
  dateLabel,
  actions,
  className,
}) => (
  <div className={cx(className)}>
    <PageHeader
      className="lg:hidden border-b-0 pb-0"
      title={title}
      description={dateLabel}
      actions={actions}
    />
    <div className="hidden lg:flex items-end justify-between gap-4 pb-2 border-b border-[var(--line)]">
      <div>
        <h1 className="ui-page-title">{title}</h1>
        <p className="ui-muted mt-0.5">{dateLabel}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  </div>
);

export default TodayHeader;
