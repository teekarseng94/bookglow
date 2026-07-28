import React from 'react';
import { Button } from '../ui/Button';
import { SettingsSaveStatus, type SettingsSaveStatusValue } from './SettingsSaveStatus';
import { cx } from '../ui/cx';

export interface SettingsSaveBarProps {
  onSave: () => void;
  status?: SettingsSaveStatusValue | 'success' | 'error';
  disabled?: boolean;
  saveLabel?: string;
  className?: string;
}

/**
 * One explicit Save Changes control. Parent owns save logic — no auto-save here.
 */
export const SettingsSaveBar: React.FC<SettingsSaveBarProps> = ({
  onSave,
  status = 'idle',
  disabled,
  saveLabel = 'Save Changes',
  className,
}) => {
  const normalized: SettingsSaveStatusValue =
    status === 'success'
      ? 'saved'
      : status === 'error'
        ? 'failed'
        : status === 'saving'
          ? 'saving'
          : status === 'unsaved' || status === 'saved' || status === 'failed' || status === 'idle'
            ? status
            : 'idle';
  const saving = normalized === 'saving';
  return (
    <div
      className={cx(
        'm-settings-body flex items-center justify-between gap-3 pt-4 border-t border-[var(--line)]',
        className,
      )}
    >
      <SettingsSaveStatus status={normalized} />
      <Button variant="primary" onClick={onSave} disabled={disabled || saving}>
        {saving ? 'Saving…' : normalized === 'saved' ? 'Saved' : saveLabel}
      </Button>
    </div>
  );
};

export default SettingsSaveBar;
