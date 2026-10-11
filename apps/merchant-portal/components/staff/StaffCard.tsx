import React from 'react';
import { StaffStatusBadge, type StaffStatusKind } from './StaffStatusBadge';
import { cx } from '../ui/cx';

export interface StaffCardProps {
  name: string;
  role: string;
  photoUrl?: string | null;
  status?: StaffStatusKind;
  /** Compact specialty / services line */
  metaSecondary?: string;
  /** Period revenue amount (display string) */
  revenueLabel?: string;
  /** Period commission amount (display string) */
  commissionLabel?: string;
  /** Today's shift label */
  shiftLabel?: string;
  /** Fallback single-line context when stats not provided */
  contextLabel?: string;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

/** Directory row: avatar, identity, status, period stats, chevron. */
export const StaffCard: React.FC<StaffCardProps> = ({
  name,
  role,
  photoUrl,
  status = 'active',
  metaSecondary,
  revenueLabel,
  commissionLabel,
  contextLabel,
  selected,
  onSelect,
  className,
}) => {
  const initial = (name || '?').charAt(0).toUpperCase();
  const hasStats = Boolean(revenueLabel || commissionLabel);

  return (
    <div
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      className={cx(
        'm-staff-card m-list-row m-entity-row m-card-interactive rounded-ui-md border cursor-pointer transition-all',
        selected
          ? 'bg-[var(--brand-soft)] border-[var(--brand)] shadow-ui-xs ring-1 ring-[var(--brand)]/20'
          : 'bg-[var(--bg-surface)] border-[var(--line)] hover:border-[var(--brand-border)] shadow-ui-xs xl:shadow-none',
        className,
      )}
    >
      <div className="flex w-full min-w-0 items-center gap-3">
        <div className="relative shrink-0">
          <div className="m-staff-avatar rounded-full flex items-center justify-center overflow-hidden bg-[var(--brand-soft)] text-[var(--brand-deep)]">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <span
            className={cx(
              'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white',
              status === 'earning' || status === 'active' ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]',
            )}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="m-staff-card__name truncate text-[var(--text-primary)]">{name}</p>
          <p className="m-staff-card__meta mt-0.5 truncate">
            <span className="m-staff-card__role">{role}</span>
            {metaSecondary ? ` · ${metaSecondary}` : ''}
            {!hasStats && contextLabel ? ` · ${contextLabel}` : ''}
          </p>
        </div>

        {commissionLabel || revenueLabel ? (
          <p className="m-staff-stat-value shrink-0 tabular-nums text-[var(--success)]">
            {commissionLabel ?? revenueLabel}
          </p>
        ) : (
          <StaffStatusBadge status={status} />
        )}
        <span className="shrink-0 text-base leading-none text-[var(--text-muted)]" aria-hidden>
          ›
        </span>
      </div>
    </div>
  );
};

export default StaffCard;
