import React from 'react';
import { StaffEditorSection } from './StaffEditorSection';

export interface StaffScheduleSectionProps {
  children?: React.ReactNode;
}

/**
 * Schedule / availability presentation.
 * No new schedule fields — shows existing outlet-hours guidance unless parent passes content.
 */
export const StaffScheduleSection: React.FC<StaffScheduleSectionProps> = ({ children }) => (
  <StaffEditorSection
    title="Schedule"
    description="Working hours follow outlet operating hours. Per-staff schedules are not edited here."
  >
    {children ?? (
      <div className="rounded-ui-sm border border-[var(--line)] bg-[var(--bg-soft)] px-3 py-2.5 text-xs text-[var(--text-secondary)]">
        Manage outlet hours in Settings → Operating hours.
      </div>
    )}
  </StaffEditorSection>
);

export default StaffScheduleSection;
