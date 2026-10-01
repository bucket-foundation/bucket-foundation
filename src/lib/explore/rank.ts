export const FIELDS = ["title", "author", "concept", "body"] as const;
export type Field = (typeof FIELDS)[number];

export const FIELD_WEIGHT: Record<Field, number> = { title: 3, author: 2, concept: 2, body: 1 };
export const K1 = 1.2;
export const B = 0.75;
export const ALL_TERMS_BONUS = 0.25;
export const PHRASE_BONUS = 0.25;
export const EXACT_TITLE_BONUS = 0.5;
export const MIN_QUERY_SHARE = 0.5;
export const FOUNDING_BONUS_CAP = 1;
export const SCORE_DECIMALS = 6;

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
  tf: Record<Field, Map<string, number>>;
  len: Record<Field, number>;
  seq: Record<Field, string>;
}

export interface RankStats {
  n: number;
  df: Map<string, number>;
  avg: Record<Field, number>;
}

export interface Scored {
  doc: RankDoc;
  score: number;
  share: number;
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

export function queryTerms(query: string): string[] {
  return Array.from(new Set(terms(query)));
}

export function round(score: number): number {
  const k = 10 ** SCORE_DECIMALS;
  return Math.round(score * k) / k;
}

export function indexDoc(doc: RankDoc): IndexedDoc {
  const tf = {} as Record<Field, Map<string, number>>;
  const len = {} as Record<Field, number>;
  const seq = {} as Record<Field, string>;
  for (const f of FIELDS) {
    const list = terms(doc[f]);
    const counts = new Map<string, number>();
    for (const t of list) counts.set(t, (counts.get(t) ?? 0) + 1);
    tf[f] = counts;
    len[f] = list.length;
    seq[f] = ` ${list.join(" ")} `;
  }
  return { doc, tf, len, seq };
}

export function statsOf(docs: IndexedDoc[]): RankStats {
  const df = new Map<string, number>();
  const sum: Record<Field, number> = { title: 0, author: 0, concept: 0, body: 0 };
  const filled: Record<Field, number> = { title: 0, author: 0, concept: 0, body: 0 };
  for (const d of docs) {
    const seen = new Set<string>();
    for (const f of FIELDS) {
      if (d.len[f] > 0) {
        sum[f] += d.len[f];
        filled[f]++;
      }
      for (const t of Array.from(d.tf[f].keys())) seen.add(t);
    }
    for (const t of Array.from(seen)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const avg = {} as Record<Field, number>;
  for (const f of FIELDS) avg[f] = filled[f] ? sum[f] / filled[f] : 1;
  return { n: docs.length, df, avg };
}

export function idf(stats: RankStats, term: string): number {
  const df = Math.min(stats.df.get(term) ?? 0, stats.n);
  return Math.log(1 + (stats.n - df + 0.5) / (df + 0.5));
}

export function scoreDoc(q: string[], d: IndexedDoc, stats: RankStats): { score: number; share: number } {
  let base = 0;
  let matchedMass = 0;
  let totalMass = 0;
  let matched = 0;
  for (const t of q) {
    const w = idf(stats, t);
    totalMass += w;
    let x = 0;
    for (const f of FIELDS) {
      const n = d.tf[f].get(t);
      if (n) x += (FIELD_WEIGHT[f] * n) / (1 - B + (B * d.len[f]) / stats.avg[f]);
    }
    if (x > 0) {
      base += (w * x) / (K1 + x);
      matchedMass += w;
      matched++;
    }
  }
  if (!matched || totalMass <= 0) return { score: 0, share: 0 };
  const phrase = ` ${q.join(" ")} `;
  let m = 1;
  if (q.length > 1 && matched === q.length) m += ALL_TERMS_BONUS;
  if (q.length > 1 && (d.seq.title.includes(phrase) || d.seq.concept.includes(phrase) || d.seq.body.includes(phrase))) m += PHRASE_BONUS;
  if (d.seq.title === phrase) m += EXACT_TITLE_BONUS;
  return { score: round(base * m), share: matchedMass / totalMass };
}

export function byScoreThenId<T extends { score: number; doc: { id: string } }>(a: T, b: T): number {
  return b.score - a.score || (a.doc.id < b.doc.id ? -1 : a.doc.id > b.doc.id ? 1 : 0);
}

export interface RankOptions {
  minShare?: number;
  bonus?: Map<string, number>;
}

export function rank(query: string, docs: IndexedDoc[], stats: RankStats, opts: RankOptions = {}): Scored[] {
  const q = queryTerms(query);
  if (!q.length) return [];
  const minShare = opts.minShare ?? MIN_QUERY_SHARE;
  const out: Scored[] = [];
  for (const d of docs) {
    const s = scoreDoc(q, d, stats);
    const lexical = s.score > 0 && s.share >= minShare ? s.score : 0;
    const bonus = Math.max(0, Math.min(FOUNDING_BONUS_CAP, opts.bonus?.get(d.doc.id) ?? 0));
    const score = round(lexical + bonus);
    if (score > 0) out.push({ doc: d.doc, score, share: s.share });
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
