import React from 'react';
import { Alert } from '../ui/Alert';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { cx } from '../ui/cx';

export interface ScheduleLoadingStateProps {
  message?: string;
  variant?: 'banner' | 'skeleton';
  className?: string;
}

export const ScheduleLoadingState: React.FC<ScheduleLoadingStateProps> = ({
<<<<<<< HEAD
  message = 'Syncing with Setmore…',
=======
  message = 'Loading schedule…',
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
  variant = 'banner',
  className,
}) => {
  if (variant === 'skeleton') {
    return <LoadingSkeleton className={className} rows={6} />;
  }
  return (
    <Alert tone="info" className={cx(className)} title={message}>
      <span className="inline-flex items-center gap-2">
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        Live calendar data is updating.
      </span>
    </Alert>
  );
};

export default ScheduleLoadingState;
