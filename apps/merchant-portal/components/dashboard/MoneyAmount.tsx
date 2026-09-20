import React from 'react';
import { cx } from '../ui/cx';

export interface MoneyAmountProps {
  value: string;
  className?: string;
}

/** Keeps `.xx` attached to the last numeric group so amounts never wrap as `567.` / `89`. */
export const MoneyAmount: React.FC<MoneyAmountProps> = ({ value, className }) => {
  const match = value.match(/^(.*?)(\d{1,3}\.\d{2})$/);
  if (!match) {
    return <span className={cx('dashboard-money min-w-0 tabular-nums', className)}>{value}</span>;
  }
  return (
    <span className={cx('dashboard-money min-w-0 tabular-nums', className)} title={value}>
      {match[1]}
      <span className="dashboard-money__tail">{match[2]}</span>
    </span>
  );
};

export default MoneyAmount;
