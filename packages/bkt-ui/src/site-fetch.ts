import { rosLiveLocal } from "@ros/contract";
import { href } from "./router";

export const SITE_ROUTES: Readonly<Record<string, string>> = { "/api/canon/search": "/local/canon/search", "/api/explore/search": "/local/explore/search" };
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
  if (path === "/explore" || path.startsWith("/explore#") || path.startsWith("/explore?")) return href({ name: "explore" });
  const ros = rosHref(path);
  if (ros) return ros;
  const find = /^\/canon\/search\?q=([^&#]+)$/.exec(path);
  if (!find) return null;
  try {
    return href({ name: "canon", find: decodeURIComponent(find[1]) });
  } catch {
    return null;
  }
}

function rosHref(path: string): string | null {
  if (!path.startsWith("/research-os")) return null;
  let url: URL;
  try {
    url = new URL(path, "http://window.local");
    decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  const p = url.pathname;
  const node = /^\/research-os\/n\/([^/]+)$/.exec(p);
  if (node) return href({ name: "node", slug: decodeURIComponent(node[1]) });
  if (p === "/research-os/map") {
    const branch = url.searchParams.get("branch");
    return url.searchParams.get("view") === "globe" ? href({ name: "canon" }) : href(branch ? { name: "graph", branch } : { name: "graph" });
  }
  if (p === "/research-os/home" || p === "/research-os") return href({ name: "progress" });
  if (p === "/research-os/profile") return href({ name: "profile" });
  if (p === "/research-os/learn/path" || p === "/research-os/learn") return href({ name: "learn" });
  const learn = /^\/research-os\/learn\/([^/]+)(?:\/([^/]+))?$/.exec(p);
  if (learn) return href({ name: "deck", deck: decodeURIComponent(learn[1]), atom: learn[2] ? decodeURIComponent(learn[2]) : undefined });
  return null;
}

type Hit = { claim_id: number; concept: string; slug: string; score: number };

function trouble(status: number): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(CANON_TROUBLE, { detail: { status } }));
}

export const OFFLINE_REFUSED = "bkt:offline-refused";
export const OFFLINE_MESSAGE = "Bucket works offline on this computer.";

export function siteFetch(base: typeof fetch, origin: string, token: string, offline = false): typeof fetch {
  const wrapped = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase();
    let url: URL;
    try {
      url = new URL(raw, origin);
    } catch {
      return base(input, init);
    }
    if (offline && url.origin !== origin) {
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(OFFLINE_REFUSED, { detail: { url: url.href } }));
      console.warn(`bkt offline: refused ${url.href}`);
      throw new TypeError(OFFLINE_MESSAGE);
    }
    const signal = init?.signal ?? (typeof input === "object" && "signal" in input ? input.signal : undefined);
    const ros = url.origin === origin ? rosLiveLocal(url.pathname) : undefined;
    if (ros && (method === "GET" || method === "POST")) {
      const headers: Record<string, string> = { authorization: `Bucket ${token}` };
      if (method === "POST") headers["content-type"] = "application/json";
      const body = method === "POST" ? init?.body ?? (input instanceof Request ? await input.clone().text() : undefined) : undefined;
      return base(`${ros}${url.search}`, { method, signal, headers, body });
    }
    const local = url.origin === origin && method === "GET" ? SITE_ROUTES[url.pathname] : undefined;
    if (!local) return base(input, init);
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
    if (url.pathname !== "/api/canon/search") return r;
    const body = (await r.json()) as { results?: Hit[] };
    const results = (body.results ?? []).filter((h) => h.score > 0);
    for (const h of results) rememberExcerpt(h.concept, h.slug, h.claim_id);
    return new Response(JSON.stringify({ ...body, n_results: results.length, results }), { status: 200, headers: { "content-type": "application/json" } });
  };
  return wrapped as typeof fetch;
}
