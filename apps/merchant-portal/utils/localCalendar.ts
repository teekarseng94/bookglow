/** Calendar dates in the browser's local timezone. BookGlow outlets operate in Asia/Kuala_Lumpur. */

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function localMonthBounds(now: Date): { start: string; end: string } {
  return {
    start: formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

export function resolveDisplayedClientCount(input: {
  rpcCount: number | null;
  exactCount: number | null;
  loadedPageLength: number;
}): number {
  if (input.rpcCount != null) return input.rpcCount;
  if (input.exactCount != null) return input.exactCount;
  return input.loadedPageLength;
}
