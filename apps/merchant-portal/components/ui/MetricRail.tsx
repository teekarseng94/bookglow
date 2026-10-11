import React from 'react';
import { cx } from './cx';

export interface MetricRailItem {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
}

export interface MetricRailProps {
  items: MetricRailItem[];
  /** grid = 2-column phone metrics. rail = horizontal scroller. */
  layout?: 'grid' | 'rail';
  className?: string;
}

/**
 * Compact KPI strip for phone/tablet. Prefer this over stacked full-width KPI cards.
 */
export const MetricRail: React.FC<MetricRailProps> = ({ items, layout = 'grid', className }) => {
  if (items.length === 0) return null;

  return (
    <div className={cx(layout === 'rail' ? 'm-metric-rail--rail' : 'm-metric-rail--grid', className)}>
      {items.map((item) => (
        <div key={item.id} className="m-metric-item">
          <span className="m-metric-item__label">{item.label}</span>
          <span className="m-metric-item__value">{item.value}</span>
          {item.hint ? <span className="m-metric-item__hint">{item.hint}</span> : null}
        </div>
      ))}
    </div>
  );
};

export default MetricRail;
