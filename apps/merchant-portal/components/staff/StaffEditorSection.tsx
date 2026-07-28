import React from 'react';
import { cx } from '../ui/cx';

export interface StaffEditorSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/** Labeled editor block — presentation only. */
export const StaffEditorSection: React.FC<StaffEditorSectionProps> = ({
  title,
  description,
  children,
  className,
}) => (
  <section className={cx('space-y-3 border-t border-[var(--line)] pt-4 first:border-t-0 first:pt-0', className)}>
    <div>
      <h4 className="m-settings-label uppercase tracking-widest text-[var(--text-muted)]">
        {title}
      </h4>
      {description ? (
        <p className="m-settings-hint mt-0.5">{description}</p>
      ) : null}
    </div>
    {children}
  </section>
);

export default StaffEditorSection;
