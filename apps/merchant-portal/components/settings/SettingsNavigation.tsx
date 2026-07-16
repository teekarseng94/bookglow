import React from 'react';
import { cx } from '../ui/cx';

export type SettingsSectionId =
  | 'business-profile'
  | 'booking-page'
  | 'operating-hours'
  | 'notifications'
  | 'receipt-payment'
  | 'access-permissions'
  | 'integrations'
  | 'advanced';

export const SETTINGS_NAV_ITEMS: { id: SettingsSectionId; label: string }[] = [
  { id: 'business-profile', label: 'Business profile' },
  { id: 'booking-page', label: 'Booking page' },
  { id: 'operating-hours', label: 'Operating hours' },
  { id: 'notifications', label: 'Notifications & reminders' },
  { id: 'receipt-payment', label: 'Receipt & payment' },
  { id: 'access-permissions', label: 'Access & permissions' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'advanced', label: 'Advanced settings' },
];

export interface SettingsNavigationProps {
  activeId: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
  className?: string;
}

export const SettingsNavigation: React.FC<SettingsNavigationProps> = ({
  activeId,
  onSelect,
  className,
}) => (
  <nav
    className={cx(
      'hidden lg:block w-56 shrink-0 sticky top-4 self-start',
      className,
    )}
    aria-label="Settings sections"
  >
    <ul className="space-y-1 rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] p-2">
      {SETTINGS_NAV_ITEMS.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onSelect(item.id)}
            className={cx(
              'w-full text-left px-3 py-2 rounded-ui-sm text-sm font-semibold transition-colors',
              activeId === item.id
                ? 'bg-[var(--brand-soft)] text-[var(--brand-deep)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]',
            )}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  </nav>
);

export default SettingsNavigation;
