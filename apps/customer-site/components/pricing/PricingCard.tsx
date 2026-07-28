import React from 'react';
import { Button } from '../Button';
import BillingToggle from './BillingToggle';
import PricingFeatureList from './PricingFeatureList';
import type { PricingPlan } from './pricingData';

interface PricingCardProps {
  plan: PricingPlan;
  isAnnual: boolean;
  onToggleBilling?: () => void;
}

/**
 * Individual pricing card.
 *
 * - Featured (Pro) cards receive a purple border, "Most popular" badge,
 *   and the billing toggle.
 * - Free cards use a neutral border with less visual prominence.
 */
const PricingCard: React.FC<PricingCardProps> = ({ plan, isAnnual, onToggleBilling }) => {
  const isFeatured = plan.featured;
  const displayPrice = isFeatured && plan.monthlyPrice ? (isAnnual ? plan.price : plan.monthlyPrice) : plan.price;

  return (
    <div
      className={`pricing-card ${isFeatured ? 'pricing-card--featured' : 'pricing-card--default'}`}
      id={`pricing-card-${plan.id}`}
    >
      {/* "Most popular" badge for featured plan */}
      {isFeatured && (
        <span className="pricing-card__badge" aria-label="Recommended plan">
          Most popular
        </span>
      )}

      {/* Card header */}
      <div className="pricing-card__header">
        <h2 className="pricing-card__title">{plan.headline}</h2>
        <p className="pricing-card__description">{plan.description}</p>
      </div>

      {/* Price block */}
      <div className="pricing-card__price-block">
        <span className="pricing-card__currency">RM</span>
        <span className="pricing-card__amount">{displayPrice}</span>
        <div className="pricing-card__price-meta">
          {isFeatured && isAnnual && (
            <span className="pricing-card__discount">Save 20%</span>
          )}
          <span className="pricing-card__suffix">{plan.priceSuffix}</span>
        </div>
      </div>

      {/* Billing toggle (Pro only) */}
      {isFeatured && onToggleBilling && (
        <BillingToggle isAnnual={isAnnual} onToggle={onToggleBilling} />
      )}

      {/* Spacer for Free card to align CTA with Pro */}
      {!isFeatured && <div className="pricing-card__toggle-spacer" />}

      {/* CTA */}
      <a href={plan.ctaHref} className="pricing-card__cta-link">
        {isFeatured ? (
          <Button size="lg" className="pricing-card__cta pricing-card__cta--primary">
            {plan.ctaLabel}
          </Button>
        ) : (
          <Button size="lg" variant="outline" className="pricing-card__cta pricing-card__cta--outline">
            {plan.ctaLabel}
          </Button>
        )}
      </a>

      {/* Support badge */}
      {plan.supportBadge && (
        <div className={`pricing-card__support ${isFeatured ? 'pricing-card__support--brand' : ''}`}>
          {plan.supportBadge}
          <svg className="pricing-card__support-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </div>
      )}

      {/* Feature list */}
      <PricingFeatureList features={plan.features} branded={!!isFeatured} />
    </div>
  );
};

export default PricingCard;
