import React from 'react';
import { cx } from '../ui/cx';

export interface PlatformBannerProps {
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

/** Unmistakable remote / platform-control context. */
export const PlatformBanner: React.FC<PlatformBannerProps> = ({
  title = 'Remote control mode',
  children,
  className,
}) => (
  <div
    className={cx(
      'rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-100',
      className,
    )}
    role="status"
  >
    <p className="text-xs font-black uppercase tracking-widest text-amber-300">{title}</p>
    <p className="text-sm mt-1 text-amber-50/90">
      {children ||
        'You are in the Bookglow platform console. This is not a merchant outlet workspace. Ordinary merchant users never see this navigation.'}
    </p>
  </div>
);

export default PlatformBanner;
