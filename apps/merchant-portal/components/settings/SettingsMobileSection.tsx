import React from 'react';
import { SettingsSection, type SettingsSectionProps } from './SettingsSection';

/** Mobile-oriented alias — same accordion section with defaultOpen false. */
export const SettingsMobileSection: React.FC<SettingsSectionProps> = (props) => (
  <SettingsSection desktopAlwaysOpen defaultOpen={false} {...props} />
);

export default SettingsMobileSection;
