import { canonIndex, type ClaimIndexEntry } from "@/lib/canon-search";
import { CANON_FILES, canonFileId, type CanonFile } from "./canon-files";
import { dedupeWorks, indexDoc, rank, statsOf, type IndexedDoc, type RankDoc, type RankStats } from "./rank";
import { excerptId, type ExcerptSource, type Hit } from "./search";
import { SOURCE_LABEL, SOURCE_LICENSE, SOURCE_TYPE, loadSourceIndex, sourceHitId, sourceUrl, type SourceRow } from "./sources";
import { talkFor, type Talk } from "./talks";

export const CANDIDATES = 200;

type Meta = { pool: "source"; row: SourceRow } | { pool: "excerpt"; entry: ClaimIndexEntry; talk: Talk | null } | { pool: "file"; file: CanonFile };

export interface ExploreCorpus {
  docs: IndexedDoc[];
  stats: RankStats;
  meta: Map<string, Meta>;
}

export interface CorpusInput {
  rows: SourceRow[];
  entries: ClaimIndexEntry[];
  files: CanonFile[];
  talk?: (file: string) => Talk | null;
}

export function sourceDoc(row: SourceRow): RankDoc {
  const [kind, id, title, , snippet, by] = row;
  return { id: sourceHitId(kind, id), title, author: by, concept: "", body: snippet, doi: kind === "d" ? id : undefined };
}

export function buildCorpus(input: CorpusInput): ExploreCorpus {
  const meta = new Map<string, Meta>();
  const docs: RankDoc[] = [];
  for (const row of input.rows) {
    const doc = sourceDoc(row);
    if (meta.has(doc.id)) continue;
    meta.set(doc.id, { pool: "source", row });
    docs.push(doc);
  }
  for (const entry of input.entries) {
    const id = excerptId(entry);
    if (meta.has(id)) continue;
    const talk = input.talk ? input.talk(entry.path) : null;
    meta.set(id, { pool: "excerpt", entry, talk });
    docs.push({ id, title: talk?.title ?? "", author: "", concept: entry.concept.replace(/-/g, " "), body: entry.text });
  }
  for (const file of input.files) {
    const id = canonFileId(file);
    if (meta.has(id)) continue;
    meta.set(id, { pool: "file", file });
    docs.push({ id, title: file.title, author: "", concept: file.branch.replace(/^\d+-/, ""), body: file.path.replace(/[/_.-]/g, " ") });
  }
  const indexed = docs.map(indexDoc);
  return { docs: indexed, stats: statsOf(indexed), meta };
}

let cached: { pool: unknown; entries: unknown; corpus: ExploreCorpus } | null = null;

export async function loadExploreCorpus(): Promise<ExploreCorpus> {
  const pool = await loadSourceIndex();
  const entries = canonIndex();
  if (cached && cached.pool === pool && cached.entries === entries) return cached.corpus;
  const corpus = buildCorpus({ rows: pool.map((p) => p.row), entries, files: CANON_FILES, talk: talkFor });
  cached = { pool, entries, corpus };
  return corpus;
}

export interface RankedPools {
  sources: Hit[];
  excerpts: ExcerptSource[];
  files: Hit[];
}

export interface RankedOptions {
  branch?: string;
  bonus?: Map<string, number>;
  year?: (concept: string) => number | null;
  candidates?: number;
  minShare?: number;
}

function sourceHit(row: SourceRow, score: number, also: string[]): Hit {
  const [kind, id, title, year, snippet, by] = row;
  const label = SOURCE_LABEL[kind];
  return {
    id: sourceHitId(kind, id),
    type: SOURCE_TYPE[kind],
    title,
    subtitle: [by, label].filter(Boolean).join(" · "),
    text: snippet,
    score,
    branch: label,
    source: label,
    license: SOURCE_LICENSE[kind],
    year,
    url: sourceUrl(kind, id),
    links: [],
    also,
  };
}

export function rankedPools(query: string, corpus: ExploreCorpus, opts: RankedOptions = {}): RankedPools {
  const scored = rank(query, corpus.docs, corpus.stats, { bonus: opts.bonus, minShare: opts.minShare });
  const works = dedupeWorks(scored.filter((s) => corpus.meta.get(s.doc.id)?.pool === "source")).slice(0, opts.candidates ?? CANDIDATES);
  const out: RankedPools = { sources: [], excerpts: [], files: [] };
  for (const w of works) {
    const m = corpus.meta.get(w.best.doc.id);
    if (m?.pool === "source") out.sources.push(sourceHit(m.row, w.best.score, w.also));
  }
  for (const s of scored) {
    const m = corpus.meta.get(s.doc.id);
    if (m?.pool === "excerpt") {
      if (opts.branch && m.entry.branch !== opts.branch) continue;
      const { branch, concept, slug, title, text } = m.entry;
      out.excerpts.push({ branch, concept, slug, title, text, score: s.score, year: opts.year?.(concept) ?? null, talk: m.talk });
    } else if (m?.pool === "file") {
      out.files.push({
        id: s.doc.id,
        type: "canon-file",
        title: m.file.title,
        subtitle: m.file.branch.replace(/^\d+-/, ""),
        text: "",
        score: s.score,
        branch: m.file.branch,
        year: null,
        url: null,
        links: [],
      });
    }
  }
  return out;
}
