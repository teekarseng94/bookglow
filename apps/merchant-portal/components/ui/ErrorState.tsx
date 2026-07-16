import React from 'react';
import { Alert } from './Alert';
import { Button } from './Button';
import { cx } from './cx';

export interface ErrorStateProps {
  title?: React.ReactNode;
  message: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  className,
}) => (
  <div className={cx('space-y-3', className)}>
    <Alert tone="danger" title={title}>
      {message}
    </Alert>
    {onRetry ? (
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {retryLabel}
      </Button>
    ) : null}
  </div>
);

export default ErrorState;
