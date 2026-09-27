/** Outlet-scoped menu categories are plain strings on the outlet + catalog items. */

export const UNCATEGORIZED_CATEGORY = 'Uncategorized';

export type CatalogCategoryItem = {
  category?: string;
  categoryId?: string;
};

export type CategoryUsage = {
  services: number;
  products: number;
  packages: number;
};

export function itemCategory(item: CatalogCategoryItem): string {
  return String(item.category || item.categoryId || '').trim();
}

/** Persist whatever the outlet stored. Never inject Massage/Facial/etc. */
export function normalizeLoadedCategories(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const next: string[] = [];
  for (const value of list) {
    const name = String(value ?? '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    next.push(name);
  }
  return next;
}

export function countCategoryUsage(
  category: string,
  services: CatalogCategoryItem[],
  products: CatalogCategoryItem[],
  packages: CatalogCategoryItem[],
): CategoryUsage {
  const match = (item: CatalogCategoryItem) => itemCategory(item) === category;
  return {
    services: services.filter(match).length,
    products: products.filter(match).length,
    packages: packages.filter(match).length,
  };
}

export function usageTotal(usage: CategoryUsage): number {
  return usage.services + usage.products + usage.packages;
}

export function formatUsageSummary(usage: CategoryUsage): string {
  const parts: string[] = [];
  if (usage.services) parts.push(`${usage.services} service${usage.services === 1 ? '' : 's'}`);
  if (usage.products) parts.push(`${usage.products} product${usage.products === 1 ? '' : 's'}`);
  if (usage.packages) parts.push(`${usage.packages} package${usage.packages === 1 ? '' : 's'}`);
  return parts.join(', ') || 'no items';
}

/** Merchant-managed names first, then any leftover item labels so filters still find existing rows. */
export function mergeFilterCategories(
  managed: string[],
  items: CatalogCategoryItem[],
): string[] {
  return normalizeLoadedCategories([
    ...managed,
    ...items.map((item) => itemCategory(item)),
  ]);
}

export function validateCategoryName(
  name: string,
  existing: string[],
  options: { ignore?: string } = {},
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Enter a category name.';
  const clash = existing.some(
    (entry) =>
      entry.toLowerCase() === trimmed.toLowerCase() &&
      entry !== options.ignore,
  );
  if (clash) return 'That category already exists.';
  return null;
}
