import React, { useState, useEffect } from 'react';
import { Logo, NAV_ITEMS, PRIMARY_GREEN } from './constants';
import { Button } from './components/Button';
import { FloatingScreens } from './components/FloatingScreens';
import { register, getAuthErrorMessage } from './services/authService';

type ViewType = 'landing' | 'pricing' | 'integrations';

const Navbar: React.FC<{ 
  onNavigate: (view: ViewType) => void, 
  currentView: ViewType 
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
            behavior: 'smooth'
          });
        }
      }, 100);
    } else {
      const targetId = href.replace('#', '');
      const elem = document.getElementById(targetId);
      if (elem) {
        window.scrollTo({
          top: elem.offsetTop - 80,
          behavior: 'smooth'
        });
      }
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <button onClick={() => onNavigate('landing')} className="hover:opacity-80 transition-opacity">
            <Logo />
          </button>
          <div className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <a 
                key={item.label} 
                href={item.href} 
                onClick={(e) => handleScroll(e, item.href)}
                className={`text-slate-600 hover:text-slate-900 font-medium transition-colors text-sm ${
                  (item.label === 'Pricing' && currentView === 'pricing') || 
                  (item.label === 'Integrations' && currentView === 'integrations') 
                  ? 'border-b-2 border-slate-900 pb-1' : ''
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href="tel:+60169929123"
            className="text-slate-700 font-medium text-sm hover:opacity-80 transition-opacity"
          >
            +60 169929123
          </a>
          <a
            href="/login"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm text-slate-700 hover:text-slate-900 transition-colors"
          >
            Login
          </a>
          <a href="/signup" className="inline-block">
            <Button size="sm" className="rounded-md">
              Start FREE
            </Button>
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-50 text-slate-700 border border-slate-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile slide-out menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-80 bg-white border-l border-slate-100 shadow-xl p-6 flex flex-col">
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
                  className={`text-slate-700 font-medium transition-colors hover:text-slate-900`}
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
                Login
              </a>
              <a href="/signup" className="text-center">
                <Button size="lg" className="w-full rounded-md">
                  Start FREE
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
    "All Integrations", "Social media", "Payment", "Website booking", 
    "Calendar sync", "Business", "Video meeting", "Marketing", "Sales and CRM"
  ];

  const IntegrationCard = ({ icon, title, description }: { icon: string, title: string, description: string }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-50 flex items-start gap-5 hover:shadow-md transition-all cursor-pointer">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 shadow-inner bg-slate-50`}>
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
          <h1 className="text-[52px] font-bold leading-tight mb-8 text-slate-900">
            Integrate your favorite apps
          </h1>
          <p className="text-slate-600 mb-6 leading-relaxed max-w-lg font-medium">
            Create connections that last by personalizing how you engage with your audience and vice versa.
          </p>
          <p className="text-slate-600 mb-10 leading-relaxed max-w-lg">
            Using Zenflow's integrations, you can automate daily processes, book more appointments and offer top-tier customer service.
          </p>
          <Button size="lg" className="rounded-md px-10">
            Get started for FREE
          </Button>
        </div>
        <div className="relative h-[450px]">
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-6 opacity-80">
            {[
              "https://upload.wikimedia.org/wikipedia/commons/3/33/Square_Inc._logo.svg",
              "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Color_Icon.svg",
              "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
              "https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg",
              "https://upload.wikimedia.org/wikipedia/commons/d/df/Shopping_Cart_Icon.svg",
              "https://upload.wikimedia.org/wikipedia/commons/b/b1/Wix.com_Logo.svg",
              "https://upload.wikimedia.org/wikipedia/commons/c/c5/Shopify_logo2.svg",
              "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
              "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg"
            ].map((icon, i) => (
              <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-50 flex items-center justify-center animate-pulse" style={{ animationDelay: `${i * 150}ms` }}>
                <img src={icon} className="h-8 w-8 object-contain grayscale hover:grayscale-0 transition-all" alt="App" />
              </div>
            ))}
          </div>
          <img 
            src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=1974&auto=format&fit=crop" 
            className="absolute bottom-0 right-0 w-[80%] h-full object-cover object-top rounded-t-[100px] z-10 border-l-8 border-t-8 border-white"
            alt="Professional"
          />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 mb-24">
        <div className="bg-white p-2 rounded-xl shadow-md border border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat, i) => (
              <button 
                key={i} 
                className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-colors ${i === 0 ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
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
          <h2 className="text-[32px] font-bold mb-4" style={{ color: PRIMARY_GREEN }}>Social media integrations</h2>
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
          <h2 className="text-[32px] font-bold mb-4" style={{ color: PRIMARY_GREEN }}>Payment integrations</h2>
          <p className="text-slate-600 text-sm max-w-lg mx-auto leading-relaxed">
            Accept secure online payments in advance, for any of your services. Less invoicing, more convenience. ⏳
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
            <h1 className="text-[52px] font-bold leading-tight mb-2 text-slate-900">Get Booked.<br />Get Paid.</h1>
            <div className="mt-24 max-w-sm">
              <p className="text-slate-700 font-medium mb-4 leading-relaxed">
                Highly recommend Zenflow to anyone. I must have tried a zillion apps and you can trust me that this is the best!
              </p>
              <p className="text-slate-500 text-sm mb-6">— Sruthi Ravindran</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Excellent</span>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="w-5 h-5 bg-[#00b67a] flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
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
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M12 3l-4 4M12 3l4 4M12 21l-4-4M12 21l4-4"/></svg>
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
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isAnnual ? 'translate-x-6' : ''}`}></div>
              </button>
              <span className="text-slate-800 font-bold text-sm">Annual billing</span>
            </div>

            <Button size="lg" className="w-full bg-[#1d352b] hover:opacity-90 mb-6 rounded-md">Start Pro</Button>
            
            <div className="bg-[#f0fdf4] text-[#10b981] text-[10px] font-bold tracking-widest px-4 py-2 rounded-full mb-8 flex items-center gap-2">
              24/7 HUMAN SUPPORT 
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            </div>

            <ul className="w-full text-left space-y-3">
              {[
                "Unlimited appointments", "Accept payments", "Branded Booking Page", "Branded Mobile App", 
                "SMS reminders*", "Email reminders", "Email confirmations", "Recurring appointments",
                "2-way calendar sync", "Remove Zenflow branding", "Block customers", "Google Reviews",
                "iOS and Android apps", "Custom notifications & reminders", "Team collaboration tools", "Donating 1% to plant trees"
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

            <Button size="lg" variant="outline" className="w-full mb-6 border-slate-900 text-slate-900 rounded-md">Start FREE</Button>
            
            <div className="bg-[#f0fdf4] text-[#10b981] text-[10px] font-bold tracking-widest px-4 py-2 rounded-full mb-8 flex items-center gap-2">
              24/7 HUMAN SUPPORT 
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            </div>

            <ul className="w-full text-left space-y-3">
              {[
                "200 appointments", "Accept payments", "Branded Booking Page", "Branded Mobile App", 
                "Email reminders", "Email confirmations", "Integrations with leading apps", "iOS and Android apps",
                "Team collaboration tools"
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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
          </button>
        </div>

        <div className="mt-32">
          <h2 className="text-[40px] font-bold text-center mb-16 text-slate-900">All essentials included</h2>
          <div className="grid md:grid-cols-3 gap-16">
            <div className="group">
              <div className="flex items-center gap-3 mb-6">
                <svg className="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                <h3 className="text-xl font-bold text-slate-900">Share your Booking Page</h3>
              </div>
              <p className="text-slate-600 mb-8 leading-relaxed">Make it easy for customers to book—your availability, services, and brand.</p>
              <div className="rounded-xl overflow-hidden shadow-md">
                <img src="https://picsum.photos/seed/pricing1/600/400" className="w-full grayscale group-hover:grayscale-0 transition-all duration-500" alt="Booking page" />
              </div>
            </div>
            <div className="group">
              <div className="flex items-center gap-3 mb-6">
                <svg className="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <h3 className="text-xl font-bold text-slate-900">Get paid anytime</h3>
              </div>
              <p className="text-slate-600 mb-8 leading-relaxed">In-person or online? You decide. Payments from your Booking Page to Tap to Pay.</p>
              <div className="rounded-xl overflow-hidden shadow-md">
                <img src="https://picsum.photos/seed/pricing2/600/400" className="w-full grayscale group-hover:grayscale-0 transition-all duration-500" alt="Payments" />
              </div>
            </div>
            <div className="group">
              <div className="flex items-center gap-3 mb-6">
                <svg className="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                <h3 className="text-xl font-bold text-slate-900">All-in-one solution</h3>
              </div>
              <p className="text-slate-600 mb-8 leading-relaxed">Where purpose meets practice—grow your business from your desktop or mobile.</p>
              <div className="rounded-xl overflow-hidden shadow-md">
                <img src="https://picsum.photos/seed/pricing3/600/400" className="w-full grayscale group-hover:grayscale-0 transition-all duration-500" alt="All in one" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Hero: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ email, password });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="learn" className="pt-32 pb-20 overflow-x-hidden scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-8 leading-[1.08] text-slate-900 text-balance">
            Book your <br /> appointment
          </h1>
          <p className="text-xl text-slate-500 mb-12 leading-relaxed max-w-lg">
            Organize your business with 24/7 automated online booking, reminders, payments, and more.
          </p>
          
          <form
            onSubmit={handleSignUp}
            className="mx-auto w-full max-w-md flex flex-col gap-4 px-4 py-6 bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 mb-8"
          >
            <input 
              type="email" 
              placeholder="Your email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 outline-none text-slate-700 bg-transparent placeholder:text-slate-300 rounded-lg focus:ring-2 focus:ring-green-100 transition-all border border-slate-100"
              required
            />
            <input 
              type="password" 
              placeholder="Password (min 6 characters)" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 outline-none text-slate-700 bg-transparent placeholder:text-slate-300 rounded-lg focus:ring-2 focus:ring-green-100 transition-all border border-slate-100"
              minLength={6}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" size="lg" className="w-full whitespace-nowrap" disabled={loading}>
              {loading ? 'Creating account…' : 'Start FREE'}
            </Button>
          </form>
          
          <div className="flex items-center gap-6 opacity-60">
             <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <img key={i} src={`https://picsum.photos/seed/${i+100}/40/40`} className="w-8 h-8 rounded-full border-2 border-white" alt="User" />
                ))}
             </div>
             <p className="text-sm text-slate-600 font-medium">Trusted by 10,000+ spa professionals</p>
          </div>
        </div>

        <div className="relative">
          <FloatingScreens />
        </div>
      </div>
    </section>
  );
};

