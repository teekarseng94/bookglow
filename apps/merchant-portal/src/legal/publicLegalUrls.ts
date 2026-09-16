import { customerSiteOrigin } from '../../utils/customerSiteUrl';

const FALLBACK_ORIGIN = 'https://bookglow.my';

function publicOrigin(): string {
  return customerSiteOrigin() || FALLBACK_ORIGIN;
}

export function publicPrivacyPolicyUrl(): string {
  return `${publicOrigin()}/privacy`;
}

export function publicAccountDeletionUrl(): string {
  return `${publicOrigin()}/account-deletion`;
}
