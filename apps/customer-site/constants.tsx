
import React from 'react';
import { NavItem } from './types';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Product', href: '#learn' },
  { label: 'Features', href: '#features' },
  { label: 'Industries', href: '#industries' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Resources', href: '#integrations' },
];

<<<<<<< HEAD
=======
/** Nav labels that show a decorative chevron in the mock (no separate dropdown pages yet). */
export const NAV_ITEMS_WITH_CHEVRON = new Set(['Product', 'Industries', 'Resources']);

>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
export const PRIMARY_GREEN = '#7656D6';

export const Logo = () => (
  <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter" style={{ color: PRIMARY_GREEN }}>
    <span>Bookglow</span>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/>
      <path d="M19 17v4"/>
      <path d="M3 5h4"/>
      <path d="M17 19h4"/>
    </svg>
  </div>
);
