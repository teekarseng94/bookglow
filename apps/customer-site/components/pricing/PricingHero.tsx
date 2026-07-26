import React, { useState } from 'react';
import PricingCard from './PricingCard';
import PricingSocialProof from './PricingSocialProof';
import { PLANS } from './pricingData';
import { ProductPreviewPanel } from '../ProductPreviewPanel';

/**
 * Pricing hero — Setmore-inspired three-column layout:
 *   Column 1: Marketing headline + social proof
 *   Column 2: Pro plan card (featured)
 *   Column 3: Free plan card
 *
 * Below the hero: "All essentials included" section (preserved from original).
 */
const PricingHero: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(true);

  const proPlan = PLANS.find((p) => p.id === 'pro')!;
  const freePlan = PLANS.find((p) => p.id === 'free')!;

  return (
    <div className="pricing-page">
      {/* ——— Three-column hero ——— */}
      <section className="pricing-hero" aria-label="Pricing plans">
        <div className="pricing-hero__grid">
          {/* Column 1 — Social proof */}
          <PricingSocialProof />

          {/* Column 2 — Pro plan */}
          <PricingCard
            plan={proPlan}
            isAnnual={isAnnual}
            onToggleBilling={() => setIsAnnual((prev) => !prev)}
          />

          {/* Column 3 — Free plan */}
          <PricingCard plan={freePlan} isAnnual={isAnnual} />
        </div>
      </section>

      {/* ——— "Explore all features" link ——— */}
      <div className="pricing-explore">
        <button className="pricing-explore__btn" type="button">
          Explore all features
          <svg className="pricing-explore__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </div>

      {/* ——— All essentials included ——— */}
      <section className="pricing-essentials" aria-label="All essentials included">
        <h2 className="pricing-essentials__title">All essentials included</h2>
        <div className="pricing-essentials__grid">
          <div className="pricing-essential-card">
            <div className="pricing-essential-card__header">
              <svg className="pricing-essential-card__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <h3 className="pricing-essential-card__title">Share your Booking Page</h3>
            </div>
            <p className="pricing-essential-card__desc">
              Make it easy for customers to book—your availability, services, and brand.
            </p>
            <ProductPreviewPanel
              title="Public booking page"
              subtitle="Customer site"
              rows={[
                { label: 'Signature massage', meta: '60 min' },
                { label: 'Express facial', meta: '45 min' },
                { label: 'Continue · RM 120', meta: 'CTA' },
              ]}
            />
          </div>

          <div className="pricing-essential-card">
            <div className="pricing-essential-card__header">
              <svg className="pricing-essential-card__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="pricing-essential-card__title">Get paid anytime</h3>
            </div>
            <p className="pricing-essential-card__desc">
              Track sales, payment methods, and daily totals from POS and reports.
            </p>
            <ProductPreviewPanel
              title="Sales snapshot"
              subtitle="Merchant POS"
              rows={[
                { label: 'Cash', meta: 'RM 420' },
                { label: 'Card', meta: 'RM 860' },
                { label: 'Member credit', meta: 'RM 120' },
              ]}
            />
          </div>

          <div className="pricing-essential-card">
            <div className="pricing-essential-card__header">
              <svg className="pricing-essential-card__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <h3 className="pricing-essential-card__title">All-in-one workspace</h3>
            </div>
            <p className="pricing-essential-card__desc">
              Schedule, members, menu, staff, and finance stay connected in one merchant portal.
            </p>
            <ProductPreviewPanel
              title="Today overview"
              subtitle="Dashboard"
              rows={[
                { label: '8 bookings', meta: 'Today' },
                { label: 'Needs attention', meta: '2' },
                { label: 'Net profit', meta: 'Live' },
              ]}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default PricingHero;
