// photon-index.ts — server-only access to the photon graph.
//
// Reads _intake/photons/all.json (a snapshot of every photon as a flat
// array). Loaded once per Node process, indexed in memory. Fast enough
// for 45K records (linear scan is ~10-30ms; precomputed indices for
// id/lang make lookups O(1) and per-lang filtered O(k)).
//
// We use JSON not sqlite so the function is portable (no native deps
// like better-sqlite3) and the data is part of the build artifact.

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
};

const REPO_ROOT = path.resolve(process.cwd());
const JSON_PATH = path.join(REPO_ROOT, "_intake", "photons", "all.json");

type LoadedIndex = {
  all: Photon[];
  byId: Map<string, Photon>;
  byLang: Map<string, Photon[]>;
};

let _cache: LoadedIndex | null | undefined;

function load(): LoadedIndex | null {
  if (_cache !== undefined) return _cache;
  if (!fs.existsSync(JSON_PATH)) {
    _cache = null;
    return null;
  }
  try {
    const raw = fs.readFileSync(JSON_PATH, "utf-8");
    const all = JSON.parse(raw) as Photon[];
    const byId = new Map<string, Photon>();
    const byLang = new Map<string, Photon[]>();
    for (const p of all) {
      byId.set(p.id, p);
      const lang = p.lang || "en";
      if (!byLang.has(lang)) byLang.set(lang, []);
      byLang.get(lang)!.push(p);
    }
    _cache = { all, byId, byLang };
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
  // Pick pool: filtered by lang if provided, else the whole set
  const pool = lang ? idx.byLang.get(lang) || [] : idx.all;
  const scored: { p: Photon; s: number }[] = [];
  for (const p of pool) {
    if (kind && p.kind !== kind) continue;
    const surface = (p.surface || "").toLowerCase();
    const meaning = (p.meaning_en || "").toLowerCase();
    // Score: exact surface match > surface contains > meaning contains
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
