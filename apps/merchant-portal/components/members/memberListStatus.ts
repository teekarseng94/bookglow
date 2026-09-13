/** Status copy for the Members list footer. Header always uses the outlet total. */
export function memberListStatusLabel(args: {
  searching: boolean;
  shownCount: number;
  loadedCount: number;
  totalCount: number;
}): string {
  const { searching, shownCount, loadedCount, totalCount } = args;
  if (searching) {
    return `${shownCount.toLocaleString()} match${shownCount === 1 ? '' : 'es'}`;
  }
  if (loadedCount < totalCount) {
    return `${loadedCount.toLocaleString()} of ${totalCount.toLocaleString()} members shown`;
  }
  return `${totalCount.toLocaleString()} members`;
}
