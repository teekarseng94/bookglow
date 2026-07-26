import React, { useState } from 'react';
import { RoleCommission } from '../../types';
import { Button } from '../ui/Button';
import { StaffDialogShell } from './StaffDialogShell';
import { cx } from '../ui/cx';

const fieldClass =
  'w-full min-h-[44px] px-3 py-2.5 text-sm bg-[var(--bg-soft)] border border-[var(--line)] rounded-ui-sm outline-none focus:ring-2 focus:ring-[var(--brand)] text-[var(--text-primary)] font-medium';

export interface StaffRolesModalProps {
  open: boolean;
  onClose: () => void;
  roleCommissions: RoleCommission[];
  onAddRole: (e: React.FormEvent) => void;
  onUpdateRate: (role: string, rate: number) => void;
  onDeleteRole: (role: string) => void;
  newRoleName: string;
  newRoleRate: number;
  onNewRoleNameChange: (value: string) => void;
  onNewRoleRateChange: (value: number) => void;
  locked?: boolean;
}

export const StaffRolesModal: React.FC<StaffRolesModalProps> = ({
  open,
  onClose,
  roleCommissions,
  onAddRole,
  onUpdateRate,
  onDeleteRole,
  newRoleName,
  newRoleRate,
  onNewRoleNameChange,
  onNewRoleRateChange,
  locked,
}) => {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <StaffDialogShell
      open={open}
      title="Role & Commission Settings"
      onClose={onClose}
      zIndexClass="z-[80]"
      footer={
        <div className="flex justify-end">
          <Button type="button" variant="primary" className="w-full sm:w-auto min-h-[44px]" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Commission rates apply to services marked commissionable. Rates save as you edit.
        </p>

        {/* Existing roles — compact rows */}
        <section className="space-y-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            Existing roles
          </h3>
          {roleCommissions.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-4 text-center border border-dashed border-[var(--line)] rounded-ui-md">
              No roles yet. Create one below.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--line)] rounded-ui-md border border-[var(--line)] overflow-hidden">
              {roleCommissions.map((rc) => (
                <li
                  key={rc.role}
                  className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 bg-[var(--bg-surface)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">{rc.role}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={locked}
                      className={cx(fieldClass, 'w-[4.5rem] text-center font-bold text-[var(--brand)]')}
                      value={rc.rate}
                      onChange={(e) => onUpdateRate(rc.role, parseFloat(e.target.value) || 0)}
                      aria-label={`${rc.role} commission percent`}
                    />
                    <span className="text-xs font-bold text-[var(--text-muted)] w-4">%</span>
                  </div>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => onDeleteRole(rc.role)}
                    className="min-w-[40px] min-h-[40px] rounded-ui-sm text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-rose-50 disabled:opacity-40"
                    aria-label={`Delete role ${rc.role}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Create new role — collapsible */}
        <section className="rounded-ui-md border border-[var(--line)] overflow-hidden">
          <button
            type="button"
            onClick={() => setCreateOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-3 py-3 text-left hover:bg-[var(--bg-soft)]"
          >
            <span className="text-sm font-bold text-[var(--text-primary)]">Create new role</span>
            <span className="text-[var(--text-muted)] text-lg leading-none" aria-hidden>
              {createOpen ? '−' : '+'}
            </span>
          </button>
          {createOpen ? (
            <form
              onSubmit={(e) => {
                onAddRole(e);
              }}
              className="px-3 pb-3 space-y-3 border-t border-[var(--line)] pt-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_7rem_auto] gap-2">
                <input
                  type="text"
                  placeholder="Role name (e.g. Master)"
                  disabled={locked}
                  className={fieldClass}
                  value={newRoleName}
                  onChange={(e) => onNewRoleNameChange(e.target.value)}
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    placeholder="%"
                    disabled={locked}
                    className={cx(fieldClass, 'text-center font-bold')}
                    value={newRoleRate || ''}
                    onChange={(e) => onNewRoleRateChange(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-xs font-bold text-[var(--text-muted)]">%</span>
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={locked || !newRoleName.trim()}
                  className="min-h-[44px] w-full sm:w-auto"
                >
                  Add Role
                </Button>
              </div>
            </form>
          ) : null}
        </section>
      </div>
    </StaffDialogShell>
  );
};

export default StaffRolesModal;
