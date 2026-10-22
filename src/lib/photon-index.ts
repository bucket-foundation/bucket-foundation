import fs from "fs";
import path from "path";

export type Photon = {
  id: string;
  kind: string;
  lang: string;
  surface: string;
  meaning_en: string;
  tier: string;
  branch: string[];
  pos?: string | null;
  ipa?: string | null;
  provenance?: {
    source: string;
    source_uri: string;
    captured_at: string;
  };
  relations?: { predicate: string; to: string }[];
  means_like?: [string, number][];
  means_like_same?: [string, number][];
};

export type MeansLikeHit = {
  surface: string;
  lang: string;
  meaning_en: string;
  ipa: string | null;
  pos: string | null;
  score: number;
  provenance: string;
};

export const PHOTON_PROVENANCE = "Wiktionary via Kaikki (CC-BY-SA)";

const REPO_ROOT = path.resolve(process.cwd());
const JSON_PATH = path.join(REPO_ROOT, "_intake", "photons", "all.json");

type LoadedIndex = {
  all: Photon[];
  byId: Map<string, Photon>;
  byLang: Map<string, Photon[]>;
  bySurface: Map<string, Photon[]>;
};

let _cache: LoadedIndex | null | undefined;

const COMBINING_MARKS = new RegExp("\\p{M}", "gu");

function surfaceKey(s: string): string {
  return s.normalize("NFKD").replace(COMBINING_MARKS, "").trim().toLowerCase();
}

export function resetPhotonIndex(jsonPath?: string): void {
  _cache = undefined;
  if (jsonPath) _jsonPath = jsonPath;
}

let _jsonPath = JSON_PATH;

function load(): LoadedIndex | null {
  if (_cache !== undefined) return _cache;
  if (!fs.existsSync(_jsonPath)) {
    _cache = null;
    return null;
  }
  try {
    const raw = fs.readFileSync(_jsonPath, "utf-8");
    const all = JSON.parse(raw) as Photon[];
    const byId = new Map<string, Photon>();
    const byLang = new Map<string, Photon[]>();
    const bySurface = new Map<string, Photon[]>();
    for (const p of all) {
      const key = surfaceKey(p.surface || "");
      if (!bySurface.has(key)) bySurface.set(key, []);
      bySurface.get(key)!.push(p);
      byId.set(p.id, p);
      const lang = p.lang || "en";
      if (!byLang.has(lang)) byLang.set(lang, []);
      byLang.get(lang)!.push(p);
    }
    _cache = { all, byId, byLang, bySurface };
    return _cache;
  } catch {
    _cache = null;
    return null;
  }
}

export function getPhoton(id: string): Photon | null {
  const idx = load();
  if (!idx) return null;
  return idx.byId.get(id) || null;
}

export function searchPhotons(query: string, lang?: string, kind?: string, topK = 20): Photon[] {
  const idx = load();
  if (!idx) return [];
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const pool = lang ? idx.byLang.get(lang) || [] : idx.all;
  const scored: { p: Photon; s: number }[] = [];
  for (const p of pool) {
    if (kind && p.kind !== kind) continue;
    const surface = (p.surface || "").toLowerCase();
    const meaning = (p.meaning_en || "").toLowerCase();
    let s = 0;
    if (surface === q) s = 1000;
    else if (surface.startsWith(q)) s = 500;
    else if (surface.includes(q)) s = 200;
    else if (meaning.includes(q)) s = 50;
    if (s > 0) scored.push({ p, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, topK).map((x) => x.p);
}

export function photonStats(): {
  total: number;
  by_kind: Record<string, number>;
  by_lang: Record<string, number>;
} {
  const idx = load();
  if (!idx) return { total: 0, by_kind: {}, by_lang: {} };
  const byKind: Record<string, number> = {};
  const byLang: Record<string, number> = {};
  for (const p of idx.all) {
    byKind[p.kind] = (byKind[p.kind] || 0) + 1;
    byLang[p.lang] = (byLang[p.lang] || 0) + 1;
  }
  return { total: idx.all.length, by_kind: byKind, by_lang: byLang };
}

export function lookupPhoton(surface: string, lang?: string | null): Photon | null {
  const idx = load();
  if (!idx) return null;
  const hits = idx.bySurface.get(surfaceKey(surface)) || [];
  if (!hits.length) return null;
  const pool = lang ? hits.filter((p) => p.lang === lang) : hits;
  if (!pool.length) return null;
  const exact = pool.filter((p) => p.surface === surface);
  const ranked = (exact.length ? exact : pool).slice().sort((a, b) => {
    const ml = Number(Boolean(b.means_like?.length)) - Number(Boolean(a.means_like?.length));
    if (ml) return ml;
    return Number(b.lang === "en") - Number(a.lang === "en");
  });
  return ranked[0];
}

export function meansLike(
  surface: string,
  lang?: string | null,
  k = 10,
  cross = true,
): { found: boolean; results: MeansLikeHit[] } {
  const idx = load();
  const p = lookupPhoton(surface, lang);
  if (!idx || !p) return { found: false, results: [] };
  const list = (cross ? p.means_like : p.means_like_same || p.means_like?.filter(([id]) => idx.byId.get(id)?.lang === p.lang)) || [];
  const limit = Math.min(Math.max(Math.floor(k) || 10, 1), 50);
  const results: MeansLikeHit[] = [];
  for (const [id, score] of list) {
    if (id === p.id) continue;
    const n = idx.byId.get(id);
    if (!n) continue;
    results.push({
      surface: n.surface,
      lang: n.lang,
      meaning_en: (n.meaning_en || "").slice(0, 120),
      ipa: n.ipa ?? null,
      pos: n.pos ?? null,
      score,
      provenance: PHOTON_PROVENANCE,
    });
    if (results.length >= limit) break;
  }
  return { found: true, results };
}
