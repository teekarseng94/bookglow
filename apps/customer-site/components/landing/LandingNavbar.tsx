import React, { useState } from 'react';
import { Logo, NAV_ITEMS, NAV_ITEMS_WITH_CHEVRON } from '../../constants';
import { Button } from '../Button';

export type LandingView = 'landing' | 'pricing' | 'integrations';

const Chevron: React.FC = () => (
  <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
  </svg>
);

export interface LandingNavbarProps {
  onNavigate: (view: LandingView) => void;
  currentView: LandingView;
}

/** Sticky top navigation — shared across all landing views. */
export const LandingNavbar: React.FC<LandingNavbarProps> = ({ onNavigate, currentView }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    if (href === '#pricing') {
      onNavigate('pricing');
      return;
    }
    if (href === '#integrations') {
      onNavigate('integrations');
      return;
    }

    if (currentView !== 'landing') {
      onNavigate('landing');
      setTimeout(() => {
        const targetId = href.replace('#', '');
        const elem = document.getElementById(targetId);
        if (elem) {
          window.scrollTo({ top: elem.offsetTop - 80, behavior: 'smooth' });
        }
      }, 100);
    } else {
      const targetId = href.replace('#', '');
      const elem = document.getElementById(targetId);
      if (elem) {
        window.scrollTo({ top: elem.offsetTop - 80, behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="hover:opacity-80 transition-opacity shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 rounded-md"
        >
          <Logo />
        </button>

        <div className="hidden lg:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleScroll(e, item.href)}
              className={`inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 rounded-sm ${
                (item.label === 'Pricing' && currentView === 'pricing') ||
                (item.label === 'Resources' && currentView === 'integrations')
                  ? 'text-slate-900'
                  : ''
              }`}
            >
              {item.label}
              {NAV_ITEMS_WITH_CHEVRON.has(item.label) ? <Chevron /> : null}
            </a>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-5 shrink-0">
          <a
            href="/login"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm text-slate-700 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 rounded-sm"
          >
            Login
          </a>
          <a href="/signup" className="inline-block">
            <Button size="sm" className="rounded-lg px-5">
              Start free
            </Button>
          </a>
        </div>

        {/* Mobile: Log in + hamburger */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          <a
            href="/login"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm text-slate-700 px-2 py-2"
          >
            Log in
          </a>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-white bg-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-slate-900/40 border-0 cursor-default"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[min(100%,20rem)] bg-white border-l border-slate-100 shadow-xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <Logo />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
                className="w-11 h-11 rounded-lg hover:bg-slate-50 border border-slate-100 text-slate-700 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => {
                    handleScroll(e, item.href);
                    setMobileMenuOpen(false);
                  }}
                  className="text-slate-700 font-medium transition-colors hover:text-slate-900 min-h-[44px] flex items-center"
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="mt-auto pt-8 flex flex-col gap-3">
              <a
                href="/login"
                target="_blank"
                rel="noopener noreferrer"
                className="text-center px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-medium hover:bg-slate-100 transition-colors min-h-[44px] flex items-center justify-center"
              >
                Log in
              </a>
              <a href="/signup" className="text-center">
                <Button size="lg" className="w-full rounded-lg">
                  Start free
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default LandingNavbar;
