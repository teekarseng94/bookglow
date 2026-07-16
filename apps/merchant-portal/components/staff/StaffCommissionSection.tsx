import React from 'react';
import { Button } from '../ui/Button';
import { StaffEditorSection } from './StaffEditorSection';

export interface StaffCommissionSectionProps {
  roleLabel: string;
  ratePercent?: number | null;
  onManageRates?: () => void;
  manageDisabled?: boolean;
  children?: React.ReactNode;
}

/**
 * Commission presentation for the staff member's role rate.
 * Parent supplies rate from existing roleCommissions — no new calc.
 */
export const StaffCommissionSection: React.FC<StaffCommissionSectionProps> = ({
  roleLabel,
  ratePercent,
  onManageRates,
  manageDisabled,
  children,
}) => (
  <StaffEditorSection
    title="Commission"
    description="Service commissions use the role rate. Product lines may use a fixed amount at sale time."
  >
    {children ?? (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-ui-sm border border-[var(--line)] bg-[var(--bg-soft)] px-3 py-2.5">
        <div className="text-xs text-[var(--text-secondary)]">
          <span className="font-bold text-[var(--text-primary)]">{roleLabel || '—'}</span>
          {typeof ratePercent === 'number' ? (
            <span className="ml-2 tabular-nums">{ratePercent}% rate</span>
          ) : (
            <span className="ml-2">No rate set</span>
          )}
        </div>
        {onManageRates ? (
          <Button type="button" variant="secondary" size="sm" onClick={onManageRates} disabled={manageDisabled}>
            Role Rates
          </Button>
        ) : null}
      </div>
    )}
  </StaffEditorSection>
);

export default StaffCommissionSection;
