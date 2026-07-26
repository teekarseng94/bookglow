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
  shiftLabel,
  contextLabel,
  selected,
  onSelect,
  className,
}) => {
  const initial = (name || '?').charAt(0).toUpperCase();
  const hasStats = Boolean(revenueLabel || commissionLabel || shiftLabel);

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
        'px-3.5 py-3.5 rounded-ui-md border cursor-pointer transition-all',
        selected
          ? 'bg-[var(--brand-soft)] border-[var(--brand)] shadow-ui-xs ring-1 ring-[var(--brand)]/20'
          : 'bg-[var(--bg-surface)] border-[var(--line)] hover:border-[var(--brand-border)] shadow-ui-xs xl:shadow-none',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden bg-[var(--brand-soft)] text-[var(--brand-deep)]">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <span
            className={cx(
              'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white',
              status === 'earning' || status === 'active' ? 'bg-emerald-500' : 'bg-slate-300',
            )}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-bold text-sm truncate leading-tight text-[var(--text-primary)]">
                  {name}
                </p>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-[var(--brand-soft)] text-[var(--brand-deep)]">
                  {role}
                </span>
              </div>
              {metaSecondary ? (
                <p className="mt-1 text-[11px] font-medium text-[var(--text-secondary)] truncate">
                  {metaSecondary}
                </p>
              ) : null}
            </div>
            <span className="text-[var(--text-muted)] text-base leading-none shrink-0 mt-0.5" aria-hidden>
              ›
            </span>
          </div>

          {hasStats ? (
            <div className="mt-2.5 grid grid-cols-3 gap-2 pt-2 border-t border-[var(--line)]">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                  Today
                </p>
                <p className="text-[11px] font-bold text-[var(--text-primary)] truncate">
                  {shiftLabel ?? '—'}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                  Commission
                </p>
                <p className="text-[11px] font-bold tabular-nums text-[var(--brand)] truncate">
                  {commissionLabel ?? revenueLabel ?? '—'}
                </p>
              </div>
              <div className="min-w-0 flex flex-col items-start gap-0.5">
                <p className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                  Status
                </p>
                <StaffStatusBadge status={status} />
              </div>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StaffStatusBadge status={status} />
              {contextLabel ? (
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] truncate">
                  {contextLabel}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffCard;
