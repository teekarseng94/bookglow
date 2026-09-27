import React from 'react';
import { cx } from '../ui/cx';
import { MoneyAmount } from './MoneyAmount';

export interface DashboardKpiCard {
  id: string;
  label: string;
  value: string;
  secondary?: string;
  valueToneClass?: string;
  secondaryToneClass?: string;
  /** Optional real weekly series (e.g. reusing the already-computed chart data) — no fabricated points. */
  sparkline?: number[];
}

export interface DashboardKpiCardsProps {
  cards: DashboardKpiCard[];
  className?: string;
}

const Sparkline: React.FC<{ points: number[] }> = ({ points }) => {
  if (points.length < 2) return null;
  const max = Math.max(...points, 0);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const width = 100;
  const height = 28;
  const step = width / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(height - ((p - min) / range) * height).toFixed(1)}`)
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="dashboard-kpi-sparkline h-5 w-12 shrink-0 sm:h-7 sm:w-16"
      aria-hidden
    >
      <path d={path} fill="none" className="stroke-[var(--brand)]" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const DashboardKpiCards: React.FC<DashboardKpiCardsProps> = ({ cards, className }) => (
  <div
    className={cx(
      'grid grid-cols-2 items-start gap-2 lg:grid-cols-4 lg:gap-3',
      className,
    )}
    role="region"
    aria-label="Business performance"
  >
    {cards.map((card) => {
      const labelId = `kpi-${card.id}-label`;
      return (
        <article
          key={card.id}
          aria-labelledby={labelId}
          className={cx(
            'dashboard-kpi-card m-card flex h-full min-w-0 flex-col gap-1 rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] shadow-ui-xs',
          )}
        >
          <p id={labelId} className="m-caption font-semibold text-[var(--text-secondary)]">
            {card.label}
          </p>
          <div className="flex min-w-0 items-end justify-between gap-2">
            <MoneyAmount
              value={card.value}
              className={cx(
                'dashboard-kpi-value font-bold leading-tight',
                card.valueToneClass || 'text-[var(--text-primary)]',
              )}
            />
            {card.sparkline ? <Sparkline points={card.sparkline} /> : null}
          </div>
          {card.secondary ? (
            <p
              className={cx(
                'm-caption leading-snug text-[var(--text-secondary)] [overflow-wrap:anywhere]',
                card.secondaryToneClass,
              )}
            >
              {card.secondary}
            </p>
          ) : null}
        </article>
      );
    })}
  </div>
);

export default DashboardKpiCards;
