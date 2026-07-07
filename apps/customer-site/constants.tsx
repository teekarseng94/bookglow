
import React from 'react';
import { NavItem } from './types';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Learn', href: '#learn' },
  { label: 'Integrations', href: '#integrations' },
  { label: 'Features', href: '#features' },
  { label: 'Industries', href: '#industries' },
  { label: 'Pricing', href: '#pricing' },
];

export const PRIMARY_GREEN = '#1D352B';

export const Logo = () => (
  <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter" style={{ color: PRIMARY_GREEN }}>
    <span>zenflow</span>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/>
      <path d="M19 17v4"/>
      <path d="M3 5h4"/>
      <path d="M17 19h4"/>
    </svg>
  </div>
);
