import React from 'react';

interface PricingFeatureListProps {
  features: string[];
  /** When true uses brand-purple checks; otherwise uses a neutral muted check. */
  branded?: boolean;
}

const CheckIcon: React.FC<{ branded?: boolean }> = ({ branded }) => (
  <svg
    className={`pricing-feature-check ${branded ? 'pricing-feature-check--brand' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
  </svg>
);

const PricingFeatureList: React.FC<PricingFeatureListProps> = ({ features, branded = false }) => (
  <ul className="pricing-feature-list" role="list">
    {features.map((feature, i) => (
      <li key={i} className="pricing-feature-item">
        <CheckIcon branded={branded} />
        <span>{feature}</span>
      </li>
    ))}
  </ul>
);

export default PricingFeatureList;
