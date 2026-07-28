import React from 'react';
import { StaffEditorSection } from './StaffEditorSection';
<<<<<<< HEAD

export interface StaffPermissionSectionProps {
  roleLabel: string;
  children?: React.ReactNode;
}

/**
 * Permissions presentation for the assigned role.
 * Does not invent per-staff permission fields — reflects existing role assignment.
 */
export const StaffPermissionSection: React.FC<StaffPermissionSectionProps> = ({
  roleLabel,
  children,
}) => (
  <StaffEditorSection
    title="Permissions"
    description="Feature access follows outlet mode and the assigned role. Locks are managed in Settings."
  >
    {children ?? (
      <div className="rounded-ui-sm border border-[var(--line)] bg-[var(--bg-soft)] px-3 py-2.5 text-xs text-[var(--text-secondary)]">
        Assigned role: <span className="font-bold text-[var(--text-primary)]">{roleLabel || '—'}</span>
      </div>
    )}
  </StaffEditorSection>
);
=======
import {
  STAFF_PERMISSION_DEFS,
  normalizeStaffPermissions,
  permissionsSummary,
  type StaffPermissions,
} from '../../utils/staffExtras';
import { cx } from '../ui/cx';

export interface StaffPermissionSectionProps {
  roleLabel: string;
  permissions?: Partial<StaffPermissions> | null;
  onChange?: (permissions: StaffPermissions) => void;
  readOnly?: boolean;
  children?: React.ReactNode;
}

export const StaffPermissionSection: React.FC<StaffPermissionSectionProps> = ({
  roleLabel,
  permissions,
  onChange,
  readOnly,
  children,
}) => {
  const editable = Boolean(onChange) && !readOnly;
  const resolved = normalizeStaffPermissions(permissions, roleLabel);

  const toggle = (key: keyof StaffPermissions) => {
    if (!onChange) return;
    onChange({ ...resolved, [key]: !resolved[key] });
  };

  return (
    <StaffEditorSection
      title="Permissions"
      description={
        editable
          ? 'Capabilities for this staff profile. Outlet Settings locks still apply for the signed-in session until staff are linked to login accounts.'
          : 'Capabilities recorded for this staff profile.'
      }
    >
      {children}
      <p className="text-xs text-[var(--text-secondary)] mb-3">
        Role: <span className="font-bold text-[var(--text-primary)]">{roleLabel || '—'}</span>
        {!editable ? (
          <span className="block mt-1 text-[var(--text-muted)]">{permissionsSummary(resolved)}</span>
        ) : null}
      </p>
      <div className="space-y-2">
        {STAFF_PERMISSION_DEFS.map((def) => {
          const allowed = resolved[def.key];
          return (
            <button
              key={def.key}
              type="button"
              disabled={!editable}
              onClick={() => toggle(def.key)}
              className={cx(
                'w-full flex items-center justify-between gap-3 rounded-ui-sm border px-3 py-2.5 text-left transition-colors',
                allowed
                  ? 'border-emerald-200 bg-emerald-50/60'
                  : 'border-[var(--line)] bg-[var(--bg-soft)]',
                editable && 'hover:border-[var(--brand-border)] cursor-pointer',
                !editable && 'cursor-default',
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)]">{def.label}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{def.description}</p>
              </div>
              <span
                className={cx(
                  'shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full',
                  allowed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600',
                )}
              >
                {allowed ? 'Allowed' : 'No'}
              </span>
            </button>
          );
        })}
      </div>
    </StaffEditorSection>
  );
};
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda

export default StaffPermissionSection;
