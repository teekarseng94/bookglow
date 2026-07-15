import React from 'react';
import { StatusBadge } from '../ui/StatusBadge';
import { IconButton } from '../ui/IconButton';
import { cx } from '../ui/cx';

export interface MemberRowProps {
  name: string;
  phoneOrId: string;
  membershipLabel?: string;
  balanceOrActivity: string;
  secondaryMeta?: string;
  highlighted?: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  className?: string;
}

/**
 * Compact member list row: name, phone/id, membership/status, one useful balance/activity value.
 */
export const MemberRow: React.FC<MemberRowProps> = ({
  name,
  phoneOrId,
  membershipLabel,
  balanceOrActivity,
  secondaryMeta,
  highlighted,
  onSelect,
  onEdit,
  className,
}) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onSelect}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect();
      }
    }}
    className={cx(
      'w-full rounded-ui-md border shadow-ui-xs p-2.5 sm:p-3 flex items-center gap-3 text-left cursor-pointer transition-colors',
      'focus-visible:shadow-ui-focus-strong',
      highlighted
        ? 'bg-amber-50/80 border-amber-300 hover:bg-amber-100/80'
        : 'bg-[var(--bg-surface)] border-[var(--line)] hover:bg-[var(--bg-soft)]',
      className,
    )}
  >
    <div
      className={cx(
        'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm shrink-0',
        highlighted ? 'bg-amber-200 text-amber-800' : 'bg-[var(--bg-soft)] text-[var(--text-secondary)]',
      )}
    >
      {(name || '?').charAt(0)}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="font-bold text-sm text-[var(--text-primary)] truncate">{name}</p>
          {membershipLabel ? (
            <StatusBadge tone="warning" className="shrink-0">
              {membershipLabel}
            </StatusBadge>
          ) : null}
        </div>
        <span className="shrink-0 text-xs font-semibold text-[var(--success)] tabular-nums">
          {balanceOrActivity}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[var(--text-muted)] min-w-0">
        <span className="shrink-0">{phoneOrId}</span>
        {secondaryMeta ? <span className="truncate">· {secondaryMeta}</span> : null}
      </div>
    </div>
    {onEdit ? (
      <div onClick={(e) => e.stopPropagation()}>
        <IconButton label={`Edit ${name}`} size="sm" onClick={onEdit}>
          ✎
        </IconButton>
      </div>
    ) : null}
  </div>
);

export default MemberRow;
