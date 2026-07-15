import React from 'react';
import { IconButton } from '../ui/IconButton';
import { StaffStatusBadge, type StaffStatusKind } from './StaffStatusBadge';
import { cx } from '../ui/cx';

export interface StaffCardProps {
  name: string;
  role: string;
  photoUrl?: string | null;
  status?: StaffStatusKind;
  contextLabel: string;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  actionsDisabled?: boolean;
  className?: string;
}

/** Dense roster card: photo/initials, name, role, status, work context, actions. */
export const StaffCard: React.FC<StaffCardProps> = ({
  name,
  role,
  photoUrl,
  status = 'active',
  contextLabel,
  selected,
  onSelect,
  onEdit,
  onDelete,
  actionsDisabled,
  className,
}) => {
  const initial = (name || '?').charAt(0).toUpperCase();
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
        'p-3 sm:p-4 rounded-ui-md border cursor-pointer transition-all group',
        selected
          ? 'bg-[var(--brand)] text-white border-transparent shadow-ui-sm'
          : 'bg-[var(--bg-surface)] border-[var(--line)] text-[var(--text-primary)] hover:border-[var(--brand)]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cx(
            'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden shrink-0',
            selected ? 'bg-white/20' : 'bg-[var(--brand-soft)] text-[var(--brand-deep)]',
          )}
        >
          {photoUrl ? (
            <img src={photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-sm truncate leading-tight">{name}</p>
              <p
                className={cx(
                  'text-[10px] uppercase font-black tracking-wider mt-0.5',
                  selected ? 'text-white/70' : 'text-[var(--text-muted)]',
                )}
              >
                {role}
              </p>
            </div>
            {!actionsDisabled && (onEdit || onDelete) ? (
              <div
                className="flex gap-0.5 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                {onEdit ? (
                  <IconButton
                    label={`Edit ${name}`}
                    size="sm"
                    className={selected ? 'text-white hover:bg-white/10' : undefined}
                    onClick={onEdit}
                  >
                    ✎
                  </IconButton>
                ) : null}
                {onDelete ? (
                  <IconButton
                    label={`Delete ${name}`}
                    size="sm"
                    className={selected ? 'text-white hover:bg-white/10' : undefined}
                    onClick={onDelete}
                  >
                    ×
                  </IconButton>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StaffStatusBadge
              status={status}
              className={selected ? 'bg-white/15 text-white border-white/20' : undefined}
            />
            <span
              className={cx(
                'text-[11px] font-semibold truncate',
                selected ? 'text-white/80' : 'text-[var(--text-secondary)]',
              )}
            >
              {contextLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffCard;
