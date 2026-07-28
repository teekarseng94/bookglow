import React from 'react';

interface PlatformSectionProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const PlatformSection: React.FC<PlatformSectionProps> = ({
  title,
  description,
  action,
  children,
  className = '',
}) => (
  <section className={`rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] shadow-ui-xs ${className}`}>
    <header className="flex flex-col gap-3 border-b border-[var(--line)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-app-section font-bold text-[var(--text-primary)]">{title}</h2>
        {description ? <p className="mt-1 text-xs text-[var(--text-secondary)]">{description}</p> : null}
      </div>
      {action}
    </header>
    {children}
  </section>
);

