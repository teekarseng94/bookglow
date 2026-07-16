import React from 'react';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';

export interface ReportEmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const ReportEmptyState: React.FC<ReportEmptyStateProps> = ({
  title = 'No transactions found.',
  description,
  actionLabel,
  onAction,
}) => (
  <EmptyState
    title={title}
    description={description}
    action={
      actionLabel && onAction ? (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : undefined
    }
  />
);

export default ReportEmptyState;
