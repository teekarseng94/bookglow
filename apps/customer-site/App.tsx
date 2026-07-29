import React, { useState, useEffect } from 'react';
import { Logo, PRIMARY_GREEN } from './constants';
import { Button } from './components/Button';
import { ProductPreviewPanel } from './components/ProductPreviewPanel';
import PricingHero from './components/pricing/PricingHero';
import { LANDING_PRICING_PLANS } from './components/pricing/pricingData';
import { LandingNavbar, Hero, IndustryStrip, type LandingView } from './components/landing';

type ViewType = LandingView;

const VALUE_CARDS = [
  {
    title: 'All-in-one platform',
    description: 'Bookings, schedule, customers, and payments in one workspace.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    title: 'Grow your revenue',
    description: 'Fill more slots with online booking and clearer follow-up.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    title: 'Save time daily',
    description: 'Automate reminders and keep the front desk organised.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Understand your business',
    description: 'See sales, appointments, and customer activity at a glance.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const FEATURE_ITEMS = [
  {
    title: 'Online Booking 24/7',
    description: 'Let customers book anytime from your public page.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Smart Schedule',
    description: 'Coordinate staff and appointments in one calendar.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Client Management',
    description: 'Keep member profiles, history, and notes together.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: 'Automated Reminders',
    description: 'Cut no-shows with timely SMS and email nudges.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    title: 'Payments & POS',
    description: 'Take payments at the counter and keep sales tidy.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    title: 'Reports & Insights',
    description: 'Track revenue and daily performance with clear reports.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const PRICING_PLANS = LANDING_PRICING_PLANS;

const IntegrationsView: React.FC = () => {
  const categories = [
    'All Integrations',
    'Social media',
    'Payment',
    'Website booking',
    'Calendar sync',
    'Business',
    'Video meeting',
    'Marketing',
    'Sales and CRM',
  ];

  const IntegrationCard = ({
    icon,
    title,
    description,
  }: {
    icon: string;
    title: string;
    description: string;
  }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-50 flex items-start gap-5 hover:shadow-md transition-all cursor-pointer">
      <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 shadow-inner bg-slate-50">
        <img src={icon} alt={title} className="w-8 h-8 object-contain" />
      </div>
      <div>
        <h4 className="font-bold text-slate-900 mb-1">{title}</h4>
        <p className="text-slate-500 text-xs leading-relaxed">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="pt-24 pb-20 bg-[#f8fafc] min-h-screen">
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <h1 className="text-[52px] font-bold leading-tight mb-8 text-slate-900">Integrate your favorite apps</h1>
          <p className="text-slate-600 mb-6 leading-relaxed max-w-lg font-medium">
            Create connections that last by personalizing how you engage with your audience and vice versa.
          </p>
          <p className="text-slate-600 mb-10 leading-relaxed max-w-lg">
            Using Bookglow&apos;s integrations, you can automate daily processes, book more appointments and offer top-tier
            customer service.
          </p>
          <a href="/signup">
            <Button size="lg" className="rounded-md px-10">
              Get started for FREE
            </Button>
          </a>
        </div>
        <div className="relative h-[450px]">
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-6 opacity-80">
            {[
              'https://upload.wikimedia.org/wikipedia/commons/3/33/Square_Inc._logo.svg',
              'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Color_Icon.svg',
              'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg',
              'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg',
              'https://upload.wikimedia.org/wikipedia/commons/d/df/Shopping_Cart_Icon.svg',
              'https://upload.wikimedia.org/wikipedia/commons/b/b1/Wix.com_Logo.svg',
              'https://upload.wikimedia.org/wikipedia/commons/c/c5/Shopify_logo2.svg',
              'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
              'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg',
            ].map((icon, i) => (
              <div
                key={i}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-50 flex items-center justify-center"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <img src={icon} className="h-8 w-8 object-contain grayscale hover:grayscale-0 transition-all" alt="App" />
              </div>
            ))}
          </div>
          <div className="absolute bottom-4 right-4 w-[55%] z-10">
            <ProductPreviewPanel
              title="Connected tools"
              subtitle="Integrations"
              rows={[
                { label: 'Calendar sync', meta: 'On' },
                { label: 'Online booking', meta: 'Live' },
                { label: 'Payments', meta: 'Ready' },
              ]}
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 mb-24">
        <div className="bg-white p-2 rounded-xl shadow-md border border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat, i) => (
              <button
                key={i}
                className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                  i === 0 ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search for an integration"
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 rounded-lg text-xs outline-none border border-transparent focus:border-slate-200"
            />
            <svg className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-6 mb-32">
        <div className="text-center mb-16">
          <h2 className="text-[32px] font-bold mb-4" style={{ color: PRIMARY_GREEN }}>
            Social media integrations
          </h2>
          <p className="text-slate-600 text-sm max-w-lg mx-auto leading-relaxed">
            Enable your online fans to book appointments without leaving their social apps.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <IntegrationCard
            icon="https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png"
            title="Facebook"
            description="Get booked directly from your Facebook business profile."
          />
          <IntegrationCard
            icon="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png"
            title="Instagram"
            description="Encourage new bookings by streaming posts to your Booking Page."
          />
          <IntegrationCard
            icon="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png"
            title="Instagram booking"
            description="Let customers book appointments from your Instagram profile and ads."
          />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 mb-32">
        <div className="text-center mb-16">
          <h2 className="text-[32px] font-bold mb-4" style={{ color: PRIMARY_GREEN }}>
            Payment integrations
          </h2>
          <p className="text-slate-600 text-sm max-w-lg mx-auto leading-relaxed">
            Accept secure online payments in advance, for any of your services. Less invoicing, more convenience.
          </p>
        </div>
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8">
          <IntegrationCard
            icon="https://upload.wikimedia.org/wikipedia/commons/3/33/Square_Inc._logo.svg"
            title="Square"
            description="Get paid for your services with Square, Cash App and more."
          />
          <IntegrationCard
            icon="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg"
            title="Stripe"
            description="Collect debit or credit card payments on booking."
          />
          <IntegrationCard
            icon="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg"
            title="PayPal"
            description="Let your customers pay online via their PayPal wallet."
          />
          <IntegrationCard
            icon="https://upload.wikimedia.org/wikipedia/commons/4/4b/LawPay_Logo.svg"
            title="LawPay"
            description="Enable leads and clients to pay in advance through your Booking Page."
          />
        </div>
      </section>
    </div>
  );
};

const PricingView: React.FC = () => <PricingHero />;

const ValueCards: React.FC = () => (
  <section className="py-12 sm:py-16 lg:py-20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {VALUE_CARDS.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-[0_8px_24px_rgba(39,25,42,0.04)]"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center mb-4">
              {card.icon}
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">{card.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const FeaturesAndPricing: React.FC<{ onExplorePricing: () => void }> = ({ onExplorePricing }) => {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="features" className="pb-16 sm:pb-24 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-14 items-start">
        {/* Features */}
        <div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 text-balance">
            Everything you need to run your business.
          </h2>
          <p className="text-slate-500 mb-4 max-w-lg">
            Powerful features designed for beauty &amp; wellness professionals.
          </p>
          <a
            href="#features"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand)] hover:opacity-80 mb-8"
          >
            Explore all features →
          </a>

          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            {FEATURE_ITEMS.map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-100 bg-white/80 p-4 sm:p-5">
                <div className="w-9 h-9 rounded-lg bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center mb-3">
                  {item.icon}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1 leading-snug">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed hidden sm:block">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing preview */}
        <div id="pricing" className="scroll-mt-24 rounded-2xl border border-slate-100 bg-white p-5 sm:p-7 shadow-[0_18px_48px_rgba(39,25,42,0.06)]">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Simple, transparent pricing.</h2>
          <p className="text-slate-500 mb-6">Start free. Upgrade when you&apos;re ready.</p>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="inline-flex items-center rounded-full bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  !isAnnual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  isAnnual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                Annual
              </button>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1">
              Save up to 20%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border p-4 ${
                  plan.popular
                    ? 'border-[var(--brand)] bg-[var(--brand-soft)]/40 shadow-sm'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {plan.popular ? (
                  <span className="absolute -top-2.5 left-4 rounded-full bg-[var(--brand)] text-white text-[10px] font-bold px-2.5 py-0.5">
                    Most popular
                  </span>
                ) : null}
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{plan.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{plan.blurb}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-black text-slate-900 tabular-nums">
                      <span className="text-sm font-bold text-slate-400 mr-0.5">RM</span>
                      {plan.price}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      /month{isAnnual && plan.price > 0 ? ' billed annually' : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onExplorePricing}
            className="mt-5 w-full text-center text-sm font-semibold text-[var(--brand)] hover:opacity-80"
          >
            View detailed pricing →
          </button>
        </div>
      </div>
    </section>
  );
};

const CookieBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-7xl mx-auto bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.08)] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-100">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            🍪
          </span>
          <p className="text-slate-600 text-sm">
            We want to provide you with the best experience. By using this site, you agree to our{' '}
            <a href="#" className="underline">
              cookie policy
            </a>
            .
          </p>
        </div>
        <button onClick={() => setVisible(false)} className="text-blue-600 font-bold text-sm hover:underline">
          Got it
        </button>
      </div>
    </div>
  );
};

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-100 py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <Logo />
        <div className="flex gap-8 text-sm text-slate-400">
          <a href="#" className="hover:text-slate-600 transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-slate-600 transition-colors">
            Terms of Service
          </a>
          <a href="#" className="hover:text-slate-600 transition-colors">
            Cookie Settings
          </a>
        </div>
        <div className="text-sm text-slate-400">© {new Date().getFullYear()} Bookglow Inc. All rights reserved.</div>
      </div>
    </footer>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('landing');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  return (
    <div className="bookglow-public-site min-h-screen gradient-bg transition-colors duration-300">
      <LandingNavbar onNavigate={setView} currentView={view} />

      {view === 'landing' && (
        <>
          <Hero />
          <IndustryStrip />
          <ValueCards />
          <FeaturesAndPricing onExplorePricing={() => setView('pricing')} />
        </>
      )}

      {view === 'pricing' && <PricingView />}
      {view === 'integrations' && <IntegrationsView />}

      <Footer />
      <CookieBanner />
    </div>
  );
};

export default App;
