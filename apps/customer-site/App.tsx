import React, { useState, useEffect } from 'react';
import { Logo, NAV_ITEMS, NAV_ITEMS_WITH_CHEVRON, PRIMARY_GREEN } from './constants';
import { Button } from './components/Button';
import { FloatingScreens } from './components/FloatingScreens';
import { ProductPreviewPanel } from './components/ProductPreviewPanel';

type ViewType = 'landing' | 'pricing' | 'integrations';

const TRUST_LOGOS = [
  'The Face Place',
  'IKIRVANA',
  'ZENITH',
  'LUSH LAB',
  'CÉLESTE',
  'GlowHaus',
];

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

const PRICING_PLANS = [
  {
    name: 'Starter',
    price: 0,
    blurb: 'Perfect for getting started.',
    popular: false,
  },
  {
    name: 'Pro',
    price: 79,
    blurb: 'Everything you need to grow.',
    popular: true,
  },
  {
    name: 'Premium',
    price: 159,
    blurb: 'Advanced tools for scaling.',
    popular: false,
  },
];

const Chevron = () => (
  <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
  </svg>
);

const Navbar: React.FC<{
  onNavigate: (view: ViewType) => void;
  currentView: ViewType;
}> = ({ onNavigate, currentView }) => {
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
          window.scrollTo({
            top: elem.offsetTop - 80,
            behavior: 'smooth',
          });
        }
      }, 100);
    } else {
      const targetId = href.replace('#', '');
      const elem = document.getElementById(targetId);
      if (elem) {
        window.scrollTo({
          top: elem.offsetTop - 80,
          behavior: 'smooth',
        });
      }
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
        <button onClick={() => onNavigate('landing')} className="hover:opacity-80 transition-opacity shrink-0">
          <Logo />
        </button>

        <div className="hidden lg:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleScroll(e, item.href)}
              className={`inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium transition-colors text-sm ${
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
            className="font-medium text-sm text-slate-700 hover:text-slate-900 transition-colors"
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
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-white"
            style={{ backgroundColor: PRIMARY_GREEN }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[min(100%,20rem)] bg-white border-l border-slate-100 shadow-xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <Logo />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 rounded-lg hover:bg-slate-50 border border-slate-100 text-slate-700 flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="text-slate-700 font-medium transition-colors hover:text-slate-900"
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
                className="text-center px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-medium hover:bg-slate-100 transition-colors"
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

const PricingView: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(true);

  const CheckIcon = () => (
    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
  );

  return (
    <div className="pt-24 pb-20 bg-[#f4f7f6] min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-[1fr,400px,400px] gap-8 items-start pt-12">
          <div className="pr-12">
            <h1 className="text-[52px] font-bold leading-tight mb-2 text-slate-900">
              Get Booked.
              <br />
              Get Paid.
            </h1>
            <div className="mt-24 max-w-sm">
              <p className="text-slate-700 font-medium mb-4 leading-relaxed">
                Highly recommend Bookglow to anyone. I must have tried a zillion apps and you can trust me that this is the
                best!
              </p>
              <p className="text-slate-500 text-sm mb-6">— Sruthi Ravindran</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Excellent</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-5 h-5 bg-[#00b67a] flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    </div>
                  ))}
                </div>
                <span className="text-sm text-slate-700 font-medium">Trustpilot</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border-2 border-[#10b981] shadow-xl p-10 flex flex-col items-center text-center relative overflow-hidden transition-colors">
            <h2 className="text-4xl font-bold mb-1 flex items-center gap-1 text-slate-900">
              Get Pro
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v18M12 3l-4 4M12 3l4 4M12 21l-4-4M12 21l4-4" />
              </svg>
            </h2>
            <p className="text-slate-500 text-sm mb-4 italic">Unlimited users</p>

            <div className="flex items-baseline mb-6">
              <span className="text-2xl font-bold text-[#10b981]">$</span>
              <span className="text-6xl font-extrabold text-[#10b981]">5</span>
              <div className="ml-2 text-left">
                <p className="text-[#0ea5e9] text-xs font-bold leading-none mb-1">58% off*</p>
                <p className="text-slate-400 text-xs font-medium">user / month</p>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`w-12 h-6 rounded-full transition-colors relative ${isAnnual ? 'bg-[#10b981]' : 'bg-slate-300'}`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    isAnnual ? 'translate-x-6' : ''
                  }`}
                />
              </button>
              <span className="text-slate-800 font-bold text-sm">Annual billing</span>
            </div>

            <a href="/signup" className="w-full">
              <Button size="lg" className="w-full bg-[#1d352b] hover:opacity-90 mb-6 rounded-md">
                Start Pro
              </Button>
            </a>

            <div className="bg-[#f0fdf4] text-[#10b981] text-[10px] font-bold tracking-widest px-4 py-2 rounded-full mb-8 flex items-center gap-2">
              24/7 HUMAN SUPPORT
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>

            <ul className="w-full text-left space-y-3">
              {[
                'Unlimited appointments',
                'Accept payments',
                'Branded Booking Page',
                'Branded Mobile App',
                'SMS reminders*',
                'Email reminders',
                'Email confirmations',
                'Recurring appointments',
                '2-way calendar sync',
                'Remove Bookglow branding',
                'Block customers',
                'Google Reviews',
                'iOS and Android apps',
                'Custom notifications & reminders',
                'Team collaboration tools',
                'Donating 1% to plant trees',
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                  <CheckIcon /> {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-xl p-10 flex flex-col items-center text-center border border-slate-100 transition-colors">
            <h2 className="text-4xl font-bold mb-1 text-slate-900">Start Free</h2>
            <p className="text-slate-500 text-sm mb-4">Up to 4 users</p>

            <div className="flex items-baseline mb-[108px]">
              <span className="text-2xl font-bold text-slate-900">$</span>
              <span className="text-6xl font-extrabold text-slate-900">0</span>
              <div className="ml-2 text-left">
                <p className="text-slate-400 text-xs font-medium">user / month</p>
              </div>
            </div>

            <a href="/signup" className="w-full">
              <Button size="lg" variant="outline" className="w-full mb-6 border-slate-900 text-slate-900 rounded-md">
                Start FREE
              </Button>
            </a>

            <div className="bg-[#f0fdf4] text-[#10b981] text-[10px] font-bold tracking-widest px-4 py-2 rounded-full mb-8 flex items-center gap-2">
              24/7 HUMAN SUPPORT
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>

            <ul className="w-full text-left space-y-3">
              {[
                '200 appointments',
                'Accept payments',
                'Branded Booking Page',
                'Branded Mobile App',
                'Email reminders',
                'Email confirmations',
                'Integrations with leading apps',
                'iOS and Android apps',
                'Team collaboration tools',
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                  <CheckIcon /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-24 text-center">
          <button className="flex items-center gap-2 mx-auto text-slate-700 font-bold text-sm hover:opacity-70 transition-colors">
            Explore all features
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>

        <div className="mt-32">
          <h2 className="text-[40px] font-bold text-center mb-16 text-slate-900">All essentials included</h2>
          <div className="grid md:grid-cols-3 gap-16">
            <div className="group">
              <div className="flex items-center gap-3 mb-6">
                <svg className="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <h3 className="text-xl font-bold text-slate-900">Share your Booking Page</h3>
              </div>
              <p className="text-slate-600 mb-8 leading-relaxed">
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
            <div className="group">
              <div className="flex items-center gap-3 mb-6">
                <svg className="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <h3 className="text-xl font-bold text-slate-900">Get paid anytime</h3>
              </div>
              <p className="text-slate-600 mb-8 leading-relaxed">
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
            <div className="group">
              <div className="flex items-center gap-3 mb-6">
                <svg className="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="text-xl font-bold text-slate-900">All-in-one workspace</h3>
              </div>
              <p className="text-slate-600 mb-8 leading-relaxed">
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
        </div>
      </div>
    </div>
  );
};

const Hero: React.FC = () => {
  return (
    <section id="learn" className="pt-24 sm:pt-28 lg:pt-32 pb-12 sm:pb-16 lg:pb-20 overflow-x-hidden scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <div className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left">
          <div className="inline-flex items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)] text-xs sm:text-sm font-semibold px-3.5 py-1.5 mb-5 sm:mb-6">
            Built for beauty &amp; wellness businesses in Malaysia 🇲🇾
          </div>

          <h1 className="text-[1.75rem] leading-[1.15] sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight mb-5 sm:mb-6 text-slate-900 text-balance">
            Run your appointments, schedule, customers, and payments{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(90deg, #7656D6 0%, #6366F1 100%)',
              }}
            >
              in one place
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-500 mb-7 sm:mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
            Bookglow is the all-in-one platform that helps you save time, reduce no-shows, and grow your business with
            confidence.
          </p>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8 text-left max-w-xl mx-auto lg:mx-0">
            {[
              {
                title: '24/7 Online Booking',
                sub: 'Never miss a booking',
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
              },
              {
                title: 'Smart Reminders',
                sub: 'Reduce no-shows',
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                ),
              },
              {
                title: 'Secure Payments',
                sub: 'Get paid faster',
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.title} className="flex flex-col items-start gap-2">
                <span className="inline-flex w-8 h-8 rounded-lg bg-[var(--brand-soft)] text-[var(--brand)] items-center justify-center shrink-0">
                  {item.icon}
                </span>
                <div>
                  <p className="text-[11px] sm:text-sm font-bold text-slate-800 leading-snug">{item.title}</p>
                  <p className="text-[10px] sm:text-xs text-slate-500 leading-snug">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start mb-5">
            <a href="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto rounded-xl px-8">
                Start free →
              </Button>
            </a>
            <a
              href="tel:+60169929123"
              className="w-full sm:w-auto inline-flex items-center justify-center font-semibold rounded-xl px-8 py-4 text-lg border-2 transition-all duration-200 hover:bg-[var(--brand-soft)]"
              style={{ borderColor: PRIMARY_GREEN, color: PRIMARY_GREEN }}
            >
              Book a demo
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
          <FloatingScreens />
        </div>
      </div>
    </section>
  );
};

const TrustStrip: React.FC = () => (
  <section className="py-10 sm:py-14 border-y border-slate-100 bg-white/60 scroll-mt-20" id="industries">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
      <p className="text-sm text-slate-500 mb-6 sm:mb-8">Trusted by beauty &amp; wellness businesses across Malaysia</p>
      <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 sm:gap-x-12 opacity-50 grayscale">
        {TRUST_LOGOS.map((name) => (
          <span key={name} className="text-xs sm:text-sm font-bold tracking-wide text-slate-600 uppercase">
            {name}
          </span>
        ))}
      </div>
    </div>
  </section>
);

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
      <Navbar onNavigate={setView} currentView={view} />

      {view === 'landing' && (
        <>
          <Hero />
          <TrustStrip />
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
