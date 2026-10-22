import { rosLiveLocal } from "@ros/contract";
import { href } from "./router";

export const SITE_ROUTES: Readonly<Record<string, string>> = { "/api/canon/search": "/local/canon/search", "/api/explore/search": "/local/explore/search", "/api/explore/rows": "/local/explore/rows" };
export const CANON_TROUBLE = "bkt:canon-trouble";
export const ACADEMY_PROGRESS = "/api/academy/progress";
export const ACADEMY_EVENT = "/api/academy/event";

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
  if (p === "/research-os/productions") return href({ name: "productions" });
  if (p === "/research-os/solvability" || p === "/research-os/software" || p === "/research-os/patents") return href({ name: "atlases" });
  if (p === "/research-os/learn/path" || p === "/research-os/learn") return href({ name: "learn" });
  const languages = /^\/research-os\/learn\/languages(?:\/([^/]+)(?:\/(place|study))?)?$/.exec(p);
  if (languages) {
    const system = languages[1] && decodeURIComponent(languages[1]);
    if (!system) return href({ name: "languages" });
    if (languages[2] === "study") return href({ name: "langStudy", system });
    if (languages[2] === "place") {
      const lang = url.searchParams.get("lang");
      return href({ name: "langPlace", system, lang: lang && /^[a-z]{2,3}$/.test(lang) ? lang : undefined });
    }
    return href({ name: "langSystem", system });
  }
  const learn = /^\/research-os\/learn\/([^/]+)(?:\/([^/]+))?$/.exec(p);
  if (!learn) return null;
  const deck = decodeURIComponent(learn[1]);
  const step = learn[2] && decodeURIComponent(learn[2]);
  if (step === "study") return href({ name: "deck", deck });
  if (step === "place" || step === "assess") return href({ name: step, deck });
  return href({ name: "deck", deck, atom: step || undefined });
}

type Hit = { claim_id: number; concept: string; slug: string; score: number };

function trouble(status: number): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(CANON_TROUBLE, { detail: { status } }));
}

const CORPUS_FILE = /^\/academy-app\/corpus\/([A-Za-z0-9._-]{1,80})\.json$/;

async function corpusFile(base: typeof fetch, token: string, name: string, signal?: AbortSignal | null): Promise<Response> {
  const get = (path: string) => base(path, { method: "GET", signal, headers: { authorization: `Bucket ${token}` } });
  const reply = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  if (name.startsWith("lang-")) return get(`/local/lang-corpus?file=${encodeURIComponent(`${name}.json`)}`);
  if (name === "index") {
    const r = await get("/local/decks");
    if (!r.ok) return r;
    const { decks } = (await r.json()) as { decks: { id: string; title: string }[] };
    return reply({ decks: decks.map((d) => ({ id: d.id, file: `corpus/${d.id}.json`, pill: d.title })) });
  }
  const r = await get(`/local/atoms?deck=${encodeURIComponent(name)}`);
  if (!r.ok) return r;
  const { atoms } = (await r.json()) as { atoms: unknown[] };
  return reply({ meta: {}, atoms });
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
    if (url.origin === origin && url.pathname === ACADEMY_EVENT && method === "POST") return new Response(null, { status: 204 });
    const corpus = url.origin === origin && method === "GET" ? CORPUS_FILE.exec(url.pathname) : null;
    if (corpus) return corpusFile(base, token, corpus[1], signal ?? undefined);
    if (url.origin === origin && url.pathname === ACADEMY_PROGRESS && (method === "GET" || method === "POST")) {
      const headers: Record<string, string> = { authorization: `Bucket ${token}` };
      if (method === "POST") headers["content-type"] = "application/json";
      const body = method === "POST" ? init?.body ?? (input instanceof Request ? await input.clone().text() : undefined) : undefined;
      return base("/local/progress", { method, signal, headers, body });
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
      if (!(url.pathname === "/api/explore/rows" && r.status === 404)) trouble(r.status);
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
