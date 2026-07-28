import React from 'react';

interface PlatformMetricCardProps {
  label: string;
  value: React.ReactNode;
  hint: string;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
  icon?: React.ReactNode;
}

const toneClasses = {
  brand: 'bg-[var(--brand-soft)] text-[var(--brand)]',
  success: 'bg-[var(--success-soft)] text-[var(--success)]',
  warning: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
  neutral: 'bg-[var(--bg-soft)] text-[var(--text-secondary)]',
};

export const PlatformMetricCard: React.FC<PlatformMetricCardProps> = ({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
}) => (
  <article className="rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] p-4 shadow-ui-xs">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-app-label font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text-primary)]">{value}</p>
      </div>
      {icon ? (
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-ui-md ${toneClasses[tone]}`}>
          {icon}
        </span>
      ) : null}
    </div>
    <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{hint}</p>
  </article>
);

