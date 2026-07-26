import React from 'react';
import { PRICING_TESTIMONIAL } from './pricingData';

/**
 * Left-column social proof: headline, testimonial, rating row,
 * and a "larger teams" CTA.
 */
const PricingSocialProof: React.FC = () => {
  const { quote, author, role, rating } = PRICING_TESTIMONIAL;

  return (
    <div className="pricing-social-proof">
      {/* Headline */}
      <div className="pricing-social-proof__headline">
        <h1 className="pricing-social-proof__title">
          Bookings made simple.
          <br />
          <span className="pricing-social-proof__title--accent">Business made better.</span>
        </h1>
      </div>

      {/* Testimonial */}
      <blockquote className="pricing-social-proof__quote">
        <p className="pricing-social-proof__quote-text">"{quote}"</p>
        <footer className="pricing-social-proof__author">
          <span className="pricing-social-proof__author-name">— {author}</span>
          <span className="pricing-social-proof__author-role">{role}</span>
        </footer>
      </blockquote>

      {/* Trust rating */}
      <div className="pricing-social-proof__trust" aria-label={`Rated ${rating} out of 5 stars`}>
        <span className="pricing-social-proof__trust-label">Excellent</span>
        <div className="pricing-social-proof__stars" aria-hidden="true">
          {Array.from({ length: rating }).map((_, i) => (
            <div key={i} className="pricing-social-proof__star">
              <svg className="pricing-social-proof__star-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </div>
          ))}
        </div>
        <span className="pricing-social-proof__trust-source">Bookglow Reviews</span>
      </div>

      {/* Larger teams section */}
      <div className="pricing-social-proof__enterprise">
        <p className="pricing-social-proof__enterprise-text">
          Need a plan for a growing team or multiple outlets?
        </p>
        <a href="mailto:hello@bookglow.com" className="pricing-social-proof__enterprise-link">
          Contact us →
        </a>
      </div>
    </div>
  );
};

export default PricingSocialProof;
