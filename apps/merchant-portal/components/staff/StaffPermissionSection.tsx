import React from 'react';
import { StaffEditorSection } from './StaffEditorSection';

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

export default StaffPermissionSection;
