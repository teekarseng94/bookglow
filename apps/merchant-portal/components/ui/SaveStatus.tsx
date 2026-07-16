import React from 'react';
import { cx } from './cx';
import { StatusBadge } from './StatusBadge';

export type SaveStatusValue = 'idle' | 'unsaved' | 'saving' | 'saved' | 'failed';

export interface SaveStatusProps {
  status: SaveStatusValue;
  unsavedLabel?: string;
  savingLabel?: string;
  savedLabel?: string;
  failedLabel?: string;
  className?: string;
}

const toneMap = {
  idle: undefined,
  unsaved: 'warning',
  saving: 'info',
  saved: 'success',
  failed: 'danger',
} as const;

export const SaveStatus: React.FC<SaveStatusProps> = ({
  status,
  unsavedLabel = 'Unsaved changes',
  savingLabel = 'Saving…',
  savedLabel = 'Saved',
  failedLabel = 'Save failed',
  className,
}) => {
  if (status === 'idle') return null;

  const label =
    status === 'unsaved'
      ? unsavedLabel
      : status === 'saving'
        ? savingLabel
        : status === 'saved'
          ? savedLabel
          : failedLabel;

  return (
    <StatusBadge tone={toneMap[status]} className={cx(className)}>
      {label}
    </StatusBadge>
  );
};

export default SaveStatus;
