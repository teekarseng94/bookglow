import React from 'react';
import { Logo } from '../../constants';
import { BOOKGLOW_PRIVACY_PATH } from '../../src/legal/legalContact';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-100 py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <Logo />
        <div className="flex gap-8 text-sm text-slate-400">
          <a href={BOOKGLOW_PRIVACY_PATH} className="hover:text-slate-600 transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-slate-600 transition-colors">
            Terms of Service
          </a>
          <a href="#" className="hover:text-slate-600 transition-colors">
            Cookie Settings
          </a>
        </div>
        <div className="text-sm text-slate-400 text-center md:text-right">
          <div>© {new Date().getFullYear()} Bookglow Inc. All rights reserved.</div>
          <div className="mt-1">Powered by Catla Solution.</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
