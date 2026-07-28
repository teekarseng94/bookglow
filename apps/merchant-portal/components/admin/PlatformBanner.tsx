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
      'rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm',
      className,
    )}
    role="status"
  >
    <p className="text-xs font-bold uppercase tracking-widest text-amber-700">{title}</p>
    <p className="text-sm mt-1 text-amber-800">
      {children ||
        'You are in the Bookglow platform console. This is not a merchant outlet workspace. Ordinary merchant users never see this navigation.'}
    </p>
  </div>
);

export default PlatformBanner;
