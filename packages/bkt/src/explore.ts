import type { Database } from "bun:sqlite";
import { rankCanon } from "../../../src/lib/canon-rank";
import type { LoadedAdvisors } from "../../../src/lib/explore/advisors";
import { CANON_FILES, canonFileHits } from "../../../src/lib/explore/canon-files";
import { foundingCard } from "../../../src/lib/explore/founding";
import { matchFounding, type FoundingRow as RankFoundingRow } from "../../../src/lib/explore/rank";
import { buildCorpus, needsClosest, rankedPools, semanticExcerpts, type ExploreCorpus } from "../../../src/lib/explore/ranked-core";
import { parseStored, serializeSaved, type SavedState } from "../../../src/lib/explore/saved";
import type { Talk } from "../../../src/lib/explore/talks";
import type { ReferenceBasis } from "../../../src/lib/explore/reference-core";
import { exploreSearch, type ExploreRanking, type ExploreSearchDeps } from "../../../src/lib/explore/respond";
import { prepare, type Prepared, type SourceKind } from "../../../src/lib/explore/source-index";
import type { CanonStore } from "./canon";
import type { Licence } from "./pack/canon";
import type { ExplorePack, FoundingRow } from "./pack/explore";
import { validDatasetId } from "../../../src/lib/explore/datasets";
import { coverage, tokens } from "../../../src/lib/explore/search";
import { narrowRows, packedBytes, pageCount, pageRows, REPLY_BYTES, type PackedRows } from "./pack/row-sets/contract";
import type { RowSetPack } from "./pack/row-sets/index";
import type { Route } from "./serve";

export const EXPLORE_META_KEY = "explore_pack_version";
export const NO_ADVISORS: LoadedAdvisors = { sources: [], sample: false, origin: "none", axes: [] };

const DOCS = ["years", "foundingWorks", "referenceBasis", "talks"] as const;
export const SAVED_BODY_BYTES = 1024 * 1024;
type Doc = (typeof DOCS)[number];

const meta = (db: Database) => db.query<{ v: string }, [string]>("select v from meta where k = ?").get(EXPLORE_META_KEY)?.v ?? null;

export function syncExplore(db: Database, pack: ExplorePack): boolean {
  if (meta(db) === pack.version) return false;
  db.transaction(() => {
    db.run(`drop table if exists explore_sources; drop table if exists explore_docs; drop table if exists explore_licences;
      create table explore_sources (n integer primary key, kind text not null, id text not null, title text not null, year integer, by text not null);
      create table explore_docs (k text primary key, v text not null);
      create table explore_licences (n integer primary key, kind text not null, name text not null, terms text not null, url text, works integer not null);`);
    const src = db.query("insert into explore_sources (n, kind, id, title, year, by) values (?, ?, ?, ?, ?, ?)");
    pack.sources.forEach(([kind, id, title, year, by], n) => src.run(n, kind, id, title, year, by));
    const doc = db.query("insert into explore_docs (k, v) values (?, ?)");
    for (const k of DOCS) doc.run(k, JSON.stringify(pack[k] ?? {}));
    const lic = db.query("insert into explore_licences (n, kind, name, terms, url, works) values (?, ?, ?, ?, ?, ?)");
    pack.licences.forEach((l, n) => lic.run(n, l.kind, l.name, l.terms, l.url, l.works));
    db.query("insert into meta (k, v) values (?, ?) on conflict (k) do update set v = excluded.v").run(EXPLORE_META_KEY, pack.version);
  })();
  return true;
}

export const ROWS_META_KEY = "explore_rows_version";
export const ROWS_ALIASES_KEY = "explore_rows_aliases";
export const ROWS_QUERY_MAX = 200;

export function syncRowSets(db: Database, pack: (Pick<RowSetPack, "version" | "sets"> & { aliases?: Record<string, string> }) | null): boolean {
  const version = pack?.version ?? "none";
  if (db.query<{ v: string }, [string]>("select v from meta where k = ?").get(ROWS_META_KEY)?.v === version) return false;
  db.transaction(() => {
    db.run(`drop table if exists explore_row_sets; drop table if exists explore_row_pages;
      create table explore_row_sets (n integer primary key, id text not null unique, label text not null);
      create table explore_row_pages (id text not null, page integer not null, body text not null, primary key (id, page));`);
    const set = db.query("insert into explore_row_sets (n, id, label) values (?, ?, ?)");
    const page = db.query("insert into explore_row_pages (id, page, body) values (?, ?, ?)");
    (pack?.sets ?? []).forEach((s, n) => {
      set.run(n, s.id, s.label);
      s.pages.forEach((p, i) => page.run(s.id, i, JSON.stringify(p)));
    });
    db.query("insert into meta (k, v) values (?, ?) on conflict (k) do update set v = excluded.v").run(ROWS_META_KEY, version);
    db.query("insert into meta (k, v) values (?, ?) on conflict (k) do update set v = excluded.v").run(ROWS_ALIASES_KEY, JSON.stringify(pack?.aliases ?? {}));
  })();
  return true;
}

