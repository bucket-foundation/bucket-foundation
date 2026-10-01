import { href } from "./router";

export const SITE_ROUTES: Readonly<Record<string, string>> = { "/api/canon/search": "/local/canon/search" };
export const CANON_TROUBLE = "bkt:canon-trouble";

const seen = new Map<string, number>();

export function rememberExcerpt(concept: string, slug: string, id: number): void {
  seen.set(`${concept}/${slug}`, id);
}

export function windowHref(path: string): string | null {
  if (path.startsWith("#/")) return path;
  const excerpt = /^\/excerpts\/([^/?#]+)\/([^/?#]+)$/.exec(path);
  if (excerpt) {
    const id = seen.get(`${excerpt[1]}/${excerpt[2]}`);
    return id === undefined ? null : href({ name: "search", id });
  }
  if (path === "/canon/search") return href({ name: "search" });
  const find = /^\/canon\/search\?q=([^&#]+)$/.exec(path);
  if (!find) return null;
  try {
    return href({ name: "canon", find: decodeURIComponent(find[1]) });
  } catch {
    return null;
  }
}

type Hit = { claim_id: number; concept: string; slug: string; score: number };

function trouble(status: number): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(CANON_TROUBLE, { detail: { status } }));
}

export function siteFetch(base: typeof fetch, origin: string, token: string): typeof fetch {
  const wrapped = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase();
    let url: URL;
    try {
      url = new URL(raw, origin);
    } catch {
      return base(input, init);
    }
    const local = url.origin === origin && method === "GET" ? SITE_ROUTES[url.pathname] : undefined;
    if (!local) return base(input, init);
    const signal = init?.signal ?? (typeof input === "object" && "signal" in input ? input.signal : undefined);
    let r: Response;
    try {
      r = await base(`${local}${url.search}`, { method: "GET", signal, headers: { authorization: `Bucket ${token}` } });
    } catch (e) {
      if ((e as Error).name !== "AbortError") trouble(0);
      throw e;
    }
    if (!r.ok) {
      trouble(r.status);
      return r;
    }
    const body = (await r.json()) as { results?: Hit[] };
    const results = (body.results ?? []).filter((h) => h.score > 0);
    for (const h of results) rememberExcerpt(h.concept, h.slug, h.claim_id);
    return new Response(JSON.stringify({ ...body, n_results: results.length, results }), { status: 200, headers: { "content-type": "application/json" } });
  };
  return wrapped as typeof fetch;
}
