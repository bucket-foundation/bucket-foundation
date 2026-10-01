import { FIELD_COUNT, FLOOR_DEN, FLOOR_NUM, FOUNDING_BONUS_CAP_MICRO, MICRO, MILLI, clampBonus, idiv, kernelOrder, kernelScore, type KernelQuery } from "./rank-kernel";

export const FIELDS = ["title", "author", "concept", "body"] as const;
export type Field = (typeof FIELDS)[number];

export const FOUNDING_BONUS_CAP = FOUNDING_BONUS_CAP_MICRO;
export const ANY_TERM: Floor = { num: 0, den: 1 };
export const HALF_WEIGHT: Floor = { num: FLOOR_NUM, den: FLOOR_DEN };

export interface Floor {
  num: number;
  den: number;
}

export interface RankDoc {
  id: string;
  title: string;
  author: string;
  concept: string;
  body: string;
  doi?: string;
}

export interface IndexedDoc {
  doc: RankDoc;
  tf: Map<string, number>[];
  len: number[];
  seq: string[];
}

export interface RankStats {
  n: number;
  idfMicro: Map<string, number>;
  unseenIdfMicro: number;
  avgMilli: number[];
}

export interface Scored {
  doc: RankDoc;
  score: number;
}

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "are", "was", "his", "her", "its", "not", "but", "you", "all", "any", "can", "has", "have", "into", "our", "out", "who", "why", "how", "what",
  "of", "to", "in", "on", "by", "an", "as", "at", "be", "or", "it", "is", "we", "me", "do", "did", "does", "which", "when", "where", "their", "there", "were", "been", "than", "then", "them", "they", "these", "those",
]);

function stem(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) return w.slice(0, -1);
  return w;
}

export function terms(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2 && !STOP.has(w))
    .map(stem);
}

export function unreadableScript(query: string): boolean {
  return terms(query).length === 0 && /[\u0370-\u1fff\u2c00-\ud7ff\uf900-\ufffc]/.test(query);
}

export function queryTerms(query: string): string[] {
  return Array.from(new Set(terms(query)));
}

export function indexDoc(doc: RankDoc): IndexedDoc {
  const tf: Map<string, number>[] = [];
  const len: number[] = [];
  const seq: string[] = [];
  for (const f of FIELDS) {
    const list = terms(doc[f]);
    const counts = new Map<string, number>();
    for (const t of list) counts.set(t, (counts.get(t) ?? 0) + 1);
    tf.push(counts);
    len.push(list.length);
    seq.push(` ${list.join(" ")} `);
  }
  return { doc, tf, len, seq };
}

export function idfMicro(n: number, df: number): number {
  return Math.round(Math.log(1 + (n - df + 0.5) / (df + 0.5)) * MICRO);
}

