import { describe, expect, it } from 'vitest';
import { SETTINGS_NAV_ITEMS } from '../../components/settings/SettingsNavigation';
import { publicAccountDeletionUrl, publicPrivacyPolicyUrl } from './publicLegalUrls';

describe('merchant legal links', () => {
  it('exposes Privacy Policy and account deletion in Settings navigation', () => {
    expect(SETTINGS_NAV_ITEMS.some((item) => item.id === 'legal' && item.label === 'About & legal')).toBe(true);
  });

  it('points legal URLs at the public BookGlow website', () => {
    expect(publicPrivacyPolicyUrl()).toMatch(/\/privacy$/);
    expect(publicAccountDeletionUrl()).toMatch(/\/account-deletion$/);
  });
});
