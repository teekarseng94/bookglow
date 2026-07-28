import React from 'react';
import { cx } from '../ui/cx';

export interface PlatformPageHeaderProps {
  title: string;
  description?: string;
  meta?: React.ReactNode;
  className?: string;
}

/** Dark-theme header for Super Admin — visually distinct from merchant pages. */
export const PlatformPageHeader: React.FC<PlatformPageHeaderProps> = ({
  title,
  description,
  meta,
  className,
}) => (
  <header className={cx('space-y-1 pb-4 border-b border-slate-800', className)}>
    <p className="m-caption font-bold uppercase tracking-widest text-emerald-400/90">
      Bookglow Platform
    </p>
    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{title}</h1>
    {description ? <p className="text-sm text-slate-400 max-w-2xl">{description}</p> : null}
    {meta ? <div className="pt-2">{meta}</div> : null}
  </header>
);

export default PlatformPageHeader;
