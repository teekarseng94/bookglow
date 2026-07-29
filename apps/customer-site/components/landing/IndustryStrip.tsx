import React from 'react';

/**
 * Truthful industry strip — replaces the previous placeholder "trusted by" customer
 * logos (fictional names, unverifiable) with the actual categories of business BookGlow
 * is built for. No customer claims, no statistics.
 */
const INDUSTRIES = [
  'Hair & Beauty Salons',
  'Spas & Wellness Centres',
  'Nail & Lash Studios',
  'Massage & Therapy Clinics',
  'Med Spas',
  'Barbershops',
];

export const IndustryStrip: React.FC = () => (
  <section className="py-10 sm:py-14 border-y border-slate-100 bg-white/60 scroll-mt-20" id="industries">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
      <p className="text-sm text-slate-500 mb-6 sm:mb-8">Built for beauty &amp; wellness businesses across Malaysia</p>
      <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-3 sm:gap-x-4">
        {INDUSTRIES.map((name) => (
          <span
            key={name}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  </section>
);

export default IndustryStrip;
