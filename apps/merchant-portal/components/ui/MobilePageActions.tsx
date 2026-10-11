import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { AppSheet } from './AppSheet';
import { IconButton } from './IconButton';
import { cx } from './cx';

export interface MobilePageOverflowItem {
  id: string;
  label: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export interface MobilePageActionsProps {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  overflow?: React.ReactNode;
  overflowItems?: MobilePageOverflowItem[];
  overflowLabel?: string;
  /** Hide at the desktop shell breakpoint (1024+). */
  hideOnDesktop?: boolean;
  className?: string;
}

/**
 * Compact phone/tablet page actions. Content-width controls, never 50% hero buttons.
 */
export const MobilePageActions: React.FC<MobilePageActionsProps> = ({
  primary,
  secondary,
  overflow,
  overflowItems,
  overflowLabel = 'More actions',
  hideOnDesktop = true,
  className,
}) => {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const hasOverflow = Boolean(overflow) || Boolean(overflowItems && overflowItems.length > 0);

  return (
    <div className={cx('m-page-actions', hideOnDesktop && 'lg:hidden', className)}>
      {secondary ? <div className="m-page-actions__secondary">{secondary}</div> : null}
      <div className="m-page-actions__primary">{primary}</div>
      {hasOverflow ? (
        <div className="m-page-actions__overflow">
          <IconButton
            label={overflowLabel}
            variant="outline"
            size="md"
            aria-haspopup="dialog"
            aria-expanded={overflowOpen}
            onClick={() => setOverflowOpen(true)}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden />
          </IconButton>
          <AppSheet
            open={overflowOpen}
            onClose={() => setOverflowOpen(false)}
            title={overflowLabel}
            side="bottom"
            showHandle
          >
            {overflow}
            {overflowItems?.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                className="m-page-actions__overflow-item flex w-full min-h-11 items-center rounded-ui-sm px-3 text-left text-sm font-semibold text-[var(--text-primary)] disabled:opacity-50"
                onClick={() => {
                  item.onClick();
                  setOverflowOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </AppSheet>
        </div>
      ) : null}
    </div>
  );
};

export default MobilePageActions;
