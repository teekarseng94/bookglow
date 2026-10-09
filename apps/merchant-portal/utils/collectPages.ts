/** Walk a paged query until a short page. Throws instead of silently summing a truncated page. */
export async function collectPages<T>(
  fetchPage: (offset: number, limit: number) => Promise<T[]>,
  pageSize = 500,
  maxRows = 20000,
): Promise<T[]> {
  if (pageSize < 1) throw new Error("pageSize must be positive");
  const rows: T[] = [];
  for (let offset = 0; offset < maxRows; offset += pageSize) {
    const page = await fetchPage(offset, pageSize);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
  throw new Error(`Result exceeded ${maxRows} rows and was not fully loaded.`);
}
