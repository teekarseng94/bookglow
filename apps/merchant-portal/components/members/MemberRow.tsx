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
 * Compact member list row: avatar | name + full phone | points + chevron.
 * Whole row is tappable.
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
      'm-entity-row m-card-interactive w-full flex items-center text-left cursor-pointer transition-colors',
      'focus-visible:shadow-ui-focus-strong',
      'm-member-row',
      'md:rounded-ui-md md:border md:shadow-ui-xs md:p-3 md:gap-3 md:min-h-0',
      highlighted
        ? 'bg-amber-50/80 border border-amber-300 hover:bg-amber-100/80'
        : 'bg-[var(--bg-surface)] border border-[var(--line)] hover:bg-[var(--bg-soft)]',
      className,
    )}
  >
    <div
      className={cx(
        'm-member-avatar rounded-full flex items-center justify-center font-semibold border-2 border-white shadow-sm shrink-0',
        'md:w-10 md:h-10 md:text-sm md:font-bold',
        highlighted ? 'bg-amber-200 text-amber-800' : 'bg-[var(--brand-soft)] text-[var(--brand)]',
      )}
    >
      {(name || '?').charAt(0)}
    </div>

    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <p className="m-member-name truncate text-[var(--text-primary)]">{name}</p>
        {membershipLabel ? (
          <StatusBadge tone="warning" className="shrink-0">
            {membershipLabel}
          </StatusBadge>
        ) : null}
      </div>
      <p className="m-member-phone text-[var(--text-muted)] whitespace-nowrap" title={phoneOrId}>
        {phoneOrId || '—'}
      </p>
      {secondaryMeta ? (
        <p className="m-caption text-[var(--text-muted)] truncate hidden sm:block mt-0.5">
          {secondaryMeta}
        </p>
      ) : null}
    </div>

    <div className="shrink-0 flex items-center gap-1 pl-2">
      <span className="m-member-points text-[var(--success)] tabular-nums whitespace-nowrap">
        {balanceOrActivity}
      </span>
      <svg
        className="m-member-chevron text-[var(--text-muted)] sm:hidden"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      {onEdit ? (
        <div className="hidden sm:block" onClick={(e) => e.stopPropagation()}>
          <IconButton label={`Edit ${name}`} size="sm" onClick={onEdit}>
            ✎
          </IconButton>
        </div>
      ) : null}
    </div>
  </div>
);

export default MemberRow;
