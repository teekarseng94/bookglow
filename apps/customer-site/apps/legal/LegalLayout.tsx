import React, { useEffect } from 'react';
import { Logo } from '../../constants';
import { Footer } from '../../components/landing/Footer';
import { BOOKGLOW_PUBLIC_ORIGIN } from '../../src/legal/legalContact';

interface LegalLayoutProps {
  title: string;
  description: string;
  canonicalPath: string;
  children: React.ReactNode;
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({
  title,
  description,
  canonicalPath,
  children,
}) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | Bookglow`;

    const upsertMeta = (selector: string, create: () => HTMLMetaElement, apply: (el: HTMLMetaElement) => void) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = create();
        document.head.appendChild(el);
      }
      apply(el);
    };

    upsertMeta('meta[name="description"]', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      return meta;
    }, (el) => el.setAttribute('content', description));

    upsertMeta('meta[name="robots"]', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      return meta;
    }, (el) => el.setAttribute('content', 'index,follow'));

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${BOOKGLOW_PUBLIC_ORIGIN}${canonicalPath}`;

    return () => {
      document.title = previousTitle;
    };
  }, [canonicalPath, description, title]);

  return (
    <div className="bookglow-public-site bookglow-legal-page min-h-screen gradient-bg">
      <header className="bookglow-legal-header">
        <div className="bookglow-legal-header__inner">
          <a href="/" className="hover:opacity-80 transition-opacity shrink-0" aria-label="Bookglow home">
            <Logo />
          </a>
          <div className="bookglow-legal-header__actions">
            <a href="/login" className="bookglow-legal-header__login">
              Login
            </a>
            <a href="/signup" className="hidden sm:inline-flex items-center justify-center rounded-lg px-5 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ backgroundColor: '#7656D6' }}>
              Start free
            </a>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <Footer />
    </div>
  );
};

export default LegalLayout;
