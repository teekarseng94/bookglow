/**
 * Small pure helpers for rendering merchant identity in the V2 shell.
 *
 * The public adapter currently maps both merchantName and outletName from the
 * same outlet document field, which can duplicate the name in the header. We
 * do not invent a new Firestore field; instead the header only shows the outlet
 * name when it is present AND meaningfully different from the merchant name.
 */

function norm(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/**
 * Whether to render the outlet name as a secondary line beneath the merchant
 * name. False when the outlet name is empty or a case/space-insensitive
 * duplicate of the merchant name.
 */
export function shouldShowOutletName(
  merchantName: string | null | undefined,
  outletName: string | null | undefined,
): boolean {
  const outlet = norm(outletName);
  if (outlet === '') return false;
  return outlet !== norm(merchantName);
}
