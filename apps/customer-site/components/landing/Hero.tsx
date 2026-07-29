import React from 'react';
import { Button } from '../Button';
import { HeroProductComposition } from './HeroProductComposition';

/**
 * Landing hero — two-column Setmore-style layout: headline + one primary action on the
 * left, a real product-interface composition on the right. Kept short enough that the
 * next section (industry strip) starts peeking in near the fold on common viewports.
 */
export const Hero: React.FC = () => {
  return (
    <section id="learn" className="pt-24 sm:pt-28 lg:pt-32 pb-8 sm:pb-10 lg:pb-12 overflow-x-hidden scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <div className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left">
          <div className="inline-flex items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)] text-xs sm:text-sm font-semibold px-3.5 py-1.5 mb-5 sm:mb-6">
            Built for beauty &amp; wellness businesses in Malaysia 🇲🇾
          </div>

          <h1 className="text-[1.75rem] leading-[1.15] sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight mb-5 sm:mb-6 text-slate-900 text-balance">
            Run your appointments, schedule, customers, and payments{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(90deg, var(--brand) 0%, var(--brand-hover) 100%)' }}
            >
              in one place
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-500 mb-7 sm:mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
            BookGlow is the all-in-one platform that helps you save time, reduce no-shows, and grow your business with
            confidence.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 justify-center lg:justify-start mb-5">
            <a href="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto rounded-xl px-8 min-h-[44px]">
                Start free →
              </Button>
            </a>
            <a
              href="tel:+60169929123"
              className="inline-flex items-center gap-1.5 font-semibold text-sm text-[var(--brand)] hover:text-[var(--brand-hover)] transition-colors min-h-[44px]"
            >
              Book a demo
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-4 text-xs sm:text-sm text-slate-500">
            <span>✓ 14-day free trial</span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span>✓ No credit card required</span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span>✓ Setup in minutes</span>
          </div>
        </div>

        <div className="relative w-full max-w-xl mx-auto lg:max-w-none">
          <HeroProductComposition />
        </div>
      </div>
    </section>
  );
};

export default Hero;
