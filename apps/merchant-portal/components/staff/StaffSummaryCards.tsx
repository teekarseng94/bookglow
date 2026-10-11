import React from 'react';
import { MetricRail } from '../ui/MetricRail';
import { cx } from '../ui/cx';

export interface StaffSummaryCardItem {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  emphasize?: boolean;
}

export interface StaffSummaryCardsProps {
  cards: StaffSummaryCardItem[];
  className?: string;
}

/**
 * Outlet-level KPIs. Phone/tablet: compact MetricRail. Desktop xl: richer cards.
 */
export const StaffSummaryCards: React.FC<StaffSummaryCardsProps> = ({ cards, className }) => (
  <div className={className}>
    <MetricRail
      className="xl:hidden"
      layout="rail"
      items={cards.map((card) => ({
        id: card.id,
        label: card.label,
        value: card.value,
      }))}
    />
    <div className="hidden xl:grid xl:grid-cols-5 xl:gap-3">
      {cards.map((card) => (
        <div
          key={card.id}
          className="min-w-0 rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] shadow-ui-xs px-4 py-3"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cx(
                'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                card.emphasize
                  ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                  : 'bg-[var(--brand-soft)] text-[var(--brand)]',
              )}
            >
              {card.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-staff-kpi-label whitespace-nowrap">{card.label}</p>
              <div className="mt-0.5 flex items-baseline gap-2 min-w-0">
                <p className="m-staff-kpi-value xl:text-xl tabular-nums text-[var(--text-primary)] shrink-0">
                  {card.value}
                </p>
                <p className="m-staff-kpi-hint truncate">{card.hint}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default StaffSummaryCards;
