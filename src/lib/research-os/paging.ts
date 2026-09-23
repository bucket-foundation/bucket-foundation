/**
 * Two different limits bite on a read filtered by a list of ids.
 *
 * PostgREST filters travel in the URL, and a long `in (...)` list fails
 * with "URI too long", so the ids are chunked at IN_CHUNK. PostgREST also
 * stops at PAGE rows per request, which the chunking says nothing about:
 * 60 node ids on a dense branch overflow a thousand edges without an
 * error, and the caller reads the truncation as the whole answer. The
 * page loop closes that (Bucket critic C42).
 *
 * The callback takes the page and must apply both `.range(page.from,
 * page.to)` and an `.order()`. Postgres gives no stable row order across
 * LIMIT/OFFSET without one, so an unordered page can repeat a row and
 * skip another.
 */
export const IN_CHUNK = 60;
export const PAGE = 1000;
/**
 * A callback that forgets `.range()` answers the same full page forever,
 * so the loop would spin rather than truncate. This turns that mistake
 * into a loud failure at 200,000 rows.
 */
export const MAX_PAGES = 200;

export class PagingError extends Error {
  constructor(what: string) {
    super(`${what}: a paged read did not terminate after ${MAX_PAGES} pages. The callback must apply .range(page.from, page.to).`);
    this.name = "PagingError";
    // Downlevelled `extends Error` loses the prototype chain, so
    // `instanceof PagingError` answers false without this.
    Object.setPrototypeOf(this, PagingError.prototype);
  }
}

export interface ChunkPage {
  from: number;
  to: number;
}

/**
 * One read, paged. For a query with no id list to chunk: the row cap
 * still applies, so a learner past a thousand rows loses the remainder
 * with no error (Bucket critic C45). The callback applies
 * `.range(page.from, page.to)` and an `.order()`.
 */
export async function pagedRead<T>(
  run: (page: ChunkPage) => Promise<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let p = 0; ; p += 1) {
    if (p >= MAX_PAGES) throw new PagingError("pagedRead");
    const { data, error } = await run({ from: p * PAGE, to: p * PAGE + PAGE - 1 });
    if (error) throw new Error(error.message);
    const page = data || [];
    out.push(...page);
    if (page.length < PAGE) break;
  }
  return out;
}

export async function inChunks<T>(
  ids: string[],
  run: (chunk: string[], page: ChunkPage) => Promise<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const chunk = ids.slice(i, i + IN_CHUNK);
    for (let p = 0; ; p += 1) {
      if (p >= MAX_PAGES) throw new PagingError("inChunks");
      const { data, error } = await run(chunk, { from: p * PAGE, to: p * PAGE + PAGE - 1 });
      if (error) throw new Error(error.message);
      const page = data || [];
      out.push(...page);
      if (page.length < PAGE) break;
    }
  }
  return out;
}
