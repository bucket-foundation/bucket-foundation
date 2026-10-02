import { createHash } from "node:crypto";
import type { Atom } from "../../../src/lib/academy/engine";
import { openable } from "./canon";
import { NOTICE_KIND, type CanonPack } from "./pack/canon";
import type { Pack } from "./pack/export";
import type { Route } from "./serve";
import { deckOf, type Store } from "./store";

export const DATA_PAGE = 50;
export const DATA_PAGE_MAX = 200;
export const DATA_QUERY_MAX = 200;
export const DATA_SORTS = ["title", "creators", "year", "kind"] as const;
export type DataSort = (typeof DATA_SORTS)[number];

export interface DataRecord {
  id: string;
  title: string;
  creators: string | null;
  year: number | null;
  kind: string;
  source: string | null;
}

export interface DataField {
  label: string;
  value: string;
}

export interface DataKind {
  id: string;
  label: string;
}

export type Stored = "encrypted" | "partly" | "plain";

export interface DataCount {
  kind: string;
  label: string;
  n: number;
  stored?: Stored;
  screen?: string;
}

export interface DataPart {
  name: string;
  count: number;
  unit: string;
  terms: string | null;
  link: string | null;
  openable: boolean;
}

export interface DatasetInfo {
  id: string;
  name: string;
  about: string;
  browsable: boolean;
  version: string | null;
  builtAt: number | null;
  checksum: string | null;
  counts: DataCount[];
  kinds: DataKind[];
  parts: DataPart[];
  leftOut: { count: number; reason: string } | null;
}

export interface DatasetAdapter {
  info(): DatasetInfo;
  records(): DataRecord[];
  fields(id: string): DataField[] | null;
}

const NO_AUTHOR_CONSENT = "the author has not agreed to sharing";
const plain = (slug: string) => slug.replace(/^\d+-/, "").replace(/-/g, " ");
const part = (name: string, count: number, unit: string, terms: string | null, link: string | null): DataPart => ({ name, count, unit, terms, link, openable: openable(link) !== null });
const field = (label: string, value: string | number | null | undefined): DataField[] => (value === null || value === undefined || value === "" ? [] : [{ label, value: String(value) }]);

export function learningAdapter(pack: Pick<Pack, "version" | "items" | "decks" | "atoms">): DatasetAdapter {
  const decks = pack.decks ?? [];
  const atoms = pack.atoms ?? {};
  const deckTitle = new Map(decks.map((d) => [d.id, d.title]));
  const lessons = new Map<string, { deck: string; atom: Atom }>();
  const lessonTitle = new Map<string, string>();
  for (const [deck, list] of Object.entries(atoms))
    for (const atom of list) {
      lessons.set(`lesson/${deck}/${atom.id}`, { deck, atom });
      lessonTitle.set(`${deck}/${atom.id}`, atom.title);
    }
  const questions = new Map(pack.items.map((i) => [`question/${i.id}`, i]));
  let list: DataRecord[] | null = null;
  let checksum: string | null = null;
  return {
    info() {
      checksum ??= createHash("sha256").update(JSON.stringify([pack.items, atoms])).digest("hex");
      return {
        id: "learning",
        name: "Learning decks",
        about: "The lessons and quiz questions that Learn, Quiz and Review draw from.",
        browsable: true,
        version: pack.version,
        builtAt: null,
        checksum,
        counts: [
          { kind: "deck", label: "decks", n: decks.length },
          { kind: "lesson", label: "lessons", n: lessons.size },
          { kind: "question", label: "questions", n: questions.size },
        ],
        kinds: [
          { id: "lesson", label: "Lesson" },
          { id: "question", label: "Question" },
        ],
        parts: decks.map((d) => part(d.title, d.atoms, "lessons", null, null)),
        leftOut: null,
      };
    },
    records() {
      list ??= [
        ...[...lessons].map(([id, { atom }]) => ({ id, title: atom.title, creators: null, year: null, kind: "lesson", source: null })),
        ...[...questions].map(([id, i]) => ({ id, title: i.prompt, creators: null, year: null, kind: "question", source: null })),
      ];
      return list;
    },
    fields(id) {
      const lesson = lessons.get(id);
      if (lesson) {
        const { deck, atom } = lesson;
        const needs = (atom.requires ?? []).map((r) => lessonTitle.get(`${deck}/${r}`) ?? plain(r));
        return [
          ...field("Deck", deckTitle.get(deck) ?? plain(deck)),
          ...field("Summary", atom.summary),
          ...field("Equation", atom.equation),
          ...field("Builds on", needs.join(", ")),
          ...field("Questions", (atom as { quiz?: unknown[] }).quiz?.length ?? 0),
          ...field("Lesson", atom.lesson),
        ];
      }
      const q = questions.get(id);
      if (!q) return null;
      const deck = deckOf(q.branch);
      return [...field("Deck", deckTitle.get(deck) ?? plain(deck)), ...field("Lesson", q.title), ...field("Level", q.level), ...field("Question", q.prompt), ...field("Answer", q.answer)];
    },
  };
}

