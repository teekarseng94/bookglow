import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, EyeOff, LayoutGrid } from 'lucide-react';
import { cx } from '../ui/cx';

export interface InventoryKpiCardsProps {
  totalItems: number;
  activeItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  hiddenItems: number;
  className?: string;
}

interface KpiDef {
  key: string;
  label: string;
  value: number;
  support: string;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  tone: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
}

const toneClass: Record<KpiDef['tone'], string> = {
  brand: 'bg-[var(--brand-soft)] text-[var(--brand)]',
  success: 'bg-[var(--success-soft,#e9f6f1)] text-[var(--success)]',
  warning: 'bg-[var(--warning-soft,#fff6dd)] text-[var(--warning)]',
  danger: 'bg-[var(--danger-soft,#fff0f3)] text-[var(--danger)]',
  neutral: 'bg-[var(--bg-soft)] text-[var(--text-secondary)]',
};

export const InventoryKpiCards: React.FC<InventoryKpiCardsProps> = ({
  totalItems,
  activeItems,
  lowStockItems,
  outOfStockItems,
  hiddenItems,
  className,
}) => {
  const activePct = totalItems > 0 ? Math.round((activeItems / totalItems) * 1000) / 10 : 0;

  const cards: KpiDef[] = [
    {
      key: 'total',
      label: 'Total Items',
      value: totalItems,
      support: 'All services, products & packages',
      Icon: LayoutGrid,
      tone: 'brand',
    },
    {
      key: 'active',
      label: 'Active Items',
      value: activeItems,
      support: `${activePct}% of total items`,
      Icon: CheckCircle2,
      tone: 'success',
    },
    {
      key: 'low-stock',
      label: 'Low Stock',
      value: lowStockItems,
      support: 'Require attention',
      Icon: AlertTriangle,
      tone: 'warning',
    },
    {
      key: 'out-of-stock',
      label: 'Out of Stock',
      value: outOfStockItems,
      support: 'Unavailable items',
      Icon: XCircle,
      tone: 'danger',
    },
    {
      key: 'hidden',
      label: 'Hidden Items',
      value: hiddenItems,
      support: 'Not visible to customers',
      Icon: EyeOff,
      tone: 'neutral',
    },
  ];

  return (
    <div className={cx('grid grid-cols-2 lg:grid-cols-5 gap-3', className)}>
      {cards.map(({ key, label, value, support, Icon, tone }) => (
        <div
          key={key}
          className="rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] p-4 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="m-inventory-count-row text-[var(--text-muted)] font-semibold">{label}</span>
            <span className={cx('inline-flex items-center justify-center w-8 h-8 rounded-full shrink-0', toneClass[tone])}>
              <Icon className="w-4 h-4" aria-hidden />
            </span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums leading-none">{value}</p>
          <p className="text-xs text-[var(--text-muted)] leading-snug">{support}</p>
        </div>
      ))}
    </div>
  );
};

export default InventoryKpiCards;
