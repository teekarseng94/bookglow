import React from 'react';
import { cx } from './cx';

export interface FormSectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Grouped form block inside modal/sheet bodies.
 */
export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className,
}) => (
  <section className={cx('space-y-3', className)}>
    {(title || description) && (
      <div className="space-y-0.5">
        {title ? (
          <h3 className="text-app-label font-bold uppercase tracking-wide text-[var(--text-secondary)]">
            {title}
          </h3>
        ) : null}
        {description ? (
          <p className="text-xs text-[var(--text-muted)]">{description}</p>
        ) : null}
      </div>
    )}
    <div className="space-y-3">{children}</div>
  </section>
);

export default FormSection;