export class RowSetStore {
  constructor(private db: Database) {}

  private ready(): boolean {
    return this.db.query<{ n: number }, []>("select count(*) as n from sqlite_master where type = 'table' and name = 'explore_row_sets'").get()!.n > 0;
  }

  aliases(): Record<string, string> {
    const raw = this.db.query<{ v: string }, [string]>("select v from meta where k = ?").get(ROWS_ALIASES_KEY)?.v;
    try {
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === "string")) : {};
    } catch {
      return {};
    }
  }

  list(): { id: string; label: string }[] {
    return this.ready() ? this.db.query<{ id: string; label: string }, []>("select id, label from explore_row_sets order by n").all() : [];
  }

  has(id: string): boolean {
    return this.ready() && this.db.query<{ n: number }, [string]>("select count(*) as n from explore_row_sets where id = ?").get(id)!.n > 0;
  }

  page(id: string, page: number): PackedRows | null {
    if (!this.ready()) return null;
    const row = this.db.query<{ body: string }, [string, number]>("select body from explore_row_pages where id = ? and page = ?").get(id, page);
    return row ? (JSON.parse(row.body) as PackedRows) : null;
  }
}

export function rowSetReply(store: RowSetStore, url: URL): { status: number; body: unknown } {
  const params = url.searchParams;
  const id = params.get("id");
  if (id === null) return { status: 200, body: { datasets: store.list(), aliases: store.aliases() } };
  const bad = { status: 400, body: { error: "bad_request" } };
  if (!validDatasetId(id)) return bad;
  const opening = store.has(id) ? store.page(id, 0) : null;
  if (!opening) return { status: 404, body: { error: "not_found" } };
  const group = params.get("group");
  let rows = opening;
  if (group !== null) {
    const at = opening.frame.drill?.values.indexOf(group) ?? -1;
    const held = at < 0 ? null : store.page(id, at + 1);
    if (!held) return bad;
    rows = held;
  }
  const rawPage = params.get("page") ?? "0";
  if (!/^\d{1,6}$/.test(rawPage)) return bad;
  const q = (params.get("q") ?? "").slice(0, ROWS_QUERY_MAX);
  const asked = tokens(q);
  if (asked.size) rows = narrowRows(rows, (title, sub) => coverage(asked, tokens(`${title} ${sub}`)) > 0);
  const page = Number(rawPage);
  if (page >= pageCount(rows)) return bad;
  const reply = pageRows(rows, page);
  if (packedBytes(reply) > REPLY_BYTES) return { status: 500, body: { error: "reply_too_large" } };
  return { status: 200, body: reply };
}

type SourceRecord = { kind: SourceKind; id: string; title: string; year: number | null; by: string };

export class ExploreStore {
  private cached: Prepared[] | null = null;
  private yearMap: Map<string, number> | null = null;
  private talkMap: Map<string, Talk> | null = null;
  private corpusFor: { pool: Prepared[]; entries: unknown; corpus: ExploreCorpus } | null = null;

  constructor(private db: Database) {}

  database(): Database {
    return this.db;
  }

  version(): string | null {
    return meta(this.db);
  }

  pool(): Prepared[] {
    if (!this.cached) {
      if (!this.version()) return [];
      const rows = this.db.query<SourceRecord, []>("select kind, id, title, year, by from explore_sources order by n").all();
      this.cached = prepare({ v: 1, items: rows.map((r) => [r.kind, r.id, r.title, r.year, "", r.by]) });
    }
    return this.cached;
  }

  private doc<T>(k: Doc): T | null {
    if (!this.version()) return null;
    const row = this.db.query<{ v: string }, [string]>("select v from explore_docs where k = ?").get(k);
    return row ? (JSON.parse(row.v) as T) : null;
  }

