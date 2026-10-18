import { readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import type { Photon, PhotonStats, SearchOptions, SearchResult } from "./photon-db";

type Row = [string, string, string, string, string | null, string | null, string];

let cache: { rows: Row[]; lower: string[]; byId: Map<string, Row>; stats: PhotonStats } | null = null;

function load() {
  if (cache) return cache;
  const file = path.join(process.cwd(), "data", "photons.json.gz");
  const rows = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8")) as Row[];
  const by_lang: Record<string, number> = {};
  for (const r of rows) by_lang[r[1]] = (by_lang[r[1]] ?? 0) + 1;
  cache = {
    rows,
    lower: rows.map((r) => r[2].toLowerCase()),
    byId: new Map(rows.map((r) => [r[0], r])),
    stats: { total: rows.length, by_lang },
  };
  return cache;
}

function toPhoton(r: Row): Photon {
  return { id: r[0], kind: "word", lang: r[1], surface: r[2], meaning_en: r[3], pos: r[4], ipa: r[5], tier: r[6], branch: [] };
}

export function bakedGet(id: string): Photon | null {
  const r = load().byId.get(id);
  return r ? toPhoton(r) : null;
}

export function bakedStats(): PhotonStats {
  return load().stats;
}

function escape(w: string): string {
  return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function bakedSearch(query: string, opts: SearchOptions = {}): SearchResult {
  const t0 = Date.now();
  const { rows, lower } = load();
  const q = query.trim().toLowerCase();
  const topK = Math.min(Math.max(opts.topK ?? 30, 1), 100);
  const tiers: Row[][] = [[], [], [], []];
  const patterns = q.split(/\s+/).filter((w) => w.length > 2).map((w) => new RegExp(`\\b${escape(w)}`));
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (opts.lang && r[1] !== opts.lang) continue;
    const s = lower[i];
    if (s === q) tiers[0].push(r);
    else if (s.startsWith(q)) { if (tiers[1].length < topK) tiers[1].push(r); }
    else if (s.includes(q)) { if (tiers[2].length < topK) tiers[2].push(r); }
    else if (patterns.length && tiers[3].length < topK) {
      const m = r[3].toLowerCase();
      if (patterns.every((p) => p.test(m))) tiers[3].push(r);
    }
  }
  const results = tiers.flat().slice(0, topK).map(toPhoton);
  return { query: query.trim(), n_results: results.length, results, took_ms: Date.now() - t0 };
}