const LEAD = /^Claim\s+\S\s+/;

export function canonAdapter(pack: CanonPack): DatasetAdapter {
  const excerpts = new Map(pack.excerpts.map((e) => [`excerpt/${e.rowid}`, e]));
  const passages = new Map<string, { of: number; n: number }>();
  for (const e of pack.excerpts) (pack.evidence[String(e.rowid)] ?? []).forEach((_, n) => passages.set(`passage/${e.rowid}/${n}`, { of: e.rowid, n }));
  const kindName = new Map(pack.licences.map((l) => [l.kind, l.name]));
  const title = (t: string) => t.replace(LEAD, "");
  let list: DataRecord[] | null = null;
  const c = pack.counts;
  const left = c.excerpts.total - c.excerpts.kept + (c.passages.total - c.passages.kept);
  return {
    info() {
      return {
        id: "canon",
        name: "Canon excerpts",
        about: "Short quotations from talks, papers and books, each with the passages that support it.",
        browsable: true,
        version: pack.version,
        builtAt: null,
        checksum: pack.sha256,
        counts: [
          { kind: "excerpt", label: "excerpts", n: excerpts.size },
          { kind: "passage", label: "supporting passages", n: passages.size },
        ],
        kinds: [
          { id: "excerpt", label: "Excerpt" },
          { id: "passage", label: "Supporting passage" },
        ],
        parts: pack.licences.filter((l) => l.kind !== NOTICE_KIND).map((l) => part(l.name, l.works, "sources", l.terms, l.url)),
        leftOut:
          left > 0
            ? { count: left, reason: `Left out because ${NO_AUTHOR_CONSENT}, the licence forbids sharing, the source could not be found, or the passage supported an excerpt that was left out.` }
            : null,
      };
    },
    records() {
      list ??= [
        ...[...excerpts].map(([id, e]) => ({ id, title: title(e.title), creators: null, year: null, kind: "excerpt", source: e.source.url })),
        ...[...passages].map(([id, { of, n }]) => {
          const p = pack.evidence[String(of)][n];
          return { id, title: p.title, creators: p.author, year: null, kind: "passage", source: p.url };
        }),
      ];
      return list;
    },
    fields(id) {
      const e = excerpts.get(id);
      if (e)
        return [
          ...field("Branch", plain(e.branch)),
          ...field("Topic", plain(e.concept)),
          ...field("Text", e.text.slice(e.title.length + 2).trim() || title(e.title)),
          ...field("Taken from", e.source.title),
          ...field("Time in the recording", e.source.timestamp?.slice(0, 8)),
          ...field("Supporting passages", (pack.evidence[String(e.rowid)] ?? []).length),
        ];
      const at = passages.get(id);
      if (!at) return null;
      const p = pack.evidence[String(at.of)][at.n];
      const of = excerpts.get(`excerpt/${at.of}`)!;
      return [...field("Source type", kindName.get(p.kind) ?? plain(p.kind)), ...field("By", p.author), ...field("Text", p.text), ...field("Supports the excerpt", title(of.title)), ...field("Closeness to the excerpt", p.score.toFixed(2))];
    },
  };
}