  yearOf(concept: string): number | null {
    this.yearMap ??= new Map(Object.entries(this.doc<Record<string, number>>("years") ?? {}));
    return this.yearMap.get(concept) ?? null;
  }

  talkFor(path: string): Talk | null {
    this.talkMap ??= new Map(Object.entries(this.doc<Record<string, Talk>>("talks") ?? {}));
    return this.talkMap.get(path) ?? null;
  }

  corpus(canon: CanonStore): ExploreCorpus {
    const pool = this.pool();
    const entries = canon.index();
    if (this.corpusFor?.pool === pool && this.corpusFor.entries === entries) return this.corpusFor.corpus;
    const corpus = buildCorpus({ rows: pool.map((p) => p.row), entries, files: CANON_FILES, talk: (f) => this.talkFor(f) });
    this.corpusFor = { pool, entries, corpus };
    return corpus;
  }

  foundingWorks(): FoundingRow[] {
    return this.doc<FoundingRow[]>("foundingWorks") ?? [];
  }

  hasPrimaryPaper(doi: string): boolean {
    if (!this.version()) return false;
    return this.db.query<{ n: number }, [string]>("select count(*) as n from explore_sources where kind = 'd' and id = ?").get(doi)!.n > 0;
  }

  referenceBasis(): ReferenceBasis | null {
    return this.doc<ReferenceBasis>("referenceBasis");
  }

  licences(): Licence[] {
    if (!this.version()) return [];
    return this.db.query<Licence, []>("select kind, name, terms, url, works from explore_licences order by n").all();
  }
}

export function exploreRanking(explore: ExploreStore, canon: CanonStore): ExploreRanking<ExploreCorpus> {
  return {
    corpus: async () => explore.corpus(canon),
    founding: (query) => {
      const m = matchFounding(query, explore.foundingWorks() as unknown as RankFoundingRow[], false);
      return m ? foundingCard(m) : null;
    },
    talkFor: (file) => explore.talkFor(file),
    rankedPools,
    semanticExcerpts,
    needsClosest,
  };
}

export function exploreDeps(explore: ExploreStore, canon: CanonStore): ExploreSearchDeps {
  return {
    ranking: exploreRanking(explore, canon),
    canon: (p) => rankCanon({ loadIndex: () => canon.index(), decodeQVec: () => null }, { ...p, qvec: null }),
    advisors: () => NO_ADVISORS,
    sources: () => explore.pool(),
    yearOf: (concept) => explore.yearOf(concept),
    canonFiles: (query) => canonFileHits(query),
  };
}

export class SavedStore {
  constructor(private db: Database, private aliases: Record<string, string> = {}) {
    db.run("create table if not exists explore_saved (k text primary key, v text not null)");
  }

  get(): SavedState {
    const row = this.db.query<{ v: string }, []>("select v from explore_saved where k = 'list'").get();
    const state = parseStored(row?.v).state;
    if (!state.items.some((item) => item.id in this.aliases)) return state;
    const items = state.items.map((item) => (item.id in this.aliases ? { ...item, id: this.aliases[item.id] } : item)).filter((item, n, all) => all.findIndex((o) => o.id === item.id) === n);
    const moved = { ...state, items };
    this.db.query("insert into explore_saved (k, v) values ('list', ?) on conflict (k) do update set v = excluded.v").run(serializeSaved(moved));
    return moved;
  }

  put(raw: string): SavedState | null {
    const { state, status } = parseStored(raw);
    if (status === "damaged" || status === "empty") return null;
    this.db.query("insert into explore_saved (k, v) values ('list', ?) on conflict (k) do update set v = excluded.v").run(serializeSaved(state));
    return state;
  }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function exploreRoutes(explore: ExploreStore, canon: CanonStore, saved: SavedStore = new SavedStore(explore.database())): Record<string, Route> {
  const deps = exploreDeps(explore, canon);
  const rowSets = new RowSetStore(explore.database());
  return {
    "GET /local/explore/rows": (_req, url) => {
      const { status, body } = rowSetReply(rowSets, url);
      return json(body, status);
    },
    "GET /local/explore/saved": () => json(saved.get()),
    "POST /local/explore/saved": async (req) => {
      const state = saved.put(await req.text());
      return state ? json(state) : json({ error: { code: "bad_saved_list", message: "That saved list could not be read." } }, 400);
    },
    "GET /local/explore/search": async (_req, url) => {
      const { status, body } = await exploreSearch(deps, url);
      return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
    },
  };
}
