import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { academyNodeSlug } from "../../src/lib/research-os/ingest/academy";
import { knownLinks, resolveTitles, wikiTitleFromUrl, type LinkIndex, type WikiQuery } from "../../src/lib/research-os/refd";

const API = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "BucketFoundation-ResearchOS/0.2 (https://bucket.foundation; prerequisite research)";
const CACHE_FILE = path.join(__dirname, "ingest", "out", "wikipedia-links.json");
const REPO = path.join(__dirname, "..", "..");
const BATCH = 50;
const PAUSE_MS = 150;

type Cache = {
  version: 1;
  resolved: Record<string, string | null>;
  aliases: Record<string, string[]>;
  links: Record<string, string[]>;
};

export type WikiIndex = {
  titleOf: Map<string, string>;
  via: Map<string, "corpus" | "title">;
  links: LinkIndex;
  requests: number;
};

export function corpusTitles(repoRoot = REPO): Map<string, string> {
  const dir = path.join(repoRoot, "learning", "app", "corpus");
  const out = new Map<string, string>();
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith(".json")) continue;
    let json: any;
    try {
      json = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
    } catch {
      continue;
    }
    if (!json?.meta?.branch || !Array.isArray(json.atoms)) continue;
    for (const atom of json.atoms) {
      if (typeof atom?.id !== "string") continue;
      for (const r of Array.isArray(atom.resources) ? atom.resources : []) {
        const t = typeof r?.url === "string" ? wikiTitleFromUrl(r.url) : null;
        if (t) {
          out.set(academyNodeSlug(`learning/app/corpus/${name}`, atom.id), t);
          break;
        }
      }
    }
  }
  return out;
}

function loadCache(): Cache {
  if (existsSync(CACHE_FILE)) {
    try {
      const c = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
      if (c?.version === 1) return c as Cache;
    } catch {
    }
  }
  return { version: 1, resolved: {}, aliases: {}, links: {} };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function wikipediaIndex(nodes: { slug: string; title: string }[], opts: { offline?: boolean } = {}): Promise<WikiIndex> {
  const cache = loadCache();
  let requests = 0;

  async function call(params: Record<string, string>): Promise<any> {
    const qs = new URLSearchParams({ action: "query", format: "json", formatversion: "2", maxlag: "5", ...params });
    for (let attempt = 0; attempt < 5; attempt++) {
      await sleep(PAUSE_MS);
      requests++;
      const res = await fetch(`${API}?${qs}`, { headers: { "User-Agent": USER_AGENT, "Api-User-Agent": USER_AGENT } });
      const retryAfter = Number(res.headers.get("retry-after") ?? "0");
      if (res.status === 429 || res.status >= 500) {
        await sleep(Math.max(retryAfter * 1000, 2000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`Wikipedia API ${res.status}`);
      const json = await res.json();
      if (json?.error?.code === "maxlag") {
        await sleep(Math.max(retryAfter * 1000, 5000));
        continue;
      }
      if (json?.error) throw new Error(`Wikipedia API: ${json.error.code}: ${json.error.info}`);
      return json;
    }
    throw new Error("Wikipedia API: gave up after 5 attempts");
  }

  async function pages(params: Record<string, string>, onPage: (q: any) => void) {
    let cont: Record<string, string> = {};
    for (;;) {
      const json = await call({ ...params, ...cont });
      onPage(json.query ?? {});
      if (!json.continue) return;
      cont = json.continue;
    }
  }

  const fromCorpus = corpusTitles();
  const raw = new Map<string, { title: string; via: "corpus" | "title" }[]>();
  for (const n of nodes) {
    const choices: { title: string; via: "corpus" | "title" }[] = [];
    const c = fromCorpus.get(n.slug);
    if (c) choices.push({ title: c, via: "corpus" });
    if (n.title.trim()) choices.push({ title: n.title.trim(), via: "title" });
    raw.set(n.slug, choices);
  }

  const unresolved = Array.from(new Set(Array.from(raw.values()).flat().map((c) => c.title))).filter((t) => !(t in cache.resolved));
  if (!opts.offline) {
    for (let i = 0; i < unresolved.length; i += BATCH) {
      const batch = unresolved.slice(i, i + BATCH);
      const q: WikiQuery = { normalized: [], redirects: [], pages: [] };
      await pages({ titles: batch.join("|"), redirects: "1", prop: "pageprops", ppprop: "disambiguation" }, (part) => {
        q.normalized!.push(...(part.normalized ?? []));
        q.redirects!.push(...(part.redirects ?? []));
        for (const p of part.pages ?? []) if (!q.pages!.some((x) => x.title === p.title)) q.pages!.push(p);
      });
      for (const [a, t] of Array.from(resolveTitles(batch, q))) cache.resolved[a] = t;
    }
  }

  const titleOf = new Map<string, string>();
  const via = new Map<string, "corpus" | "title">();
  for (const [slug, choices] of Array.from(raw)) {
    for (const c of choices) {
      const t = cache.resolved[c.title];
      if (t) {
        titleOf.set(slug, t);
        via.set(slug, c.via);
        break;
      }
    }
  }

  const articles = Array.from(new Set(Array.from(titleOf.values())));
  if (!opts.offline) {
    const needAliases = articles.filter((t) => !(t in cache.aliases));
    for (let i = 0; i < needAliases.length; i += BATCH) {
      const batch = needAliases.slice(i, i + BATCH);
      const got = new Map<string, string[]>(batch.map((t) => [t, []]));
      await pages({ titles: batch.join("|"), prop: "redirects", rdlimit: "max", rdnamespace: "0" }, (part) => {
        for (const p of part.pages ?? []) got.get(p.title)?.push(...(p.redirects ?? []).map((r: { title: string }) => r.title));
      });
      for (const [t, a] of Array.from(got)) cache.aliases[t] = a;
    }
    const needLinks = articles.filter((t) => !(t in cache.links));
    for (let i = 0; i < needLinks.length; i += 10) {
      const batch = needLinks.slice(i, i + 10);
      const got = new Map<string, string[]>(batch.map((t) => [t, []]));
      await pages({ titles: batch.join("|"), prop: "links", pllimit: "max", plnamespace: "0" }, (part) => {
        for (const p of part.pages ?? []) got.get(p.title)?.push(...(p.links ?? []).map((l: { title: string }) => l.title));
      });
      for (const [t, l] of Array.from(got)) cache.links[t] = l;
      writeFileSync(CACHE_FILE, JSON.stringify(cache));
    }
    writeFileSync(CACHE_FILE, JSON.stringify(cache));
  }

  const aliasOf = new Map<string, string>();
  for (const t of articles) for (const a of cache.aliases[t] ?? []) aliasOf.set(a, t);
  const rawLinks = new Map(articles.filter((t) => t in cache.links).map((t) => [t, cache.links[t]]));
  return { titleOf, via, links: knownLinks(rawLinks, aliasOf), requests };
}