export interface ExplorePackLike {
  version: string;
  sha256: string;
  sources: [kind: string, id: string, title: string, year: number | null, by: string][];
  licences: { kind: string; name: string; terms: string; url: string | null; works: number }[];
  counts: { sources: { total: number; kept: number } };
}

const EXPLORE_URL: Record<string, (id: string) => string> = {
  o: (id) => `https://openalex.org/${id}`,
  p: (id) => `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
  a: (id) => `https://arxiv.org/abs/${id}`,
  g: (id) => `https://www.gutenberg.org/ebooks/${id}`,
  d: (id) => `https://doi.org/${id}`,
  y: (id) => `https://www.youtube.com/watch?v=${id}`,
  w: (id) => `https://en.wikisource.org/?curid=${id}`,
};

export function exploreAdapter(pack: ExplorePackLike): DatasetAdapter {
  const kindName = new Map(pack.licences.map((l) => [l.kind, l.name]));
  const rows = new Map(pack.sources.map((r) => [`source/${r[0]}/${r[1]}`, r]));
  const left = pack.counts.sources.total - pack.counts.sources.kept;
  let list: DataRecord[] | null = null;
  return {
    info() {
      return {
        id: "explore",
        name: "Explore sources",
        about: "Titles, authors and years of the papers, books and talks that Explore searches.",
        browsable: true,
        version: pack.version,
        builtAt: null,
        checksum: pack.sha256,
        counts: pack.licences.map((l) => ({ kind: l.kind, label: l.name, n: l.works })),
        kinds: pack.licences.map((l) => ({ id: l.kind, label: l.name })),
        parts: pack.licences.map((l) => part(l.name, l.works, "sources", l.terms, l.url)),
        leftOut: left > 0 ? { count: left, reason: `Left out because ${NO_AUTHOR_CONSENT}.` } : null,
      };
    },
    records() {
      list ??= [...rows].map(([id, [kind, key, title, year, by]]) => ({ id, title, creators: by || null, year, kind, source: EXPLORE_URL[kind]?.(key) ?? null }));
      return list;
    },
    fields(id) {
      const r = rows.get(id);
      return r ? [...field("Found in", kindName.get(r[0]) ?? r[0]), ...field("By", r[4]), ...field("Year", r[3])] : null;
    },
  };
}

export interface OwnDataOptions {
  analyses?: () => number;
}

