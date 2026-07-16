import React from 'react';
import { cx } from './cx';

export interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
  rowClassName?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  rows = 4,
  className,
  rowClassName,
}) => (
  <div className={cx('space-y-3', className)} aria-busy="true" aria-live="polite">
    <span className="sr-only">Loading</span>
    {Array.from({ length: rows }).map((_, index) => (
      <div
        key={index}
        className={cx('ui-skeleton h-10 w-full', index % 3 === 0 && 'max-w-[80%]', rowClassName)}
      />
    ))}
  </div>
);

export default LoadingSkeleton;
