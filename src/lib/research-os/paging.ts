export const IN_CHUNK = 60;
export const PAGE = 1000;
export const MAX_PAGES = 200;

export class PagingError extends Error {
  constructor(what: string) {
    super(`${what}: a paged read did not terminate after ${MAX_PAGES} pages. The callback must apply .range(page.from, page.to).`);
    this.name = "PagingError";
    Object.setPrototypeOf(this, PagingError.prototype);
  }
}

export interface ChunkPage {
  from: number;
  to: number;
}

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
