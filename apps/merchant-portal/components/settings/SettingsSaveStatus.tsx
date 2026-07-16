import React from 'react';
import { SaveStatus, type SaveStatusValue } from '../ui/SaveStatus';
import { cx } from '../ui/cx';

export type SettingsSaveStatusValue = SaveStatusValue;

export interface SettingsSaveStatusProps {
  status: SettingsSaveStatusValue;
  className?: string;
}

export const SettingsSaveStatus: React.FC<SettingsSaveStatusProps> = ({ status, className }) => (
  <SaveStatus status={status} className={cx(className)} />
);

export default SettingsSaveStatus;
