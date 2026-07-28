import React from 'react';
import { cx } from '../ui/cx';

export interface PlatformPageHeaderProps {
  title: string;
  description?: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Dark-theme header for Super Admin — visually distinct from merchant pages. */
export const PlatformPageHeader: React.FC<PlatformPageHeaderProps> = ({
  title,
  description,
  meta,
  action,
  className,
}) => (
  <header className={cx('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
    <div>
      <p className="m-caption font-bold uppercase tracking-widest text-[var(--brand)]">Bookglow Platform</p>
      <h1 className="mt-1 text-app-page font-bold tracking-tight text-[var(--text-primary)]">{title}</h1>
      {description ? <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">{description}</p> : null}
      {meta ? <div className="pt-2">{meta}</div> : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </header>
);

export default PlatformPageHeader;
