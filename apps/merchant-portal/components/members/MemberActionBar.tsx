import React from 'react';
import { StickyActionBar } from '../ui/StickyActionBar';
import { cx } from '../ui/cx';

export interface MemberActionBarProps {
  leading?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Sticky / footer action region — do not hide existing actions. */
export const MemberActionBar: React.FC<MemberActionBarProps> = ({
  leading,
  children,
  className,
}) => (
  <StickyActionBar className={cx(className)} leading={leading}>
    {children}
  </StickyActionBar>
);

export default MemberActionBar;
