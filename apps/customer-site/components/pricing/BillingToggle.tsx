import React from 'react';

interface BillingToggleProps {
  isAnnual: boolean;
  onToggle: () => void;
}

/**
 * Annual / monthly billing toggle.
 *
 * Keyboard-accessible — Space and Enter toggle the switch.
 * Uses Bookglow's brand purple for the active state.
 */
const BillingToggle: React.FC<BillingToggleProps> = ({ isAnnual, onToggle }) => (
  <div className="pricing-billing-toggle" role="group" aria-label="Billing frequency">
    <button
      type="button"
      role="switch"
      aria-checked={isAnnual}
      aria-label={isAnnual ? 'Annual billing enabled' : 'Monthly billing enabled'}
      onClick={onToggle}
      className={`pricing-toggle-track ${isAnnual ? 'pricing-toggle-track--active' : ''}`}
    >
      <span className={`pricing-toggle-thumb ${isAnnual ? 'pricing-toggle-thumb--active' : ''}`} />
    </button>
    <span className="pricing-toggle-label">Annual billing</span>
  </div>
);

export default BillingToggle;
