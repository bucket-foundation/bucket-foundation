import fs from "fs";
import path from "path";
import { coverage, rankNormalized, tokens, type Hit } from "./search";

export type SourceKind = "o" | "p" | "a" | "g" | "w" | "y";
export type SourceType = "paper" | "text" | "talk";
export type SourceRow = [SourceKind, string, string, number | null, string, string];

export interface SourceIndex {
  v: number;
  items: SourceRow[];
}

export interface SourceSource {
  kind: SourceKind;
  id: string;
  title: string;
  year: number | null;
  snippet: string;
  by: string;
  score: number;
}

export const SOURCE_TYPE: Record<SourceKind, SourceType> = { o: "paper", p: "paper", a: "paper", g: "text", w: "text", y: "talk" };
export const SOURCE_LABEL: Record<SourceKind, string> = { o: "OpenAlex", p: "PubMed", a: "arXiv", g: "Gutenberg", w: "Wikisource", y: "YouTube" };

export function sourceUrl(kind: SourceKind, id: string): string | null {
  if (kind === "o") return `https://openalex.org/${id}`;
  if (kind === "p") return `https://pubmed.ncbi.nlm.nih.gov/${id}/`;
  if (kind === "a") return `https://arxiv.org/abs/${id}`;
  if (kind === "g") return `https://www.gutenberg.org/ebooks/${id}`;
  if (kind === "y") return `https://www.youtube.com/watch?v=${id}`;
  return `https://en.wikisource.org/?curid=${id}`;
}

export function sourceHitId(kind: SourceKind, id: string): string {
  return `${SOURCE_TYPE[kind]}:${kind}/${id}`;
}

const FILES = ["explore-sources.json", "explore-sources.local.json"];
const PER_TYPE = 12;

interface Prepared {
  row: SourceRow;
  title: Set<string>;
  body: Set<string>;
}

let prepared: Prepared[] | null = null;
let loading: Promise<Prepared[]> | null = null;

export function prepare(index: SourceIndex): Prepared[] {
  return index.items.map((row) => ({ row, title: tokens(row[2]), body: tokens(`${row[4]} ${row[5]}`) }));
}

async function readIndex(dir: string): Promise<SourceIndex | null> {
  for (const f of FILES) {
    try {
      const raw = await fs.promises.readFile(path.join(dir, f), "utf8");
      const parsed = JSON.parse(raw) as SourceIndex;
      if (parsed?.v === 1 && Array.isArray(parsed.items)) return parsed;
    } catch {}
  }
  return null;
}

export function loadSourceIndex(dir = path.join(process.cwd(), "src", "data")): Promise<Prepared[]> {
  if (prepared) return Promise.resolve(prepared);
  loading ??= readIndex(dir).then((idx) => {
    prepared = idx ? prepare(idx) : [];
    return prepared;
  });
  return loading;
}

export function resetSourceIndex(): void {
  prepared = null;
  loading = null;
}

export function searchSources(query: string, pool: Prepared[], perType = PER_TYPE): SourceSource[] {
  const q = tokens(query);
  if (!q.size) return [];
  const scored: { p: Prepared; raw: number; id: string }[] = [];
  for (const p of pool) {
    const t = coverage(q, p.title);
    const b = coverage(q, p.body);
    if (t === 0 && b === 0) continue;
    scored.push({ p, raw: t * 0.7 + b * 0.3, id: sourceHitId(p.row[0], p.row[1]) });
  }
  const out: SourceSource[] = [];
  for (const type of ["paper", "text", "talk"] as SourceType[]) {
    const group = scored.filter((s) => SOURCE_TYPE[s.p.row[0]] === type);
    const top = group.sort((a, b) => b.raw - a.raw || (a.id < b.id ? -1 : 1)).slice(0, perType);
    for (const s of rankNormalized(top)) {
      const [kind, id, title, year, snippet, by] = s.p.row;
      out.push({ kind, id, title, year, snippet, by, score: s.score });
    }
  }
  return out;
}

export function sourceToHit(s: SourceSource): Hit {
  const label = SOURCE_LABEL[s.kind];
  return {
    id: sourceHitId(s.kind, s.id),
    type: SOURCE_TYPE[s.kind],
    title: s.title,
    subtitle: [s.by, label].filter(Boolean).join(" · "),
    text: s.snippet,
    score: s.score * 0.9,
    branch: label,
    year: s.year,
    url: sourceUrl(s.kind, s.id),
    links: [],
  };
}