const Testimonials: React.FC = () => {
  const testimonials = [
    {
      name: "Sarah Jenkins",
      business: "Serenity Day Spa",
      quote: "Zenflow has completely transformed how we handle bookings. Our no-show rate dropped by 50% in the first month alone!",
      image: "https://picsum.photos/seed/sarah/100/100"
    },
    {
      name: "Marcus Thorne",
      business: "Zenith Wellness",
      quote: "The AI optimizer gave us insights into our peak hours we never noticed. It's like having a business consultant built-in.",
      image: "https://picsum.photos/seed/marcus/100/100"
    },
    {
      name: "Elena Rodriguez",
      business: "Radiance Esthetics",
      quote: "Finally, a scheduling tool that is actually beautiful and easy for my clients to use. The mobile app is a lifesaver.",
      image: "https://picsum.photos/seed/elena/100/100"
    }
  ];

  return (
    <section id="industries" className="py-24 bg-white scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-slate-900">
            Loved by wellness experts
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Discover how Zenflow is helping thousands of businesses streamline their operations and delight their clients.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-slate-50 p-8 rounded-2xl border border-slate-100 relative group transition-all hover:shadow-lg">
              <div className="mb-6 text-yellow-400 text-lg flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => <span key={star}>★</span>)}
              </div>
              <p className="text-slate-700 italic mb-8 leading-relaxed">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-4">
                <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full object-cover border border-slate-200" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{t.name}</h4>
                  <p className="text-slate-500 text-xs">{t.business}</p>
                </div>
              </div>
            </div>
          ))}
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
          <span className="text-2xl">🍪</span>
          <p className="text-slate-600 text-sm">
            We want to provide you with the best experience. By using this site, you agree to our <a href="#" className="underline">cookie policy</a>.
          </p>
        </div>
        <button 
          onClick={() => setVisible(false)}
          className="text-blue-600 font-bold text-sm hover:underline"
        >
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
           <a href="#" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
           <a href="#" className="hover:text-slate-600 transition-colors">Terms of Service</a>
           <a href="#" className="hover:text-slate-600 transition-colors">Cookie Settings</a>
        </div>
        <div className="text-sm text-slate-400">
          © {new Date().getFullYear()} Zenflow Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('landing');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  // /book/* is handled by its own route in index.tsx; this App is for landing/marketing only

  return (
    <div className="min-h-screen gradient-bg transition-colors duration-300">
      <Navbar onNavigate={setView} currentView={view} />
      
      {view === 'landing' && (
        <>
          <Hero />
          
          <div id="integrations" className="max-w-7xl mx-auto px-6 py-12 border-y border-slate-50 flex flex-wrap justify-center gap-12 lg:gap-24 opacity-30 grayscale items-center scroll-mt-24">
             <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" className="h-8" alt="Stripe" />
             <img src="https://upload.wikimedia.org/wikipedia/commons/3/39/PayPal_logo.svg" className="h-8" alt="PayPal" />
             <img src="https://upload.wikimedia.org/wikipedia/commons/0/01/LinkedIn_Logo.svg" className="h-8" alt="LinkedIn" />
             <img src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" className="h-6" alt="Amazon" />
          </div>

          <section id="features" className="py-24 max-w-7xl mx-auto px-6 scroll-mt-20">
             <div className="grid md:grid-cols-3 gap-12">
                <div className="p-8 rounded-2xl hover:bg-slate-50 transition-colors group">
                   <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6 text-green-700 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                   </div>
                   <h3 className="text-xl font-bold mb-4">Auto-Reminders</h3>
                   <p className="text-slate-500 leading-relaxed">Reduce no-shows by up to 40% with automated text and email reminders sent directly to your clients.</p>
                </div>
                <div className="p-8 rounded-2xl hover:bg-slate-50 transition-colors group">
                   <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-700 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                   </div>
                   <h3 className="text-xl font-bold mb-4">Online Payments</h3>
                   <p className="text-slate-500 leading-relaxed">Securely accept deposits or full payments at the time of booking with integrated Square and Stripe support.</p>
                </div>
                <div className="p-8 rounded-2xl hover:bg-slate-50 transition-colors group">
                   <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6 text-purple-700 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                   </div>
                   <h3 className="text-xl font-bold mb-4">Staff Management</h3>
                   <p className="text-slate-500 leading-relaxed">Coordinate schedules for your entire team with individual logins, permissions, and syncable Google/Outlook calendars.</p>
                </div>
             </div>
          </section>

          <Testimonials />

          <section id="pricing" className="py-24 bg-slate-900 text-white overflow-hidden relative scroll-mt-20">
             <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-full h-full"><circle cx="100" cy="50" r="50" fill="white" /></svg>
             </div>
             <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to grow your spa?</h2>
                <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">Join the world's most successful wellness businesses today. Set up takes less than 2 minutes.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                   <Button size="lg" variant="primary" className="bg-white !text-slate-900 hover:bg-slate-100">Get Started for Free</Button>
                   <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" onClick={() => setView('pricing')}>View Detailed Pricing</Button>
                </div>
             </div>
          </section>
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