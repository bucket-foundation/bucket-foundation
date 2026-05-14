// photon-index.ts — server-only access to the photon index sqlite.
// Reads _intake/photons/index.sqlite and serializes photons as JSON.
// Used by /api/photon endpoints and (eventually) the polingual.com app.

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
  provenance: {
    source: string;
    source_uri: string;
    captured_at: string;
  };
  relations: { predicate: string; to: string }[];
};

const REPO_ROOT = path.resolve(process.cwd());
const SQLITE_PATH = path.join(REPO_ROOT, "_intake", "photons", "index.sqlite");

// We use better-sqlite3 if available, otherwise return empty/null.
// (Avoiding a hard dep until polingual is wired; the sqlite file may
//  not even exist on Vercel until we publish a snapshot.)
let _db: { prepare: (sql: string) => { get: (...args: unknown[]) => unknown; all: (...args: unknown[]) => unknown[] } } | null | undefined;

function getDb() {
  if (_db !== undefined) return _db;
  if (!fs.existsSync(SQLITE_PATH)) {
    _db = null;
    return _db;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    _db = new Database(SQLITE_PATH, { readonly: true, fileMustExist: true });
    return _db;
  } catch {
    _db = null;
    return _db;
  }
}

export function getPhoton(id: string): Photon | null {
  const db = getDb();
  if (!db) return null;
  try {
    const row = db
      .prepare("SELECT payload FROM photons WHERE id = ?")
      .get(id) as { payload?: string } | undefined;
    if (!row?.payload) return null;
    return JSON.parse(row.payload) as Photon;
  } catch {
    return null;
  }
}

export function searchPhotons(query: string, lang?: string, kind?: string, topK = 20): Photon[] {
  const db = getDb();
  if (!db) return [];
  try {
    const clauses: string[] = [];
    const args: (string | number)[] = [];
    if (query) {
      clauses.push("(surface LIKE ? OR meaning_en LIKE ?)");
      args.push(`%${query}%`, `%${query}%`);
    }
    if (lang) { clauses.push("lang = ?"); args.push(lang); }
    if (kind) { clauses.push("kind = ?"); args.push(kind); }
    const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
    const rows = db
      .prepare(`SELECT payload FROM photons ${where} LIMIT ?`)
      .all(...args, topK) as { payload?: string }[];
    return rows
      .map((r) => (r.payload ? (JSON.parse(r.payload) as Photon) : null))
      .filter((p): p is Photon => !!p);
  } catch {
    return [];
  }
}

export function photonStats(): { total: number; by_kind: Record<string, number>; by_lang: Record<string, number> } {
  const db = getDb();
  if (!db) return { total: 0, by_kind: {}, by_lang: {} };
  try {
    const total = (db.prepare("SELECT COUNT(*) AS n FROM photons").get() as { n: number }).n;
    const byKind: Record<string, number> = {};
    for (const r of db.prepare("SELECT kind, COUNT(*) AS n FROM photons GROUP BY kind").all() as { kind: string; n: number }[]) {
      byKind[r.kind] = r.n;
    }
    const byLang: Record<string, number> = {};
    for (const r of db.prepare("SELECT lang, COUNT(*) AS n FROM photons GROUP BY lang").all() as { lang: string; n: number }[]) {
      byLang[r.lang] = r.n;
    }
    return { total, by_kind: byKind, by_lang: byLang };
  } catch {
    return { total: 0, by_kind: {}, by_lang: {} };
  }
}