export function statsOf(docs: IndexedDoc[]): RankStats {
  const df = new Map<string, number>();
  const sum = new Array<number>(FIELD_COUNT).fill(0);
  const filled = new Array<number>(FIELD_COUNT).fill(0);
  for (const d of docs) {
    const seen = new Set<string>();
    for (let f = 0; f < FIELD_COUNT; f++) {
      if (d.len[f] > 0) {
        sum[f] += d.len[f];
        filled[f]++;
      }
      for (const t of Array.from(d.tf[f].keys())) seen.add(t);
    }
    for (const t of Array.from(seen)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const table = new Map<string, number>();
  for (const [t, n] of Array.from(df)) table.set(t, idfMicro(docs.length, n));
  return {
    n: docs.length,
    idfMicro: table,
    unseenIdfMicro: idfMicro(docs.length, 0),
    avgMilli: sum.map((s, f) => (filled[f] ? Math.max(1, idiv(s * MILLI, filled[f])) : MILLI)),
  };
}

export function kernelQuery(q: string[], stats: RankStats, floor: Floor = HALF_WEIGHT): KernelQuery {
  return { idfMicro: q.map((t) => stats.idfMicro.get(t) ?? stats.unseenIdfMicro), avgMilli: stats.avgMilli, floorNum: floor.num, floorDen: floor.den };
}

const TITLE = 0;

export function byScoreThenId<T extends { score: number; doc: { id: string } }>(a: T, b: T): number {
  return kernelOrder({ id: a.doc.id, score: a.score }, { id: b.doc.id, score: b.score });
}

export interface RankOptions {
  floor?: Floor;
  bonus?: Map<string, number>;
}

export function rank(query: string, docs: IndexedDoc[], stats: RankStats, opts: RankOptions = {}): Scored[] {
  const q = queryTerms(query);
  if (!q.length) return [];
  const kq = kernelQuery(q, stats, opts.floor);
  const phrase = ` ${q.join(" ")} `;
  const out: Scored[] = [];
  for (const d of docs) {
    const bonusMicro = clampBonus(opts.bonus?.get(d.doc.id) ?? 0);
    const tf = q.map((t) => d.tf.map((m) => m.get(t) ?? 0));
    if (!bonusMicro && !tf.some((row) => row.some((n) => n > 0))) continue;
    const s = kernelScore(kq, {
      id: d.doc.id,
      tf,
      len: d.len,
      phrase: d.seq.some((x, f) => f !== 1 && x.includes(phrase)),
      exactTitle: d.seq[TITLE] === phrase,
      bonusMicro,
    });
    if (s.score > 0) out.push({ doc: d.doc, score: s.score });
  }
  return out.sort(byScoreThenId);
}

const flat = (s: string) => s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "");

export function firstAuthorFamily(author: string): string {
  const first = author.split(/,|;| and | et al/)[0].trim();
  return flat(first.split(/\s+/).pop() ?? "");
}

export function titleAuthorKey(doc: Pick<RankDoc, "title" | "author">): string {
  return `ta:${flat(doc.title)}|${firstAuthorFamily(doc.author)}`;
}

export interface Work<T> {
  best: T;
  also: string[];
}

export function dedupeWorks<T extends { doc: RankDoc; score: number }>(rows: T[]): Work<T>[] {
  const doiOf = new Map<string, string>();
  for (const r of rows) {
    const key = titleAuthorKey(r.doc);
    if (r.doc.doi && !doiOf.has(key)) doiOf.set(key, `doi:${r.doc.doi.toLowerCase()}`);
  }
  const works = new Map<string, Work<T>>();
  for (const r of rows.slice().sort(byScoreThenId)) {
    const ta = titleAuthorKey(r.doc);
    const key = r.doc.doi ? `doi:${r.doc.doi.toLowerCase()}` : doiOf.get(ta) ?? ta;
    const w = works.get(key);
    if (w) w.also.push(r.doc.id);
    else works.set(key, { best: r, also: [] });
  }
  return Array.from(works.values());
}

export interface FoundingRow {
  concept: string;
  aliases: string[];
  work: { kind: string; id: string; title: string; author: string; year: number };
  tier: string;
  basis_verified: boolean;
  reviewer: string;
  disputed?: boolean;
  dispute_reason?: string;
}

export interface FoundingMatch {
  row: FoundingRow;
  matched: string;
  approved: boolean;
  bonus: number;
}

export function foundingApproved(row: FoundingRow): boolean {
  return typeof row.reviewer === "string" && row.reviewer.trim() !== "" && row.basis_verified === true;
}

export function matchFounding(query: string, rows: FoundingRow[], allowUnverified: boolean): FoundingMatch | null {
  const q = new Set(queryTerms(query));
  if (!q.size) return null;
  const found: (FoundingMatch & { size: number })[] = [];
  for (const row of rows) {
    const approved = foundingApproved(row);
    if (!approved && !allowUnverified) continue;
    let best: { name: string; size: number } | null = null;
    for (const name of [row.concept, ...row.aliases]) {
      const t = queryTerms(name);
      if (!t.length || !t.every((x) => q.has(x))) continue;
      if (!best || t.length > best.size) best = { name, size: t.length };
    }
    if (best) found.push({ row, matched: best.name, approved, bonus: row.disputed ? 0 : FOUNDING_BONUS_CAP, size: best.size });
  }
  found.sort(
    (a, b) =>
      b.size - a.size ||
      Number(b.approved) - Number(a.approved) ||
      Number(!!a.row.disputed) - Number(!!b.row.disputed) ||
      Number(b.row.tier === "founding") - Number(a.row.tier === "founding") ||
      (a.row.concept < b.row.concept ? -1 : a.row.concept > b.row.concept ? 1 : 0),
  );
  if (!found.length) return null;
  const { row, matched, approved, bonus } = found[0];
  return { row, matched, approved, bonus };
}