export function ownAdapter(store: Store, opts: OwnDataOptions = {}): DatasetAdapter {
  const n = (sql: string) => store.db.query<{ n: number }, []>(sql).get()!.n;
  return {
    info() {
      return {
        id: "yours",
        name: "Your work",
        about: "What you have written and answered in Bucket. It stays on this computer.",
        browsable: false,
        version: null,
        builtAt: null,
        checksum: null,
        counts: [
          { kind: "note", label: "notes", n: n("select count(*) n from notes"), stored: "encrypted", screen: "notes" },
          { kind: "answer", label: "quiz and review answers", n: n("select count(*) n from attempts"), stored: "partly", screen: "history" },
          { kind: "work-answer", label: "work quiz answers", n: n("select count(*) n from work_quiz_attempts"), stored: "plain" },
          { kind: "daily", label: "daily quizzes", n: n("select count(*) n from daily_quiz"), stored: "encrypted" },
          { kind: "started", label: "lessons started", n: n("select count(*) n from learn_cards"), stored: "plain", screen: "learn" },
          { kind: "analysis", label: "analyses", n: opts.analyses?.() ?? 0, stored: "plain", screen: "jobs" },
          { kind: "history", label: "saved research histories", n: n("select count(*) n from history_snapshot"), stored: "encrypted", screen: "history" },
        ],
        kinds: [],
        parts: [],
        leftOut: null,
      };
    },
    records: () => [],
    fields: () => null,
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

interface Prepared {
  adapter: DatasetAdapter;
  records: DataRecord[];
  hay: string[];
  orders: Map<DataSort, number[]>;
  kinds: Map<string, string>;
}

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

function order(records: DataRecord[], sort: DataSort): number[] {
  const idx = records.map((_, i) => i);
  const text = (r: DataRecord) => (sort === "creators" ? r.creators : sort === "kind" ? r.kind : r.title) ?? "";
  if (sort === "year") return idx.sort((a, b) => (records[a].year ?? Infinity) - (records[b].year ?? Infinity) || a - b);
  return idx.sort((a, b) => {
    const x = text(records[a]);
    const y = text(records[b]);
    if (!x !== !y) return x ? -1 : 1;
    return collator.compare(x, y) || a - b;
  });
}

function whole(raw: string | null, fallback: number, max: number): number {
  if (raw === null) return fallback;
  const v = Number(raw);
  return Number.isInteger(v) && v >= 0 ? Math.min(v, max) : fallback;
}

export interface DataRoutes {
  routes: Record<string, Route>;
  match(method: string, pathname: string): Route | undefined;
}

const RECORDS = /^\/local\/data\/([a-z]{1,32})\/records(?:\/([^/]{1,1024}))?$/;

export function dataRoutes(adapters: DatasetAdapter[]): DataRoutes {
  const prepared = new Map<string, Prepared>();
  const byId = new Map(adapters.map((a) => [a.info().id, a]));
  const prep = (id: string): Prepared | null => {
    const adapter = byId.get(id);
    if (!adapter || !adapter.info().browsable) return null;
    if (!prepared.has(id)) {
      const records = adapter.records();
      prepared.set(id, { adapter, records, hay: records.map((r) => `${r.title} ${r.creators ?? ""} ${r.year ?? ""}`.toLowerCase()), orders: new Map(), kinds: new Map(adapter.info().kinds.map((k) => [k.id, k.label])) });
    }
    return prepared.get(id)!;
  };
  const view = (p: Prepared, r: DataRecord) => ({ ...r, kindLabel: p.kinds.get(r.kind) ?? r.kind, openable: openable(r.source) !== null });
  const list = (p: Prepared, url: URL) => {
    const q = (url.searchParams.get("q") ?? "").slice(0, DATA_QUERY_MAX).toLowerCase().split(/\s+/).filter(Boolean);
    const kind = url.searchParams.get("kind") ?? "";
    const rawSort = url.searchParams.get("sort") ?? "";
    const sort = (DATA_SORTS as readonly string[]).includes(rawSort) ? (rawSort as DataSort) : null;
    const desc = url.searchParams.get("dir") === "desc";
    const limit = Math.max(1, whole(url.searchParams.get("limit"), DATA_PAGE, DATA_PAGE_MAX));
    const offset = whole(url.searchParams.get("offset"), 0, Number.MAX_SAFE_INTEGER);
    let idx: number[] | null = null;
    if (sort) {
      if (!p.orders.has(sort)) p.orders.set(sort, order(p.records, sort));
      idx = p.orders.get(sort)!;
    }
    const hits: number[] = [];
    for (let k = 0; k < p.records.length; k++) {
      const i = idx ? idx[desc ? p.records.length - 1 - k : k] : k;
      if (kind && p.records[i].kind !== kind) continue;
      if (q.length && !q.every((t) => p.hay[i].includes(t))) continue;
      hits.push(i);
    }
    return json({ total: hits.length, offset, limit, records: hits.slice(offset, offset + limit).map((i) => view(p, p.records[i])) });
  };
  const one = (p: Prepared, raw: string) => {
    let id: string;
    try {
      id = decodeURIComponent(raw);
    } catch {
      return json({ error: "no such record" }, 404);
    }
    const record = p.records.find((r) => r.id === id);
    const fields = record ? p.adapter.fields(id) : null;
    return record && fields ? json({ record: view(p, record), fields }) : json({ error: "no such record" }, 404);
  };
  return {
    routes: { "GET /local/data": () => json({ datasets: adapters.map((a) => a.info()) }) },
    match(method, pathname) {
      const m = method === "GET" ? RECORDS.exec(pathname) : null;
      if (!m) return undefined;
      return (_req, url) => {
        const p = prep(m[1]);
        if (!p) return json({ error: "no such dataset" }, 404);
        return m[2] === undefined ? list(p, url) : one(p, m[2]);
      };
    },
  };
}
