import React from 'react';
import { Info } from 'lucide-react';
import { cx } from '../ui/cx';

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

const Sparkline: React.FC<{ points: number[]; strokeClassName: string }> = ({ points, strokeClassName }) => {
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
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-16 h-7 shrink-0" aria-hidden>
      <path d={path} fill="none" className={strokeClassName} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const DashboardKpiCards: React.FC<DashboardKpiCardsProps> = ({ cards, className }) => (
  <div className={cx('grid grid-cols-2 lg:grid-cols-4 gap-3', className)}>
    {cards.map((card) => (
      <div
        key={card.id}
        className="bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs p-4 flex flex-col gap-1.5"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-muted)]">{card.label}</span>
          <Info className="w-3.5 h-3.5 text-[var(--text-muted)]/70" aria-hidden />
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className={cx('text-xl font-bold tabular-nums leading-tight', card.valueToneClass || 'text-[var(--text-primary)]')}>
            {card.value}
          </p>
          {card.sparkline ? (
            <Sparkline points={card.sparkline} strokeClassName={card.valueToneClass ? card.valueToneClass.replace('text-', 'stroke-') : 'stroke-[var(--brand)]'} />
          ) : null}
        </div>
        {card.secondary ? (
          <p className={cx('text-xs', card.secondaryToneClass || 'text-[var(--text-muted)]')}>{card.secondary}</p>
        ) : null}
      </div>
    ))}
  </div>
);

export default DashboardKpiCards;
